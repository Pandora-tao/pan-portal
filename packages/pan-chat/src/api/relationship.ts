import { apiRequest } from './request'
import type {
  MemoryStatus,
  MemoryType,
  ProactiveCheckResponse,
  RelationshipExport,
  RelationshipMemory,
  RelationshipOverview,
  RelationshipPreferences,
} from '../types/relationship'

export const relationshipApi = {
  overview: () => apiRequest<RelationshipOverview>('/api/relationship'),
  memories: (status: MemoryStatus = 'ACTIVE') =>
    apiRequest<RelationshipMemory[]>(`/api/relationship/memories?status=${status}`),
  createMemory: (body: {
    memoryType: MemoryType
    content: string
    occurredAt?: string | null
    confidence?: number
  }) => apiRequest<RelationshipMemory>('/api/relationship/memories', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateMemory: (id: string, body: {
    memoryType: MemoryType
    content: string
    occurredAt?: string | null
  }) => apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  forgetMemory: (id: string) => apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}`, {
    method: 'DELETE',
  }),
  restoreMemory: (id: string) => apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}/restore`, {
    method: 'POST',
  }),
  updatePreferences: (body: Pick<RelationshipPreferences,
    'proactiveEnabled' | 'proactiveFrequency' | 'quietStart' | 'quietEnd' | 'timezone'>) =>
    apiRequest<RelationshipPreferences>('/api/relationship/preferences', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  checkProactive: () => apiRequest<ProactiveCheckResponse>('/api/relationship/proactive/check', {
    method: 'POST',
  }),
  exportData: () => apiRequest<RelationshipExport>('/api/relationship/export'),
  deleteAll: (confirmation: string) => apiRequest<void>('/api/relationship', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation }),
  }),
}
