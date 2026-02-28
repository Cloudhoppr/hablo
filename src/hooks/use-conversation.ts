'use client'

import { useRef, useState, useCallback } from 'react'
import { api } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types for ElevenLabs Conversational AI WebSocket events
// ---------------------------------------------------------------------------

type ElevenLabsIncomingEvent =
  | { type: 'conversation_initiation_metadata'; conversation_initiation_metadata_event: { conversation_id: string; agent_output_audio_format?: string } }
  | { type: 'user_transcript'; user_transcription_event: { user_transcript: string } }
  | { type: 'agent_response'; agent_response_event: { agent_response: string } }
  | { type: 'agent_response_correction'; agent_response_correction_event: { corrected_agent_response: string; original_agent_response: string } }
  | { type: 'audio'; audio_event: { audio_base_64: string; event_id?: number } }
  | { type: 'interruption'; interruption_event: { event_id: number } }
  | { type: 'ping'; ping_event: { event_id: number; ping_ms?: number } }

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseConversationReturn {
  connect: (sessionId: string) => Promise<void>
  disconnect: () => void
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean
  error: string | null
  conversationId: string | null

  // AnalyserNodes for waveform visualizer (Phase 7)
  userAnalyser: AnalyserNode | null
  agentAnalyser: AnalyserNode | null

  // Transcript event subscriptions
  onUserTranscript: (callback: (text: string) => void) => void
  onAgentResponse: (callback: (text: string) => void) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Float32 PCM samples to Int16 PCM buffer */
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

/** Downsample Float32 PCM from sourceSampleRate to targetSampleRate */
function downsample(float32: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  if (sourceSampleRate === targetSampleRate) return float32
  const ratio = sourceSampleRate / targetSampleRate
  const newLength = Math.round(float32.length / ratio)
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.round(i * ratio)
    result[i] = float32[Math.min(srcIndex, float32.length - 1)]
  }
  return result
}

