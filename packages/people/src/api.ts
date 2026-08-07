import type { Account, AccountLink, AccountSession, Conversation, DirectMessage, MessagePage, NotificationPage, PrivateRelationship, Profile, RelationshipInbox, SearchResult, Verification } from './types'

interface ApiResult<T> { code: number; message: string; data: T }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function csrfToken() {
  const item = document.cookie.split('; ').find(value => value.startsWith('people_csrf='))
  return item ? decodeURIComponent(item.slice('people_csrf='.length)) : ''
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD'].includes(method) && !path.includes('/auth/register') && !path.includes('/auth/login')
    && !path.includes('/auth/password-reset/') && !path.includes('/auth/email-verification/complete')
    && !path.includes('/account/deletion-restore')) {
    headers.set('X-People-CSRF', csrfToken())
  }
  const response = await fetch(`/api/people/v1${path}`, { ...options, headers, credentials: 'include' })
  const payload = await response.json().catch(() => ({ message: '请求失败' })) as Partial<ApiResult<T>>
  if (!response.ok || payload.code !== 0) throw new ApiError(response.status, payload.message || '请求失败')
  return payload.data as T
}

export const peopleApi = {
  me: () => request<Account>('/account/me'),
  register: (email: string, password: string) => request<Account>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<Account>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  requestEmailVerification: () => request<AccountLink>('/auth/email-verification/request', { method: 'POST' }),
  verifyEmail: (token: string) => request<void>('/auth/email-verification/complete', { method: 'POST', body: JSON.stringify({ token }) }),
  requestPasswordReset: (email: string) => request<AccountLink>('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<void>('/auth/password-reset/complete', { method: 'POST', body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword: string, newPassword: string) => request<void>('/account/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  sessions: () => request<AccountSession[]>('/account/sessions'),
  revokeSession: (id: string) => request<void>(`/account/sessions/${id}`, { method: 'DELETE' }),
  startVerification: (body: Record<string, unknown>) => request<Verification>('/identity-verifications', { method: 'POST', body: JSON.stringify(body) }),
  completeVerification: (id: string) => request<Verification>(`/identity-verifications/${id}/complete`, { method: 'POST' }),
  myProfile: () => request<Profile>('/profile/me'),
  saveProfile: (body: Record<string, unknown>) => request<Profile>('/profile/me', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ mediaId: string; url: string; contentType: string; byteSize: number; width: number; height: number }>('/profile/me/avatar', { method: 'POST', body })
  },
  deleteAvatar: () => request<void>('/profile/me/avatar', { method: 'DELETE' }),
  saveSections: (sections: Profile['sections']) => request<Profile>('/profile/me/sections', { method: 'PUT', body: JSON.stringify({ sections }) }),
  publish: () => request<Profile>('/profile/me/publish', { method: 'POST' }),
  unpublish: () => request<Profile>('/profile/me/unpublish', { method: 'POST' }),
  search: (q: string) => request<SearchResult>(`/public/search?q=${encodeURIComponent(q)}&limit=20`),
  publicProfile: (id: string) => request<Profile>(`/public/pages/${id}`),
  follow: (id: string, follow: boolean) => request<void>(`/pages/${id}/follow`, { method: follow ? 'PUT' : 'DELETE' }),
  relationship: (targetPageId: string, relationshipType: string) => request('/relationships/requests', { method: 'POST', body: JSON.stringify({ targetPageId, relationshipType }) }),
  relationshipInbox: () => request<RelationshipInbox[]>('/relationships/requests/inbox'),
  myRelationships: () => request<PrivateRelationship[]>('/relationships/mine'),
  resolveRelationship: (id: string, accept: boolean) => request(`/relationships/requests/${id}/${accept ? 'accept' : 'reject'}`, { method: 'POST' }),
  setRelationshipVisibility: (id: string, visible: boolean) => request(`/relationships/${id}/visibility`, { method: 'PUT', body: JSON.stringify({ visible }) }),
  deleteRelationship: (id: string) => request<void>(`/relationships/${id}`, { method: 'DELETE' }),
  conversations: () => request<Conversation[]>('/dm/conversations'),
  createConversation: (targetPageId: string) => request<Conversation>('/dm/conversations', { method: 'POST', body: JSON.stringify({ targetPageId }) }),
  messages: (id: string, before?: string | null) => request<MessagePage>(`/dm/conversations/${id}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ''}`),
  sendMessage: (id: string, clientMessageId: string, text: string) => request<DirectMessage>(`/dm/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ clientMessageId, text }) }),
  markRead: (id: string, lastReadMessageId: string | null) => request<void>(`/dm/conversations/${id}/read`, { method: 'PUT', body: JSON.stringify({ lastReadMessageId }) }),
  reportMessages: (conversationId: string, messageIds: string[], reason: string) => request<string>('/dm/reports', { method: 'POST', body: JSON.stringify({ conversationId, messageIds, reason }) }),
  block: (accountId: string, blocked: boolean) => request<void>(`/blocks/${accountId}`, { method: blocked ? 'PUT' : 'DELETE' }),
  blocks: () => request<string[]>('/blocks'),
  notifications: (before?: number | null) => request<NotificationPage>(`/notifications?limit=30${before ? `&before=${before}` : ''}`),
  readNotification: (id: number) => request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  readAllNotifications: () => request<void>('/notifications/read-all', { method: 'PUT' }),
  proposeFigure: (body: Record<string, unknown>) => request('/figures/proposals', { method: 'POST', body: JSON.stringify(body) }),
  exportAccount: () => request<Record<string, unknown>>('/account/export', { method: 'POST' }),
  requestDeletion: (password: string) => request<{ status: string; requestedAt: string; scheduledFor: string }>('/account/deletion-request', { method: 'POST', body: JSON.stringify({ password, confirmation: 'DELETE' }) }),
  restoreDeletion: (email: string, password: string) => request<Account>('/account/deletion-restore', { method: 'POST', body: JSON.stringify({ email, password }) }),
}
