import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

type RGB = readonly [number, number, number]
const BLUE: RGB = [77, 163, 255]
const PAPER: RGB = [242, 242, 242]
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// Brightness ramp for the body of each hand, and the junk characters things scramble through.
const RAMP = '.:-=+*#%@'
const NOISE = '/\\|<>{}[]()+=~:;*01'
// Darker than this is background. Above EDGE (Sobel magnitude) a cell is on an outline and gets a stroke character.
const LIT = 0.12
const EDGE = 1.6
// Brightness levels of the characters, dim to bright.
const INK = [0.62, 0.78, 0.9, 1]

type Spec = { src: string; tipY: number; aspect: number; colour: RGB }
// Where each fingertip sits (fraction of the image height); the human's tip is its right edge, the robot's its left.
const HUMAN: Spec = { src: '/creation/human.png', tipY: 0.577, aspect: 170 / 420, colour: BLUE }
const ROBOT: Spec = { src: '/creation/robot.png', tipY: 0.372, aspect: 152 / 420, colour: PAPER }

const FONT_FAMILY = '"Geist Mono Variable", ui-monospace, Menlo, monospace'

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// The photo of a hand turned into ink: its brightness becomes the alpha of one flat colour. This is what the grid's
// halftone prints at rest.
function tint(img: HTMLImageElement, colour: RGB) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < d.data.length; i += 4) {
    const a = Math.max(0, Math.min(1, (d.data[i] / 255 - 0.06) / 0.78))
    d.data[i] = colour[0]
    d.data[i + 1] = colour[1]
    d.data[i + 2] = colour[2]
    d.data[i + 3] = Math.round(Math.pow(a, 0.85) * 255)
  }
  x.putImageData(d, 0, 0)
  return c
}

type Source = { img: HTMLImageElement; print: HTMLCanvasElement }
let sources: Promise<Source[]> | null = null
const loadSources = () =>
  (sources ??= Promise.all(
    [HUMAN, ROBOT].map((spec) => load(spec.src).then((img) => ({ img, print: tint(img, spec.colour) }))),
  ).catch((e) => {
    sources = null
    throw e
  }))

// Cheap stable noise: the same inputs always give the same number.
const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return (h >>> 0) / 4294967296
}

// One hand as character cells, sorted by brightness level so each level draws with one fill colour.
type Cells = {
  cols: number
  rows: number
  tip: number
  tipRight: boolean
  print: HTMLCanvasElement
  colour: RGB
  start: number[]
  col: Int16Array
  row: Int16Array
  // How many columns from the fingertip (for the decode sweep) and how far in px (for the charge wave).
  reach: Int16Array
  dist: Float32Array
  glyph: string[]
}

function toCells(src: Source, spec: Spec, cols: number, rows: number, cw: number, ch: number, tipRight: boolean): Cells {
  const c = document.createElement('canvas')
  c.width = cols
  c.height = rows
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.imageSmoothingQuality = 'high'
  x.drawImage(src.img, 0, 0, cols, rows)
  const px = x.getImageData(0, 0, cols, rows).data
  const lum = new Float32Array(cols * rows)
  for (let i = 0; i < lum.length; i++) lum[i] = px[i * 4] / 255
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= cols || j >= rows ? 0 : lum[j * cols + i])
  const tip = Math.min(rows - 1, Math.floor(spec.tipY * rows))
  const tipCol = tipRight ? cols - 1 : 0

  const buckets: { col: number; row: number; glyph: string }[][] = [[], [], [], []]
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const l = lum[j * cols + i]
      if (l < LIT) continue
      const gx = at(i + 1, j - 1) + 2 * at(i + 1, j) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i - 1, j) - at(i - 1, j + 1)
      const gy = at(i - 1, j + 1) + 2 * at(i, j + 1) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i, j - 1) - at(i + 1, j - 1)
      const v = (l - LIT) / (1 - LIT)
      let glyph: string
      if (Math.hypot(gx, gy) > EDGE) {
        // Outlines get the stroke that follows them (angle measured on screen, since cells aren't square).
        const t = ((Math.atan2(gx / cw, gy / ch) * 180) / Math.PI + 180) % 180
        glyph = t < 25 || t >= 155 ? (gy < 0 ? '_' : '-') : t < 72 ? '/' : t < 108 ? '|' : '\\'
      } else glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))]
      buckets[Math.min(3, Math.floor(v * 4))].push({ col: i, row: j, glyph })
    }
  }
  const all = buckets.flat()
  const start = [0]
  buckets.forEach((b) => start.push(start[start.length - 1] + b.length))
  return {
    cols,
    rows,
    tip,
    tipRight,
    print: src.print,
    colour: spec.colour,
    start,
    col: Int16Array.from(all, (a) => a.col),
    row: Int16Array.from(all, (a) => a.row),
    reach: Int16Array.from(all, (a) => Math.abs(a.col - tipCol)),
    dist: Float32Array.from(all, (a) => Math.hypot((a.col - tipCol) * cw, (a.row - tip) * ch)),
    glyph: all.map((a) => a.glyph),
  }
}

