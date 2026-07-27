export interface AdminMe {
  id: string
  email: string
  displayName: string
  realName: string | null
  role: 'SUPER_ADMIN'
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface UserSummary {
  id: string
  email: string
  displayName: string
  realName: string | null
  realNameVerificationStatus: RealNameVerificationStatus
  realNameVerifiedAt: string | null
  realNameReviewedAt: string | null
  realNameReviewedBy: string | null
  realNameReviewReason: string | null
  status: 'ACTIVE' | 'DISABLED'
  role: 'USER' | 'SUPER_ADMIN'
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
  chatSessionCount: number
  chatMessageCount: number
}

export type RealNameVerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AuthSessionView {
  id: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  revokedAt: string | null
}

export interface AuditView {
  id: string
  actorUserId: string | null
  action: string
  targetType: string
  targetId: string | null
  reason: string | null
  beforeState: string | null
  afterState: string | null
  result: 'SUCCESS' | 'FAILURE'
  ipAddress: string | null
  requestId: string | null
  createdAt: string
}

export interface UserDetail {
  user: UserSummary
  authSessions: AuthSessionView[]
  auditLogs: AuditView[]
}

export interface ProfileAchievement {
  title: string
  date: string | null
  description: string | null
}

export interface AdminProfileData {
  userId: string
  name: string
  avatarDataUrl: string | null
  birthDate: string | null
  bio: string | null
  interests: string[]
  achievements: ProfileAchievement[]
  published: boolean
  exists: boolean
  updatedAt: string | null
}

export type RelationshipMemoryStatus = 'ACTIVE' | 'FORGOTTEN'

export interface RelationshipMemory {
  id: string
  memoryType: 'PERSON' | 'PREFERENCE' | 'SHARED_EVENT' | 'OPEN_LOOP' | 'RELATIONSHIP'
  content: string
  sourceMessageId: string | null
  sourceExcerpt: string | null
  sourceAt: string | null
  occurredAt: string | null
  confidence: number
  status: RelationshipMemoryStatus
  userCorrected: boolean
  lastRecalledAt: string | null
  recallCount: number
  forgottenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminRelationshipData {
  accessedAt: string
  memories: RelationshipMemory[]
  activeMemoryCount: number
  forgottenMemoryCount: number
}

export interface ConversationSummary {
  id: string
  title: string
  userId: string
  userEmail: string
  userDisplayName: string
  messageCount: number
  tokenCount: number
  averageDurationMs: number
  createdAt: string
  updatedAt: string
  lastMessagePreview: string | null
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  status: string
  createdAt: string
  updatedAt: string
  metadata: {
    model: string | null
    tokens: number | null
    durationMs: number | null
  }
}

export interface ConversationDetail {
  session: ConversationSummary
  messages: ChatMessage[]
}

export interface DashboardSummary {
  totalUsers: number
  todayNewUsers: number
  lastSevenDaysNewUsers: number
  todayActiveUsers: number
  todayChatUsers: number
  todayChatSessions: number
  todayUserMessages: number
  todayAssistantMessages: number
  todayTokens: number
  assistantSuccessRate: number
  failedAssistantMessages: number
  p50DurationMs: number
  p95DurationMs: number
  generatedAt: string
}

export interface TrendPoint {
  date: string
  newUsers: number
  activeUsers: number
  userMessages: number
  assistantMessages: number
}

export type PrizeClaimStatus = 'UNCLAIMED' | 'CLAIMED' | 'REDEEMED'

export interface AdminPrizeRecord {
  id: string
  userId: string
  userEmail: string
  userDisplayName: string
  prizeDisplayName: string
  claimStatus: PrizeClaimStatus
  claimedAt: string | null
  redeemedAt: string | null
  redeemedByEmail: string | null
  redeemNote: string | null
  createdAt: string
}
