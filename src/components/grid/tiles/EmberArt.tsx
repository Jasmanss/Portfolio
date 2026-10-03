import { useEffect, useLayoutEffect, useRef } from 'react'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import { heatFor, useNow, workingOn } from '../../../lib/now'
import type { ArtProps } from '../types'

gsap.registerPlugin(Physics2DPlugin)

// Ember: today's commits as a fire, printed on a character grid. No commits, just a bed of coals and a curl of
// smoke; one commit, a low flame; around twelve, a full blaze. It burns blue (the hotter colour) with a white-hot
// core. The flame is a field (an outline that tapers to a tip, torn into tongues by noise that rises through it), so
// its height is exactly what today's number says. At rest it is printed as solid cells, which the grid's halftone
// turns into dots; pointed at, it flares up, throws sparks and resolves into the characters it's made of, from the
// coals up.

const RAMP = ' .:-=+*#%@'
// Commit counts marked on the panel's ruler.
const MARKS = [1, 2, 4, 8, 12]
// Where the fire stands in the opened panel, as fractions of the box: the base line and the tallest flame.
const OPEN_BASE = 0.84
const OPEN_HMAX = 0.72
// Frames drawn per second while burning, and while resting.
const FPS = 30
const IDLE_FPS = 8

type Scene = { speed: number; level: number; flare: number; mix: number; t: number }
type Spark = { x: number; y: number; life: number }
type Layout = {
  dpr: number
  cw: number
  ch: number
  cwp: number
  chp: number
  cols: number
  rows: number
  ox: number
  oy: number
  cx: number
  base: number
  hmax: number
  rank: Float32Array
  atlas: HTMLCanvasElement
}

// Value noise (seeded, so the coals and the tongues are the same on every visit).
const PERM = (() => {
  const a = Array.from({ length: 256 }, (_, i) => i)
  let s = 20261001
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  const p = new Uint8Array(512)
  for (let i = 0; i < 512; i++) p[i] = a[i & 255]
  return p
})()
function noise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const X = xi & 255
  const Y = yi & 255
  const a = PERM[PERM[X] + Y]
  const b = PERM[PERM[X + 1] + Y]
  const c = PERM[PERM[X] + Y + 1]
  const d = PERM[PERM[X + 1] + Y + 1]
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) / 255
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a))
  return k * k * (3 - 2 * k)
}
const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Coolest to hottest: smoke, the blue's outer edge, blue, pale blue, white-hot.
function tiers(accent: [number, number, number]) {
  const [r, g, b] = accent
  const lift = (k: number) => `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(b + (255 - b) * k)})`
  return ['#7C7C7C', `rgba(${r},${g},${b},0.55)`, `rgb(${r},${g},${b})`, lift(0.55), '#F7F7F7']
}
const tierOf = (heat: number) => (heat < 0.22 ? 1 : heat < 0.56 ? 2 : heat < 0.9 ? 3 : 4)
const glyphOf = (heat: number) => 1 + Math.min(8, Math.floor(heat * 9))

function readAccent(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/[\s,]+/).map(Number)
  return raw.length === 3 && raw.every((n) => !Number.isNaN(n)) ? (raw as [number, number, number]) : [77, 163, 255]
}

// Every character of the ramp in every colour, drawn once per cell size.
function buildAtlas(cwp: number, chp: number, colors: string[]) {
  const a = document.createElement('canvas')
  a.width = cwp * RAMP.length
  a.height = chp * colors.length
  const g = a.getContext('2d')!
  g.font = `600 ${Math.round(chp * 0.95)}px "Geist Mono Variable", ui-monospace, monospace`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  colors.forEach((c, ti) => {
    g.fillStyle = c
    for (let i = 1; i < RAMP.length; i++) g.fillText(RAMP[i], (i + 0.5) * cwp, (ti + 0.54) * chp)
  })
  return a
}

