import type { UserProfile } from './types'

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

export function getMyProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/profile/me')
}

export function saveMyProfile(profile: UserProfile): Promise<UserProfile> {
  return request<UserProfile>('/api/profile/me', {
    method: 'PUT',
    body: JSON.stringify({
      name: profile.name,
      avatarDataUrl: profile.avatarDataUrl,
      birthDate: profile.birthDate,
      bio: profile.bio,
      interests: profile.interests,
      achievements: profile.achievements,
      published: profile.published,
    }),
  })
}

export function getPublishedProfile(userId: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/profiles/${encodeURIComponent(userId)}`)
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  let result: ApiResult<T> | null = null
  try {
    result = (await response.json()) as ApiResult<T>
  } catch {
    // Use the stable fallback below when the server returns a non-JSON response.
  }
  if (!response.ok || !result) {
    throw new ApiError(result?.message || '服务暂时不可用，请稍后再试', response.status)
  }
  return result.data
}
