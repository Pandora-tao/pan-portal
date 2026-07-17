import { apiRequest, isUnauthorizedError } from './request'
import { streamSse } from './sse'
import type {
  ChatSession,
  PersistedChatMessage,
  SendMessageResponse,
  UserInfo,
  MessageFeedbackInput,
} from '../types/chat'

export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    return await apiRequest<UserInfo>('/api/me')
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null
    }
    throw error
  }
}

export function listSessions(): Promise<ChatSession[]> {
  return apiRequest<ChatSession[]>('/api/chat/sessions')
}

export function createSession(): Promise<ChatSession> {
  return apiRequest<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function listMessages(sessionId: string): Promise<PersistedChatMessage[]> {
  return apiRequest<PersistedChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`)
}

export function sendSessionMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
    signal,
  })
}

export function streamSessionMessage(
  sessionId: string,
  content: string,
  onEvent: (event: string, payload: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    body: JSON.stringify({ content }),
    signal,
  }, onEvent)
}

export function regenerateSessionMessage(
  sessionId: string,
  messageId: string,
  onEvent: (event: string, payload: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse(
    `/api/chat/sessions/${sessionId}/messages/${messageId}/regenerate/stream`,
    { method: 'POST', body: JSON.stringify({}), signal },
    onEvent,
  )
}

export function saveMessageFeedback(
  sessionId: string,
  messageId: string,
  feedback: MessageFeedbackInput,
): Promise<PersistedChatMessage> {
  return apiRequest<PersistedChatMessage>(
    `/api/chat/sessions/${sessionId}/messages/${messageId}/feedback`,
    { method: 'PUT', body: JSON.stringify(feedback) },
  )
}

export function deleteAllSessions(): Promise<void> {
  return apiRequest<void>('/api/chat/sessions', { method: 'DELETE' })
}
