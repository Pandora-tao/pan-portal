import { getVisitorId } from '../composables/useVisitorId'

export interface SSEMessageCreatedEvent {
  userMessageId: string
  assistantMessageId: string
}

export interface SSEDeltaEvent {
  content: string
}

export interface SSEDoneEvent {
  messageId: string
}

export interface SSEErrorEvent {
  error: string
}

export interface SSECallbacks {
  onMessageCreated?: (data: SSEMessageCreatedEvent) => void
  onDelta?: (data: SSEDeltaEvent) => void
  onDone?: (data: SSEDoneEvent) => void
  onError?: (data: SSEErrorEvent) => void
}

export function getStreamChatApiUrl(sessionId: string): string {
  return new URL(
    `api/chat/sessions/${sessionId}/messages/stream`,
    window.location.origin + import.meta.env.BASE_URL,
  ).pathname
}

export async function sendStreamChat(
  sessionId: string,
  payload: { messages: Array<{ role: string; content: string }> },
  callbacks: SSECallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = getStreamChatApiUrl(sessionId)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Visitor-Id': getVisitorId(),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(`流式请求失败：${response.status}`)
  }

  if (!response.body) {
    throw new Error('流式响应体为空')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      let currentEvent = ''

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
          continue
        }

        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim()

          if (!dataStr || !currentEvent) {
            continue
          }

          try {
            const data = JSON.parse(dataStr)

            switch (currentEvent) {
              case 'message-created':
                callbacks.onMessageCreated?.(data as SSEMessageCreatedEvent)
                break
              case 'delta':
                callbacks.onDelta?.(data as SSEDeltaEvent)
                break
              case 'done':
                callbacks.onDone?.(data as SSEDoneEvent)
                break
              case 'error':
                callbacks.onError?.(data as SSEErrorEvent)
                break
            }
          } catch {
            // 忽略无法解析的 SSE data
          }

          currentEvent = ''
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
