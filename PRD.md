# PRD: HablaConmigo -- AI Spanish Language Coach

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Data Models](#4-data-models)
5. [Phase 0 -- Project Scaffolding](#phase-0----project-scaffolding)
6. [Phase 1 -- Backend Foundation (Next.js Route Handlers + Supabase)](#phase-1----backend-foundation-nextjs-route-handlers--supabase)
7. [Phase 2 -- Frontend Shell](#phase-2----frontend-shell)
8. [Phase 3 -- Voice Conversation Engine (ElevenLabs Conversational AI)](#phase-3----voice-conversation-engine-elevenlabs-conversational-ai)
9. [Phase 4 -- Live Chat Transcript](#phase-4----live-chat-transcript)
10. [Phase 5 -- Chat History](#phase-5----chat-history)
11. [Phase 6 -- Text Input Mode](#phase-6----text-input-mode)
12. [Phase 7 -- Waveform Visualizer (2D)](#phase-7----waveform-visualizer-2d)
13. [Phase 8 -- Waveform Visualizer (3D Upgrade)](#phase-8----waveform-visualizer-3d-upgrade)
14. [Phase 9 -- Light/Dark Mode](#phase-9----lightdark-mode)
15. [Phase 10 -- Post-Session Feedback & Analysis](#phase-10----post-session-feedback--analysis)
16. [Phase 11 -- Polish, Testing & Deployment](#phase-11----polish-testing--deployment)
17. [Environment Variables Reference](#environment-variables-reference)
18. [API Contract Reference](#api-contract-reference)

---

## 1. Product Overview

**HablaConmigo** is a web-based AI language coach for English speakers learning Mexican Spanish. The user has real-time voice conversations with a bilingual AI coach that speaks both English and Spanish fluently. The coach initiates conversations, teaches vocabulary and grammar, evaluates the user's spoken Spanish, and provides personalized feedback in English.

### Core User Flow

1. User opens the app and sees the main conversation interface.
2. User starts a new session by clicking a microphone button.
3. The AI coach greets the user and begins a lesson or conversation in a mix of English and Spanish.
4. The user speaks back (in English or Spanish). The AI responds with voice.
5. A live transcript scrolls in real-time, showing both sides of the conversation like a chat interface.
6. A waveform visualizer shows audio activity for both user and AI.
7. The user can also type messages instead of speaking.
8. When the session ends, the user can review the full transcript and receive a detailed feedback report.
9. All past sessions are accessible from a sidebar/history tab.

### Key Principles

- **Voice-first**: The primary interaction is spoken conversation, not text.
- **Mexican Spanish**: The coach uses Mexican dialect vocabulary, pronunciation, and cultural references.
- **Bilingual coaching**: The coach explains grammar and gives feedback in English, but conducts practice in Spanish.
- **Autonomous coaching**: The AI decides lesson content, conversation topics, difficulty level, and session length based on the user's proficiency.

---

## 2. Architecture

This is a unified Next.js application. The frontend and backend (API Route Handlers) live in a single codebase and deploy together to Vercel. There is no separate backend server, no CORS configuration, and no cross-origin requests -- all API routes are same-origin.

```
+-----------------------------------------------------------+
|                        BROWSER                             |
|                                                            |
|  +------------------------------------------------------+ |
|  |                Next.js App (Vercel)                   | |
|  |                                                       | |
|  |  Client Components          Route Handlers (/api)    | |
|  |  +-------------------+     +------------------------+ | |
|  |  | Chat UI           |     | /api/sessions    CRUD  | | |
|  |  | History            |     | /api/messages    CRUD  | | |
|  |  | Waveform Visualizer|     | /api/chat     Gemini  | | |
|  |  | Theme Toggle       |     | /api/feedback Gemini  | | |
|  |  +--------+----------+     | /api/voice  ElevenLabs | | |
|  |           |                +-----+------------------+ | |
|  +-----------|----------------------|--------------------+ |
|              |                      |                      |
|    WebSocket |             Server-side calls               |
|   (audio)    |                      |                      |
+--------------|-----------+----------|----------------------+
               |           |          |
               v           |          v
  +-----------------+      |   +-------------------+
  | ElevenLabs      |      |   | Supabase          |
  | Conversational  |      |   | - PostgreSQL DB   |
  | AI Agent        |      |   | - Realtime pub    |
  | (WebSocket)     |      |   | - Storage (audio) |
  |                 |      |   +-------------------+
  | - Built-in STT  |      |
  | - Gemini LLM    |      v
  | - Multilingual  |   +-------------------+
  |   v2 TTS        |   | Google Gemini API |
  +-----------------+   | (text chat +      |
                         |  feedback)        |
                         +-------------------+
```

### Data Flow: Voice Conversation

1. **Browser** captures microphone audio via Web Audio API.
2. **Browser** sends audio chunks to **ElevenLabs Conversational AI** over WebSocket (`wss://api.elevenlabs.io/v1/convai/conversation`).
3. **ElevenLabs** transcribes speech (built-in STT), sends text to **Gemini** (natively integrated), receives LLM response, synthesizes speech (Multilingual v2 TTS).
4. **ElevenLabs** sends back to browser: `user_transcript` events, `agent_response` events, and `audio` chunks.
5. **Browser** plays audio, updates transcript UI, feeds audio data to waveform visualizer.
6. **Browser** sends transcript messages to **Next.js Route Handlers** (`/api/messages`) for persistent storage in **Supabase**.
7. **Supabase Realtime** is available for syncing state but is optional for single-tab usage.

### Data Flow: Text Input

1. **Browser** sends typed text to the same-origin **Route Handler** at `/api/chat`.
2. **Route Handler** calls **Gemini API** directly (via `@google/genai` SDK) with the conversation history.
3. **Route Handler** stores the message pair in **Supabase** (via `@supabase/supabase-js` with the service role key).
4. **Route Handler** optionally calls **ElevenLabs TTS** to generate audio for the response.
5. **Route Handler** returns the response text (and audio URL if generated) to the browser.

### Data Flow: Post-Session Feedback

1. **Browser** signals session end to **Route Handler** at `/api/feedback/[sessionId]/generate`.
2. **Route Handler** retrieves the full transcript from **Supabase**.
3. **Route Handler** sends the transcript to **Gemini** with a grammar-analysis system prompt and structured JSON output schema.
4. **Gemini** returns structured JSON feedback (errors, corrections, proficiency assessment).
5. **Route Handler** stores the feedback in **Supabase** and returns it to the browser.

---

## 3. Tech Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| **Framework** | Next.js (App Router) | 15.x, TypeScript, single codebase for frontend + API |
| **Styling** | Tailwind CSS | v4 |
| **State Management** | Zustand | Lightweight, no boilerplate |
| **Validation** | Zod | Runtime validation for API inputs |
| **3D Visualizer** | React Three Fiber + Three.js | Phase 8 upgrade |
| **2D Visualizer** | HTML5 Canvas + Web Audio API | Phase 7 |
| **LLM** | Google Gemini (gemini-2.5-flash) | via `@google/genai` SDK |
| **Voice AI** | ElevenLabs Conversational AI | WebSocket, agent-based |
| **TTS** | ElevenLabs Multilingual v2 | `eleven_multilingual_v2` model |
| **STT** | ElevenLabs (built into Conversational AI) + Scribe for batch | `scribe_v1` |
| **Database** | Supabase (PostgreSQL) | Hosted, `@supabase/supabase-js` |
| **Auth** | None (single-user) | Can add later |
| **Hosting** | Vercel | Single deployment for everything |

### Key Package Versions

**package.json**:
- `next` ^15.0.0
- `react` ^19.0.0
- `tailwindcss` ^4.0.0
- `zustand` ^5.0.0
- `zod` ^3.24.0
- `@google/genai` ^1.0.0
- `@supabase/supabase-js` ^2.49.0
- `@react-three/fiber` ^9.0.0 (Phase 8)
- `@react-three/drei` ^10.0.0 (Phase 8)
- `three` ^0.170.0 (Phase 8)

---

## 4. Data Models

### 4.1 Supabase Database Schema

```sql
-- ============================================
-- Sessions table
-- ============================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New Session',
  status text not null default 'active' check (status in ('active', 'ended', 'analyzed')),
  source_language text not null default 'en',
  target_language text not null default 'es-MX',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Messages table
-- ============================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  original_audio_url text,
  language text check (language in ('en', 'es', 'mixed', null)),
  created_at timestamptz not null default now()
);

create index idx_messages_session_id on messages(session_id);
create index idx_messages_created_at on messages(created_at);

-- ============================================
-- Feedback table (post-session analysis)
-- ============================================
create table feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  summary text not null,
  grammar_errors jsonb not null default '[]',
  vocabulary_suggestions jsonb not null default '[]',
  pronunciation_notes jsonb not null default '[]',
  proficiency_assessment text,
  score integer check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  unique(session_id)
);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

-- ============================================
-- RLS Policies (single-user: open read, server writes)
-- ============================================
alter table sessions enable row level security;
alter table messages enable row level security;
alter table feedback enable row level security;

-- Frontend (anon key) can read everything
create policy "Public read" on sessions for select to anon using (true);
create policy "Public read" on messages for select to anon using (true);
create policy "Public read" on feedback for select to anon using (true);

-- Server (service_role key) bypasses RLS for writes

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table sessions;
```

### 4.2 Zod Schemas (API Validation)

These schemas validate incoming request bodies in Route Handlers and also serve as the source of truth for TypeScript types via `z.infer<>`.

```typescript
// src/lib/schemas.ts
import { z } from 'zod'

// ---- Sessions ----

export const SessionCreateSchema = z.object({
  title: z.string().default('New Session'),
})
export type SessionCreate = z.infer<typeof SessionCreateSchema>

export const SessionUpdateSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['active', 'ended', 'analyzed']).optional(),
})
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>

// ---- Messages ----

export const MessageCreateSchema = z.object({
  session_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  language: z.enum(['en', 'es', 'mixed']).nullable().optional(),
})
export type MessageCreate = z.infer<typeof MessageCreateSchema>

// ---- Chat ----

export const TextChatRequestSchema = z.object({
  session_id: z.string().uuid(),
  message: z.string().min(1),
})
export type TextChatRequest = z.infer<typeof TextChatRequestSchema>

// ---- Feedback (Gemini response shape) ----

export const GrammarErrorSchema = z.object({
  original: z.string(),
  correction: z.string(),
  rule: z.string(),
  explanation: z.string(),
})
export type GrammarError = z.infer<typeof GrammarErrorSchema>

export const VocabSuggestionSchema = z.object({
  word: z.string(),
  translation: z.string(),
  example_sentence: z.string(),
  context: z.string(),
})
export type VocabSuggestion = z.infer<typeof VocabSuggestionSchema>

export const FeedbackAnalysisSchema = z.object({
  summary: z.string(),
  grammar_errors: z.array(GrammarErrorSchema),
  vocabulary_suggestions: z.array(VocabSuggestionSchema),
  pronunciation_notes: z.array(z.string()),
  proficiency_assessment: z.string(),
  score: z.number().int().min(0).max(100),
})
export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>
```

### 4.3 TypeScript Types (Database Row Types)

These mirror the Supabase table shapes and are used on both client and server.

```typescript
// src/lib/types.ts

export interface Session {
  id: string
  title: string
  status: 'active' | 'ended' | 'analyzed'
  source_language: string
  target_language: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  original_audio_url: string | null
  language: 'en' | 'es' | 'mixed' | null
  created_at: string
}

export interface Feedback {
  id: string
  session_id: string
  summary: string
  grammar_errors: GrammarError[]
  vocabulary_suggestions: VocabSuggestion[]
  pronunciation_notes: string[]
  proficiency_assessment: string | null
  score: number | null
  created_at: string
}

export interface GrammarError {
  original: string
  correction: string
  rule: string
  explanation: string
}

export interface VocabSuggestion {
  word: string
  translation: string
  example_sentence: string
  context: string
}

export interface TextChatResponse {
  reply: string
  audio_url: string | null
  message_id: string
}
```

---

## Phase 0 -- Project Scaffolding

### Goal
Set up the project structure, install all dependencies, configure linting, and verify the app runs locally.

### Directory Structure

```
language-coach/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Main chat page
│   │   ├── globals.css                   # Global styles + Tailwind
│   │   ├── history/
│   │   │   ├── page.tsx                  # Chat history list
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Session detail (transcript)
│   │   └── api/
│   │       ├── sessions/
│   │       │   ├── route.ts              # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET, PATCH, DELETE
│   │       │       └── generate-title/
│   │       │           └── route.ts      # POST
│   │       ├── messages/
│   │       │   └── route.ts              # GET, POST
│   │       ├── chat/
│   │       │   └── route.ts              # POST (text chat with Gemini)
│   │       ├── feedback/
│   │       │   └── [sessionId]/
│   │       │       ├── route.ts          # GET (retrieve feedback)
│   │       │       └── generate/
│   │       │           └── route.ts      # POST (generate feedback)
│   │       └── voice/
│   │           └── signed-url/
│   │               └── route.ts          # GET (ElevenLabs signed URL)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── mic-button.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── message-list.tsx
│   │   │   ├── text-input.tsx
│   │   │   └── feedback-panel.tsx
│   │   ├── visualizer/
│   │   │   ├── waveform-2d.tsx
│   │   │   └── waveform-3d.tsx
│   │   ├── history/
│   │   │   └── session-list.tsx
│   │   └── ui/
│   │       └── theme-toggle.tsx
│   ├── hooks/
│   │   └── use-conversation.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client (anon key)
│   │   │   └── server.ts               # Server Supabase client (service role key)
│   │   ├── gemini.ts                    # Gemini service (server-only)
│   │   ├── elevenlabs.ts               # ElevenLabs service (server-only)
│   │   ├── api.ts                       # Frontend API client (calls /api/*)
│   │   ├── schemas.ts                   # Zod schemas
│   │   ├── types.ts                     # TypeScript types
│   │   └── constants.ts                 # Shared constants (system prompt, etc.)
│   └── stores/
│       └── session-store.ts             # Zustand store
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # The SQL from Section 4.1
├── public/
├── .env.local                           # All environment variables
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── PRD.md
```

### Steps

1. **Initialize the Next.js project** from the repo root:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
   ```
   This scaffolds the project directly in `language-coach/` (not a subdirectory).

2. **Install dependencies**:
   ```bash
   npm install zustand zod @google/genai @supabase/supabase-js
   ```

3. **Create the directory structure** for all directories that `create-next-app` doesn't generate:
   - `src/app/api/sessions/`, `src/app/api/sessions/[id]/`, `src/app/api/sessions/[id]/generate-title/`
   - `src/app/api/messages/`, `src/app/api/chat/`, `src/app/api/voice/signed-url/`
   - `src/app/api/feedback/[sessionId]/`, `src/app/api/feedback/[sessionId]/generate/`
   - `src/app/history/`, `src/app/history/[id]/`
   - `src/components/chat/`, `src/components/visualizer/`, `src/components/history/`, `src/components/ui/`
   - `src/hooks/`, `src/lib/supabase/`, `src/stores/`
   - `supabase/migrations/`

4. **Create `.gitignore`** at root with entries for:
   - `node_modules/`, `.next/`, `out/`
   - `.env`, `.env.local`, `.env*.local`
   - `.vercel`

5. **Create `.env.local`** with placeholder keys (see [Environment Variables Reference](#environment-variables-reference)).

6. **Create `supabase/migrations/001_initial_schema.sql`** with the exact SQL from Section 4.1.

7. **Create `src/lib/schemas.ts`** with the Zod schemas from Section 4.2.

8. **Create `src/lib/types.ts`** with the TypeScript types from Section 4.3.

9. **Create `src/lib/constants.ts`** with the coach system prompt (shared between text-chat Route Handler and ElevenLabs agent config):
   ```typescript
   export const COACH_SYSTEM_PROMPT = `You are HablaConmigo, a friendly and encouraging bilingual language coach...`
   // (full prompt from Phase 3)
   ```

### Acceptance Criteria
- [ ] Running `npm run dev` starts Next.js on `localhost:3000` without errors.
- [ ] Visiting `localhost:3000` shows the default Next.js page.
- [ ] All directories from the structure exist.
- [ ] `npm run build` completes without TypeScript or ESLint errors.
- [ ] `.gitignore` correctly excludes `node_modules`, `.env.local`.
- [ ] `src/lib/schemas.ts` and `src/lib/types.ts` compile without errors.

---

## Phase 1 -- Backend Foundation (Next.js Route Handlers + Supabase)

### Goal
Build the API Route Handlers with Supabase integration, session CRUD, and message storage. No AI features yet -- just the data layer.

### Steps

#### 1.1 Server-Side Supabase Client (`src/lib/supabase/server.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This uses the `service_role` key which bypasses RLS. It is only used in Route Handlers (server-side). The key is a server-only env var (no `NEXT_PUBLIC_` prefix), so it is never exposed to the browser.

#### 1.2 Client-Side Supabase Client (`src/lib/supabase/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

This uses the `anon` key which respects RLS. Used for client-side reads and Realtime subscriptions.

#### 1.3 Sessions Route Handler (`src/app/api/sessions/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { SessionCreateSchema } from '@/lib/schemas'

export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = SessionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('sessions')
    .insert({ title: parsed.data.title })
    .select()
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

#### 1.4 Session Detail Route Handler (`src/app/api/sessions/[id]/route.ts`)

Implement these operations:

| Method | Description | Notes |
|--------|-------------|-------|
| `GET` | Get single session by ID | Return 404 if not found |
| `PATCH` | Update session (title, status) | Validate with `SessionUpdateSchema` |
| `DELETE` | Delete session (cascades to messages + feedback) | Return `{ deleted: true }` |

Each handler extracts `id` from `params`, calls `createServerSupabase()`, and performs the query.

#### 1.5 Messages Route Handler (`src/app/api/messages/route.ts`)

| Method | Description | Notes |
|--------|-------------|-------|
| `GET` | Get messages for a session | Read `session_id` from URL search params, order by `created_at` asc |
| `POST` | Store a new message | Validate with `MessageCreateSchema`, also update parent session's `updated_at` |

The `POST` handler should update the session timestamp:
```typescript
// After inserting the message:
await supabase
  .from('sessions')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', parsed.data.session_id)
```

#### 1.6 Voice Signed URL Route Handler (`src/app/api/voice/signed-url/route.ts`)

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const apiKey = process.env.ELEVENLABS_API_KEY

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { 'xi-api-key': apiKey! } }
  )

  if (!resp.ok) {
    const err = await resp.text()
    return NextResponse.json({ detail: `ElevenLabs error: ${err}` }, { status: resp.status })
  }

  const data = await resp.json()
  return NextResponse.json(data)
}
```

#### 1.7 Chat and Feedback Route Handlers -- Stubs Only

Create stub route files that return `501 Not Implemented`:

- `src/app/api/chat/route.ts`: `POST` returns `{ detail: "Not implemented" }` with status 501.
- `src/app/api/feedback/[sessionId]/route.ts`: `GET` returns 501.
- `src/app/api/feedback/[sessionId]/generate/route.ts`: `POST` returns 501.

These will be completed in Phase 6 and Phase 10.

#### 1.8 Health Check

Add a health check route at `src/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

### Acceptance Criteria
- [ ] `POST /api/sessions` creates a session in Supabase and returns it with a UUID.
- [ ] `GET /api/sessions` returns a list of sessions ordered by `updated_at` descending.
- [ ] `GET /api/sessions/{id}` returns 404 for a non-existent UUID.
- [ ] `DELETE /api/sessions/{id}` removes the session and all its messages.
- [ ] `POST /api/messages` creates a message linked to a session.
- [ ] `GET /api/messages?session_id={id}` returns messages ordered by `created_at`.
- [ ] `GET /api/voice/signed-url` returns a signed URL (or a clear error if the ElevenLabs API key is invalid).
- [ ] Invalid request bodies return 400 with Zod validation error details.
- [ ] All endpoints return proper error codes (400, 404, 500) with clear messages.
- [ ] `GET /api/health` returns `{"status": "ok"}`.

---

## Phase 2 -- Frontend Shell

### Goal
Build the frontend UI shell with routing, layout, API client, Zustand store, and static placeholder UI for all pages.

### Steps

#### 2.1 API Client (`src/lib/api.ts`)

Create a typed wrapper around `fetch` for calling the same-origin Route Handlers. Since the API is same-origin, no base URL configuration is needed:

```typescript
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
```

#### 2.2 Zustand Store (`src/stores/session-store.ts`)

```typescript
import { create } from 'zustand'
import type { Session, Message } from '@/lib/types'

interface SessionState {
  // Current session
  currentSession: Session | null
  messages: Message[]
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean     // AI is speaking

  // History
  sessions: Session[]

  // Actions
  setCurrentSession: (session: Session | null) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setSessions: (sessions: Session[]) => void
  setIsConnected: (connected: boolean) => void
  setIsRecording: (recording: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  reset: () => void
}
```

#### 2.3 Root Layout (`src/app/layout.tsx`)

- Full-height layout (`min-h-screen`)
- Sidebar for navigation (Chat, History) -- collapsible
- Main content area
- Use `Geist` font from `next/font`

#### 2.4 Main Chat Page (`src/app/page.tsx`)

Static placeholder layout:
- Top: Session title / "New Session" header
- Center: Empty message area with "Start a conversation" prompt
- Bottom: Control bar with microphone button (disabled), text input field (disabled), send button

#### 2.5 History Page (`src/app/history/page.tsx`)

Static placeholder:
- List of session cards showing title, date, and status
- Clicking a card will eventually navigate to the session transcript

### Acceptance Criteria
- [ ] App loads at `localhost:3000` with the layout visible.
- [ ] Sidebar shows "Chat" and "History" navigation links.
- [ ] Clicking "History" navigates to `/history`.
- [ ] The main page shows the placeholder chat UI with disabled controls.
- [ ] No console errors or hydration mismatches.
- [ ] The Zustand store initializes correctly (verify with React DevTools or a simple `console.log`).
- [ ] `api.ts` functions are importable and typed correctly (compile check only -- no runtime calls yet).

---

## Phase 3 -- Voice Conversation Engine (ElevenLabs Conversational AI)

### Goal
Implement the core voice conversation loop: the user clicks a microphone button, the browser connects to ElevenLabs Conversational AI via WebSocket, audio flows bidirectionally, and the AI coach speaks back.

### Important Context: ElevenLabs Agent Configuration

Before this phase, the ElevenLabs Conversational AI agent must be created in the ElevenLabs dashboard (https://elevenlabs.io/app/conversational-ai). Configure:

- **Agent name**: "HablaConmigo Coach"
- **LLM**: Select Gemini 2.5 Flash (natively supported)
- **System prompt** (set in the dashboard):

```
You are HablaConmigo, a friendly and encouraging bilingual language coach specializing in Mexican Spanish for English speakers. Your personality is warm, patient, and culturally aware.

## Core Behavior

1. ALWAYS start the conversation by greeting the user in English and asking what they'd like to practice today. Gauge their level in the first few exchanges.

2. For BEGINNERS: Teach primarily in English, introducing Spanish words and simple phrases. Repeat key vocabulary. Use lots of encouragement.

3. For INTERMEDIATE learners: Mix English and Spanish. Conduct practice segments entirely in Spanish, then switch to English for explanations. Progressively increase Spanish usage.

4. For ADVANCED learners: Speak primarily in Mexican Spanish. Only switch to English for nuanced grammar explanations or when the user explicitly asks.

## Mexican Spanish Specifics

- Use "tú" (not "vos") for informal address
- Use Mexican vocabulary: "platicar" (not "charlar"), "carro" (not "coche"), "computadora" (not "ordenador"), "departamento" (not "piso"), "padre/chido" (cool), "neta" (truth/really), "mande" (polite "what?")
- Reference Mexican culture, food, places, and customs in examples
- Use Mexican pronunciation guidance (e.g., "ll" as [j], not [ʃ])

## Conversation Management

- YOU decide the lesson content, topic, and length of practice segments
- Mix teaching with practice: explain a concept, then practice it in conversation
- After practice segments, provide brief corrections and encouragement in English
- Keep sessions engaging -- vary between vocabulary, grammar, conversation practice, and cultural knowledge
- If the user makes an error in Spanish, gently correct them and explain in English
- Track which topics you've covered in the conversation and build on them

## Speech Patterns Analysis

When the user speaks in Spanish, pay attention to:
- Verb conjugation accuracy
- Gender agreement (el/la, -o/-a endings)
- Ser vs. estar usage
- Preterite vs. imperfect tense
- Subjunctive usage (intermediate+)
- Vocabulary range and appropriateness
- Sentence structure

Provide corrections naturally within the conversation flow, not as a separate "grading" segment.
```

- **Voice**: Select a voice that sounds natural in both English and Spanish (use the ElevenLabs voice library to find a bilingual voice, or use a Multilingual v2-compatible voice)
- **Turn-taking**: Normal eagerness, 10-second turn timeout
- **Interruptions**: Enabled

### Steps

#### 3.1 Custom Hook: `useConversation` (`src/hooks/use-conversation.ts`)

This is the most critical piece of code in the application. It manages the WebSocket connection to ElevenLabs Conversational AI.

**Responsibilities:**
1. Get a signed WebSocket URL from the Route Handler at `/api/voice/signed-url`.
2. Open a WebSocket connection to ElevenLabs.
3. Capture microphone audio using the Web Audio API.
4. Send audio chunks (base64-encoded) to the WebSocket.
5. Receive and play back audio chunks from the agent.
6. Receive and emit transcript events (`user_transcript`, `agent_response`).
7. Handle connection lifecycle (connect, disconnect, errors).
8. Respond to `ping` events with `pong`.
9. Handle `interruption` events (stop playback).

**WebSocket Message Types to Handle:**

Incoming (server -> client):
```typescript
type ElevenLabsEvent =
  | { type: 'conversation_initiation_metadata'; conversation_id: string }
  | { type: 'user_transcript'; user_transcript: { text: string; is_final: boolean } }
  | { type: 'agent_response'; agent_response: { text: string } }  // combined with agent_response_correction
  | { type: 'audio'; audio: { chunk: string; alignment?: object } }
  | { type: 'interruption' }
  | { type: 'ping'; ping_event: { event_id: number; ping_ms?: number } }
```

Outgoing (client -> server):
```typescript
// Audio chunk
{ user_audio_chunk: string }  // base64-encoded audio

// Pong response
{ type: 'pong', event_id: number }
```

**Audio Pipeline:**
1. `navigator.mediaDevices.getUserMedia({ audio: true })` to get mic stream.
2. Create an `AudioContext` and `MediaStreamSource`.
3. Use a `ScriptProcessorNode` or `AudioWorkletNode` to capture raw PCM audio.
4. Convert Float32Array samples to 16-bit PCM, then base64-encode.
5. Send as `{ user_audio_chunk: base64String }` over WebSocket.
6. For playback: decode incoming base64 audio chunks and queue them in an `AudioContext` for gapless playback.

**Hook API:**
```typescript
interface UseConversationReturn {
  connect: (sessionId: string) => Promise<void>
  disconnect: () => void
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean    // AI is currently speaking
  error: string | null
  conversationId: string | null

  // Audio analysis data for waveform visualizer
  userAnalyser: AnalyserNode | null
  agentAnalyser: AnalyserNode | null

  // Transcript events
  onUserTranscript: (callback: (text: string, isFinal: boolean) => void) => void
  onAgentResponse: (callback: (text: string) => void) => void
}
```

#### 3.2 Microphone Button Component (`src/components/chat/mic-button.tsx`)

- Large, centered circular button.
- States: idle (gray), connecting (pulsing yellow), recording (pulsing red), error (red with icon).
- On click: calls `connect()` from the hook to start a session.
- On click again: calls `disconnect()` to end the session.
- Shows a visual indicator when the AI is speaking.

#### 3.3 Audio Playback Manager

Embedded in the `useConversation` hook. Requirements:
- Queue incoming audio chunks and play them sequentially without gaps.
- Stop playback immediately when an `interruption` event is received.
- Track playback state (`isSpeaking`) for the waveform visualizer.
- Use `AudioContext.decodeAudioData()` for decoding or raw PCM playback depending on the format ElevenLabs sends.

#### 3.4 Session Auto-Creation

When the user clicks the mic button for the first time:
1. Call `api.createSession()` to create a new session in Supabase via the Route Handler.
2. Pass the session ID to `connect(sessionId)`.
3. Update the Zustand store with the new session.

#### 3.5 Wire Up to Main Page

Update `src/app/page.tsx`:
- Import and use the `useConversation` hook.
- Wire the mic button to the hook's `connect`/`disconnect`.
- Display connection status (connecting, connected, disconnected).
- Audio plays through the browser's default audio output.

### Acceptance Criteria
- [ ] Clicking the mic button requests microphone permission.
- [ ] After granting permission, the WebSocket connection is established (check browser Network tab for the `wss://` connection).
- [ ] The AI coach speaks a greeting through the browser speakers.
- [ ] The user can speak and the AI responds appropriately.
- [ ] The mic button shows correct visual states (idle, connecting, recording).
- [ ] Clicking the mic button again disconnects the WebSocket.
- [ ] The `ping`/`pong` keepalive works (connection doesn't drop after 30s).
- [ ] If the user interrupts the AI mid-speech, the AI stops speaking.
- [ ] A new session is created in Supabase when the conversation starts.
- [ ] No audio glitches, echoes, or feedback loops.
- [ ] Errors (mic denied, WebSocket failure) are displayed to the user.

---

## Phase 4 -- Live Chat Transcript

### Goal
Display a real-time scrolling transcript of the conversation as it happens, styled like a modern AI chatbot interface (similar to ChatGPT/Claude).

### Steps

#### 4.1 Capture Transcript Events

In the `useConversation` hook (from Phase 3), the WebSocket already emits `user_transcript` and `agent_response` events. Wire these to the Zustand store:

- On `user_transcript` (with `is_final: true`): Create a `Message` object with `role: "user"` and add to `messages` array in the store.
- On `agent_response`: Create a `Message` object with `role: "assistant"`. Note: `agent_response` events may arrive in chunks. Buffer them until the next `user_transcript` or `audio` silence, then commit the full message.
- On partial `user_transcript` (with `is_final: false`): Show as a grayed-out "typing" indicator in the transcript, but do not persist it.

#### 4.2 Persist Messages to Route Handlers

After each finalized message (user or assistant), call `api.createMessage()` to persist it to Supabase via the `/api/messages` Route Handler. Do this asynchronously (fire-and-forget) so it doesn't block the UI.

#### 4.3 Message Bubble Component (`src/components/chat/message-bubble.tsx`)

Design:
- **User messages**: Right-aligned, colored bubble (e.g., blue/indigo), white text.
- **Assistant messages**: Left-aligned, neutral bubble (e.g., gray/white), dark text. Show a small avatar or coach icon.
- **System messages**: Centered, subtle text, no bubble.
- Each bubble shows: the message text, a small timestamp.
- Support for mixed-language content (no special rendering needed; just display the text).

#### 4.4 Message List Component (`src/components/chat/message-list.tsx`)

- Scrollable container that fills the available space.
- Auto-scrolls to the bottom when new messages arrive.
- Shows a "Start a conversation" empty state when there are no messages.
- Shows a typing indicator when a partial `user_transcript` is being received.
- Shows a "thinking" indicator when the AI is processing (after user stops speaking, before AI starts responding).

#### 4.5 Update Main Page Layout

The main page (`page.tsx`) should now show:
- The message list in the center, taking up most of the vertical space.
- The mic button and control bar at the bottom.
- The session title at the top.

### Acceptance Criteria
- [ ] When the user speaks, their finalized words appear as a right-aligned bubble in real-time.
- [ ] When the AI responds, its text appears as a left-aligned bubble.
- [ ] Partial (interim) user speech shows as a grayed-out indicator that updates in real-time.
- [ ] The transcript auto-scrolls to show the latest message.
- [ ] Messages are persisted to Supabase (verify in Supabase dashboard).
- [ ] The empty state ("Start a conversation") shows when no messages exist.
- [ ] Messages have readable timestamps.
- [ ] The layout does not jump or flicker as new messages are added.

---

## Phase 5 -- Chat History

### Goal
Build a history view where users can browse all past sessions, click into one to view the full transcript, and delete sessions.

### Steps

#### 5.1 Sessions List Component (`src/components/history/session-list.tsx`)

- Fetches sessions from `api.getSessions()` on mount.
- Displays each session as a card: title, date ("2 hours ago" or "Jan 15, 2025"), status badge, message preview (first 50 chars of the last message).
- Sessions sorted by `updated_at` descending (most recent first).
- Each card is clickable -- navigates to `/history/[id]`.
- Delete button (with confirmation) on each card.
- "No sessions yet" empty state.

#### 5.2 Session Detail Page (`src/app/history/[id]/page.tsx`)

- Fetches the session and its messages from the API.
- Displays the full transcript using the same `MessageList` and `MessageBubble` components from Phase 4.
- Read-only (no mic button, no text input).
- Back button to return to the history list.
- Session title displayed at the top.
- If feedback exists for this session, show a "View Feedback" button/section (content populated in Phase 10).

#### 5.3 Sidebar Session List

Add a condensed session list to the sidebar (visible on the main chat page):
- Shows the 10 most recent sessions as a compact list (title + date).
- "New Chat" button at the top that starts a new session.
- Clicking a past session opens it in read-only mode (same as `/history/[id]`).
- "View All" link at the bottom navigates to `/history`.

#### 5.4 Session Title Auto-Generation

When a session is created, it gets the default title "New Session". After the first 3 message exchanges, automatically generate a descriptive title:
- The frontend calls `api.generateTitle(sessionId)`.
- The Route Handler at `/api/sessions/[id]/generate-title` fetches the first ~6 messages from Supabase, sends them to Gemini with the prompt: "Generate a concise 3-5 word title for this Spanish language learning session. Return only the title, nothing else."
- The Route Handler updates the session title in Supabase and returns the updated session.

Implementation for `src/app/api/sessions/[id]/generate-title/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getGeminiClient } from '@/lib/gemini'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerSupabase()

  // Fetch first 6 messages
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', id)
    .order('created_at')
    .limit(6)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ detail: 'No messages found' }, { status: 400 })
  }

  const ai = getGeminiClient()
  const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n')
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a concise 3-5 word title for this Spanish language learning session. Return only the title, nothing else.\n\n${transcript}`,
  })

  const title = response.text?.trim() || 'Spanish Practice'
  const { data, error } = await supabase
    .from('sessions')
    .update({ title })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### Acceptance Criteria
- [ ] `/history` page displays all past sessions with titles and dates.
- [ ] Clicking a session card navigates to `/history/[id]` and shows the full transcript.
- [ ] The transcript in history mode is read-only (no input controls).
- [ ] Deleting a session removes it from the list and from Supabase.
- [ ] The sidebar shows recent sessions and a "New Chat" button.
- [ ] Session titles are auto-generated after the first few exchanges.
- [ ] The "New Chat" button creates a new session and navigates to the main chat page.
- [ ] Empty states display correctly when there are no sessions.

---

## Phase 6 -- Text Input Mode

### Goal
Allow the user to type messages instead of (or in addition to) speaking. Typed messages go through the Route Handler at `/api/chat` to Gemini directly, bypassing ElevenLabs Conversational AI.

### Steps

#### 6.1 Text Input Component (`src/components/chat/text-input.tsx`)

- Text input field at the bottom of the chat interface, next to the mic button.
- Send button (or Enter key) to submit.
- Disabled while a voice conversation is active (mic is on).
- Auto-focuses when the user is not in a voice conversation.
- Placeholder text: "Type a message in English or Spanish..."
- Multi-line support (Shift+Enter for newline, Enter to send).

#### 6.2 Gemini Service (`src/lib/gemini.ts`)

Server-only module that wraps the `@google/genai` SDK:

```typescript
import { GoogleGenAI } from '@google/genai'

let client: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }
  return client
}
```

#### 6.3 Chat Route Handler (`src/app/api/chat/route.ts`)

Replace the Phase 1 stub with the full implementation:

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getGeminiClient } from '@/lib/gemini'
import { TextChatRequestSchema } from '@/lib/schemas'
import { COACH_SYSTEM_PROMPT } from '@/lib/constants'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = TextChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 })
  }

  const { session_id, message } = parsed.data
  const supabase = createServerSupabase()

  // 1. Fetch existing messages for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at')

  // 2. Build Gemini conversation
  const ai = getGeminiClient()
  const contents = (history || []).map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: COACH_SYSTEM_PROMPT,
      temperature: 0.7,
    },
  })

  const reply = response.text || ''

  // 3. Store both messages
  const { data: userMsg } = await supabase
    .from('messages')
    .insert({ session_id, role: 'user', content: message })
    .select()
    .single()

  const { data: assistantMsg } = await supabase
    .from('messages')
    .insert({ session_id, role: 'assistant', content: reply })
    .select()
    .single()

  // 4. Update session timestamp
  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', session_id)

  return NextResponse.json({
    reply,
    audio_url: null,
    message_id: assistantMsg?.id || '',
  })
}
```

#### 6.4 Optional: TTS for Text Responses

Add an option to hear the AI's text response spoken aloud:
- After getting the text response from Gemini, call the ElevenLabs TTS API to generate audio.
- Use `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream` with `model_id: "eleven_multilingual_v2"`.
- Return the audio as a streaming response or store it in Supabase Storage and return the URL.
- The frontend plays the audio using an `<audio>` element.

This is **optional** for MVP -- mark it as an enhancement. The text response alone is sufficient.

#### 6.5 Frontend Integration

Update `page.tsx`:
- When the user submits text, call `api.sendTextMessage()`.
- Show the user's message immediately in the transcript (optimistic update).
- Show a "typing" indicator while waiting for the response.
- When the response arrives, add the assistant message to the transcript.
- If audio is available, show a "Play" button on the assistant message bubble.

### Acceptance Criteria
- [ ] The text input field is visible at the bottom of the chat interface.
- [ ] Typing a message and pressing Enter sends it and shows the user's message in the transcript.
- [ ] The AI responds with a text message that appears in the transcript.
- [ ] The text input is disabled while a voice conversation is active.
- [ ] Conversation history is maintained across text messages in the same session.
- [ ] The AI's responses are contextually appropriate (it uses the coach persona, teaches Spanish).
- [ ] Both text and voice messages appear in the same transcript chronologically.

---

## Phase 7 -- Waveform Visualizer (2D)

### Goal
Add a 2D waveform visualizer that shows real-time audio activity for both the user's microphone input and the AI's speech output.

### Steps

#### 7.1 Audio Analysis Setup

In the `useConversation` hook, expose `AnalyserNode` data:

1. Create two `AnalyserNode` instances -- one for user mic input, one for AI playback.
2. Connect the user's `MediaStreamSource` to the user `AnalyserNode`.
3. Connect the AI's audio playback chain to the AI `AnalyserNode`.
4. Expose `getByteTimeDomainData()` or `getByteFrequencyData()` from both analysers.

```typescript
// In useConversation hook
const userAnalyser = audioContext.createAnalyser()
userAnalyser.fftSize = 256

const agentAnalyser = audioContext.createAnalyser()
agentAnalyser.fftSize = 256

// Expose these on the hook return value
return {
  ...existingReturn,
  userAnalyser,
  agentAnalyser,
}
```

#### 7.2 Waveform Canvas Component (`src/components/visualizer/waveform-2d.tsx`)

- HTML5 `<canvas>` element.
- Uses `requestAnimationFrame` for smooth 60fps rendering.
- Draws two waveforms:
  - **User waveform** (bottom or left): Rendered in one color (e.g., blue/indigo).
  - **AI waveform** (top or right): Rendered in another color (e.g., green/emerald).
- Waveform style: Horizontal bars or smooth curve (frequency domain looks better than time domain for this use case).
- Fades to flat line when no audio is active.
- Responsive: fills its container width.

Rendering approach:
```typescript
function draw(analyser: AnalyserNode, canvas: HTMLCanvasElement, color: string) {
  const ctx = canvas.getContext('2d')!
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const barWidth = canvas.width / bufferLength
  let x = 0

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height
    ctx.fillStyle = color
    ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
    x += barWidth
  }
}
```

#### 7.3 Placement

Position the waveform visualizer between the message list and the control bar (mic button + text input). It should be a narrow horizontal strip (~60-80px tall) that's always visible during a voice conversation but hidden/collapsed when there's no active session.

#### 7.4 Idle State

When no voice conversation is active, show a flat line or subtle ambient animation to indicate the visualizer is ready.

### Acceptance Criteria
- [ ] During a voice conversation, the user's waveform animates when the user speaks.
- [ ] The AI's waveform animates when the AI is speaking.
- [ ] Both waveforms are visually distinct (different colors).
- [ ] The animation is smooth (no jank or frame drops).
- [ ] The visualizer is hidden or collapsed when no voice session is active.
- [ ] The visualizer is responsive (adapts to window width).
- [ ] No performance impact on the conversation (audio quality is unaffected).

---

## Phase 8 -- Waveform Visualizer (3D Upgrade)

### Goal
Replace or augment the 2D waveform with a 3D visualization using React Three Fiber and Three.js. The visualizer should be a visually impressive, reactive 3D scene.

### Steps

#### 8.1 Install Dependencies

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

#### 8.2 3D Waveform Component (`src/components/visualizer/waveform-3d.tsx`)

Create a 3D scene with React Three Fiber:

**Concept**: A circular or spherical mesh that deforms based on audio frequency data. Two entities -- one for user audio, one for AI audio -- orbiting or facing each other.

**Implementation approach**:
1. Create a `Canvas` from `@react-three/fiber`.
2. Inside the canvas, create two `Mesh` objects (e.g., `IcosahedronGeometry` or `SphereGeometry` with high segment count).
3. On each animation frame, read frequency data from the `AnalyserNode` and deform the mesh vertices based on the frequency amplitudes.
4. Use different materials/colors for user vs. AI (e.g., user = blue emissive, AI = green emissive).
5. Add subtle lighting (ambient + point light) and a dark background.
6. Use `@react-three/drei`'s `OrbitControls` for optional user interaction (let the user rotate the view).

**Vertex deformation approach**:
```typescript
function AudioReactiveMesh({ analyser, color }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const originalPositions = useRef<Float32Array | null>(null)

  useFrame(() => {
    if (!meshRef.current || !analyser) return
    const geometry = meshRef.current.geometry
    const positions = geometry.attributes.position

    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(positions.array)
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    for (let i = 0; i < positions.count; i++) {
      const freqIndex = i % dataArray.length
      const amplitude = dataArray[freqIndex] / 255
      const orig = originalPositions.current

      positions.setXYZ(
        i,
        orig[i * 3] * (1 + amplitude * 0.3),
        orig[i * 3 + 1] * (1 + amplitude * 0.3),
        orig[i * 3 + 2] * (1 + amplitude * 0.3),
      )
    }
    positions.needsUpdate = true
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  )
}
```

#### 8.3 Toggle Between 2D and 3D

- Add a settings toggle to switch between 2D and 3D waveform modes.
- Default to 3D on desktop, 2D on mobile (check with `window.innerWidth` or a media query).
- The toggle state is stored in `localStorage`.

#### 8.4 Performance Considerations

- Use `frameloop="demand"` on the R3F `Canvas` if GPU usage is a concern.
- Reduce geometry complexity on low-end devices.
- The 3D visualizer should not interfere with audio processing.

### Acceptance Criteria
- [ ] The 3D visualizer renders two reactive meshes that respond to audio.
- [ ] User and AI audio produce visually distinct deformations.
- [ ] The visualization is smooth at 60fps on a mid-range laptop.
- [ ] The user can toggle between 2D and 3D modes.
- [ ] The 3D scene has proper lighting and looks polished.
- [ ] No WebGL errors or crashes.
- [ ] Mobile devices fall back to 2D mode.

---

## Phase 9 -- Light/Dark Mode

### Goal
Implement a light mode and dark mode with a toggle switch. The mode persists across sessions.

### Steps

#### 9.1 Theme Provider

Use Tailwind CSS's built-in dark mode support via the `class` strategy:

In `tailwind.config.ts`:
```typescript
export default {
  darkMode: 'class',
  // ... rest of config
}
```

#### 9.2 Theme Store

Add to the Zustand store (or create a separate store):

```typescript
interface ThemeState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}
```

Persist to `localStorage`. On initial load, check:
1. `localStorage` value (if exists, use it).
2. `prefers-color-scheme` media query (if no localStorage value).
3. Default to `dark`.

#### 9.3 Theme Toggle Component (`src/components/ui/theme-toggle.tsx`)

- A button in the sidebar or header.
- Shows a sun icon in dark mode, moon icon in light mode.
- On click, toggles the `dark` class on `<html>` and updates the store.

#### 9.4 Apply Theme Classes

Go through all components and ensure they use Tailwind's `dark:` variant for colors:
- Background: `bg-white dark:bg-gray-950`
- Text: `text-gray-900 dark:text-gray-100`
- Borders: `border-gray-200 dark:border-gray-800`
- Message bubbles: User = `bg-indigo-600 dark:bg-indigo-500`, AI = `bg-gray-100 dark:bg-gray-800`
- Waveform canvas: Adapt colors for visibility in both modes.
- 3D scene: Adjust lighting/background.

#### 9.5 Prevent Flash of Wrong Theme

In `layout.tsx`, add a blocking `<script>` in `<head>` that reads `localStorage` and sets the `dark` class before React hydrates:

```typescript
// In layout.tsx <head>
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  `
}} />
```

### Acceptance Criteria
- [ ] The app defaults to dark mode.
- [ ] A toggle button switches between light and dark mode.
- [ ] The selected mode persists across page reloads.
- [ ] There is no flash of the wrong theme on page load.
- [ ] All components look correct in both modes (no unreadable text, missing borders, etc.).
- [ ] The waveform visualizer adapts to both modes.
- [ ] The 3D visualizer looks good in both modes.

---

## Phase 10 -- Post-Session Feedback & Analysis

### Goal
After a conversation session ends, generate a detailed feedback report analyzing the user's Spanish, including grammar errors, vocabulary suggestions, and a proficiency assessment.

### Steps

#### 10.1 Gemini Analysis Function (`src/lib/gemini.ts`)

Add an analysis function to the existing Gemini service module:

```typescript
import { getGeminiClient } from './gemini'
import { FeedbackAnalysisSchema } from './schemas'
import type { Message } from './types'

const ANALYSIS_PROMPT = `You are analyzing a Spanish language learning session transcript between a student and their AI coach. The student is an English speaker learning Mexican Spanish.

Analyze ONLY the student's (user's) messages in Spanish. Provide:

1. **Grammar Errors**: List each grammar mistake, with the original text, the correction, the grammar rule violated, and a clear English explanation.

2. **Vocabulary Suggestions**: Based on the topics discussed, suggest 3-5 new Mexican Spanish words/phrases the student should learn next. Include translations, example sentences, and context for when to use them.

3. **Pronunciation Notes**: Based on common English-speaker mistakes with the words they used, note any likely pronunciation issues (you can't hear them, but infer from the vocabulary used).

4. **Proficiency Assessment**: Estimate the student's CEFR level (A1-C2) based on this session, with a brief justification.

5. **Summary**: A 2-3 sentence encouraging summary of how the session went, highlighting strengths and one key area to improve.

6. **Score**: A score from 0-100 representing overall performance in this session.

Return your analysis as structured JSON matching the provided schema.`

export async function analyzeSession(messages: Message[]) {
  const ai = getGeminiClient()
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
    .join('\n')

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Session transcript:\n\n${transcript}`,
    config: {
      systemInstruction: ANALYSIS_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          grammar_errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                original: { type: 'string' },
                correction: { type: 'string' },
                rule: { type: 'string' },
                explanation: { type: 'string' },
              },
              required: ['original', 'correction', 'rule', 'explanation'],
            },
          },
          vocabulary_suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                translation: { type: 'string' },
                example_sentence: { type: 'string' },
                context: { type: 'string' },
              },
              required: ['word', 'translation', 'example_sentence', 'context'],
            },
          },
          pronunciation_notes: { type: 'array', items: { type: 'string' } },
          proficiency_assessment: { type: 'string' },
          score: { type: 'integer' },
        },
        required: ['summary', 'grammar_errors', 'vocabulary_suggestions',
                   'pronunciation_notes', 'proficiency_assessment', 'score'],
      },
      temperature: 0.3,
    },
  })

  const parsed = JSON.parse(response.text || '{}')
  return FeedbackAnalysisSchema.parse(parsed) // Validate with Zod
}
```

#### 10.2 Feedback Route Handlers

**`src/app/api/feedback/[sessionId]/generate/route.ts`** (replace stub):

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { analyzeSession } from '@/lib/gemini'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = createServerSupabase()

  // 1. Verify session exists and is ended
  const { data: session } = await supabase
    .from('sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ detail: 'Session not found' }, { status: 404 })
  if (session.status !== 'ended') {
    return NextResponse.json({ detail: 'Session must be ended before generating feedback' }, { status: 400 })
  }

  // 2. Fetch all messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')

  if (!messages || messages.length === 0) {
    return NextResponse.json({ detail: 'No messages found' }, { status: 400 })
  }

  // 3. Analyze with Gemini
  const analysis = await analyzeSession(messages)

  // 4. Store feedback
  const { data: feedback, error } = await supabase
    .from('feedback')
    .upsert({
      session_id: sessionId,
      ...analysis,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })

  // 5. Update session status
  await supabase.from('sessions').update({ status: 'analyzed' }).eq('id', sessionId)

  return NextResponse.json(feedback)
}
```

