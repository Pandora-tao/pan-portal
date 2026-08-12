import { computed, onMounted, ref } from 'vue'
import { streamLegacyChat } from '../api/chat'
import {
  createSession,
  createPersistentGeneration,
  createPersistentRegeneration,
  getGeneration,
  getCurrentUser,
  listMessages,
  listSessions,
  saveMessageFeedback,
  observeGeneration,
  stopGeneration,
} from '../api/chatPersistence'
import { relationshipApi } from '../api/relationship'
import { isUnauthorizedError } from '../api/request'
import { SseEventError } from '../api/sse'
import type {
  ChatMessage,
  ChatAttachmentInput,
  ChatGenerationSnapshot,
  ChatStreamDeltaEvent,
  ChatStreamErrorEvent,
  FeedbackRating,
  LegacyChatResponse,
  MessageFeedbackInput,
  PersistedChatMessage,
} from '../types/chat'
import type { RelationshipOverview } from '../types/relationship'
import { normalizeAssistantContents } from '../utils/assistantMessages'
import { createId, createUuid } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'

type ChatMode = 'loading' | 'guest' | 'account'

const GUEST_NOTICE = '当前为临时对话，刷新后不会保留。登录后只保存新的对话。'
const EXPIRED_NOTICE = '登录已过期，已切换为临时对话；新的内容不会保存。'
const PENDING_GENERATIONS_KEY = 'pan-chat-pending-generations-v1'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const mode = ref<ChatMode>('loading')
  const currentSessionId = ref<string | null>(null)
  const relationshipOverview = ref<RelationshipOverview | null>(null)
  const realNameVerificationStatus = ref<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | null>(null)
  const sending = ref(false)
  const feedbackSubmittingId = ref<string | null>(null)
  const loadingEarlier = ref(false)
  const hasEarlierMessages = ref(false)
  const error = ref<string | null>(null)
  const guestNotice = ref(GUEST_NOTICE)
  let currentController: AbortController | null = null
  let currentAssistantId: string | null = null
  let abortedByUser = false
  let nextMessageCursor: string | null = null
  let currentGenerationId: string | null = null

  const loading = computed(() => mode.value === 'loading')
  const isGuest = computed(() => mode.value === 'guest')
  const feedbackEnabled = computed(() => mode.value === 'account')
  const loginHref = computed(() => '/?login=1&next=%2Fchat%2F')
  const identityHref = computed(() => '/?identity=1')
  const personalizationEnabled = computed(() => realNameVerificationStatus.value === 'APPROVED')
  const personalizationNotice = computed(() => {
    if (realNameVerificationStatus.value === 'PENDING') return '实名认证正在审核。通过后将启用个人记忆和个人主页。'
    if (realNameVerificationStatus.value === 'REJECTED') return '实名认证未通过。重新提交后可继续审核。'
    return '完成实名认证并通过审核后，将启用个人记忆和个人主页。'
  })
  const continuityLabel = computed(() => formatContinuityLabel(
    relationshipOverview.value?.lastInteractionAt ?? null,
    mode.value,
  ))

  onMounted(initialize)

  async function initialize() {
    mode.value = 'loading'
    error.value = null

    try {
      const user = await getCurrentUser()
      if (!user) {
        enterGuestMode(GUEST_NOTICE)
        return
      }

      mode.value = 'account'
      realNameVerificationStatus.value = user.realNameVerificationStatus
      const sessions = await listSessions()
      const overview = personalizationEnabled.value ? await relationshipApi.overview() : null
      relationshipOverview.value = overview
      const latestSession = sessions[0]

      if (!latestSession) {
        messages.value = []
        currentSessionId.value = null
        return
      }

      currentSessionId.value = latestSession.id
      const page = await listMessages(latestSession.id)
      messages.value = page.items.map(toChatMessage)
      nextMessageCursor = page.nextCursor
      hasEarlierMessages.value = page.hasMore
      await recoverPendingGeneration(latestSession.id)
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        return
      }

      enterGuestMode(GUEST_NOTICE)
      error.value = caught instanceof Error ? caught.message : '暂时无法读取登录状态。'
    }
  }

  async function sendMessage(rawContent: string, attachment: ChatAttachmentInput | null = null) {
    if (attachment && mode.value !== 'account') {
      error.value = '登录后才能发送文件和图片。'
      return
    }
    const content = normalizeMessageContent(rawContent)
    if ((isEmptyMessage(content) && !attachment) || sending.value || loading.value) return

    if (content && isMessageTooLong(content)) {
      error.value = '消息太长了，请缩短后再发送。'
      return
    }

    error.value = null
    const clientMessageId = createUuid()
    const userMessage = createTemporaryMessage('user', content, 'completed', clientMessageId, attachment)
    const assistantMessage = createTemporaryMessage('assistant', '', 'pending')
    messages.value = [...messages.value, userMessage, assistantMessage]
    await runGeneration(assistantMessage.id, async (signal) => {
      if (mode.value === 'account') {
        await streamAccountMessage(
          content, clientMessageId, userMessage.id, assistantMessage.id, signal, attachment,
        )
      } else {
        await streamGuestMessage(assistantMessage.id, buildGuestHistory(), signal)
      }
    })
  }

  async function loadEarlierMessages() {
    if (mode.value !== 'account' || !currentSessionId.value || !nextMessageCursor
      || !hasEarlierMessages.value || loadingEarlier.value) return
    const requestedCursor = nextMessageCursor
    loadingEarlier.value = true
    try {
      const page = await listMessages(currentSessionId.value, requestedCursor)
      const merged = [...page.items.map(toChatMessage), ...messages.value]
      const seen = new Set<string>()
      messages.value = merged.filter((message) => {
        if (seen.has(message.id)) return false
        seen.add(message.id)
        return true
      })
      nextMessageCursor = page.nextCursor
      hasEarlierMessages.value = page.hasMore
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : '更早的消息加载失败。'
    } finally {
      loadingEarlier.value = false
    }
  }

  async function recoverPendingGeneration(sessionId: string) {
    const stored = readPendingGenerations()
      .filter((item) => item.sessionId === sessionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .at(-1)
    const pendingMessage = [...messages.value].reverse().find(message =>
      message.role === 'assistant' && ['pending', 'streaming'].includes(message.status)
      && message.generationId,
    )
    if (!stored && !pendingMessage?.generationId) return
    try {
      const snapshot = stored?.generationId
        ? await getGeneration(stored.generationId)
          : stored
          ? await createPersistentGeneration(
              sessionId, stored.clientMessageId, stored.content, stored.attachmentId,
            )
          : await getGeneration(pendingMessage!.generationId!)
      if (stored) savePendingGeneration({ ...stored, generationId: snapshot.generationId })
      mergeGenerationSnapshot(snapshot, null, null)
      if (isTerminal(snapshot)) {
        removePendingGeneration(snapshot.generationId)
        return
      }
      const assistantId = snapshot.assistantMessages[0]?.id ?? createId('recovering')
      currentGenerationId = snapshot.generationId
      await runGeneration(assistantId, signal => observeWithRecovery(snapshot.generationId, signal))
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : '正在生成的回复暂时无法恢复。'
    }
  }

  async function regenerateMessage(messageId: string) {
    if (sending.value || loading.value) return
    const targetIndex = messages.value.findIndex((message) => message.id === messageId)
    if (targetIndex < 0) return

    let generationStartIndex = targetIndex
    while (generationStartIndex > 0 && messages.value[generationStartIndex - 1]?.role === 'assistant') {
      generationStartIndex -= 1
    }
    const generationTarget = messages.value[generationStartIndex]
    if (!generationTarget || generationTarget.role !== 'assistant') return

    const history = messages.value.slice(0, generationStartIndex)
    messages.value = messages.value.filter((_, index) =>
      index < generationStartIndex || index > targetIndex,
    )
    updateMessage(generationTarget.id, {
      content: '',
      status: 'pending',
      errorMessage: undefined,
      feedback: undefined,
    })

    await runGeneration(generationTarget.id, async (signal) => {
      if (mode.value === 'account') {
        if (!currentSessionId.value) throw new Error('当前对话不存在，请重新发送消息。')
        await streamAccountRegeneration(generationTarget.id, signal)
      } else {
        const legacyHistory = history
          .filter((message) => message.status === 'completed')
          .map(({ role, content }) => ({ role, content }))
        await streamGuestMessage(generationTarget.id, legacyHistory, signal)
      }
    })
  }

  async function runGeneration(
    assistantId: string,
    operation: (signal: AbortSignal) => Promise<void>,
  ) {
    sending.value = true
    abortedByUser = false
    currentAssistantId = assistantId
    currentController = new AbortController()

    try {
      await operation(currentController.signal)
    } catch (caught) {
      if (mode.value === 'account' && isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        error.value = '登录状态已失效，请重新登录后继续保存对话。'
        return
      }

      if (abortedByUser) {
        if (currentAssistantId) {
          const partial = messages.value.find((message) => message.id === currentAssistantId)?.content
          updateMessage(currentAssistantId, {
            content: partial || '已停止生成。',
            status: 'stopped',
          })
        }
        return
      }

      if (caught instanceof PendingConfirmationError) {
        error.value = caught.message
        if (currentAssistantId) {
          updateMessage(currentAssistantId, {
            content: '正在确认发送状态，恢复网络或刷新页面后会自动对账。',
            status: 'pending',
          })
        }
        return
      }

      const streamError = caught instanceof SseEventError
        ? caught.payload as ChatStreamErrorEvent
        : null
      if (streamError?.assistantMessage) {
        const failedMessage = toChatMessage(streamError.assistantMessage)
        replaceMessage(currentAssistantId ?? failedMessage.id, [failedMessage])
        currentAssistantId = streamError.assistantMessage.id
      }
      const message = caught instanceof Error ? caught.message : '消息发送失败，请稍后再试。'
      error.value = message
      if (currentAssistantId) {
        const partial = messages.value.find((item) => item.id === currentAssistantId)?.content
        updateMessage(currentAssistantId, {
          content: partial || '消息生成失败，请稍后再试。',
          status: 'failed',
          errorMessage: message,
        })
      }
    } finally {
      sending.value = false
      if (mode.value === 'account') {
        relationshipOverview.value = relationshipOverview.value
          ? { ...relationshipOverview.value, lastInteractionAt: new Date().toISOString() }
          : null
      }
      currentController = null
      currentAssistantId = null
      currentGenerationId = null
    }
  }

  async function streamGuestMessage(
    assistantId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    signal: AbortSignal,
  ) {
    await streamLegacyChat({ messages: history }, (event, payload) => {
      if (event === 'delta') {
        const { delta } = payload as ChatStreamDeltaEvent
        appendDelta(assistantId, delta)
      }
      if (event === 'done') {
        const response = payload as LegacyChatResponse
        const timestamp = Date.now()
        const assistantMessages = normalizeAssistantContents(response.answers, response.answer)
          .map((content, index) => {
            const presentation = parseMessagePresentation(content)
            return {
              id: index === 0 ? assistantId : createId('msg'),
              role: 'assistant' as const,
              content,
              status: 'completed' as const,
              createdAt: new Date(timestamp + index).toISOString(),
              ...presentation,
            }
          })
        replaceMessage(assistantId, assistantMessages)
      }
    }, signal)
  }

  async function streamAccountMessage(
    content: string,
    clientMessageId: string,
    temporaryUserId: string,
    temporaryAssistantId: string,
    signal: AbortSignal,
    attachment: ChatAttachmentInput | null = null,
  ) {
    if (!currentSessionId.value) currentSessionId.value = (await createSession()).id
    const pending: PendingGeneration = {
      sessionId: currentSessionId.value,
      clientMessageId,
      content,
      createdAt: new Date().toISOString(),
      generationId: null,
      attachmentId: attachment?.attachmentId ?? null,
    }
    savePendingGeneration(pending)
    let snapshot: ChatGenerationSnapshot | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3 && !signal.aborted; attempt += 1) {
      try {
        snapshot = await createPersistentGeneration(
          currentSessionId.value, clientMessageId, content, attachment?.attachmentId, signal,
        )
        break
      } catch (caught) {
        if (isUnauthorizedError(caught) || signal.aborted) throw caught
        lastError = caught
        if (attempt < 2) await delay(700, signal)
      }
    }
    if (!snapshot) {
      throw new PendingConfirmationError(
        lastError instanceof Error
          ? `发送结果尚未确认：${lastError.message}`
          : '发送结果尚未确认，恢复网络或刷新页面后会自动对账。',
      )
    }
    currentGenerationId = snapshot.generationId
    savePendingGeneration({ ...pending, generationId: snapshot.generationId })
    mergeGenerationSnapshot(snapshot, temporaryUserId, temporaryAssistantId)
    await observeWithRecovery(snapshot.generationId, signal)
  }

  async function streamAccountRegeneration(messageId: string, signal: AbortSignal) {
    if (!currentSessionId.value) return
    const clientRequestId = createUuid()
    let snapshot: ChatGenerationSnapshot | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3 && !signal.aborted; attempt += 1) {
      try {
        snapshot = await createPersistentRegeneration(
          currentSessionId.value, messageId, clientRequestId, signal,
        )
        break
      } catch (caught) {
        if (isUnauthorizedError(caught) || signal.aborted) throw caught
        lastError = caught
        if (attempt < 2) await delay(700, signal)
      }
    }
    if (!snapshot) {
      throw new PendingConfirmationError(
        lastError instanceof Error ? lastError.message : '重新生成请求尚未确认，请稍后重试。',
      )
    }
    currentGenerationId = snapshot.generationId
    mergeGenerationSnapshot(snapshot, null, messageId)
    await observeWithRecovery(snapshot.generationId, signal)
  }

  async function observeWithRecovery(generationId: string, signal: AbortSignal) {
    let reconnects = 0
    while (!signal.aborted) {
      try {
        await observeGeneration(generationId, (event, payload) => {
          if (event !== 'generation') return
          const snapshot = payload as ChatGenerationSnapshot
          mergeGenerationSnapshot(snapshot, null, null)
          if (isTerminal(snapshot)) removePendingGeneration(generationId)
        }, signal)
        const snapshot = await getGeneration(generationId)
        mergeGenerationSnapshot(snapshot, null, null)
        if (isTerminal(snapshot)) {
          removePendingGeneration(generationId)
          return
        }
      } catch (caught) {
        if (signal.aborted) throw caught
        const snapshot = await getGeneration(generationId).catch(() => null)
        if (snapshot) {
          mergeGenerationSnapshot(snapshot, null, null)
          if (isTerminal(snapshot)) {
            removePendingGeneration(generationId)
            return
          }
        }
      }
      reconnects += 1
      error.value = `连接暂时中断，正在恢复${reconnects > 1 ? `（${reconnects}）` : ''}…`
      await delay(700, signal)
    }
  }

  function mergeGenerationSnapshot(
    snapshot: ChatGenerationSnapshot,
    temporaryUserId: string | null,
    temporaryAssistantId: string | null,
  ) {
    const userMessage = snapshot.userMessage ? toChatMessage(snapshot.userMessage) : null
    const assistants = snapshot.assistantMessages.map(toChatMessage)
    const incoming = [...(userMessage ? [userMessage] : []), ...assistants]
    if (!incoming.length) return
    const incomingIds = new Set(incoming.map((message) => message.id))
    let insertionIndex = messages.value.findIndex((message) =>
      message.id === temporaryUserId || message.id === temporaryAssistantId || incomingIds.has(message.id)
      || Boolean(userMessage?.clientMessageId && message.clientMessageId === userMessage.clientMessageId),
    )
    if (insertionIndex < 0) insertionIndex = messages.value.length
    const retained = messages.value.filter((message) =>
      message.id !== temporaryUserId && message.id !== temporaryAssistantId && !incomingIds.has(message.id)
      && !(userMessage?.clientMessageId && message.clientMessageId === userMessage.clientMessageId),
    )
    const safeIndex = Math.min(insertionIndex, retained.length)
    messages.value = [...retained.slice(0, safeIndex), ...incoming, ...retained.slice(safeIndex)]
    const assistant = assistants.at(-1)
    if (assistant) currentAssistantId = assistant.id
    if (snapshot.status === 'FAILED') error.value = '消息生成失败，可以重新生成。'
    if (snapshot.status === 'COMPLETED') error.value = null
  }

  function buildGuestHistory() {
    return messages.value
      .filter((message) => message.status === 'completed')
      .map(({ role, content }) => ({ role, content }))
  }

  function appendDelta(messageId: string, delta: string) {
    const current = messages.value.find((message) => message.id === messageId)
    if (!current) return
    updateMessage(messageId, { content: current.content + delta, status: 'streaming' })
  }

  async function rateMessage(messageId: string, rating: FeedbackRating) {
    await submitFeedback(messageId, { rating })
  }

  async function submitProblemFeedback(messageId: string, categories: string[], comment: string) {
    await submitFeedback(messageId, { rating: 'dislike', categories, comment })
  }

  async function submitFeedback(messageId: string, feedback: MessageFeedbackInput) {
    if (mode.value !== 'account' || !currentSessionId.value) {
      error.value = '登录后才能提交评价和问题反馈。'
      return
    }
    if (feedbackSubmittingId.value) return

    const original = messages.value.find((message) => message.id === messageId)?.feedback
    feedbackSubmittingId.value = messageId
    error.value = null
    updateMessage(messageId, {
      feedback: {
        rating: feedback.rating,
        categories: feedback.categories ?? [],
        comment: feedback.comment,
      },
    })
    try {
      const saved = await saveMessageFeedback(currentSessionId.value, messageId, feedback)
      updateMessage(messageId, { feedback: saved.feedback })
    } catch (caught) {
      updateMessage(messageId, { feedback: original })
      if (isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        error.value = '登录状态已失效，反馈未提交。'
        return
      }
      error.value = caught instanceof Error ? caught.message : '反馈提交失败，请稍后再试。'
    } finally {
      feedbackSubmittingId.value = null
    }
  }

  function stopGenerating() {
    if (!sending.value || !currentController) return
    abortedByUser = true
    if (currentGenerationId) {
      void stopGeneration(currentGenerationId).then(snapshot => {
        mergeGenerationSnapshot(snapshot, null, null)
        removePendingGeneration(snapshot.generationId)
      }).catch(() => undefined)
    }
    currentController.abort()
  }

  function enterGuestMode(notice: string) {
    mode.value = 'guest'
    currentSessionId.value = null
    relationshipOverview.value = null
    realNameVerificationStatus.value = null
    messages.value = []
    nextMessageCursor = null
    hasEarlierMessages.value = false
    guestNotice.value = notice
  }

  function createTemporaryMessage(
    role: ChatMessage['role'],
    content: string,
    status: ChatMessage['status'],
    clientMessageId?: string,
    attachment?: ChatAttachmentInput | null,
  ): ChatMessage {
    return {
      id: createId('msg'), role, content, status, createdAt: new Date().toISOString(), clientMessageId,
      contentType: attachment ? attachment.kind : undefined,
      attachment: attachment ? {
        kind: attachment.kind,
        name: attachment.name,
        size: attachment.size,
        mime: attachment.mime,
        durationMs: attachment.durationMs,
        url: '',
      } : undefined,
    }
  }

  function updateMessage(messageId: string, patch: Partial<ChatMessage>) {
    messages.value = messages.value.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    )
  }

  function replaceMessage(messageId: string, replacements: ChatMessage[]) {
    messages.value = messages.value.flatMap((message) =>
      message.id === messageId ? replacements : [message],
    )
  }

  function toChatMessage(message: PersistedChatMessage): ChatMessage {
    return {
      id: message.id,
      clientMessageId: message.clientMessageId,
      generationId: message.generationId,
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
      contentType: message.contentType,
      stickerKey: message.stickerKey,
      origin: message.origin,
      errorMessage: message.errorMessage,
      feedback: message.feedback,
      metadata: message.metadata,
      attachment: message.attachmentUrl ? {
        kind: message.attachmentKind as ChatAttachmentInput['kind'],
        name: message.attachmentName ?? '附件',
        size: message.attachmentSize ?? 0,
        mime: message.attachmentMime ?? 'application/octet-stream',
        durationMs: message.attachmentDurationMs,
        url: message.attachmentUrl,
      } : undefined,
    }
  }

  return {
    messages,
    sending,
    loading,
    isGuest,
    continuityLabel,
    feedbackEnabled,
    feedbackSubmittingId,
    loadingEarlier,
    hasEarlierMessages,
    error,
    guestNotice,
    loginHref,
    identityHref,
    personalizationEnabled,
    personalizationNotice,
    sendMessage,
    loadEarlierMessages,
    regenerateMessage,
    rateMessage,
    submitProblemFeedback,
    stopGenerating,
  }
}

