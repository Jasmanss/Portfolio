import { useEffect, useLayoutEffect, useRef } from 'react'
import { SKILLS } from '../../../data/content'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

// Instrument Serif italic "S" and "." (the hero's "Sidhu."), lifted from the font file. Font units, baseline at y = 0.
const S_GLYPH =
  'M173 9Q145 9 113.5 3Q82 -3 54.5 -13.5Q27 -24 11 -38Q6 -43 4.5 -48Q3 -53 5 -63L33 -220Q36 -238 49 -238Q61 -238 61 -218L62 -179Q64 -95 91 -58Q118 -21 179 -21Q235 -21 272 -61.5Q309 -102 309 -170Q309 -214 285 -262Q261 -310 218 -358Q167 -415 142.5 -462Q118 -509 118 -561Q118 -602 138 -640.5Q158 -679 198.5 -704.5Q239 -730 302 -730Q389 -730 435 -691Q449 -680 445 -658L417 -512Q414 -497 403 -497Q392 -497 390 -514L389 -535Q385 -616 366.5 -658.5Q348 -701 293 -701Q253 -701 229 -683Q205 -665 194 -638.5Q183 -612 183 -586Q183 -557 191 -530.5Q199 -504 218.5 -474.5Q238 -445 272 -403Q320 -346 347 -294Q374 -242 374 -193Q374 -134 347.5 -88.5Q321 -43 276 -17Q231 9 173 9Z'
const DOT_GLYPH =
  'M486 9Q465 9 452 -4.5Q439 -18 439 -38Q439 -64 457 -80Q475 -96 495 -96Q515 -96 528.5 -82.5Q542 -69 542 -49Q542 -23 524 -7Q506 9 486 9Z'
// The S's own box, and the box of "S." together (font units).
const S_BOX = { x0: 4, x1: 446, y0: -730, y1: 9 }
const BOX = { x0: 0, x1: 548, y0: -736, y1: 15 }
// Where the period squashes from when the lever is pulled: the bottom of the dot.
const DOT_FOOT = { x: 489, y: 9 }

// Every tool he builds with, end to end: the tape the letter is set from.
const TAPE = SKILLS.flatMap((g) => g.items)
  .map((s) => s.toUpperCase().replace(/ /g, '_'))
  .join('/') + '/'
const L = TAPE.length
const FAMILY = '"Geist Mono Variable", ui-monospace, Menlo, monospace'
const REELS = 3

type RGB = readonly [number, number, number]
const INK = '#0A0A0A'
const MUTE: RGB = [124, 124, 124]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
const rgbOf = (s: string, fallback: RGB): RGB => {
  const n = s.match(/[\d.]+/g)?.map(Number)
  return n && n.length >= 3 ? [n[0], n[1], n[2]] : fallback
}

