import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const RAMP = ' .,:;~=+*x%#&@'

// Heat (0..1) to colour: ember red at the edges, orange in the body, near-white at the core.
function colour(h: number) {
  if (h > 0.86) return '#FFF6DE'
  if (h > 0.7) return '#FFD98A'
  if (h > 0.52) return '#FFA93F'
  if (h > 0.34) return '#FF7A2B'
  if (h > 0.2) return '#C9431C'
  return '#6A2211'
}

type Props = {
  // 0 = out, 1 = normal, above 1 = flaring.
  intensity: number
  className?: string
}

type Spark = { x: number; y: number; vy: number; life: number }

// A candle flame drawn in monospace characters. The flame is a teardrop-shaped heat field that sways,
// flickers at the tip and leans away from the cursor like there's a draught; sparks drift off the top.
export default function AsciiFlame({ intensity, className = '' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const level = useRef(intensity)
  level.current = intensity

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const CELL_W = 8
    const CELL_H = 12
    let cols = 0
    let rows = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = cv.getBoundingClientRect()
      cv.width = width * dpr
      cv.height = height * dpr
      cols = Math.max(8, Math.floor(width / CELL_W))
      rows = Math.max(8, Math.floor(height / CELL_H))
    }
    resize()

    let wind = 0
    let windTarget = 0
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height * 0.55)) / r.height
      // Blow away from the pointer, harder when it's close.
      windTarget = Math.abs(dx) < 1.6 && Math.abs(dy) < 0.6 ? -Math.sign(dx) * (1.6 - Math.abs(dx)) * 0.55 : 0
    }
    window.addEventListener('pointermove', move)

    let shown = 0 // eases toward the requested intensity, so the candle lights and goes out smoothly
    const sparks: Spark[] = []

    const frame = (t: number) => {
      shown += (level.current - shown) * 0.06
      wind += (windTarget - wind) * 0.06
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.font = `600 ${CELL_H}px "JetBrains Mono Variable", monospace`
      ctx.textBaseline = 'top'

      const cx = cols / 2
      const base = rows - 3
      // Wick and a stub of wax, visible even when the candle is out.
      ctx.fillStyle = '#3a3a36'
      ctx.fillText('|', Math.floor(cx) * CELL_W, base * CELL_H)
      ctx.fillStyle = '#3c3f3b'
      for (let x = Math.floor(cx - 3); x <= Math.floor(cx + 3); x++) ctx.fillText('▓', x * CELL_W, (base + 1) * CELL_H)
      ctx.fillStyle = '#2a2c2a'
      for (let x = Math.floor(cx - 3); x <= Math.floor(cx + 3); x++) ctx.fillText('▒', x * CELL_W, (base + 2) * CELL_H)
      if (shown < 0.02) return

      // Flame height breathes and flickers.
      const flick = 0.92 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 13.1) * 0.03 + Math.sin(t * 2.1) * 0.03
      const height = Math.min(base - 2, rows * 0.8) * Math.min(shown, 1.25) * flick
      const halfW = Math.max(3, cols * 0.16) * Math.min(1, 0.6 + shown * 0.4)

      for (let y = 0; y < base; y++) {
        const v = (base - y) / height // 0 at the wick, 1 at the tip
        if (v > 1.05) continue
        // Teardrop: swells quickly from the wick, then tapers to a point.
        const profile = v < 0.22 ? Math.sqrt(v / 0.22) : Math.pow(Math.max(0, 1 - (v - 0.22) / 0.78), 0.85)
        const w = halfW * profile
        if (w < 0.3) continue
        // The column of flame sways and leans with the draught, more near the tip.
        const centre = cx + (Math.sin(t * 3.1 + v * 5) * 0.9 + Math.sin(t * 1.7 + v * 3) * 0.6) * v * 1.4 + wind * v * v * halfW * 2.2
        for (let x = Math.floor(centre - w - 1); x <= Math.ceil(centre + w + 1); x++) {
          if (x < 0 || x >= cols) continue
          const d = Math.abs(x + 0.5 - centre) / w
          if (d > 1.15) continue
          const noise = Math.sin(x * 1.7 + t * 9 + y * 0.9) * Math.sin(y * 1.3 - t * 11) * 0.18
          let h = (1 - d) * (1 - v * 0.55) + noise
          // A hot white core low in the flame.
          if (v < 0.55 && d < 0.4) h += (0.4 - d) * (0.55 - v) * 1.6
          // The dark gap just above the wick, like a real candle.
          if (v < 0.08 && d < 0.5) h *= 0.55
          h = Math.min(1, Math.max(0, h))
          if (h < 0.12) continue
          ctx.fillStyle = colour(h)
          ctx.fillText(RAMP[Math.min(RAMP.length - 1, Math.floor(h * RAMP.length))], x * CELL_W, y * CELL_H)
        }
      }

      // Sparks off the tip.
      if (Math.random() < 0.12 * Math.min(shown, 1.5)) {
        sparks.push({ x: cx + (Math.random() - 0.5) * 2 + wind * halfW, y: base - height * 0.9, vy: 0.25 + Math.random() * 0.35, life: 1 })
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.y -= s.vy
        s.x += wind * 0.3 + Math.sin(t * 4 + i) * 0.15
        s.life -= 0.025
        if (s.life <= 0 || s.y < 0) {
          sparks.splice(i, 1)
          continue
        }
        ctx.fillStyle = s.life > 0.5 ? '#FFA93F' : '#6A2211'
        ctx.fillText(s.life > 0.6 ? '*' : '.', Math.round(s.x) * CELL_W, Math.round(s.y) * CELL_H)
      }
    }

    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 33) return // ~30fps suits flicker
      last = now
      frame(now / 1000)
    }
    if (prefersReducedMotion()) {
      shown = level.current
      frame(0)
    } else raf = requestAnimationFrame(loop)

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvas} aria-hidden className={className} />
}
