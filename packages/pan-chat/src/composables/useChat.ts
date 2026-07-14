import { computed, onMounted, ref } from 'vue'
import { sendLegacyChat } from '../api/chat'
import {
  createSession,
  deleteAllSessions,
  getCurrentUser,
  listMessages,
  listSessions,
  sendSessionMessage,
} from '../api/chatPersistence'
import { isUnauthorizedError } from '../api/request'
import type { ChatMessage, PersistedChatMessage } from '../types/chat'
import { createId } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'

type ChatMode = 'loading' | 'guest' | 'account'

const GUEST_NOTICE = '当前为临时对话，刷新后不会保留。登录后只保存新的对话。'
const EXPIRED_NOTICE = '登录已过期，已切换为临时对话；新的内容不会保存。'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const mode = ref<ChatMode>('loading')
  const currentSessionId = ref<string | null>(null)
  const sending = ref(false)
  const clearing = ref(false)
  const error = ref<string | null>(null)
  const guestNotice = ref(GUEST_NOTICE)
  let currentController: AbortController | null = null
  let abortedByUser = false

  const loading = computed(() => mode.value === 'loading')
  const isGuest = computed(() => mode.value === 'guest')
  const loginHref = computed(() => '/?login=1&next=%2Fchat%2F')

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
      const sessions = await listSessions()
      const latestSession = sessions[0]

      if (!latestSession) {
        messages.value = []
        currentSessionId.value = null
        return
      }

      currentSessionId.value = latestSession.id
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
    const assistantMessage = createTemporaryMessage('assistant', '正在想怎么回你...', 'pending')
    messages.value = [...messages.value, userMessage, assistantMessage]
    sending.value = true
    abortedByUser = false
    currentController = new AbortController()

    try {
      if (mode.value === 'account') {
        await sendAccountMessage(content, userMessage.id, assistantMessage.id, currentController.signal)
      } else {
        await sendGuestMessage(assistantMessage.id, currentController.signal)
      }
    } catch (caught) {
      if (mode.value === 'account' && isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        error.value = '登录状态已失效，请重新登录后继续保存对话。'
        return
      }

      if (abortedByUser) {
        updateMessage(assistantMessage.id, { content: '已停止生成。', status: 'stopped' })
        return
      }

      const message = caught instanceof Error ? caught.message : '消息发送失败，请稍后再试。'
      error.value = message
      updateMessage(assistantMessage.id, {
        content: '消息发送失败，请稍后再试。',
        status: 'failed',
        errorMessage: message,
      })
    } finally {
      sending.value = false
      currentController = null
    }
  }

  async function sendGuestMessage(assistantId: string, signal: AbortSignal) {
    const legacyMessages = messages.value
      .filter((message) => message.status === 'completed')
      .map(({ role, content }) => ({ role, content }))
    const response = await sendLegacyChat({ messages: legacyMessages }, signal)
    updateMessage(assistantId, { content: response.answer, status: 'completed' })
  }

  async function sendAccountMessage(
    content: string,
    temporaryUserId: string,
    temporaryAssistantId: string,
    signal: AbortSignal,
  ) {
    if (!currentSessionId.value) {
      currentSessionId.value = (await createSession()).id
    }

    const response = await sendSessionMessage(currentSessionId.value, content, signal)
    messages.value = messages.value.map((message) => {
      if (message.id === temporaryUserId) return toChatMessage(response.userMessage)
      if (message.id === temporaryAssistantId) return toChatMessage(response.assistantMessage)
      return message
    })
  }

  function stopGenerating() {
    if (!sending.value || !currentController) return
    abortedByUser = true
    currentController.abort()
  }

  async function clearMessages() {
    if (sending.value || clearing.value) return

    if (mode.value === 'guest') {
      messages.value = []
      error.value = null
      return
    }

    if (mode.value !== 'account') return
    if (!window.confirm('确认永久删除账号中的全部聊天记录吗？此操作无法恢复。')) return

    clearing.value = true
    error.value = null
    try {
      await deleteAllSessions()
      messages.value = []
      currentSessionId.value = null
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        enterGuestMode(EXPIRED_NOTICE)
        error.value = '登录状态已失效，未执行账号记录删除。'
        return
      }
      error.value = caught instanceof Error ? caught.message : '清空失败，请稍后再试。'
    } finally {
      clearing.value = false
    }
  }

  function enterGuestMode(notice: string) {
    mode.value = 'guest'
    currentSessionId.value = null
    messages.value = []
    guestNotice.value = notice
  }

  function createTemporaryMessage(
    role: ChatMessage['role'],
    content: string,
    status: ChatMessage['status'],
  ): ChatMessage {
    return {
      id: createId('msg'),
      role,
      content,
      status,
      createdAt: new Date().toISOString(),
    }
  }

  function updateMessage(messageId: string, patch: Partial<ChatMessage>) {
    messages.value = messages.value.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    )
  }

  function toChatMessage(message: PersistedChatMessage): ChatMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
      errorMessage: message.errorMessage,
    }
  }

  return {
    messages,
    sending,
    clearing,
    loading,
    isGuest,
    error,
    guestNotice,
    loginHref,
    sendMessage,
    stopGenerating,
    clearMessages,
  }
}