**`src/app/api/feedback/[sessionId]/route.ts`** (replace stub):

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !data) return NextResponse.json({ detail: 'Feedback not found' }, { status: 404 })
  return NextResponse.json(data)
}
```

#### 10.3 End Session Flow

When the user clicks the mic button to end a voice conversation (or clicks an explicit "End Session" button):

1. Frontend calls `api.updateSession(sessionId, { status: 'ended' })`.
2. Frontend calls `api.generateFeedback(sessionId)`.
3. While feedback is generating, show a loading state: "Analyzing your session..."
4. When feedback arrives, display it in a modal or expandable section below the transcript.

#### 10.4 Feedback Display Component (`src/components/chat/feedback-panel.tsx`)

A panel that shows:
- **Summary** at the top with the score as a large number or badge.
- **Proficiency Assessment**: CEFR level badge (A1/A2/B1/B2/C1/C2).
- **Grammar Errors**: Expandable list with original -> correction, rule, and explanation.
- **Vocabulary Suggestions**: Cards with the word, translation, example sentence.
- **Pronunciation Notes**: Simple list.

This panel appears:
- After a session ends (auto-generated).
- In the history detail view for analyzed sessions.

### Acceptance Criteria
- [ ] When a session ends, feedback is automatically generated.
- [ ] The feedback includes a summary, grammar errors, vocabulary, pronunciation notes, proficiency, and score.
- [ ] Grammar errors are specific and reference actual text from the transcript.
- [ ] The feedback panel displays clearly with proper formatting.
- [ ] Feedback is persisted in Supabase and available in the history view.
- [ ] The loading state shows while feedback is being generated.
- [ ] If the session has no user messages in Spanish, the feedback gracefully handles this ("No Spanish speech detected").
- [ ] `GET /api/feedback/{sessionId}` returns 404 if no feedback exists yet.

---

## Phase 11 -- Polish, Testing & Deployment

### Goal
Final polish, error handling, performance optimization, and deployment to Vercel.

### Steps

#### 11.1 Error Handling

- **Client components**: Global error boundary component. Toast notifications for API errors. Retry logic for failed API calls.
- **Route Handlers**: Consistent error response format: `{"detail": "Error message"}`. Try/catch around all external API calls (Gemini, ElevenLabs, Supabase). Return appropriate HTTP status codes.

#### 11.2 Loading States

- Skeleton loaders for the session list and message history.
- Spinner/pulse animation for the "generating feedback" state.
- Disabled state for all interactive elements while loading.

#### 11.3 Responsive Design

- The app should work on desktop (1024px+), tablet (768px), and mobile (375px).
- On mobile: sidebar collapses to a hamburger menu, waveform visualizer defaults to 2D, mic button is prominently placed.
- Test all breakpoints.

#### 11.4 Accessibility

- All interactive elements are keyboard-navigable.
- Proper ARIA labels for the mic button states.
- Screen reader announcements for new messages.
- Focus management when modals open/close.
- Sufficient color contrast in both light and dark modes.

#### 11.5 Performance

- Memoize heavy components (`MessageList`, `Waveform`) with `React.memo`.
- Virtualize the message list if sessions exceed 100 messages (use `react-window` or similar).
- Debounce the partial transcript updates (no more than 10 updates/second).
- Ensure the 3D visualizer uses `dispose()` to clean up geometries on unmount.

#### 11.6 Deployment (Vercel)

1. Push the repository to GitHub.
2. Connect the GitHub repo to Vercel.
3. Vercel auto-detects the Next.js project. No special configuration needed -- the root directory contains `next.config.ts` and `package.json`.
4. Set environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_AGENT_ID`
   - `GEMINI_API_KEY`
