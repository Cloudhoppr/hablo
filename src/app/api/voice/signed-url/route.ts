import { NextResponse } from 'next/server'

export async function GET() {
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!agentId || !apiKey) {
    return NextResponse.json(
      { detail: 'ElevenLabs configuration missing' },
      { status: 500 }
    )
  }

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { 'xi-api-key': apiKey } }
  )

  if (!resp.ok) {
    const err = await resp.text()
    return NextResponse.json(
      { detail: `ElevenLabs error: ${err}` },
      { status: resp.status }
    )
  }

  const data = await resp.json()
  return NextResponse.json(data)
}
