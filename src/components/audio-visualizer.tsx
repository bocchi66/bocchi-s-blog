'use client'

import { useEffect, useRef } from 'react'

interface Props {
  cardWidth: number
  cardHeight: number
  x: number
  y: number
  analyser: AnalyserNode | null
  isPlaying: boolean
}

const BAR_MAX_HEIGHT = 28
const BAR_WIDTH = 3
const BAR_GAP = 6
const HORIZONTAL_PADDING = 28

export default function AudioVisualizer({ cardWidth, cardHeight, x, y, analyser, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smoothedRef = useRef<Float64Array | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const canvasW = cardWidth
    const canvasH = cardHeight + BAR_MAX_HEIGHT

    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = `${canvasW}px`
    canvas.style.height = `${canvasH}px`
    ctx.scale(dpr, dpr)

    const effectiveWidth = cardWidth - HORIZONTAL_PADDING * 2
    const step = BAR_WIDTH + BAR_GAP
    const totalBars = Math.floor(effectiveWidth / step)

    if (!smoothedRef.current || smoothedRef.current.length !== totalBars) {
      smoothedRef.current = new Float64Array(totalBars)
    }
    const smoothed = smoothedRef.current

    const brandColor =
      getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim() || '#ff80b6'

    const draw = () => {
      ctx.clearRect(0, 0, canvasW, canvasH)

      const active = analyser && isPlaying

      if (active && analyser) {
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.getByteFrequencyData(dataArray)

        const binsPerBar = bufferLength / totalBars
        const half = Math.max(1, Math.floor(totalBars / 2))
        const mid = Math.floor(half / 2)
        for (let i = 0; i < totalBars; i++) {
          const mirrored = i % half
          const freqIndex = mirrored <= mid ? mirrored : half - mirrored
          const start = Math.floor(freqIndex * binsPerBar)
          const end = Math.floor((i + 1) * binsPerBar)
          let sum = 0
          for (let j = start; j < end; j++) {
            sum += dataArray[j]
          }
          const avg = sum / (end - start)
          const target = (avg / 255) * BAR_MAX_HEIGHT
          smoothed[i] = smoothed[i] * 0.55 + target * 0.45
        }
      } else {
        for (let i = 0; i < smoothed.length; i++) {
          smoothed[i] *= 0.82
          if (smoothed[i] < 0.3) smoothed[i] = 0
        }
      }

      ctx.fillStyle = brandColor
      ctx.shadowColor = brandColor
      ctx.shadowBlur = 6

      const ox = HORIZONTAL_PADDING
      const oy = BAR_MAX_HEIGHT

      for (let i = 0; i < totalBars; i++) {
        const bx = ox + i * step
        const h = smoothed[i]
        if (h > 0) {
          ctx.beginPath()
          ctx.roundRect(bx, oy - h, BAR_WIDTH, h, BAR_WIDTH / 2)
          ctx.fill()
        }
      }

      ctx.shadowBlur = 0
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cardWidth, cardHeight, analyser, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      className='pointer-events-none absolute'
      style={{
        left: x,
        top: y - BAR_MAX_HEIGHT
      }}
    />
  )
}