5. Deploy and verify.

**Vercel Function Timeout Note**: The free tier has a 10-second function timeout. The feedback generation endpoint (Phase 10) calls Gemini with a potentially long transcript and may exceed this. Mitigations:
- Gemini 2.5 Flash typically responds in 3-8 seconds for analysis tasks, which fits within the limit.
- If timeouts occur, upgrade to Vercel Pro ($20/month, 60-second timeout) or switch the feedback endpoint to use Vercel's streaming response pattern to keep the connection alive.

#### 11.7 Supabase Production Setup

1. Run the migration SQL from `supabase/migrations/001_initial_schema.sql` against the production Supabase instance.
2. Verify RLS policies are applied.
3. Enable Realtime on the `messages` and `sessions` tables via the Supabase dashboard (Database > Publications > `supabase_realtime` > add tables).

### Acceptance Criteria
- [ ] The app is deployed and accessible at a public Vercel URL.
- [ ] Voice conversations work end-to-end in production.
- [ ] Text chat works end-to-end in production.
- [ ] Chat history is persistent across browser sessions.
- [ ] Post-session feedback generates correctly.
- [ ] No console errors in production.
- [ ] The app is responsive on mobile, tablet, and desktop.
- [ ] Light and dark mode both work in production.
- [ ] The waveform visualizer works in production.
- [ ] Error states display correctly (e.g., mic denied, API down).
- [ ] The app loads in under 3 seconds on a broadband connection.