export default function EmberArt({ active, open }: ArtProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const now = useNow()
  const level = heatFor(now.commitsToday)
  const scene = useRef<Scene>({ speed: 0.3, level, flare: 0, mix: 0, t: 7 })
  const ctxRef = useRef<gsap.Context | null>(null)
  const api = useRef<{ draw: () => void; burst: (n: number, power: number) => void; clearSparks: () => void } | null>(null)
  const on = active || !!open

  // The canvas, its character grid, the fire and the loop that keeps it burning.
  useLayoutEffect(() => {
    const root = rootRef.current!
    const canvas = canvasRef.current!
    const g = canvas.getContext('2d')!
    const S = scene.current
    const reduce = prefersReducedMotion()
    const colors = tiers(readAccent())
    const sparks: Spark[] = []
    let L: Layout | null = null

    // How tall the flame stands right now (CSS px): today's level, lifted by a flare. With no commits, only a flare
    // (someone pointing at the coals) raises a brief lick of flame.
    const flameHeight = () => {
      if (!L) return 0
      const H = S.level > 0.01 ? L.hmax * S.level * (1 + S.flare * 0.32) : L.hmax * 0.3 * S.flare
      return Math.min(L.hmax * 1.12, L.base * 0.96, H)
    }
    // Half-widths: the flame at its foot, and the bed of coals under it (which never shrinks below a hearth).
    const flameHalf = (H: number) => H * 0.4
    const bedHalf = (H: number) => (L ? Math.max(flameHalf(H) * 0.9, L.hmax * 0.3) : 0)

    const layout = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const chCss = open ? Math.min(16, Math.max(10, h / 52)) : Math.min(9.5, Math.max(7, h / 22))
      const chp = Math.max(6, Math.round(chCss * dpr))
      const cwp = Math.max(4, Math.round(chp * 0.6))
      const ch = chp / dpr
      const cw = cwp / dpr
      const cols = Math.ceil(w / cw)
      const rows = Math.ceil(h / ch)
      const ox = (w - cols * cw) / 2
      const oy = h - rows * ch
      // In the tile, room is kept under the fire for the repo name (shown on hover, so only where there is hover).
      const base = open ? h * OPEN_BASE : h - (window.matchMedia('(min-width: 768px)').matches ? 44 : 14)
      const hmax = open ? h * OPEN_HMAX : base - 8
      // The order cells turn from print into characters: from the coals upwards, with a ragged edge.
      const rank = new Float32Array(cols * rows)
      for (let r = 0; r < rows; r++) {
        const v = clamp01((base - (oy + (r + 0.5) * ch)) / hmax)
        for (let c = 0; c < cols; c++) rank[r * cols + c] = v * 0.75 + hash(r * 977 + c) * 0.25
      }
      // Opened on a narrow screen (a phone), the fire stands a little right of centre, clear of the ruler's labels.
      const cx = open && w < 640 ? w / 2 + Math.min(28, w * 0.07) : w / 2
      L = { dpr, cw, ch, cwp, chp, cols, rows, ox, oy, cx, base, hmax, rank, atlas: buildAtlas(cwp, chp, colors) }
    }

    const draw = () => {
      if (!L) return
      const { cw, ch, cwp, chp, cols, rows, ox, oy, cx, base, hmax, rank, atlas, dpr } = L
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      const { level: lv, flare, mix, t } = S
      // How wild the fire is: calm at rest (a clean teardrop, barely breathing), fully alive while pointed at.
      const wild = clamp01((S.speed - 0.3) / 0.7)
      // Today's height, breathing a little.
      const H0 = flameHeight()
      const H = H0 * (1 + (0.04 + 0.08 * wild) * (noise(t * 1.5, 2.2) - 0.5) * 2)
      const W0 = flameHalf(H0)
      const bed = bedHalf(H0)
      const glow = 0.8 + 0.2 * lv + 0.45 * flare
      const smoke = 1 - smooth(0.02, 0.28, lv)
      // Noise scales (px per unit), never finer than a couple of cells: the tearing inside the flame (about a sixth of
      // it across) and the licks running up its edges (a fifth of its height), both rising at about the flame's own
      // height per second.
      const sx = Math.max(H0 / 6, cw * 2.2)
      const sy = Math.max(H0 / 4.5, ch * 2)
      const rise = Math.max(H0 * 0.95, ch * 9) / sy
      const sb = Math.max(H0 / 5, ch * 2.5)
      const riseB = Math.max(H0 * 1.1, ch * 10) / sb
      const reach = Math.max(bed * 1.15, W0 * 1.5, smoke > 0.01 ? hmax * 0.3 : 0)
      const c0 = Math.max(0, Math.floor((cx - reach - ox) / cw))
      const c1 = Math.min(cols - 1, Math.ceil((cx + reach - ox) / cw))
      const top = base - Math.max(H * 1.25, smoke > 0.01 ? hmax * 1.05 : 0, ch * 3)
      const r0 = Math.max(0, Math.floor((top - oy) / ch))
      const r1 = Math.min(rows - 1, Math.ceil((base + ch * 2 - oy) / ch))
      const blocks: number[][] = colors.map(() => [])

      for (let r = r0; r <= r1; r++) {
        const py = oy + (r + 0.5) * ch
        const up = base - py
        // The flame at this height: a teardrop that tapers to a tip and sways more towards the top, its two edges
        // pushed in and out by licks that run up them.
        const q = H > 1 ? up / H : 9
        const qq = clamp01(q)
        const sway = (noise(qq * 1.2 - t * 0.8, 3.3) - 0.5) * 0.8 * qq * qq * W0
        const half = W0 * 2.27 * Math.sqrt(qq + 0.15) * Math.pow(1 - Math.min(qq, 0.999), 1.35)
        const amp = 0.04 + 0.1 * qq + wild * (0.06 + 0.5 * qq)
        const lickL = half * (1 + amp * (noise(up / sb - t * riseB, 1.7) - 0.5) * 2)
        const lickR = half * (1 + amp * (noise(up / sb - t * riseB, 8.3) - 0.5) * 2)
        const core = 0.95 * (1 - 0.72 * qq * Math.sqrt(qq))
        const tear = 0.08 + 0.25 * qq + wild * (0.22 + 1.05 * qq)
        const jitter = 0.12 * wild
        const ny = up / sy - t * rise
        const lit = q > -0.1 && q < 1.2
        for (let c = c0; c <= c1; c++) {
          const px = ox + (c + 0.5) * cw
          let heat = 0
          if (lit) {
            const p = px - cx - sway
            const shape = 1 - Math.abs(p) / (p < 0 ? lickL : lickR)
            if (shape > 0) {
              // Noise rising through the flame tears it, more so towards the top, where tips break off.
              // Burning, every cell also flickers on its own.
              const u = p / sx
              const n =
                noise(u + 7.1, ny * 0.75) * 0.5 +
                noise(u * 2.3 + 1.7, ny * 1.6 - t * rise * 0.9) * 0.3 +
                noise(u * 5 + 4.4, ny * 3.6 - t * rise * 1.7) * 0.2
              heat = core * Math.pow(shape, 0.6) - (n - 0.45) * tear - (q > 1 ? (q - 1) * 4 : 0) + (Math.random() - 0.5) * jitter
            }
          }
          // The coals: a low mound at the foot of the fire, its lumps glowing and dimming each in its own time.
          const ue = (px - cx) / bed
          if (ue > -1.08 && ue < 1.08 && up > -ch * 1.2) {
            const dome = Math.max(0, 1 - ue * ue)
            const crown = bed * (0.08 + 0.68 * dome) + ch * (noise(px / (cw * 2.5) + 2.2, 0.5) - 0.5) * 1.6
            if (up < crown) {
              const lump = noise(px / (cw * 2) + 3.1, py / (ch * 1.3) + 7.7)
              const pulse = noise(px / (cw * 4) + 9.4, t * 0.8 + py / (ch * 6))
              const e = (0.12 + 0.5 * lump * lump + 0.38 * pulse) * glow * (0.55 + 0.45 * dome)
              if (e > heat) heat = e
            }
          }
          let tier = 0
          let glyph = 0
          if (heat > 0.07) {
            tier = tierOf(heat)
            glyph = glyphOf(heat)
          } else if (smoke > 0.01 && up > 0) {
            // A curl of smoke drifting up off the coals, in puffs.
            const yy = up / hmax
            if (yy < 1.05) {
              const sxp = cx + (noise(yy * 1.8 - t * 0.3, 4.7) - 0.5) * hmax * 0.4 * yy + Math.sin(yy * 5.5 - t * 1.1) * hmax * (0.03 + 0.1 * yy)
              const dx = Math.abs(px - sxp) / (cw * 0.9 + hmax * 0.04 * yy)
              if (dx < 1) {
                const puff = smooth(0.36, 0.68, noise(px / (hmax * 0.36) + 1.3, py / (hmax * 0.16) + t * 1.3))
                const s = (1 - dx) * puff * (1 - yy * 0.8) * 1.7 * smoke
                if (s > 0.25) {
                  glyph = 1 + Math.min(3, Math.floor((s - 0.25) * 5))
                  heat = s
                }
              }
            }
          }
          if (!glyph) continue
          const x = Math.round((ox + c * cw) * dpr)
          const y = Math.round((oy + r * ch) * dpr)
          if (mix > rank[r * cols + c]) g.drawImage(atlas, glyph * cwp, tier * chp, cwp, chp, x, y, cwp, chp)
          else if (tier > 0 ? heat > 0.14 : heat > 0.4) blocks[tier].push(x, y)
        }
      }
      // Print the solid cells, one colour at a time.
      blocks.forEach((list, ti) => {
        if (!list.length) return
        g.fillStyle = colors[ti]
        g.beginPath()
        for (let i = 0; i < list.length; i += 2) g.rect(list[i], list[i + 1], cwp, chp)
        g.fill()
      })
      // Sparks live on the same grid: '*' while hot, then '+', then '.'.
      if (mix > 0.3) {
        for (const s of sparks) {
          const c = Math.round((s.x - ox) / cw - 0.5)
          const r = Math.round((s.y - oy) / ch - 0.5)
          if (s.life <= 0 || c < 0 || r < 0 || c >= cols || r >= rows) continue
          const glyph = s.life > 0.6 ? 6 : s.life > 0.3 ? 5 : 1
          const tier = s.life > 0.55 ? 4 : s.life > 0.25 ? 3 : 2
          g.drawImage(atlas, glyph * cwp, tier * chp, cwp, chp, Math.round((ox + c * cw) * dpr), Math.round((oy + r * ch) * dpr), cwp, chp)
        }
      }
    }

    // Sparks thrown up out of the flames (or off the coals): real physics, then they cool and go out.
    const burst = (n: number, power: number) => {
      if (!L || reduce) return
      const H = Math.max(flameHeight(), L.hmax * 0.12)
      const half = Math.min(flameHalf(H), bedHalf(H))
      for (let i = 0; i < n; i++) {
        const s: Spark = { x: L.cx + gsap.utils.random(-half * 0.6, half * 0.6), y: L.base - H * gsap.utils.random(0.25, 0.7), life: 1 }
        sparks.push(s)
        gsap.to(s, {
          physics2D: { velocity: gsap.utils.random(0.35, 0.8) * L.hmax * power, angle: gsap.utils.random(-120, -60), gravity: L.hmax * 0.35, friction: 0.04 },
          life: 0,
          duration: gsap.utils.random(0.8, 1.5),
          ease: 'power1.in',
          onComplete: () => sparks.splice(sparks.indexOf(s), 1),
        })
      }
    }
    const clearSparks = () => {
      gsap.killTweensOf(sparks)
      sparks.length = 0
    }

    layout()
    draw()
    api.current = { draw, burst, clearSparks }
    ctxRef.current = gsap.context(() => {}, root)

    const ro = new ResizeObserver(() => {
      layout()
      draw()
    })
    ro.observe(root)
    document.fonts?.load('600 12px "Geist Mono Variable"').then(() => {
      layout()
      draw()
    }, () => {})

    // Burning: redrawn 30 times a second. At rest the fire idles at a third of the pace and is redrawn 8 times a
    // second. Offscreen, nothing runs.
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '40px' })
    io.observe(root)
    let since = 0
    const tick = (_time: number, deltaTime: number) => {
      if (!visible || !L) return
      const dt = Math.min(deltaTime, 100) / 1000
      S.t += dt * S.speed
      since += dt
      const busy = S.speed > 0.5 || S.mix > 0.01 || sparks.length > 0
      if (since >= 1 / (busy ? FPS : IDLE_FPS) - 0.004) {
        since = 0
        draw()
      }
    }
    if (!reduce) gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      ro.disconnect()
      io.disconnect()
      clearSparks()
      ctxRef.current?.revert()
      ctxRef.current = null
      api.current = null
    }
  }, [open])

  // Pointed at (or opened): flare up, throw sparks, resolve into characters, keep burning. Let go: settle back.
  useLayoutEffect(() => {
    const ctx = ctxRef.current
    const A = api.current
    if (!ctx || !A) return
    const S = scene.current
    if (prefersReducedMotion()) {
      // A still: the calm print at rest, a frame of the fire burning when pointed at.
      S.mix = on ? 1.02 : 0
      S.speed = on ? 1 : 0.3
      S.flare = 0
      A.draw()
      return
    }
    let pop: gsap.core.Tween | null = null
    ctx.add(() => {
      gsap.killTweensOf(S, 'speed,flare,mix')
      if (!on) {
        gsap.to(S, { speed: 0.3, flare: 0, mix: 0, duration: 0.7, ease: 'power2.inOut' })
        return
      }
      const loop = () => {
        A.burst(S.level > 0.7 ? 2 : 1, 0.55 + S.level * 0.5)
        pop = gsap.delayedCall(gsap.utils.random(0.3, 0.85) / (0.45 + S.level), loop)
      }
      gsap
        .timeline({ delay: open ? 0.7 : 0 })
        .to(S, { speed: 1, duration: 0.4, ease: 'power2.out' }, 0)
        .to(S, { mix: 1.02, duration: 0.75, ease: 'power2.inOut' }, 0)
        .to(S, { flare: 1, duration: 0.35, ease: 'power3.out' }, 0.05)
        .add(() => A.burst(4 + Math.round(S.level * 9), 0.9 + S.level * 0.5), 0.3)
        .to(S, { flare: 0.06, duration: 1.6, ease: 'power2.inOut' }, 0.55)
        .add(loop, 1.2)
    })
    return () => {
      pop?.kill()
      if (on) A.clearSparks()
    }
  }, [on, open])

  // Today's number decides the size of the fire; when it arrives (or changes) the fire grows into it.
  useEffect(() => {
    const S = scene.current
    if (Math.abs(S.level - level) < 0.001) return
    if (prefersReducedMotion()) {
      S.level = level
      api.current?.draw()
    } else gsap.to(S, { level, duration: 1.4, ease: 'power2.inOut', overwrite: 'auto', onUpdate: () => api.current?.draw() })
  }, [level])

  // In the tile, the repo being worked on decodes in under the fire.
  useEffect(() => {
    if (open || !nameRef.current || !countRef.current) return
    const name = workingOn(now, 'quiet today')
    const count = now.loading ? '' : `\u00a0· ${now.commitsToday} today`
    if (prefersReducedMotion()) {
      nameRef.current.textContent = on ? name : ''
      countRef.current.textContent = on ? count : ''
      return
    }
    const tween = (el: HTMLElement, text: string, delay: number) =>
      gsap.to(el, { scrambleText: { text, chars: RAMP.trim(), speed: 0.7 }, duration: text ? 0.8 : 0.3, delay, overwrite: true })
    tween(nameRef.current, on ? name : '', on ? 0.15 : 0)
    tween(countRef.current, on ? count : '', on ? 0.45 : 0)
  }, [on, open, now.repo, now.hidden, now.commitsToday, now.loading])

  // The ruler's marks, minus any the "today" marker would sit on.
  const marks = MARKS.filter((c) => now.commitsToday <= 0 || Math.abs(heatFor(c) - level) > 0.04)

  return (
    <div ref={rootRef} className="relative h-full w-full" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      {!open && (
        <span className="absolute inset-x-0 bottom-0 hidden truncate text-center font-mono md:block text-[11px] uppercase leading-none tracking-[0.06em] text-paper">
          <span ref={nameRef} />
          <span ref={countRef} className="text-accent" />
        </span>
      )}
      {open && (
        // The ruler beside the fire: how tall it stands for each number of commits, and where today's is. Shown at every
        // size (on phones too), its numbers growing a little on big monitors.
        <span className="absolute inset-y-0 left-0 block w-24 huge:w-32">
          <span className="absolute left-0 block w-px bg-paper/15" style={{ bottom: `${(1 - OPEN_BASE) * 100}%`, height: `${OPEN_HMAX * 100}%` }} />
          {marks.map((c) => (
            <span
              key={c}
              className="absolute left-0 flex -translate-y-1/2 items-center gap-2 font-mono text-[11px] leading-none tracking-[0.06em] text-mute huge:gap-3 huge:text-[clamp(11px,0.3vw+5px,15px)]"
              style={{ top: `${(OPEN_BASE - OPEN_HMAX * heatFor(c)) * 100}%` }}
            >
              <span className="block h-px w-2 bg-paper/30" />
              {c === 12 ? '12+' : c}
            </span>
          ))}
          {!now.loading && (
            <span
              className="absolute left-0 flex -translate-y-1/2 items-center gap-2 font-mono text-[11px] uppercase leading-none tracking-[0.06em] text-accent huge:gap-3 huge:text-[clamp(11px,0.3vw+5px,15px)]"
              style={{ top: `${(OPEN_BASE - OPEN_HMAX * level) * 100}%` }}
            >
              <span className="block h-[2px] w-5 bg-accent" />
              {now.commitsToday} today
            </span>
          )}
        </span>
      )}
    </div>
  )
}
