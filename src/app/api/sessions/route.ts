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