interface PendingGeneration {
  sessionId: string
  clientMessageId: string
  content: string
  createdAt: string
  generationId: string | null
  attachmentId: string | null
}

class PendingConfirmationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PendingConfirmationError'
  }
}

function readPendingGenerations(): PendingGeneration[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_GENERATIONS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePendingGeneration(pending: PendingGeneration) {
  const existing = readPendingGenerations().filter((item) =>
    item.clientMessageId !== pending.clientMessageId && item.generationId !== pending.generationId,
  )
  try {
    localStorage.setItem(PENDING_GENERATIONS_KEY, JSON.stringify([...existing, pending].slice(-10)))
  } catch {
    // Private browsing or a full storage quota must not block message delivery.
  }
}

function removePendingGeneration(generationId: string) {
  try {
    localStorage.setItem(PENDING_GENERATIONS_KEY, JSON.stringify(
      readPendingGenerations().filter((item) => item.generationId !== generationId),
    ))
  } catch {
    // Reconciliation still works from the server-side pending assistant message.
  }
}

function isTerminal(snapshot: ChatGenerationSnapshot) {
  return ['COMPLETED', 'FAILED', 'STOPPED'].includes(snapshot.status)
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

function parseMessagePresentation(content: string): Pick<ChatMessage, 'contentType' | 'stickerKey'> {
  const match = content.trim().match(/^\[\[sticker:(lulu|pudding-dog|crab)]]$/)
  return match
    ? { contentType: 'STICKER', stickerKey: match[1] as ChatMessage['stickerKey'] }
    : { contentType: 'TEXT' }
}

function formatContinuityLabel(lastInteractionAt: string | null, mode: ChatMode) {
  if (mode === 'loading') return '正在回来'
  if (mode === 'guest') return '临时聊天'
  if (!lastInteractionAt) return '一直在这里'

  const elapsedMs = Math.max(0, Date.now() - new Date(lastInteractionAt).getTime())
  const minutes = Math.floor(elapsedMs / 60_000)
  const hours = Math.floor(elapsedMs / 3_600_000)
  const days = Math.floor(elapsedMs / 86_400_000)
  if (minutes < 2) return '刚刚聊过'
  if (minutes < 60) return `${minutes} 分钟前聊过`
  if (hours < 24) return `${hours} 小时前聊过`
  if (days < 30) return `${days} 天前聊过`
  return '好久不见'
}
