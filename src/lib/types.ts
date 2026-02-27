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
