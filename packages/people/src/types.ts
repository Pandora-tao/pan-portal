export interface Account {
  id: string
  email: string
  status: string
  emailVerified: boolean
  verified: boolean
  pageId: string | null
  unreadNotifications: number
  deletionScheduledFor: string | null
}

export interface Verification {
  verificationId: string
  status: string
  provider: string
  certifyUrl: string | null
  expiresAt: string
  simulated: boolean
}

export interface ProfileSection {
  id?: string
  type: string
  title: string | null
  content: Record<string, unknown>
  position: number
  schemaVersion: number
}

export interface Relationship {
  relationshipId: string
  pageId: string
  legalName: string
  avatarUrl: string | null
  relationshipType: string
  publicOnBothSides: boolean
}

export interface Profile {
  pageId: string
  pageType: 'PERSONAL' | 'FIGURE'
  status: string
  slug: string
  legalName: string
  avatarUrl: string | null
  bio: string | null
  birthDate: string | null
  displayedBirthDate: string | null
  gender: string | null
  birthVisibility: 'YEAR_MONTH' | 'FULL' | 'HIDDEN'
  allowFollowerDm: boolean
  followingCount: number
  followerCount: number
  followedByMe: boolean
  sections: ProfileSection[]
  relationships: Relationship[]
  version: number
  updatedAt: string
}

export interface SearchResult { items: Profile[]; nextCursor: string | null }

export interface Conversation {
  conversationId: string
  otherPageId: string
  otherAccountId: string
  otherLegalName: string
  otherAvatarUrl: string | null
  lastMessagePreview: string | null
  updatedAt: string
  unreadCount: number
}

export interface DirectMessage {
  messageId: string
  conversationId: string
  senderAccountId: string | null
  clientMessageId: string
  text: string
  createdAt: string
}

export interface MessagePage { items: DirectMessage[]; nextCursor: string | null }

export interface AccountLink { path: string | null; expiresAt: string | null; testOnly: boolean }

export interface NotificationItem {
  notificationId: number
  eventType: string
  subjectId: string | null
  summary: string
  readAt: string | null
  createdAt: string
}

export interface NotificationPage { items: NotificationItem[]; nextCursor: number | null }

export interface AccountSession {
  sessionId: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  current: boolean
}

export interface RelationshipInbox {
  requestId: string
  requesterPageId: string
  requesterLegalName: string
  requesterAvatarUrl: string | null
  relationshipType: string
  createdAt: string
}

export interface PrivateRelationship {
  relationshipId: string
  pageId: string
  accountId: string
  legalName: string
  avatarUrl: string | null
  relationshipType: string
  visibleByMe: boolean
  visibleByOther: boolean
  publicOnBothSides: boolean
}
