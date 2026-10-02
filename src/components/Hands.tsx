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

// What a parent can steer instead of the built-in scroll: how close the fingertips are (reach, 0..1),
// how far both hands are pushed out past the edges (spread, 0 = in place, 1 = off screen), how much the
// gap between the fingertips crackles (charge, 0..1) and how bright the hands are (dim, 0..1).
export type HandsControl = { reach: number; spread: number; charge?: number; dim?: number }
export type RGB = [number, number, number]

type Props = {
  className?: string
  control?: HandsControl
  // How much of the width each hand spans.
  size?: number
  human?: RGB
  robot?: RGB
  // The colour of the energy between them: the crackle across the gap and the spark.
  energy?: RGB
}

// A human hand and a robot hand, drawn in characters, reaching for each other.
// They close the gap as the footer scrolls into view (or as `control` says), lean toward the cursor,
// scatter into noise where the cursor passes, and spark when their fingertips meet.
export default function Hands({ className = '', control, size = 0.46, human: humanColour, robot: robotColour, energy }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const ctl = useRef(control)
  ctl.current = control
  const colours = useRef<[RGB, RGB, RGB]>([humanColour ?? HUMAN.colour, robotColour ?? ROBOT.colour, energy ?? [255, 200, 120]])
  colours.current = [humanColour ?? HUMAN.colour, robotColour ?? ROBOT.colour, energy ?? [255, 200, 120]]

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

    // Each hand spans `size` of the width, sampled at the character grid.
    const layout = () => {
      if (!imgs) return
      const handCols = Math.floor((W * size) / CW)
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

      const dim = c?.dim ?? 1
      const paint = (hand: Sampled, spec: Hand, tipXpx: number, tipYpx: number, colour: RGB) => {
        const originX = tipXpx - spec.tipX * hand.w * CW
        const originY = tipYpx - spec.tipY * hand.h * CH
        const [r, g, b] = colour
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
            const a = Math.min(1, 0.4 + l * 0.8 + stir * 0.4) * dim
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`
            ctx.fillText(ch, px, py + (stir ? (Math.random() - 0.5) * stir * 6 : 0))
          }
        }
      }
      const [hc, rc, ec] = colours.current
      paint(human, HUMAN, W / 2 - gap / 2, tipY + bob, hc)
      paint(robot, ROBOT, W / 2 + gap / 2, tipY - bob, rc)

      // The charge: arcs of characters crackling across the gap, more of them and wilder as the
      // fingertips close in. Each arc is a jagged walk from one fingertip to the other.
      const charge = c?.charge ?? 0
      if (charge > 0.02 && gap > CW * 2 && !reduce) {
        const from = W / 2 - gap / 2
        const steps = Math.max(2, Math.floor(gap / CW))
        const arcs = 1 + Math.round(charge * 3)
        for (let a = 0; a < arcs; a++) {
          let y = 0
          for (let k = 0; k <= steps; k++) {
            // Pinned at both fingertips, free to wander in the middle.
            const pin = Math.sin((k / steps) * Math.PI)
            y += (Math.random() - 0.5) * CH * (0.8 + charge * 1.8)
            y *= 0.92
            if (Math.random() > 0.55 + charge * 0.45) continue
            const alpha = (0.35 + charge * 0.65) * (a === 0 ? 1 : 0.55)
            ctx.fillStyle = `rgba(${ec[0]},${ec[1]},${ec[2]},${alpha})`
            ctx.fillText(NOISE[(Math.random() * NOISE.length) | 0], from + k * CW, tipY + y * pin)
          }
        }
      }

      // The spark: characters bursting out of the meeting point.
      if (state.spark > 0.01) {
        const n = Math.round(90 * state.spark)
        for (let k = 0; k < n; k++) {
          const ang = Math.random() * Math.PI * 2
          const rad = (1 - state.spark) * 260 * Math.random() + 4
          const hot = Math.random() < 0.75
          ctx.fillStyle = hot ? `rgba(${ec[0]},${ec[1]},${ec[2]},${state.spark})` : `rgba(${hc[0]},${hc[1]},${hc[2]},${state.spark})`
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
