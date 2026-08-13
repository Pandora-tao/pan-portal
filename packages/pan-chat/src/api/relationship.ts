import { apiRequest } from './request'
import type {
  MemoryStatus,
  MemoryType,
  RelationshipExport,
  RelationshipMemory,
  RelationshipOverview,
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
  confirmMemory: (id: string) => apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}/confirm`, {
    method: 'POST',
  }),
  rejectMemory: (id: string) => apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}/reject`, {
    method: 'POST',
  }),
  updateOpenLoopStatus: (id: string, status: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED') =>
    apiRequest<RelationshipMemory>(`/api/relationship/memories/${id}/open-loop`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  exportData: () => apiRequest<RelationshipExport>('/api/relationship/export'),
  deleteAll: (confirmation: string) => apiRequest<void>('/api/relationship', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation }),
  }),
}
