import { ref } from 'vue'
import { sendStreamChat } from '../api/chatSSE'
import type { ChatMessage } from '../types/chat'
import { createId } from '../utils/id'
import { isEmptyMessage, isMessageTooLong, normalizeMessageContent } from '../utils/text'
import { useAbortController } from './useAbortController'
import { useChatSessions } from './useChatSessions'

export function useChatStream() {
  const {
    currentSessionId,
    currentMessages,
    messagesMap,
    appendMessageToCurrentSession,
    updateMessageInCurrentSession,
    updateCurrentSessionTitleFromFirstMessage,
    setCurrentMessages,
  } = useChatSessions()

  const { create: createSignal, abort, isAborted } = useAbortController()
  const streaming = ref(false)
  const error = ref<string | null>(null)

  function clearError() {
    error.value = null
  }

  async function sendMessageStream(rawContent: string) {
    const content = normalizeMessageContent(rawContent)

    if (isEmptyMessage(content)) {
      return
    }

    if (isMessageTooLong(content)) {
      error.value = '消息太长了，请缩短后再发送。'
      return
    }

    if (streaming.value) {
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

    const assistantId = createId('msg')
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    }
    appendMessageToCurrentSession(assistantMessage)

    streaming.value = true
    const signal = createSignal()

    const legacyMessages = currentMessages.value
      .filter((msg) => msg.status === 'completed' || msg.status === 'streaming')
      .filter((msg) => msg.id !== assistantId)
      .map(({ role, content: msgContent }) => ({ role, content: msgContent }))

    let accumulatedContent = ''
    let doneReceived = false

    try {
      const sid = currentSessionId.value
      if (!sid) {
        throw new Error('没有当前会话')
      }

      await sendStreamChat(
        sid,
        { messages: legacyMessages },
        {
          onMessageCreated: () => {
            // 后端已创建消息，前端已插入占位，无需额外处理
          },
          onDelta: (data) => {
            accumulatedContent += data.content
            updateMessageInCurrentSession(assistantId, {
              content: accumulatedContent,
            })
          },
          onDone: () => {
            doneReceived = true
            updateMessageInCurrentSession(assistantId, {
              content: accumulatedContent,
              status: 'completed',
            })
            updateCurrentSessionTitleFromFirstMessage()
          },
          onError: (data) => {
            error.value = data.error
            updateMessageInCurrentSession(assistantId, {
              content: accumulatedContent || '流式响应出现错误，请稍后再试。',
              status: 'failed',
              errorMessage: data.error,
            })
          },
        },
        signal,
      )

      // 流正常结束但没有收到 done 事件
      if (!doneReceived) {
        if (accumulatedContent) {
          updateMessageInCurrentSession(assistantId, {
            content: accumulatedContent,
            status: 'completed',
          })
          updateCurrentSessionTitleFromFirstMessage()
        } else {
          updateMessageInCurrentSession(assistantId, {
            content: '未收到有效响应，请稍后再试。',
            status: 'failed',
            errorMessage: '流式响应未完成',
          })
        }
      }
    } catch (err) {
      if (isAborted()) {
        // 用户主动停止
        updateMessageInCurrentSession(assistantId, {
          content: accumulatedContent,
          status: 'stopped',
        })
      } else {
        const message = err instanceof Error ? err.message : '流式请求失败'
        error.value = message
        updateMessageInCurrentSession(assistantId, {
          content: accumulatedContent || '流式请求失败，请稍后再试。',
          status: 'failed',
          errorMessage: message,
        })
      }
    } finally {
      streaming.value = false
    }
  }

  function stopGenerating() {
    if (!streaming.value) {
      return
    }
    abort()
  }

  function regenerateMessage() {
    const messages = currentMessages.value
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === 'assistant')

    if (!lastAssistant) {
      return
    }

    if (lastAssistant.status === 'completed' || lastAssistant.status === 'failed' || lastAssistant.status === 'stopped') {
      const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user')
      if (!lastUserMessage) {
        return
      }
      removeMessage(lastAssistant.id)
      void sendMessageStream(lastUserMessage.content)
    }
  }

  function removeMessage(messageId: string) {
    const sid = currentSessionId.value
    if (!sid) return

    const sessionMessages = messagesMap.value[sid] ?? []
    setCurrentMessages(sessionMessages.filter((msg) => msg.id !== messageId))
  }

  return {
    streaming,
    error,
    clearError,
    sendMessageStream,
    stopGenerating,
    regenerateMessage,
  }
}
