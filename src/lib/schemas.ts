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
