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
