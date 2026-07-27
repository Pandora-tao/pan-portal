export interface Account {
  id: string
  email: string
  status: string
  verified: boolean
  pageId: string | null
  unreadNotifications: number
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