// Each row of the letter starts somewhere different along the tape, so no two rows line up.
const rowStart = (v: number) => {
  let h = Math.imul(v ^ 0x5bd1e995, 0x9e3779b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  return (h >>> 0) % L
}
const charAt = (row: number, col: number) => TAPE[(((rowStart(row) + col) % L) + L) % L]

// One reel: a third of the letter's columns that rolls as one. r is how many rows it has rolled (rows fall as it grows),
// flash is the sky blue it lands with, dim is how fast it's spinning (spinning type greys out like a blurred reel).
type Reel = { r: number; flash: number; dim: number; last: number }

type Geo = {
  scale: number
  ox: number
  oy: number
  emb: number
  cw: number
  ch: number
  font: string
  reach: number
  push: number
  brush: number
  start: number[]
  plate: HTMLCanvasElement
  layer: HTMLCanvasElement
  type: Uint8Array
  cx: Float32Array
  cy: Float32Array
  col: Int16Array
  row: Int16Array
  dx: Float32Array
  dy: Float32Array
  vx: Float32Array
  vy: Float32Array
  heat: Float32Array
  wave: Float32Array
}

// Tile 05, Side quest: a big serif-italic "S." set entirely from his tool names in tiny mono type.
// At rest it's one solid letter, printed through the grid's halftone. Pointed at, the period is pulled like a slot
// machine's lever, the solid letter breaks into its type from where the pointer came in, and the letter's three reels
// spin through the names and stop left to right, each landing in sky blue. Then the reels tick on a row at a time and
// every few seconds the lever is pulled again; the pointer shoves the type aside (it springs back) and turns what it
// touches sky blue. Leaving puts the blocks back, outside in, until it's the solid letter again and nothing runs.
export default function SArt({ active, open = false }: ArtProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const api = useRef<((on: boolean) => void) | null>(null)
  const on = active || open
  const onAtMount = useRef(on)

  useLayoutEffect(() => {
    const root = rootRef.current
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    if (!root || !cv || !g) return
    const reduce = prefersReducedMotion()
    const S = new Path2D(S_GLYPH)
    const DOT = new Path2D(DOT_GLYPH)
    const paper = rgbOf(getComputedStyle(root).color, [242, 242, 242])
    const blue = rgbOf(getComputedStyle(document.documentElement).getPropertyValue('--accent'), [77, 163, 255])
    const PAPER = css(paper)
    const BLUE = css(blue)
    // Type colours, quantised: how dim (spinning) by how blue.
    const STEPS = 6
    const tones: string[] = []
    for (let d = 0; d <= STEPS; d++)
      for (let b = 0; b <= STEPS; b++) tones.push(css(mix(mix(paper, MUTE, (d / STEPS) * 0.8), blue, b / STEPS)))
    const tone = (dim: number, b: number) => tones[Math.round(dim * STEPS) * (STEPS + 1) + Math.round(Math.min(1, b) * STEPS)]

    let W = 0
    let H = 0
    let dpr = 1
    let geo: Geo | null = null
    let alive = true
    let running = false
    let wanted = false
    // p: how far the solid letter has broken into type (0 solid, 1 all type). press: the period squashed by the pull.
    const s = { p: 0, press: 0 }
    const reels: Reel[] = Array.from({ length: REELS }, () => ({ r: 0, flash: 0, dim: 0, last: 0 }))
    // The pointer in viewport coordinates (cx, cy) and against this canvas (x, y). It's re-measured every frame, so
    // the push stays under the cursor when the page scrolls (or settles after a reload) with the mouse held still.
    const ptr = { x: 0, y: 0, cx: 0, cy: 0, in: false }
    const locate = () => {
      if (!ptr.in) return
      const r = cv.getBoundingClientRect()
      ptr.x = ptr.cx - r.left
      ptr.y = ptr.cy - r.top
    }
    let intro: gsap.core.Timeline | null = null
    let outro: gsap.core.Timeline | null = null
    let idle: gsap.core.Tween | null = null
    let tick = 0

    const layout = () => {
      const r = root.getBoundingClientRect()
      W = r.width
      H = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.max(1, Math.round(W * dpr))
      cv.height = Math.max(1, Math.round(H * dpr))
      if (W < 24 || H < 24) return (geo = null)
      const bw = BOX.x1 - BOX.x0
      const bh = BOX.y1 - BOX.y0
      const scale = Math.min((H * 0.96) / bh, (W * 0.9) / bw)
      const ox = (W - bw * scale) / 2 - BOX.x0 * scale
      const oy = (H - bh * scale) / 2 - BOX.y0 * scale
      // About 27 rows of type down the letter, never smaller than 5px a row nor bigger than 12.
      const ch = Math.max(5, Math.min(12, ((S_BOX.y1 - S_BOX.y0) * scale) / 27))
      const size = ch * 0.92
      const font = `600 ${size.toFixed(2)}px ${FAMILY}`
      g.font = font
      const cw = g.measureText('M').width || size * 0.6
      // The hairlines of the serif are thinner than a row of type, so the letter is set a little bolder than the font.
      const emb = (ch * 0.42) / scale
      const x0 = ox + (S_BOX.x0 - emb) * scale
      const x1 = ox + (S_BOX.x1 + emb) * scale
      const y0 = oy + (S_BOX.y0 - emb) * scale
      const y1 = oy + (S_BOX.y1 + emb) * scale
      const cols = Math.ceil((x1 - x0) / cw) + 1
      const rows = Math.ceil((y1 - y0) / ch) + 1
      const gx = (x0 + x1) / 2 - (cols * cw) / 2
      const gy = (y0 + y1) / 2 - (rows * ch) / 2

      // Which cells the letter covers: draw it at one pixel per cell and read the coverage back.
      const m = document.createElement('canvas')
      m.width = cols
      m.height = rows
      const mx = m.getContext('2d', { willReadFrequently: true })!
      mx.setTransform(scale / cw, 0, 0, scale / ch, (ox - gx) / cw, (oy - gy) / ch)
      mx.fillStyle = mx.strokeStyle = '#fff'
      mx.lineWidth = emb * 2
      mx.lineJoin = 'round'
      mx.fill(S)
      mx.stroke(S)
      const px = mx.getImageData(0, 0, cols, rows).data
      // Every cell the letter touches carries a block of it; the ones mostly inside also carry a character.
      const byReel: [number, number, number][][] = Array.from({ length: REELS }, () => [])
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const a = px[(j * cols + i) * 4 + 3]
          if (a >= 8) byReel[Math.min(REELS - 1, Math.floor((i / cols) * REELS))].push([i, j, a >= 110 ? 1 : 0])
        }
      const all = byReel.flat()
      const start = [0]
      byReel.forEach((b) => start.push(start[start.length - 1] + b.length))
      const n = all.length

      // The solid letter at full resolution: drawn as is at rest, and the stencil the blocks are cut to while they
      // break up, so the first and last frames of the break-up are exactly the calm letter.
      const plate = document.createElement('canvas')
      plate.width = cv.width
      plate.height = cv.height
      const pg = plate.getContext('2d')!
      pg.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy)
      pg.fillStyle = pg.strokeStyle = PAPER
      pg.lineWidth = emb * 2
      pg.lineJoin = 'round'
      pg.fill(S)
      pg.stroke(S)
      const layer = document.createElement('canvas')
      layer.width = cv.width
      layer.height = cv.height
      geo = {
        scale,
        ox,
        oy,
        emb,
        cw,
        ch,
        font,
        reach: ch * 5.5,
        push: ch * 1.9,
        brush: ch * 1.8,
        start,
        plate,
        layer,
        type: Uint8Array.from(all, ([, , t]) => t),
        cx: Float32Array.from(all, ([i]) => gx + (i + 0.5) * cw),
        cy: Float32Array.from(all, ([, j]) => gy + (j + 0.5) * ch),
        col: Int16Array.from(all, ([i]) => i),
        row: Int16Array.from(all, ([, j]) => j),
        dx: new Float32Array(n),
        dy: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        heat: new Float32Array(n),
        wave: new Float32Array(n),
      }
      waveFrom()
    }

    // The order the solid letter breaks up (and goes back together): outwards from the pointer, or from its middle.
    const waveFrom = () => {
      if (!geo) return
      locate()
      const ax = ptr.in ? ptr.x : geo.ox + ((S_BOX.x0 + S_BOX.x1) / 2) * geo.scale
      const ay = ptr.in ? ptr.y : geo.oy + ((S_BOX.y0 + S_BOX.y1) / 2) * geo.scale
      let max = 1
      for (let i = 0; i < geo.cx.length; i++) {
        geo.wave[i] = Math.hypot(geo.cx[i] - ax, geo.cy[i] - ay)
        max = Math.max(max, geo.wave[i])
      }
      for (let i = 0; i < geo.cx.length; i++) geo.wave[i] /= max
    }

    const drawDot = () => {
      if (!geo) return
      const { scale, ox, oy, emb } = geo
      const k = s.press
      g.save()
      g.translate(ox + DOT_FOOT.x * scale, oy + DOT_FOOT.y * scale)
      g.scale(scale * (1 + 0.3 * k), scale * (1 - 0.5 * k))
      g.translate(-DOT_FOOT.x, -DOT_FOOT.y)
      g.fillStyle = g.strokeStyle = BLUE
      g.lineWidth = emb * 2
      g.lineJoin = 'round'
      g.fill(DOT)
      g.stroke(DOT)
      g.restore()
    }

    const draw = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      if (!geo) return
      const { cx, cy, dx, dy, col, row, heat, wave, type, cw, ch, start, plate, layer } = geo
      if (s.p <= 0.0005) {
        // Calm: one solid letter, so it prints as a single mass through the halftone.
        g.drawImage(plate, 0, 0, W, H)
        return drawDot()
      }
      // How far each cell has broken up: a wave out from where the pointer came in.
      const spread = 1.6
      const lift = (i: number) => Math.min(1, Math.max(0, s.p * (1 + spread) - wave[i] * spread))

      // Pass 1: each cell starts as a solid block of the letter and shrinks away to leave its character.
      if (s.p < 1) {
        const lg = layer.getContext('2d')!
        lg.globalCompositeOperation = 'source-over'
        lg.setTransform(1, 0, 0, 1, 0, 0)
        lg.clearRect(0, 0, layer.width, layer.height)
        lg.setTransform(dpr, 0, 0, dpr, 0, 0)
        lg.fillStyle = PAPER
        for (let i = 0; i < cx.length; i++) {
          const t = lift(i)
          const block = 1 - t * t
          if (block < 0.02) continue
          const w = cw * block + (block > 0.97 ? 0.8 : 0)
          const h = ch * block + (block > 0.97 ? 0.8 : 0)
          lg.fillRect(cx[i] + dx[i] - w / 2, cy[i] + dy[i] - h / 2, w, h)
        }
        lg.setTransform(1, 0, 0, 1, 0, 0)
        lg.globalCompositeOperation = 'destination-in'
        lg.drawImage(plate, 0, 0)
        lg.globalCompositeOperation = 'source-over'
        g.drawImage(layer, 0, 0, W, H)
      }

      // Pass 2: the type. Knocked out of the block while the block is still big, then paper (grey while its reel
      // spins, sky blue when it lands or the pointer touches it).
      g.font = geo.font
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      let style = ''
      for (let k = 0; k < REELS; k++) {
        const reel = reels[k]
        const fl = Math.floor(reel.r)
        const fr = reel.r - fl
        for (let i = start[k]; i < start[k + 1]; i++) {
          if (!type[i]) continue
          const t = lift(i)
          if (t <= 0) continue
          const fill = t * t < 0.45 ? INK : tone(reel.dim, Math.max(heat[i], reel.flash))
          if (style !== fill) g.fillStyle = style = fill
          g.fillText(charAt(row[i] - fl, col[i]), cx[i] + dx[i], cy[i] + dy[i] + fr * ch)
        }
      }
      drawDot()
    }

    // Springs: the pointer shoves type out of its way, it wobbles back; what it touches turns sky blue and cools.
    const step = (dt: number) => {
      if (!geo) return 0
      const { cx, cy, dx, dy, vx, vy, heat, reach, push, brush } = geo
      const K = 260
      const C = 19
      const r2 = reach * reach
      let moving = 0
      for (let i = 0; i < cx.length; i++) {
        let tx = 0
        let ty = 0
        if (ptr.in && wanted) {
          const ax = cx[i] - ptr.x
          const ay = cy[i] - ptr.y
          const d2 = ax * ax + ay * ay
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 0.001
            const f = 1 - d / reach
            tx = (ax / d) * f * f * push
            ty = (ay / d) * f * f * push
            if (d < brush) heat[i] = 1
          }
        }
        vx[i] += ((tx - dx[i]) * K - vx[i] * C) * dt
        vy[i] += ((ty - dy[i]) * K - vy[i] * C) * dt
        dx[i] += vx[i] * dt
        dy[i] += vy[i] * dt
        if (heat[i] > 0) heat[i] = Math.max(0, heat[i] - dt * 1.4)
        moving = Math.max(moving, Math.abs(dx[i]) + Math.abs(dy[i]) + Math.abs(vx[i]) * 0.05 + heat[i])
      }
      for (const reel of reels) {
        const speed = Math.abs(reel.r - reel.last) / Math.max(dt, 0.001)
        reel.last = reel.r
        reel.dim += (Math.min(1, Math.max(0, (speed - 4) / 14)) - reel.dim) * Math.min(1, dt * 16)
        moving = Math.max(moving, reel.dim, reel.flash)
      }
      return moving
    }

    const frame = (_t: number, deltaTime: number) => {
      locate()
      const moving = step(Math.min(deltaTime, 50) / 1000)
      draw()
      if (!wanted && s.p <= 0 && !outro?.isActive() && moving < 0.02) stop()
    }
    const go = () => {
      if (running) return
      running = true
      for (const reel of reels) reel.last = reel.r
      gsap.ticker.add(frame)
    }
    const stop = () => {
      if (!running) return
      running = false
      gsap.ticker.remove(frame)
      if (geo) {
        geo.dx.fill(0)
        geo.dy.fill(0)
        geo.vx.fill(0)
        geo.vy.fill(0)
        geo.heat.fill(0)
      }
      draw()
    }

    // The reels landed: one at a time they tick on a row, left to right, and every couple of rounds the lever is
    // pulled again.
    const ticking = () => {
      if (tick >= REELS * 2) return pull(false)
      const reel = reels[tick++ % REELS]
      gsap.to(reel, { r: Math.round(reel.r) + 1, duration: 0.45, ease: 'back.out(2.4)', overwrite: 'auto' })
      idle = gsap.delayedCall(tick % REELS === 0 ? 1.1 : 0.32, ticking)
    }

    const pull = (first: boolean) => {
      const tl = (intro = gsap.timeline())
      // The pull: the period squashes down and springs back as the reels let go.
      tl.to(s, { press: 1, duration: 0.14, ease: 'power2.in' }, 0).to(s, { press: 0, duration: 1, ease: 'elastic.out(1, 0.35)' }, 0.14)
      // The first time, the solid letter breaks into its type as the reels start.
      if (first) tl.to(s, { p: 1, duration: 0.8, ease: 'none' }, 0.04)
      reels.forEach((reel, k) => {
        const spin = first ? 0.85 + k * 0.3 : 0.6 + k * 0.26
        const to = Math.ceil(reel.r) + (first ? 13 + k * 5 : 7 + k * 4)
        // Spin, run a touch past the row, then kick back onto it; it lands in sky blue.
        tl.to(reel, { r: to + 0.4, duration: spin, ease: 'power2.inOut', overwrite: 'auto' }, 0.12)
          .call(() => void gsap.fromTo(reel, { flash: 1 }, { flash: 0, duration: 0.85, ease: 'power2.in', overwrite: 'auto' }), undefined, 0.12 + spin - 0.06)
          .to(reel, { r: to, duration: 0.4, ease: 'back.out(3)' }, 0.12 + spin)
      })
      tl.call(() => {
        tick = 0
        idle = gsap.delayedCall(0.6, ticking)
      })
    }

    const play = () => {
      outro?.kill()
      intro?.kill()
      idle?.kill()
      go()
      if (s.p <= 0.05) waveFrom()
      pull(true)
    }

    const rest = () => {
      intro?.kill()
      idle?.kill()
      if (!running) return draw()
      waveFrom()
      const tl = (outro = gsap.timeline())
      reels.forEach((reel) => {
        tl.to(reel, { r: Math.ceil(reel.r - 0.05), duration: 0.35, ease: 'power2.out', overwrite: 'auto' }, 0)
        tl.to(reel, { flash: 0, duration: 0.3, ease: 'power1.out' }, 0)
      })
      tl.to(s, { press: 0, duration: 0.3, ease: 'power2.out' }, 0).to(s, { p: 0, duration: 0.6, ease: 'none' }, 0.05)
    }

    let said: boolean | null = null
    const set = (want: boolean) => {
      if (want === said) return
      said = want
      wanted = want
      if (reduce) {
        // A still: the letter in its type, or solid at rest; nothing moves.
        s.p = want ? 1 : 0
        s.press = 0
        return draw()
      }
      if (want) play()
      else rest()
    }
    api.current = set

    // The pointer, measured against this canvas (the art box sits inside the tile's button).
    const host = (root.closest('[data-tile]') as HTMLElement | null) ?? root
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      ptr.cx = e.clientX
      ptr.cy = e.clientY
      ptr.in = true
    }
    const leave = () => {
      ptr.in = false
    }
    host.addEventListener('pointerenter', move)
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', leave)

    layout()
    const ro = new ResizeObserver(() => {
      layout()
      if (!running) draw()
    })
    ro.observe(root)
    // The type is measured in Geist Mono; once it has loaded (e.g. on a fresh reload), set the letter again.
    document.fonts?.load(`600 12px ${FAMILY}`).then(() => {
      if (!alive) return
      layout()
      if (!running) draw()
    })
    set(onAtMount.current)

    return () => {
      alive = false
      api.current = null
      ro.disconnect()
      host.removeEventListener('pointerenter', move)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      gsap.ticker.remove(frame)
      intro?.kill()
      outro?.kill()
      idle?.kill()
      gsap.killTweensOf(reels)
      gsap.killTweensOf(s)
    }
  }, [])

  useEffect(() => {
    api.current?.(on)
  }, [on])

  return (
    <div ref={rootRef} className="relative h-full w-full" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