type Layout = { cw: number; ch: number; font: string; bold: string; spark: string; human: Cells; robot: Cells; line: number; rest: number; near: number; far: number }
type Bolt = { row: number; glyph: string }[]
// The charge front runs past the end of the arm so the blue it leaves behind has time to fade.
const WAVE_END = 1.7
// The spark's six arms, in cells per step: up and down, and the four diagonals.
const ARMS: [number, number, string][] = [
  [0, -1, '|'],
  [0, 1, '|'],
  [1, -1, '/'],
  [-1, 1, '/'],
  [1, 1, '\\'],
  [-1, -1, '\\'],
]

// Contact: a human hand (sky blue) and a robot hand (paper), echoing the hero's marble hands.
// At rest they're printed apart, as photos through the grid's halftone. Pointed at, they decode into characters from
// the fingertips back, reach until the fingertips almost touch, a spark jumps the gap, both flinch, and the charge
// runs up the robot's arm in sky blue; then it sparks again every couple of seconds.
// `burst` (panel only) fires an extra, bigger spark whenever it changes, e.g. when the email is copied.
export default function ContactArt({ active, open = false, burst = 0 }: ArtProps & { burst?: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const api = useRef<{ set: (on: boolean) => void; fire: () => void } | null>(null)
  const openAtMount = useRef(open)

  useLayoutEffect(() => {
    const root = rootRef.current
    const cv = canvasRef.current
    const g = cv?.getContext('2d')
    if (!root || !cv || !g) return
    const reduce = prefersReducedMotion()
    const big = openAtMount.current
    let W = 0
    let H = 0
    let dpr = 1
    let lay: Layout | null = null
    let srcs: Source[] | null = null
    let alive = true

    // Everything the scene animates. reach: 0 apart, 1 almost touching. code: 0 printed photo, 1 characters (the
    // decode sweep). fx fades the spark layer out when the visitor leaves.
    // burst is how far the spark's rays have flown, flash how bright they still are (split so they can ease apart).
    const s = { reach: 0, code: big ? 1 : 0, drift: 0, fx: 1, crackle: 0, bolt: 0, boltOut: 0, burst: 0, flash: 0, wave: 0, big: 0 }
    let bolt: Bolt = []
    let lastGap = -1

    const layout = () => {
      const r = cv.getBoundingClientRect()
      W = r.width
      H = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.max(1, Math.round(W * dpr))
      cv.height = Math.max(1, Math.round(H * dpr))
      if (!srcs || W < 20 || H < 20) return (lay = null)
      // Each hand spans most of the box with its arm cropped by the edge, capped so both fit the height.
      // In the panel the crop follows the shape of the box: on a wide screen each hand takes about half the width with
      // its forearm; on a phone or an upright tablet there's no room for arms side by side, so the crop closes in on the
      // fingertips (the Creation detail) and both hands run off the edges, big, instead of shrinking to a thin strip.
      const wide = gsap.utils.clamp(0, 1, (W / H - 1.2) / 1.1)
      const handW = Math.min(W * (big ? 1.75 - 1.21 * wide : 0.95), H * 2.05)
      // Character cells scale with the hands (so the cropped-in hands get bigger characters), growing on big monitors.
      const cw = Math.max(4, Math.min(W >= 1800 ? 11.5 : 9, handW / (big ? 120 : 70)))
      const ch = cw * 1.8
      const cols = Math.round(handW / cw)
      const rowsOf = (spec: Spec) => Math.max(4, Math.round((cols * cw * spec.aspect) / ch))
      const human = toCells(srcs[0], HUMAN, cols, rowsOf(HUMAN), cw, ch, true)
      const robot = toCells(srcs[1], ROBOT, cols, rowsOf(ROBOT), cw, ch, false)
      const above = Math.max(human.tip, robot.tip) * ch
      const below = Math.max(human.rows - human.tip, robot.rows - robot.tip) * ch
      const size = (cw * 1.7).toFixed(2)
      lay = {
        cw,
        ch,
        font: `${big ? 600 : 700} ${size}px ${FONT_FAMILY}`,
        bold: `800 ${size}px ${FONT_FAMILY}`,
        spark: `800 ${(cw * 2.1).toFixed(2)}px ${FONT_FAMILY}`,
        human,
        robot,
        line: Math.round((H - above - below) / 2 + above),
        rest: W * (big ? 0.2 : 0.3),
        // Fingertips almost touching: a few characters of air between them.
        near: cw * (big ? 4.5 : 3.4),
        far: cols * cw,
      }
    }

    // A jagged walk from one fingertip to the other, pinned at both ends, one character per column.
    const walk = (): Bolt => {
      if (!lay) return []
      const gap = lay.near + (lay.rest - lay.near) * (1 - Math.min(1, s.reach))
      const n = Math.max(3, Math.round(gap / lay.cw) - 1)
      const amp = Math.min(2, Math.floor(n / 3))
      const rows: number[] = [0]
      for (let k = 1; k < n; k++) {
        const room = Math.min(amp, n - 1 - k)
        rows.push(Math.max(-room, Math.min(room, rows[k - 1] + Math.round(Math.random() * 2 - 1))))
      }
      if (!rows.some(Boolean)) rows[Math.floor(n / 2)] = Math.random() < 0.5 ? -1 : 1
      return rows.map((row, k) => {
        const d = (rows[k + 1] ?? 0) - row
        return { row, glyph: d > 0 ? '\\' : d < 0 ? '/' : '-' }
      })
    }
    // The main strand and a fainter second one beside it.
    let fork: Bolt = []
    const newBolt = () => {
      bolt = walk()
      fork = walk()
    }

    const BAND_CELLS = 7
    const draw = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      if (!lay) return
      const { cw, ch, human, robot, line } = lay
      const gap = lay.rest + (lay.near - lay.rest) * s.reach + s.drift
      const xh = W / 2 - gap / 2
      const xr = W / 2 + gap / 2
      const seed = Math.floor(gsap.ticker.time * 24)
      const moving = lastGap < 0 ? 0 : Math.min(0.6, (Math.abs(gap - lastGap) / cw) * 0.5)
      lastGap = gap
      const band = BAND_CELLS * cw * (1 + s.big)
      const front = s.wave > 0 && s.wave < WAVE_END ? s.wave * (lay.far + band) : -1
      const charged: number[] = []
      g.font = lay.font
      g.textAlign = 'center'
      g.textBaseline = 'middle'

      const hands: [Cells, number, number, number][] = [
        [human, xh - human.cols * cw, line - human.tip * ch, 0],
        [robot, xr, line - robot.tip * ch, 1],
      ]
      for (const [c, x0, y0, id] of hands) {
        // The decode sweep: in each row, cells closer to the fingertip than `edge` columns are characters, the rest is
        // still the printed photo. Rows start at slightly different times so the front is ragged.
        const edges: number[] = []
        for (let j = 0; j < c.rows; j++) edges.push(Math.ceil((s.code * 1.3 - 0.3 * hash(j, 101 + id)) * c.cols))

        if (s.code < 1) {
          g.save()
          g.beginPath()
          for (let j = 0; j < c.rows; j++) {
            const e = Math.max(0, edges[j])
            if (e >= c.cols) continue
            const left = c.tipRight ? x0 : x0 + e * cw
            g.rect(left, y0 + j * ch, (c.cols - e) * cw, ch)
          }
          g.clip()
          g.drawImage(c.print, x0, y0, c.cols * cw, c.rows * ch)
          g.restore()
        }
        if (s.code <= 0) continue

        for (let L = 0; L < 4; L++) {
          g.fillStyle = rgba(c.colour, INK[L])
          for (let k = c.start[L]; k < c.start[L + 1]; k++) {
            const left = edges[c.row[k]] - c.reach[k]
            if (left <= 0) continue
            const x = x0 + c.col[k] * cw
            if (x > W || x < -cw) continue
            if (id === 1 && front > c.dist[k]) {
              charged.push(k, L)
              continue
            }
            // Characters scramble at the decode front and while a hand moves fast, and resolve as it settles.
            const p = left <= 2 ? 0.85 : moving
            const glyph = p > 0.02 && hash(k + id * 9973, seed) < p ? NOISE[(hash(k, seed + 7) * NOISE.length) | 0] : c.glyph[k]
            g.fillText(glyph, x + cw / 2, y0 + c.row[k] * ch + ch / 2)
          }
        }
      }

      // The charge running up the robot's arm: a band of scrambling, bright sky-blue characters at the front, and
      // behind it the robot flushed blue, fading back to paper.
      if (charged.length) {
        const [, x0, y0] = hands[1]
        const fade = lay.far * 0.6
        for (let i = 0; i < charged.length; i += 2) {
          const k = charged[i]
          const behind = front - robot.dist[k]
          const t = behind < band ? 1 - behind / band : 0
          const glow = t > 0 ? 1 : Math.max(0, 1 - (behind - band) / fade)
          if (glow <= 0) {
            g.fillStyle = rgba(PAPER, INK[charged[i + 1]])
            g.fillText(robot.glyph[k], x0 + robot.col[k] * cw + cw / 2, y0 + robot.row[k] * ch + ch / 2)
            continue
          }
          // Four steps of blue are plenty, and keep the colour strings few.
          const step = Math.ceil(glow * 4) / 4
          g.fillStyle = rgba(t > 0.6 ? mix(BLUE, PAPER, 0.35) : mix(PAPER, BLUE, step), t > 0 ? 1 : INK[charged[i + 1]])
          const glyph = t > 0 && hash(k, seed) < 0.25 + t * 0.6 ? NOISE[(hash(k, seed + 3) * NOISE.length) | 0] : robot.glyph[k]
          g.fillText(glyph, x0 + robot.col[k] * cw + cw / 2, y0 + robot.row[k] * ch + ch / 2)
        }
      }

      const fx = s.fx * Math.min(1, s.code * 2)
      if (fx < 0.01) return
      const span = xr - xh
      const cy = line + ch / 2

      // Charge building in the gap just before the spark: characters flickering on and off between the fingertips,
      // thickest on the line between them.
      if (s.crackle > 0.02) {
        const n = Math.max(2, Math.round(span / cw))
        g.font = lay.bold
        for (let k = 0; k < n; k++) {
          for (let row = -1; row <= 1; row++) {
            if (hash(k * 3 + row + 40, seed) > s.crackle * (row ? 0.22 : 0.7)) continue
            g.fillStyle = rgba(hash(k + 5, seed + row) < 0.3 ? PAPER : BLUE, (0.45 + s.crackle * 0.55) * fx)
            g.fillText(NOISE[(hash(k + 17 + row, seed) * NOISE.length) | 0], xh + (k + 0.5) * (span / n), cy + row * ch)
          }
        }
      }

      // The spark: drawn from the human fingertip to the robot's, white-hot at its head, then erased from its tail.
      if (s.bolt > s.boltOut && bolt.length) {
        const strand = (b: Bolt, colour: RGB, alpha: number, font: string) => {
          const n = b.length
          const head = Math.min(n, Math.ceil(s.bolt * n))
          const tail = Math.floor(s.boltOut * n)
          g.font = font
          for (let k = tail; k < head; k++) {
            const hot = k === head - 1 && s.bolt < 1
            g.fillStyle = rgba(hot ? PAPER : colour, alpha * fx)
            g.fillText(hot ? '*' : b[k].glyph, xh + (k + 0.5) * (span / n), cy + b[k].row * ch)
          }
        }
        strand(fork, PAPER, 0.45, lay.bold)
        strand(bolt, BLUE, 1, lay.spark)
      }

      // The moment it lands: an asterisk where the fingertips meet, white-hot for an instant (both tips flash with it),
      // then sky blue and shrinking while its six arms fly outward. The diagonals step one cell across per row, so
      // their slashes line up the way ASCII art draws them. The arms travel fast and fade late.
      if (s.flash > 0.01) {
        const cx = W / 2
        const hot = s.flash > 0.88
        const star = (size: number, colour: RGB, alpha: number) => {
          g.font = `800 ${size.toFixed(1)}px ${FONT_FAMILY}`
          // '*' sits high in its cell; centre the glyph itself on the line between the fingertips.
          const m = g.measureText('*')
          g.fillStyle = rgba(colour, alpha)
          g.fillText('*', cx, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2)
        }
        star(ch * (1.1 + s.flash * (1.7 + (big ? 0.6 : 0) + s.big * 1.2)), BLUE, Math.min(1, s.flash * 1.4) * fx)
        if (hot) star(ch * 1.6, PAPER, fx)
        g.font = lay.spark
        if (hot) {
          g.fillStyle = rgba(PAPER, fx)
          g.fillText('*', xh - cw * 0.5, cy)
          g.fillText('*', xr + cw * 0.5, cy)
        }
        const r = 1.4 + s.burst * (2.3 + (big ? 1.4 : 0) + s.big * 2.6)
        const glyphs = s.big || big ? 3 : 2
        for (const [dx, dy, glyph] of ARMS) {
          for (let k = 0; k < glyphs; k++) {
            const d = r - k
            if (d < 1) continue
            g.fillStyle = rgba(BLUE, Math.pow(s.flash, 1 + k * 0.8) * fx)
            g.fillText(glyph, cx + dx * d * cw, cy + dy * d * ch)
          }
        }
      }
    }

    // Draw every frame only while something is moving.
    let running = false
    const tick = () => draw()
    const run = () => {
      if (running) return
      running = true
      lastGap = -1
      gsap.ticker.add(tick)
    }
    const stop = () => {
      running = false
      gsap.ticker.remove(tick)
      draw()
    }

    const ctx = gsap.context(() => {}, root)
    let live: gsap.core.Animation[] = []
    let spark: gsap.core.Timeline | null = null
    const killAll = () => {
      live.forEach((a) => a.kill())
      live = []
      spark = null
    }

    const buildSpark = () => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 })
      tl.call(newBolt)
        .fromTo(s, { crackle: 0 }, { crackle: 1, duration: 0.42, ease: 'power2.in' })
        .addLabel('bolt')
        .set(s, { crackle: 0, bolt: 0, boltOut: 0, burst: 0, flash: 0, wave: 0 }, 'bolt')
        .to(s, { bolt: 1, duration: 0.1, ease: 'none' }, 'bolt')
        .to(s, { boltOut: 1, duration: 0.3, ease: 'power2.in' }, 'bolt+=0.22')
        // It lands: the flash pops at full strength and fades late while its rays shoot out early.
        .set(s, { flash: 1 }, 'bolt+=0.1')
        .to(s, { flash: 0, duration: 0.9, ease: 'power1.in' }, 'bolt+=0.1')
        .to(s, { burst: 1, duration: 0.85, ease: 'expo.out' }, 'bolt+=0.1')
        .to(s, { wave: WAVE_END, duration: 1.7, ease: 'power1.in' }, 'bolt+=0.1')
        // The shock: both hands flinch apart, then spring back.
        .to(s, { reach: 0.86, duration: 0.09, ease: 'power2.out' }, 'bolt+=0.1')
        .to(s, { reach: 1, duration: 0.9, ease: 'elastic.out(1, 0.4)' }, 'bolt+=0.19')
        .set(s, { big: 0 })
      return tl
    }

    // Reduced motion: the rest frame, or the hands reaching with the spark across the gap.
    const still = (on: boolean) => {
      Object.assign(s, { reach: on ? 1 : 0, code: on || big ? 1 : 0, fx: 1, wave: 0, burst: on ? 0.3 : 0, flash: on ? 0.7 : 0, bolt: on ? 1 : 0, boltOut: 0 })
      if (on) newBolt()
      // A jump, not a move: don't let the fast-hand scramble fire.
      lastGap = -1
      draw()
    }

    let on = false
    const set = (next: boolean) => {
      on = next
      if (reduce) return still(on)
      // Already at rest with nothing playing (e.g. on mount): just draw.
      if (!on && !running && s.reach === 0) return draw()
      killAll()
      run()
      ctx.add(() => {
        if (on) {
          Object.assign(s, { fx: 1, bolt: 0, boltOut: 0, burst: 0, flash: 0, wave: 0, crackle: 0, big: 0 })
          const intro = gsap.timeline({ delay: big ? 0.75 : 0 })
          intro
            .to(s, { code: 1, duration: 0.7, ease: 'power2.inOut' }, 0)
            // A small wind-up, then the reach.
            .to(s, { reach: s.reach - 0.07, duration: 0.2, ease: 'power2.out' }, 0)
            .to(s, { reach: 1, duration: 1.0, ease: 'expo.out' }, 0.2)
            .add(() => {
              ctx.add(() => {
                spark = buildSpark()
                const drift = gsap.to(s, { drift: lay ? lay.cw * 0.7 : 4, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
                live.push(spark, drift)
              })
            }, 1.05)
          live.push(intro)
        } else {
          s.wave = 0
          s.crackle = 0
          const back = gsap.timeline({ onComplete: stop })
          back
            .to(s, { fx: 0, duration: 0.2, ease: 'power1.out' }, 0)
            .to(s, { reach: 0, drift: 0, duration: 0.85, ease: 'power3.inOut' }, 0)
            .to(s, { code: big ? 1 : 0, duration: 0.7, ease: 'power2.inOut' }, 0.2)
          live.push(back)
        }
      })
    }

    // An extra, bigger spark on demand.
    const fire = () => {
      if (!on) return
      if (reduce) return still(true)
      if (!spark) return
      newBolt()
      s.big = 1
      spark.play('bolt')
    }

    api.current = { set, fire }

    const ro = new ResizeObserver(() => {
      layout()
      draw()
    })
    ro.observe(root)
    loadSources()
      .then((loaded) => {
        if (!alive) return
        srcs = loaded
        layout()
        if (reduce) still(on)
        else draw()
        // Characters drawn before the mono font arrived would be in the fallback; redraw once it's in.
        document.fonts?.load(`600 12px ${FONT_FAMILY}`).then(() => alive && draw())
      })
      .catch(() => {})

    return () => {
      alive = false
      api.current = null
      ro.disconnect()
      killAll()
      gsap.ticker.remove(tick)
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    api.current?.set(active || open)
  }, [active, open])

  const fired = useRef(burst)
  useEffect(() => {
    if (burst === fired.current) return
    fired.current = burst
    api.current?.fire()
  }, [burst])

  return (
    <div ref={rootRef} className="relative h-full w-full" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  )
}
