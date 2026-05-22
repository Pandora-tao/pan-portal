import { PAN_CHAT_VISITOR_ID_KEY } from '../constants/storageKeys'
import { createId } from '../utils/id'

export function getVisitorId(): string {
  const existing = localStorage.getItem(PAN_CHAT_VISITOR_ID_KEY)

  if (existing) {
    return existing
  }

  const visitorId = createId('visitor')
  localStorage.setItem(PAN_CHAT_VISITOR_ID_KEY, visitorId)

  return visitorId
}

export function useVisitorId() {
  return {
    getVisitorId,
  }
}
