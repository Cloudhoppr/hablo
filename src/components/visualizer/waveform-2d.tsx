'use client'

import { useRef, useEffect, useCallback } from 'react'

interface Waveform2DProps {
  userAnalyser: AnalyserNode | null
  agentAnalyser: AnalyserNode | null
  isActive: boolean
}

// Draw a frequency-domain bar waveform for one analyser onto a canvas region.
// yOffset: the top pixel of the region, height: pixel height of the region.
function drawBars(
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  dataArray: Uint8Array<ArrayBuffer>,
  canvasWidth: number,
  yOffset: number,
  regionHeight: number,
  color: string,
  mirrorVertical: boolean,
) {
  analyser.getByteFrequencyData(dataArray)
  const bufferLength = dataArray.length
  const barWidth = canvasWidth / bufferLength

  for (let i = 0; i < bufferLength; i++) {
    const magnitude = dataArray[i] / 255
    const barHeight = magnitude * regionHeight

    // Gradient colour: base color with varying alpha
    ctx.fillStyle = color
    ctx.globalAlpha = 0.3 + magnitude * 0.7

    if (mirrorVertical) {
      // User waveform grows upward from bottom of its region
      ctx.fillRect(i * barWidth, yOffset + regionHeight - barHeight, barWidth - 1, barHeight)
    } else {
      // Agent waveform grows downward from top of its region
      ctx.fillRect(i * barWidth, yOffset, barWidth - 1, barHeight)
    }
  }
  ctx.globalAlpha = 1
}

// Draw a flat idle line
function drawIdleLine(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  y: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.3
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(canvasWidth, y)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function Waveform2D({ userAnalyser, agentAnalyser, isActive }: Waveform2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const halfH = height / 2

    if (userAnalyser && agentAnalyser && isActive) {
      const userBuf = new Uint8Array(userAnalyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
      const agentBuf = new Uint8Array(agentAnalyser.frequencyBinCount) as Uint8Array<ArrayBuffer>

      // Agent waveform: top half, grows downward, emerald green
      drawBars(ctx, agentAnalyser, agentBuf, width, 0, halfH, '#10b981', false)

      // Thin divider line
      ctx.strokeStyle = 'rgba(156,163,175,0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, halfH)
      ctx.lineTo(width, halfH)
      ctx.stroke()

      // User waveform: bottom half, grows upward, indigo
      drawBars(ctx, userAnalyser, userBuf, width, halfH, halfH, '#6366f1', true)
    } else {
      // Idle state: two flat lines
      drawIdleLine(ctx, width, halfH * 0.5, '#10b981')
      drawIdleLine(ctx, width, halfH * 1.5, '#6366f1')
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [userAnalyser, agentAnalyser, isActive])

  // Resize observer to keep canvas pixel-perfect
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.round(width * devicePixelRatio)
        canvas.height = Math.round(height * devicePixelRatio)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(devicePixelRatio, devicePixelRatio)
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: 72 }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
