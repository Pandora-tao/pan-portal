import type { Account, Conversation, DirectMessage, MessagePage, Profile, SearchResult, Verification } from './types'

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
  if (!['GET', 'HEAD'].includes(method) && !path.includes('/auth/register') && !path.includes('/auth/login')) {
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
  startVerification: (body: Record<string, unknown>) => request<Verification>('/identity-verifications', { method: 'POST', body: JSON.stringify(body) }),
  completeVerification: (id: string) => request<Verification>(`/identity-verifications/${id}/complete`, { method: 'POST' }),
  myProfile: () => request<Profile>('/profile/me'),
  saveProfile: (body: Record<string, unknown>) => request<Profile>('/profile/me', { method: 'PUT', body: JSON.stringify(body) }),
  saveSections: (sections: Profile['sections']) => request<Profile>('/profile/me/sections', { method: 'PUT', body: JSON.stringify({ sections }) }),
  publish: () => request<Profile>('/profile/me/publish', { method: 'POST' }),
  unpublish: () => request<Profile>('/profile/me/unpublish', { method: 'POST' }),
  search: (q: string) => request<SearchResult>(`/public/search?q=${encodeURIComponent(q)}&limit=20`),
  publicProfile: (id: string) => request<Profile>(`/public/pages/${id}`),
  follow: (id: string, follow: boolean) => request<void>(`/pages/${id}/follow`, { method: follow ? 'PUT' : 'DELETE' }),
  relationship: (targetPageId: string, relationshipType: string) => request('/relationships/requests', { method: 'POST', body: JSON.stringify({ targetPageId, relationshipType }) }),
  conversations: () => request<Conversation[]>('/dm/conversations'),
  createConversation: (targetPageId: string) => request<Conversation>('/dm/conversations', { method: 'POST', body: JSON.stringify({ targetPageId }) }),
  messages: (id: string) => request<MessagePage>(`/dm/conversations/${id}/messages?limit=50`),
  sendMessage: (id: string, clientMessageId: string, text: string) => request<DirectMessage>(`/dm/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ clientMessageId, text }) }),
  proposeFigure: (body: Record<string, unknown>) => request('/figures/proposals', { method: 'POST', body: JSON.stringify(body) }),
  exportAccount: () => request<Record<string, unknown>>('/account/export', { method: 'POST' }),
}
