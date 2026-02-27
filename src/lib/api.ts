import type { Session, Message, Feedback, TextChatResponse } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `API error: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Sessions
  createSession: (title?: string) =>
    request<Session>('/api/sessions', { method: 'POST', body: JSON.stringify({ title }) }),
  getSessions: () => request<Session[]>('/api/sessions'),
  getSession: (id: string) => request<Session>(`/api/sessions/${id}`),
  updateSession: (id: string, data: Partial<Session>) =>
    request<Session>(`/api/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSession: (id: string) =>
    request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),

  // Messages
  getMessages: (sessionId: string) =>
    request<Message[]>(`/api/messages?session_id=${sessionId}`),
  createMessage: (data: { session_id: string; role: string; content: string; language?: string }) =>
    request<Message>('/api/messages', { method: 'POST', body: JSON.stringify(data) }),

  // Voice
  getSignedUrl: () => request<{ signed_url: string }>('/api/voice/signed-url'),

  // Chat (text mode)
  sendTextMessage: (sessionId: string, message: string) =>
    request<TextChatResponse>(
      '/api/chat', { method: 'POST', body: JSON.stringify({ session_id: sessionId, message }) }
    ),

  // Feedback
  getFeedback: (sessionId: string) =>
    request<Feedback>(`/api/feedback/${sessionId}`),
  generateFeedback: (sessionId: string) =>
    request<Feedback>(`/api/feedback/${sessionId}/generate`, { method: 'POST' }),

  // Title generation
  generateTitle: (sessionId: string) =>
    request<Session>(`/api/sessions/${sessionId}/generate-title`, { method: 'POST' }),
}
