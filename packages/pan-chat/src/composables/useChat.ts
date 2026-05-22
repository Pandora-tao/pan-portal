import { ref } from 'vue'
import { sendLegacyChat } from '../api/chat'
import type { Nullable } from '../types/common'
import type { ChatMessage } from '../types/chat'
import { createId } from '../utils/id'
import { isEmptyMessage, normalizeMessageContent } from '../utils/text'

export function useChat() {
  const messages = ref<ChatMessage[]>([
    {
      id: createId('msg'),
      role: 'assistant',
      content: '嗨，想聊点什么？你可以慢慢说，我会认真听。',
      status: 'completed',
    },
  ])
  const sending = ref(false)
  const error = ref<Nullable<string>>(null)

  async function sendMessage(rawContent: string) {
    const content = normalizeMessageContent(rawContent)

    if (isEmptyMessage(content) || sending.value) {
      return
    }

    error.value = null
    messages.value.push({
      id: createId('msg'),
      role: 'user',
      content,
      status: 'completed',
    })
    sending.value = true

    try {
      const response = await sendLegacyChat({
        messages: messages.value.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
      })

      messages.value.push({
        id: createId('msg'),
        role: 'assistant',
        content: response.answer,
        status: 'completed',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '消息发送失败，请稍后再试。'
    } finally {
      sending.value = false
    }
  }

  return {
    messages,
    sending,
    error,
    sendMessage,
  }
}
