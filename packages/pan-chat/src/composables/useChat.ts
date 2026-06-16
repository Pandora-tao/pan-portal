import { ref } from 'vue'
import { sendLegacyChat } from '../api/chat'
import type { ChatMessage, CurrentChatState } from '../types/chat'
import { createId } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'
import { useChatSessions } from './useChatSessions'
import { useChatStream } from './useChatStream'

export function useChat() {
  const {
    sessions,
    currentSessionId,
    currentMessages: messages,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    appendMessageToCurrentSession,
    updateMessageInCurrentSession,
  } = useChatSessions()
  const sending = ref(false)
  const error = ref<CurrentChatState['error']>(null)

  const {
    streaming,
    error: streamError,
    clearError: clearStreamError,
    sendMessageStream,
    stopGenerating,
    regenerateMessage,
  } = useChatStream()

  function clearError() {
    error.value = null
    clearStreamError()
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
    const userMessage: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content,
      status: 'completed',
      createdAt: new Date().toISOString(),
    }
    appendMessageToCurrentSession(userMessage)

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
    appendMessageToCurrentSession(assistantMessage)
    sending.value = true

    try {
      const response = await sendLegacyChat({
        messages: legacyMessages,
      })

      updateMessageInCurrentSession(assistantMessage.id, {
        content: response.answer,
        status: 'completed',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '消息发送失败，请稍后再试。'
      error.value = message
      updateMessageInCurrentSession(assistantMessage.id, {
        content: '消息发送失败，请稍后再试。',
        status: 'failed',
        errorMessage: message,
      })
    } finally {
      sending.value = false
    }
  }

  return {
    sessions,
    currentSessionId,
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
    createSession,
    selectSession,
    deleteSession,
    renameSession,
  }
}
