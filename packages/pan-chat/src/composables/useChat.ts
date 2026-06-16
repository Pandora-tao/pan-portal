import { ref } from 'vue'
import { sendLegacyChat } from '../api/chat'
import type { ChatMessage, CurrentChatState } from '../types/chat'
import { createId } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const error = ref<CurrentChatState['error']>(null)
  const streamError = ref<string | null>(null)
  const streaming = ref(false)
  let currentController: AbortController | null = null
  let abortedByUser = false

  function clearError() {
    error.value = null
    streamError.value = null
  }

  function sendMessageStream(rawContent: string) {
    return sendMessage(rawContent)
  }

  async function sendMessage(rawContent: string) {
    const content = normalizeMessageContent(rawContent)

    if (isEmptyMessage(content)) {
      return
    }

    if (isMessageTooLong(content)) {
      error.value = '消息太长了，请缩短后再发送。'
      return
    }

    if (sending.value) {
      return
    }

    error.value = null
    streamError.value = null
    const userMessage: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content,
      status: 'completed',
      createdAt: new Date().toISOString(),
    }
    messages.value = [...messages.value, userMessage]

    const legacyMessages = messages.value
      .filter((message) => message.status === 'completed')
      .map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }))

    const assistantMessage: ChatMessage = {
      id: createId('msg'),
      role: 'assistant',
      content: '正在想怎么回你...',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    messages.value = [...messages.value, assistantMessage]
    sending.value = true
    abortedByUser = false
    currentController = new AbortController()

    try {
      const response = await sendLegacyChat(
        {
          messages: legacyMessages,
        },
        currentController.signal,
      )

      updateMessage(assistantMessage.id, {
        content: response.answer,
        status: 'completed',
      })
    } catch (err) {
      if (abortedByUser) {
        updateMessage(assistantMessage.id, {
          content: '已停止生成。',
          status: 'stopped',
        })
        return
      }

      const message = err instanceof Error ? err.message : '消息发送失败，请稍后再试。'
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

  function stopGenerating() {
    if (!sending.value || !currentController) {
      return
    }

    abortedByUser = true
    currentController.abort()
  }

  function regenerateMessage() {
    const lastAssistant = [...messages.value].reverse().find((message) => message.role === 'assistant')
    const lastUser = [...messages.value].reverse().find((message) => message.role === 'user')

    if (!lastAssistant || !lastUser || sending.value) {
      return
    }

    messages.value = messages.value.filter((message) => message.id !== lastAssistant.id)
    void sendMessage(lastUser.content)
  }

  function clearMessages() {
    stopGenerating()
    messages.value = []
    clearError()
  }

  function updateMessage(messageId: string, patch: Partial<ChatMessage>) {
    messages.value = messages.value.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    )
  }

  return {
    messages,
    sending,
    streaming,
    error,
    streamError,
    sendMessage,
    sendMessageStream,
    stopGenerating,
    regenerateMessage,
    clearError,
    clearMessages,
  }
}
