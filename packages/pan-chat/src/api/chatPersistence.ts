import { apiRequest, isUnauthorizedError } from './request'
import type {
  ChatSession,
  PersistedChatMessage,
  SendMessageResponse,
  UserInfo,
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

export function deleteAllSessions(): Promise<void> {
  return apiRequest<void>('/api/chat/sessions', { method: 'DELETE' })
}
