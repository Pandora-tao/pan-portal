export interface Achievement {
  title: string
  date: string | null
  description: string | null
}

export interface UserProfile {
  userId: string
  name: string
  avatarDataUrl: string | null
  birthDate: string | null
  bio: string | null
  interests: string[]
  achievements: Achievement[]
  published: boolean
  exists: boolean
  updatedAt: string | null
}
