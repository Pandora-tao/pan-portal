import { computed, ref } from 'vue'
import {
  clearCurrentSessionId as clearStoredCurrentSessionId,
  loadCurrentSessionId,
  loadMessagesMap,
  loadSessions,
  saveCurrentSessionId,
  saveMessagesMap,
  saveSessions,
} from '../services/chatLocalStorage'
import type { ChatMessage, ChatMessagesMap, ChatSession } from '../types/chat'
import { createId } from '../utils/id'
import { normalizeMessageContent } from '../utils/text'

const DEFAULT_SESSION_TITLE = '新聊天'
const MAX_TITLE_LENGTH = 30
const AUTO_TITLE_LENGTH = 20

export function useChatSessions() {
  const sessions = ref(sortSessions(loadSessions()))
  const messagesMap = ref<ChatMessagesMap>(normalizeMessagesMap(loadMessagesMap(), sessions.value))
  const storedCurrentSessionId = loadCurrentSessionId()
  const currentSessionId = ref<string | null>(
    storedCurrentSessionId && sessions.value.some((session) => session.id === storedCurrentSessionId)
      ? storedCurrentSessionId
      : null,
  )

  if (currentSessionId.value) {
    saveCurrentSessionId(currentSessionId.value)
  } else {
    clearStoredCurrentSessionId()
  }

  const currentMessages = computed(() => {
    const sessionId = currentSessionId.value
    return sessionId ? (messagesMap.value[sessionId] ?? []) : []
  })

  function createSession(title = DEFAULT_SESSION_TITLE): ChatSession {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id: createId('session'),
      title: normalizeSessionTitle(title) || DEFAULT_SESSION_TITLE,
      createdAt: now,
      updatedAt: now,
    }

    sessions.value = sortSessions([session, ...sessions.value])
    messagesMap.value = {
      ...messagesMap.value,
      [session.id]: [],
    }
    setCurrentSessionId(session.id)
    persistSessions()
    persistMessages()

    return session
  }

  function selectSession(sessionId: string) {
    if (!sessions.value.some((session) => session.id === sessionId)) {
      return
    }

    setCurrentSessionId(sessionId)
  }

  function deleteSession(sessionId: string) {
    const nextSessions = sessions.value.filter((session) => session.id !== sessionId)
    const { [sessionId]: _deletedMessages, ...nextMessagesMap } = messagesMap.value

    sessions.value = sortSessions(nextSessions)
    messagesMap.value = nextMessagesMap

    if (currentSessionId.value === sessionId) {
      setCurrentSessionId(sessions.value[0]?.id ?? null)
    }

    persistSessions()
    persistMessages()
  }

  function renameSession(sessionId: string, title: string) {
    const normalizedTitle = normalizeSessionTitle(title)

    if (!normalizedTitle) {
      return
    }

    updateSession(sessionId, {
      title: normalizedTitle,
      titleManuallyEdited: true,
      updatedAt: new Date().toISOString(),
    })
  }

  function setCurrentMessages(messages: ChatMessage[]) {
    const sessionId = ensureCurrentSession()
    messagesMap.value = {
      ...messagesMap.value,
      [sessionId]: messages,
    }
    updateSessionFromMessages(sessionId, messages)
    persistMessages()
  }

  function appendMessageToCurrentSession(message: ChatMessage): string {
    const sessionId = ensureCurrentSession()
    const messages = [...(messagesMap.value[sessionId] ?? []), message]
    messagesMap.value = {
      ...messagesMap.value,
      [sessionId]: messages,
    }
    updateSessionFromMessages(sessionId, messages)
    persistMessages()

    return sessionId
  }

  function updateMessageInCurrentSession(messageId: string, patch: Partial<ChatMessage>) {
    const sessionId = currentSessionId.value

    if (!sessionId) {
      return
    }

    const messages = (messagesMap.value[sessionId] ?? []).map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    )
    messagesMap.value = {
      ...messagesMap.value,
      [sessionId]: messages,
    }
    updateSessionFromMessages(sessionId, messages)
    persistMessages()
  }

  function updateCurrentSessionTitleFromFirstMessage() {
    const sessionId = currentSessionId.value

    if (!sessionId) {
      return
    }

    const session = sessions.value.find((item) => item.id === sessionId)
    const firstUserMessage = messagesMap.value[sessionId]?.find((message) => message.role === 'user')

    if (!session || !firstUserMessage || session.titleManuallyEdited || session.title !== DEFAULT_SESSION_TITLE) {
      return
    }

    updateSession(sessionId, {
      title: createAutoTitle(firstUserMessage.content),
      updatedAt: new Date().toISOString(),
    })
  }

  function ensureCurrentSession(): string {
    if (currentSessionId.value && sessions.value.some((session) => session.id === currentSessionId.value)) {
      return currentSessionId.value
    }

    return createSession().id
  }

  function setCurrentSessionId(sessionId: string | null) {
    currentSessionId.value = sessionId

    if (sessionId) {
      saveCurrentSessionId(sessionId)
    } else {
      clearStoredCurrentSessionId()
    }
  }

  function updateSession(sessionId: string, patch: Partial<ChatSession>) {
    sessions.value = sortSessions(
      sessions.value.map((session) => (session.id === sessionId ? { ...session, ...patch } : session)),
    )
    persistSessions()
  }

  function updateSessionFromMessages(sessionId: string, messages: ChatMessage[]) {
    const lastCompletedMessage = [...messages].reverse().find((message) => message.status === 'completed')
    const now = new Date().toISOString()

    updateSession(sessionId, {
      updatedAt: now,
      lastMessagePreview: lastCompletedMessage
        ? truncateText(normalizeMessageContent(lastCompletedMessage.content), 36)
        : undefined,
    })
    updateCurrentSessionTitleFromFirstMessage()
  }

  function persistSessions() {
    saveSessions(sessions.value)
  }

  function persistMessages() {
    saveMessagesMap(messagesMap.value)
  }

  return {
    sessions,
    currentSessionId,
    messagesMap,
    currentMessages,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    setCurrentMessages,
    appendMessageToCurrentSession,
    updateMessageInCurrentSession,
    updateCurrentSessionTitleFromFirstMessage,
  }
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((first, second) => {
    if (first.pinned !== second.pinned) {
      return first.pinned ? -1 : 1
    }

    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  })
}

function normalizeMessagesMap(messagesMap: ChatMessagesMap, sessions: ChatSession[]): ChatMessagesMap {
  return sessions.reduce<ChatMessagesMap>((result, session) => {
    result[session.id] = Array.isArray(messagesMap[session.id]) ? messagesMap[session.id] : []
    return result
  }, {})
}

function normalizeSessionTitle(title: string): string {
  return normalizeMessageContent(title).slice(0, MAX_TITLE_LENGTH)
}

function createAutoTitle(content: string): string {
  const title = normalizeMessageContent(content)

  if (title.length <= AUTO_TITLE_LENGTH) {
    return title || DEFAULT_SESSION_TITLE
  }

  return `${title.slice(0, AUTO_TITLE_LENGTH)}...`
}

function truncateText(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }

  return `${content.slice(0, maxLength)}...`
}
