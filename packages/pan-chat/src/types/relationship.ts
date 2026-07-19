import type { PersistedChatMessage } from './chat'

export type MemoryType = 'PERSON' | 'PREFERENCE' | 'SHARED_EVENT' | 'OPEN_LOOP' | 'RELATIONSHIP'
export type MemoryStatus = 'ACTIVE' | 'FORGOTTEN'
export type ProactiveFrequency = 'LOW' | 'NORMAL' | 'HIGH'

export interface RelationshipMemory {
  id: string
  memoryType: MemoryType
  content: string
  sourceMessageId: string | null
  sourceExcerpt: string | null
  sourceAt: string | null
  occurredAt: string | null
  confidence: number
  status: MemoryStatus
  userCorrected: boolean
  lastRecalledAt: string | null
  recallCount: number
  forgottenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RelationshipPreferences {
  proactiveEnabled: boolean
  proactiveFrequency: ProactiveFrequency
  quietStart: string
  quietEnd: string
  timezone: string
  lastProactiveAt: string | null
  updatedAt: string | null
}

export interface RelationshipOverview {
  activeMemoryCount: number
  forgottenMemoryCount: number
  lastInteractionAt: string | null
  preferences: RelationshipPreferences
}

export interface ProactiveCheckResponse {
  messages: PersistedChatMessage[]
}

export interface RelationshipExport {
  exportedAt: string
  memories: RelationshipMemory[]
  preferences: RelationshipPreferences
  conversations: unknown[]
}
