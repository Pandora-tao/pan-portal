export type MemoryType = 'PERSON' | 'PREFERENCE' | 'SHARED_EVENT' | 'OPEN_LOOP' | 'RELATIONSHIP'
export type MemoryStatus = 'ACTIVE' | 'FORGOTTEN' | 'NEEDS_CONFIRMATION'
export type StoredMemoryStatus = 'ACTIVE' | 'FORGOTTEN' | 'SUPERSEDED' | 'DISMISSED'
export type MemoryConfirmationStatus = 'AUTO' | 'USER_CONFIRMED' | 'NEEDS_CONFIRMATION'
export type OpenLoopStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export interface RelationshipMemoryEvidence {
  id: string | null
  sourceMessageId: string | null
  evidenceType: 'CHAT_EXTRACTION' | 'USER_STATEMENT' | 'USER_CORRECTION' | 'ADMIN_ACTION'
  excerpt: string
  sourceAt: string | null
  createdAt: string
}

export interface RelationshipMemory {
  id: string
  memoryType: MemoryType
  content: string
  memoryKey: string
  sourceMessageId: string | null
  sourceExcerpt: string | null
  sourceAt: string | null
  occurredAt: string | null
  confidence: number
  status: StoredMemoryStatus
  confirmationStatus: MemoryConfirmationStatus
  userCorrected: boolean
  expiresAt: string | null
  importance: number
  supersedesMemoryId: string | null
  supersedesContent: string | null
  replacementMemoryId: string | null
  openLoopStatus: OpenLoopStatus | null
  evidence: RelationshipMemoryEvidence[]
  usageCount: number
  lastRecalledAt: string | null
  recallCount: number
  forgottenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RelationshipOverview {
  activeMemoryCount: number
  forgottenMemoryCount: number
  needsConfirmationCount: number
  lastInteractionAt: string | null
  reliability: {
    pendingExtractionCount: number
    failedExtractionCount: number
    evidenceCount: number
    usageCount: number
  }
}

export interface RelationshipExport {
  exportedAt: string
  memories: RelationshipMemory[]
  conversations: unknown[]
}