/** Encode an Int16Array to a base64 string */
function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Decode a base64-encoded PCM Int16 chunk into a playable AudioBuffer */
function pcmBase64ToAudioBuffer(ctx: AudioContext, base64: string, sampleRate: number): AudioBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const int16 = new Int16Array(bytes.buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768
  }
  const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate)
  audioBuffer.getChannelData(0).set(float32)
  return audioBuffer
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversation(): UseConversationReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userAnalyserState, setUserAnalyserState] = useState<AnalyserNode | null>(null)
  const [agentAnalyserState, setAgentAnalyserState] = useState<AnalyserNode | null>(null)

  // Mutable refs (don't trigger re-renders)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Audio playback queue
  const playbackQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const agentGainRef = useRef<GainNode | null>(null)

  // Half-duplex turn-taking: controls whether mic audio is sent to ElevenLabs
  const isListeningRef = useRef(true)

  // Agent audio output sample rate (parsed from initiation metadata, default PCM 16kHz)
  const agentAudioSampleRateRef = useRef(16000)

  // Accumulated agent response text (emitted as one message when the agent's turn ends)
  const pendingAgentTextRef = useRef('')

  // Transcript callbacks — single-slot (replace on each registration)
  const userTranscriptCallbackRef = useRef<((text: string) => void) | null>(null)
  const agentResponseCallbackRef = useRef<((text: string) => void) | null>(null)

  // ---------------------------------------------------------------------------
  // Transcript callback subscriptions
  // ---------------------------------------------------------------------------

  const onUserTranscript = useCallback(
    (callback: (text: string) => void) => {
      userTranscriptCallbackRef.current = callback
    },
    []
  )

  const onAgentResponse = useCallback((callback: (text: string) => void) => {
    agentResponseCallbackRef.current = callback
  }, [])

  // ---------------------------------------------------------------------------
  // Audio playback queue
  // ---------------------------------------------------------------------------

  const stopPlayback = useCallback(() => {
    playbackQueueRef.current = []
    isPlayingRef.current = false
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop() } catch { /* may already be stopped */ }
      currentSourceRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  const playNextChunk = useCallback(() => {
    const ctx = audioContextRef.current
    if (!ctx || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false
      currentSourceRef.current = null
      setIsSpeaking(false)
      // Emit the complete accumulated agent response as a single message
      if (pendingAgentTextRef.current) {
        agentResponseCallbackRef.current?.(pendingAgentTextRef.current)
        pendingAgentTextRef.current = ''
      }
      // Half-duplex: resume listening now that agent finished speaking
      isListeningRef.current = true
      setIsRecording(true)
      return
    }

    isPlayingRef.current = true
    setIsSpeaking(true)

    const base64Chunk = playbackQueueRef.current.shift()!

    try {
      const sampleRate = agentAudioSampleRateRef.current
      const audioBuffer = pcmBase64ToAudioBuffer(ctx, base64Chunk, sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      currentSourceRef.current = source

      // Connect through agent gain node (for analyser) -> destination
      const gainNode = agentGainRef.current
      if (gainNode) {
        source.connect(gainNode)
      } else {
        source.connect(ctx.destination)
      }

      source.onended = () => {
        currentSourceRef.current = null
        playNextChunk()
      }
      source.start(0)
    } catch (err) {
      // If conversion fails, log and skip to next chunk
      console.warn('[useConversation] Failed to process audio chunk, skipping:', err)
      currentSourceRef.current = null
      playNextChunk()
    }
  }, [])

  const enqueueAudioChunk = useCallback(
    (base64Chunk: string) => {
      playbackQueueRef.current.push(base64Chunk)
      if (!isPlayingRef.current) {
        playNextChunk()
      }
    },
    [playNextChunk]
  )

  // ---------------------------------------------------------------------------
  // connect
  // ---------------------------------------------------------------------------

  const connect = useCallback(
    async (sessionId: string) => {
      setError(null)

      // 1. Get signed URL
      let signedUrl: string
      try {
        const result = await api.getSignedUrl()
        signedUrl = result.signed_url
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get signed URL'
        setError(msg)
        return
      }

      // 2. Set up AudioContext at the device's native sample rate (NOT 16kHz)
      //    This ensures decodeAudioData works correctly for agent audio playback.
      //    We downsample mic audio to 16kHz manually before sending to ElevenLabs.
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Resume context if it was created in a suspended state (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const nativeSampleRate = audioContext.sampleRate

      // 3. Create AnalyserNodes
      const userAnalyser = audioContext.createAnalyser()
      userAnalyser.fftSize = 256
      setUserAnalyserState(userAnalyser)

      const agentAnalyser = audioContext.createAnalyser()
      agentAnalyser.fftSize = 256
      setAgentAnalyserState(agentAnalyser)

      // Agent audio chain: source -> gainNode -> agentAnalyser -> destination
      const agentGain = audioContext.createGain()
      agentGain.connect(agentAnalyser)
      agentAnalyser.connect(audioContext.destination)
      agentGainRef.current = agentGain

      // 4. Request microphone
      let micStream: MediaStream
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        setError('Microphone permission denied')
        audioContext.close()
        return
      }
      micStreamRef.current = micStream

      // 5. Wire mic into AudioContext for capture
      const micSource = audioContext.createMediaStreamSource(micStream)
      micSourceRef.current = micSource

      // Connect mic source -> userAnalyser (for visualization only; no output)
      micSource.connect(userAnalyser)

      // ScriptProcessorNode for PCM capture (4096 buffer, 1 channel in/out)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      micSource.connect(processor)
      processor.connect(audioContext.destination) // must connect to destination to fire onaudioprocess

      // 6. Open WebSocket
      const ws = new WebSocket(signedUrl)
      wsRef.current = ws

      // Use a function that reads refs so we always get the latest callbacks
      const handleMessage = (event: MessageEvent) => {
        let data: ElevenLabsIncomingEvent
        try {
          data = JSON.parse(event.data as string)
        } catch {
          return
        }

        switch (data.type) {
          case 'conversation_initiation_metadata': {
            const meta = data.conversation_initiation_metadata_event
            setConversationId(meta.conversation_id)
            // Parse agent output audio format (e.g. "pcm_16000" → 16000)
            const format = meta.agent_output_audio_format
            if (format?.startsWith('pcm_')) {
              const rate = parseInt(format.substring(4), 10)
              if (!isNaN(rate) && rate > 0) agentAudioSampleRateRef.current = rate
            }
            break
          }

          case 'ping': {
            const { event_id, ping_ms } = data.ping_event
            const sendPong = () => ws.send(JSON.stringify({ type: 'pong', event_id }))
            if (ping_ms && ping_ms > 0) {
              setTimeout(sendPong, ping_ms)
            } else {
              sendPong()
            }
            break
          }

          case 'user_transcript': {
            const text = data.user_transcription_event.user_transcript
            // Half-duplex: stop sending mic audio once user finishes speaking
            isListeningRef.current = false
            setIsRecording(false)
            userTranscriptCallbackRef.current?.(text)
            break
          }

          case 'agent_response': {
            // Accumulate streamed text chunks — emitted as one message when audio finishes
            const text = data.agent_response_event.agent_response
            pendingAgentTextRef.current += text
            break
          }

          case 'agent_response_correction': {
            // Corrections replace the entire accumulated response
            const text = data.agent_response_correction_event.corrected_agent_response
            pendingAgentTextRef.current = text
            break
          }

          case 'audio':
            enqueueAudioChunk(data.audio_event.audio_base_64)
            break

          case 'interruption':
            // Emit any partial agent text before stopping
            if (pendingAgentTextRef.current) {
              agentResponseCallbackRef.current?.(pendingAgentTextRef.current)
              pendingAgentTextRef.current = ''
            }
            stopPlayback()
            // Resume listening after interruption
            isListeningRef.current = true
            setIsRecording(true)
            break
        }
      }

      ws.addEventListener('open', () => {
        setIsConnected(true)
        setIsRecording(true)

        // Send required initiation message per ElevenLabs WebSocket protocol
        ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' }))

        // Start sending audio chunks after WS opens
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          // Half-duplex: only send audio when it's the user's turn
          if (!isListeningRef.current) return
          const float32 = e.inputBuffer.getChannelData(0)
          // Downsample from native sample rate to 16kHz for ElevenLabs
          const downsampled = downsample(float32, nativeSampleRate, 16000)
          const int16 = float32ToInt16(downsampled)
          const b64 = int16ToBase64(int16)
          ws.send(JSON.stringify({ user_audio_chunk: b64 }))
        }
      })

      ws.addEventListener('message', handleMessage)

      ws.addEventListener('error', () => {
        setError('WebSocket connection error')
      })

      ws.addEventListener('close', () => {
        setIsConnected(false)
        setIsRecording(false)
        setIsSpeaking(false)
      })

      // Store sessionId for potential future use (e.g. message persistence)
      void sessionId
    },
    [enqueueAudioChunk, stopPlayback]
  )

  // ---------------------------------------------------------------------------
  // disconnect
  // ---------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    // Emit any pending agent response text before tearing down
    if (pendingAgentTextRef.current) {
      agentResponseCallbackRef.current?.(pendingAgentTextRef.current)
      pendingAgentTextRef.current = ''
    }

    // Stop mic processor
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect()
      micSourceRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop audio playback
    stopPlayback()
    agentGainRef.current = null

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clear analyser state
    setUserAnalyserState(null)
    setAgentAnalyserState(null)

    setIsConnected(false)
    setIsRecording(false)
    setIsSpeaking(false)
    setConversationId(null)
    isListeningRef.current = true
    agentAudioSampleRateRef.current = 16000
    pendingAgentTextRef.current = ''
  }, [stopPlayback])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    connect,
    disconnect,
    isConnected,
    isRecording,
    isSpeaking,
    error,
    conversationId,
    userAnalyser: userAnalyserState,
    agentAnalyser: agentAnalyserState,
    onUserTranscript,
    onAgentResponse,
  }
}
