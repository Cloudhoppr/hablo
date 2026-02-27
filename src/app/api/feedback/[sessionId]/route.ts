import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ detail: 'Not implemented' }, { status: 501 })
}
