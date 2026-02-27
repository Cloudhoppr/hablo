import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { SessionUpdateSchema } from '@/lib/schemas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ detail: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = SessionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('sessions')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ detail: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerSupabase()

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
