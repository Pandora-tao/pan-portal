import { apiRequest, isUnauthorizedError } from './request'
import { streamSse } from './sse'
import type {
  ChatSession,
  ChatMessagePage,
  ChatGenerationSnapshot,
  PersistedChatMessage,
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

export function listMessages(
  sessionId: string,
  before?: string | null,
  limit = 50,
): Promise<ChatMessagePage> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', before)
  return apiRequest<ChatMessagePage>(`/api/chat/sessions/${sessionId}/messages?${params}`)
}

export function createPersistentGeneration(
  sessionId: string,
  clientMessageId: string,
  content: string,
  signal?: AbortSignal,
): Promise<ChatGenerationSnapshot> {
  return apiRequest<ChatGenerationSnapshot>(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ clientMessageId, content }),
    signal,
  })
}

export function createPersistentRegeneration(
  sessionId: string,
  messageId: string,
  clientRequestId: string,
  signal?: AbortSignal,
): Promise<ChatGenerationSnapshot> {
  return apiRequest<ChatGenerationSnapshot>(
    `/api/chat/sessions/${sessionId}/messages/${messageId}/generations`,
    { method: 'POST', body: JSON.stringify({ clientRequestId }), signal },
  )
}

export function getGeneration(generationId: string): Promise<ChatGenerationSnapshot> {
  return apiRequest<ChatGenerationSnapshot>(`/api/chat/generations/${generationId}`)
}

export function observeGeneration(
  generationId: string,
  onEvent: (event: string, payload: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse(`/api/chat/generations/${generationId}/stream`, {
    method: 'GET',
    signal,
  }, onEvent)
}

export function stopGeneration(generationId: string): Promise<ChatGenerationSnapshot> {
  return apiRequest<ChatGenerationSnapshot>(`/api/chat/generations/${generationId}/stop`, {
    method: 'POST',
  })
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
