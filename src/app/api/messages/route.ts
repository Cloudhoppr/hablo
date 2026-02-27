import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { MessageCreateSchema } from '@/lib/schemas'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ detail: 'session_id is required' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = MessageCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('messages')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })

  // Update parent session's updated_at
  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', parsed.data.session_id)

  return NextResponse.json(data, { status: 201 })
}
