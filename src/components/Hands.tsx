import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger } from '../lib/motion'

const RAMP = " .,:;-~=+*x#%@"
const NOISE = '/\\|<>{}[]()*+=-~:;'

type Hand = {
  src: string
  // Where the fingertip sits in the image, as fractions of its width and height.
  tipX: number
  tipY: number
  colour: [number, number, number]
}

const HUMAN: Hand = { src: '/creation/human.png', tipX: 1, tipY: 0.54, colour: [255, 59, 31] }
const ROBOT: Hand = { src: '/creation/robot.png', tipX: 0, tipY: 0.35, colour: [232, 232, 226] }

type Sampled = { w: number; h: number; lum: Float32Array }

// Reads an image into a brightness grid, one sample per character cell.
function sample(img: HTMLImageElement, cols: number, rows: number): Sampled {
  const c = document.createElement('canvas')
  c.width = cols
  c.height = rows
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0, cols, rows)
  const data = x.getImageData(0, 0, cols, rows).data
  const lum = new Float32Array(cols * rows)
  for (let i = 0; i < cols * rows; i++) lum[i] = data[i * 4] / 255
  return { w: cols, h: rows, lum }
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// What a parent can steer instead of the built-in scroll: how close the fingertips are (reach, 0..1)
// and how far both hands are pushed out past the edges (spread, 0 = in place, 1 = off screen).
export type HandsControl = { reach: number; spread: number }

// A human hand and a robot hand, drawn in characters, reaching for each other.
// They close the gap as the footer scrolls into view (or as `control` says), lean toward the cursor,
// scatter into noise where the cursor passes, and spark when their fingertips meet.
export default function Hands({ className = '', control }: { className?: string; control?: HandsControl }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const ctl = useRef(control)
  ctl.current = control

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const CW = 7
    const CH = 11
    let dpr = 1
    let W = 0
    let H = 0
    let human: Sampled | null = null
    let robot: Sampled | null = null
    let imgs: [HTMLImageElement, HTMLImageElement] | null = null
    const reduce = prefersReducedMotion()

    // Each hand spans about 46% of the width, sampled at the character grid.
    const layout = () => {
      if (!imgs) return
      const handCols = Math.floor((W * 0.46) / CW)
      const rowsFor = (img: HTMLImageElement) => Math.max(4, Math.round(((handCols * CW) / img.width) * img.height / CH))
      human = sample(imgs[0], handCols, rowsFor(imgs[0]))
      robot = sample(imgs[1], handCols, rowsFor(imgs[1]))
    }
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = cv.getBoundingClientRect()
      W = r.width
      H = r.height
      cv.width = W * dpr
      cv.height = H * dpr
      layout()
    }

    // 0 = far apart, 1 = touching. Driven by scroll, nudged by the cursor.
    const state = { reach: reduce ? 0.85 : 0, lean: 0, spark: 0 }
    const pointer = { x: -9999, y: -9999, near: 0 }
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      const inside = pointer.y > 0 && pointer.y < r.height
      // The closer the cursor gets to the gap, the more the hands lean in.
      const dx = Math.abs(pointer.x - W / 2) / (W / 2)
      gsap.to(state, { lean: inside ? Math.max(0, 1 - dx) : 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' })
    }
    const leave = () => {
      pointer.x = pointer.y = -9999
      gsap.to(state, { lean: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' })
    }

    const st = reduce || ctl.current
      ? null
      : ScrollTrigger.create({
          trigger: cv,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.2,
          onUpdate: (s) => (state.reach = s.progress),
        })

    let touched = false
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (!human || !robot) return
      ctx.font = `500 ${CH - 1}px ui-monospace, Menlo, monospace`
      ctx.textBaseline = 'top'

      // Scrolling to the very bottom closes the gap; hovering near it gets them there sooner.
      const c = ctl.current
      const closeness = Math.min(1, (c ? c.reach : state.reach) + state.lean * 0.25)
      const maxGap = W * 0.34
      const gap = Math.max(CW * 1.5, maxGap * (1 - closeness)) + (c ? c.spread * W * 1.1 : 0)
      const tipY = H * 0.46
      const bob = Math.sin(t * 0.8) * 4

      // Spark when they (almost) touch.
      if (gap <= CW * 3 && !touched) {
        touched = true
        gsap.fromTo(state, { spark: 1 }, { spark: 0, duration: 1.6, ease: 'power2.out' })
      } else if (gap > CW * 8) touched = false

      const paint = (hand: Sampled, spec: Hand, tipXpx: number, tipYpx: number) => {
        const originX = tipXpx - spec.tipX * hand.w * CW
        const originY = tipYpx - spec.tipY * hand.h * CH
        const [r, g, b] = spec.colour
        for (let j = 0; j < hand.h; j++) {
          const py = originY + j * CH
          if (py < -CH || py > H) continue
          for (let i = 0; i < hand.w; i++) {
            const l = hand.lum[j * hand.w + i]
            if (l < 0.1) continue
            const px = originX + i * CW
            if (px < -CW || px > W) continue
            // The cursor stirs the characters it passes over.
            const d = Math.hypot(px - pointer.x, py - pointer.y)
            const stir = d < 90 ? 1 - d / 90 : 0
            let ch = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))]
            if (stir > 0.15 && Math.random() < stir) ch = NOISE[(Math.random() * NOISE.length) | 0]
            else if (!reduce && Math.random() < 0.015) ch = NOISE[(Math.random() * NOISE.length) | 0]
            const a = Math.min(1, 0.4 + l * 0.8 + stir * 0.4)
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`
            ctx.fillText(ch, px, py + (stir ? (Math.random() - 0.5) * stir * 6 : 0))
          }
        }
      }
      paint(human, HUMAN, W / 2 - gap / 2, tipY + bob)
      paint(robot, ROBOT, W / 2 + gap / 2, tipY - bob)

      // The spark: characters bursting out of the meeting point.
      if (state.spark > 0.01) {
        const n = Math.round(60 * state.spark)
        for (let k = 0; k < n; k++) {
          const ang = Math.random() * Math.PI * 2
          const rad = (1 - state.spark) * 160 * Math.random() + 4
          ctx.fillStyle = `rgba(255,${180 + ((Math.random() * 75) | 0)},120,${state.spark})`
          ctx.fillText(Math.random() < 0.5 ? '*' : '+', W / 2 + Math.cos(ang) * rad, tipY + Math.sin(ang) * rad * 0.6)
        }
      }
    }

    let raf = 0
    let last = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(cv)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 33) return
      last = now
      draw(now / 1000)
    }

    let alive = true
    Promise.all([load(HUMAN.src), load(ROBOT.src)]).then((pair) => {
      if (!alive) return
      imgs = pair
      resize()
      if (reduce) draw(0)
      else raf = requestAnimationFrame(loop)
    })
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move)
    cv.addEventListener('pointerleave', leave)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      st?.kill()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerleave', leave)
    }
  }, [])

  return <canvas ref={canvas} aria-hidden className={className} />
}