---

## Environment Variables Reference

All environment variables live in a single `.env.local` file at the project root.

```env
# ---- Public (exposed to browser) ----

# Supabase (read-only, anon key)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ---- Server-only (Route Handlers only, never exposed to browser) ----

# Supabase (service role key, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ElevenLabs
ELEVENLABS_API_KEY=xi_...
ELEVENLABS_AGENT_ID=agent_...

# Google Gemini
GEMINI_API_KEY=AIza...
```

**Important**: Only variables prefixed with `NEXT_PUBLIC_` are visible to the browser. All other variables are server-only and are accessible only in Route Handlers and Server Components.

---

## API Contract Reference

### Next.js Route Handlers (Complete)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/health` | Health check | None |
| `POST` | `/api/sessions` | Create session | None |
| `GET` | `/api/sessions` | List sessions | None |
| `GET` | `/api/sessions/[id]` | Get session | None |
| `PATCH` | `/api/sessions/[id]` | Update session | None |
| `DELETE` | `/api/sessions/[id]` | Delete session | None |
| `POST` | `/api/sessions/[id]/generate-title` | Auto-generate title | None |
| `POST` | `/api/messages` | Store message | None |
| `GET` | `/api/messages?session_id={id}` | Get messages | None |
| `POST` | `/api/chat` | Text chat with AI | None |
| `GET` | `/api/voice/signed-url` | Get ElevenLabs signed URL | None |
| `POST` | `/api/feedback/[sessionId]/generate` | Generate feedback | None |
| `GET` | `/api/feedback/[sessionId]` | Get feedback | None |

### ElevenLabs Endpoints (External)

| Protocol | URL | Purpose |
|----------|-----|---------|
| WSS | `wss://api.elevenlabs.io/v1/convai/conversation?agent_id={id}` | Real-time voice conversation |
| GET | `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={id}` | Get signed WebSocket URL |
| POST | `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream` | Text-to-speech (text mode) |
| POST | `https://api.elevenlabs.io/v1/speech-to-text` | Batch transcription (if needed) |

### Supabase Tables

| Table | Purpose | Realtime |
|-------|---------|----------|
| `sessions` | Conversation sessions | Yes |
| `messages` | Chat messages | Yes |
| `feedback` | Post-session analysis | No |
