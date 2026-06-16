import {
  PAN_CHAT_CURRENT_SESSION_ID_KEY,
  PAN_CHAT_MESSAGES_KEY,
  PAN_CHAT_SESSIONS_KEY,
  PAN_CHAT_STORAGE_VERSION_KEY,
} from '../constants/storageKeys'
import type { ChatMessagesMap, ChatSession } from '../types/chat'

export function loadSessions(): ChatSession[] {
  return safeParse<ChatSession[]>(localStorage.getItem(PAN_CHAT_SESSIONS_KEY), []).filter(isChatSession)
}

export function saveSessions(sessions: ChatSession[]): void {
  safeSetItem(PAN_CHAT_SESSIONS_KEY, JSON.stringify(sessions))
}

export function loadMessagesMap(): ChatMessagesMap {
  const parsed = safeParse<ChatMessagesMap>(localStorage.getItem(PAN_CHAT_MESSAGES_KEY), {})
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

export function saveMessagesMap(messagesMap: ChatMessagesMap): void {
  safeSetItem(PAN_CHAT_MESSAGES_KEY, JSON.stringify(messagesMap))
}

export function loadCurrentSessionId(): string | null {
  return localStorage.getItem(PAN_CHAT_CURRENT_SESSION_ID_KEY)
}

export function saveCurrentSessionId(sessionId: string): void {
  safeSetItem(PAN_CHAT_CURRENT_SESSION_ID_KEY, sessionId)
}

export function clearCurrentSessionId(): void {
  localStorage.removeItem(PAN_CHAT_CURRENT_SESSION_ID_KEY)
}

export function clearLocalChatData(): void {
  localStorage.removeItem(PAN_CHAT_SESSIONS_KEY)
  localStorage.removeItem(PAN_CHAT_MESSAGES_KEY)
  localStorage.removeItem(PAN_CHAT_CURRENT_SESSION_ID_KEY)
}

export function loadStorageVersion(): string | null {
  return localStorage.getItem(PAN_CHAT_STORAGE_VERSION_KEY)
}

export function saveStorageVersion(version: string): void {
  safeSetItem(PAN_CHAT_STORAGE_VERSION_KEY, version)
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota exceeded or other storage error — silently fail
  }
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function isChatSession(value: unknown): value is ChatSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'createdAt' in value &&
    'updatedAt' in value &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    typeof (value as Record<string, unknown>).title === 'string' &&
    typeof (value as Record<string, unknown>).createdAt === 'string' &&
    typeof (value as Record<string, unknown>).updatedAt === 'string'
  )
}
