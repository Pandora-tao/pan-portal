import { computed, onMounted, ref } from 'vue'
import { streamLegacyChat } from '../api/chat'
import {
  createSession,
  getCurrentUser,
  listMessages,
  listSessions,
  regenerateSessionMessage,
  saveMessageFeedback,
  streamSessionMessage,
} from '../api/chatPersistence'
import { relationshipApi } from '../api/relationship'
import { isUnauthorizedError } from '../api/request'
import { SseEventError } from '../api/sse'
import type {
  ChatMessage,
  ChatStreamDeltaEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamStartEvent,
  FeedbackRating,
  LegacyChatResponse,
  MessageFeedbackInput,
  PersistedChatMessage,
} from '../types/chat'
import type { RelationshipOverview } from '../types/relationship'
import { normalizeAssistantContents } from '../utils/assistantMessages'
import { createId } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'

type ChatMode = 'loading' | 'guest' | 'account'

const GUEST_NOTICE = '当前为临时对话，刷新后不会保留。登录后只保存新的对话。'
const EXPIRED_NOTICE = '登录已过期，已切换为临时对话；新的内容不会保存。'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const mode = ref<ChatMode>('loading')
  const currentSessionId = ref<string | null>(null)
  const relationshipOverview = ref<RelationshipOverview | null>(null)
  const sending = ref(false)
  const feedbackSubmittingId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const guestNotice = ref(GUEST_NOTICE)
  let currentController: AbortController | null = null
  let currentAssistantId: string | null = null
  let abortedByUser = false

  const loading = computed(() => mode.value === 'loading')
  const isGuest = computed(() => mode.value === 'guest')
  const feedbackEnabled = computed(() => mode.value === 'account')
  const loginHref = computed(() => '/?login=1&next=%2Fchat%2F')
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
      const [sessions, overview] = await Promise.all([
        listSessions(),
        relationshipApi.overview(),
      ])
      relationshipOverview.value = overview
      const latestSession = sessions[0]

      if (!latestSession) {
        messages.value = []
        currentSessionId.value = null
        return
      }

      currentSessionId.value = latestSession.id
      try {
        const proactive = await relationshipApi.checkProactive()
        const lastProactive = proactive.messages.at(-1)
        if (lastProactive) {
          relationshipOverview.value = {
            ...overview,
            lastInteractionAt: lastProactive.createdAt,
          }
        }
      } catch {
        // 主动联系只是增强能力，不能阻断用户进入已有聊天。
      }
      messages.value = (await listMessages(latestSession.id)).map(toChatMessage)
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        return
      }

      enterGuestMode(GUEST_NOTICE)
      error.value = caught instanceof Error ? caught.message : '暂时无法读取登录状态。'
    }
  }

  async function sendMessage(rawContent: string) {
    const content = normalizeMessageContent(rawContent)
    if (isEmptyMessage(content) || sending.value || loading.value) return

    if (isMessageTooLong(content)) {
      error.value = '消息太长了，请缩短后再发送。'
      return
    }

    error.value = null
    const userMessage = createTemporaryMessage('user', content, 'completed')
    const assistantMessage = createTemporaryMessage('assistant', '', 'pending')
    messages.value = [...messages.value, userMessage, assistantMessage]
    await runGeneration(assistantMessage.id, async (signal) => {
      if (mode.value === 'account') {
        await streamAccountMessage(content, userMessage.id, assistantMessage.id, signal)
      } else {
        await streamGuestMessage(assistantMessage.id, buildGuestHistory(), signal)
      }
    })
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
    temporaryUserId: string,
    temporaryAssistantId: string,
    signal: AbortSignal,
  ) {
    if (!currentSessionId.value) currentSessionId.value = (await createSession()).id
    await streamSessionMessage(currentSessionId.value, content, (event, payload) => {
      handleAccountStreamEvent(event, payload, temporaryUserId, temporaryAssistantId)
    }, signal)
  }

  async function streamAccountRegeneration(messageId: string, signal: AbortSignal) {
    if (!currentSessionId.value) return
    await regenerateSessionMessage(currentSessionId.value, messageId, (event, payload) => {
      handleAccountStreamEvent(event, payload, null, messageId)
    }, signal)
  }

  function handleAccountStreamEvent(
    event: string,
    payload: unknown,
    temporaryUserId: string | null,
    temporaryAssistantId: string,
  ) {
    if (event === 'start') {
      const start = payload as ChatStreamStartEvent
      const assistant = toChatMessage(start.assistantMessage)
      currentAssistantId = assistant.id
      messages.value = messages.value.flatMap((message) => {
        if (temporaryUserId && message.id === temporaryUserId && start.userMessage) {
          return [toChatMessage(start.userMessage)]
        }
        if (message.id === temporaryAssistantId) return [assistant]
        return [message]
      })
    }
    if (event === 'delta') {
      const delta = payload as ChatStreamDeltaEvent
      appendDelta(delta.messageId ?? currentAssistantId ?? temporaryAssistantId, delta.delta)
    }
    if (event === 'done') {
      const done = payload as ChatStreamDoneEvent
      if (currentAssistantId) {
        replaceMessage(currentAssistantId, done.assistantMessages.map(toChatMessage))
      }
    }
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
    currentController.abort()
  }

  function enterGuestMode(notice: string) {
    mode.value = 'guest'
    currentSessionId.value = null
    relationshipOverview.value = null
    messages.value = []
    guestNotice.value = notice
  }

  function createTemporaryMessage(
    role: ChatMessage['role'],
    content: string,
    status: ChatMessage['status'],
  ): ChatMessage {
    return { id: createId('msg'), role, content, status, createdAt: new Date().toISOString() }
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
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
      contentType: message.contentType,
      stickerKey: message.stickerKey,
      origin: message.origin,
      errorMessage: message.errorMessage,
      feedback: message.feedback,
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
    error,
    guestNotice,
    loginHref,
    sendMessage,
    regenerateMessage,
    rateMessage,
    submitProblemFeedback,
    stopGenerating,
  }
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
