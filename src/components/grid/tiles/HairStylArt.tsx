import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin)

// HairStyl: a head in profile, drawn like a raster scan: the hair is rows of wavy line, the beard rows of stubble
// dashes, the face one clean contour. Pointed at, the camera's detection corners lock on, a scan line runs down the
// head, each hair row springs into its real wave as the line passes it and landmarks light on the hair, brows and
// beard. Then the read-out lands as chips on leader lines, and the sky-blue payoff: the recommended cut previews on
// the head itself (the sides fade out row by row, like a dither) as its chip fills. Each loop reads a new selfie.

const TAU = Math.PI * 2
const INK = '#0A0A0A'
const NS = { vectorEffect: 'non-scaling-stroke' as const }
const SOLID = '6 0' // a hair row's dash pattern (screen px): solid, until the fade preview breaks it up
const PERIOD = 6
const REST = { amp: 0.9, len: 20 } // the calm frame: the rows barely ripple

// ---- The head, in its own coordinates (about 200 x 230, facing right) ----

// The hair's outer edge is an ellipse.
const E = { cx: 98, cy: 86, rx: 80, ry: 78 }
const ex = (y: number, side: 1 | -1) => E.cx + side * E.rx * Math.sqrt(Math.max(0, 1 - ((y - E.cy) / E.ry) ** 2))

// Piecewise-linear x for a y, from [y, x] pairs sorted by y.
const lerp = (pts: number[][], y: number) => {
  if (y <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [y1, x1] = pts[i]
    if (y <= y1) {
      const [y0, x0] = pts[i - 1]
      return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
    }
  }
  return pts[pts.length - 1][1]
}

// The profile, forehead to throat: brow ridge, nose, lips, chin, and down the neck.
const PROFILE = [
  [167, 46], [171, 58], [174, 72], [176, 84], [177, 92], [173, 101], [176, 108], [182, 117], [189, 125], [190, 130],
  [185, 133], [178, 135], [181, 140], [182, 144], [177, 149], [180, 153], [179, 158], [174, 163], [176, 170], [179, 177],
  [176, 185], [168, 190], [156, 194], [149, 200], [146, 208], [146, 216],
]
const FACE_YX = PROFILE.filter((p) => p[1] <= 186).map(([x, y]) => [y, x])
const HAIRLINE = [[46, 166], [52, 152], [62, 140], [72, 134], [82, 130], [94, 127]] // forehead back to the temple
const CHEEK = [[104, 126], [114, 134], [124, 144], [132, 156], [138, 172]] // the beard's top edge, sideburn to lip
const JAW = [[142, 112], [166, 108], [176, 118], [186, 136]] // the beard's back edge, under the ear and along the jaw

const smooth = (p: number[][]) => {
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const f = (n: number) => n.toFixed(1)
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`
  }
  return d
}
const FACE = smooth(PROFILE)
const NAPE = 'M66 158 C68 178 70 198 72 216'
const EAR = 'M115 99 C104 92 95 101 96 114 C97 126 102 136 111 138'
const EAR_IN = 'M109 107 C104 110 104 120 109 124'
const EYE = 'M157 106 Q163 110 169 106'
const BROW = 'M149 95 Q161 88 175 92'

type Seg = { y: number; x0: number; x1: number }
const hairRows = (step: number): Seg[] => {
  const rows: Seg[] = []
  for (let y = 12; y <= 152; y += step) {
    const x1 = y < 46 ? ex(y, 1) : y < 96 ? lerp(HAIRLINE, y) : y < 146 ? 92 : 80
    rows.push({ y, x0: ex(y, -1), x1 })
  }
  return rows
}
const beardRows = (step: number): Seg[] => {
  const rows: Seg[] = []
  for (let y = 112; y <= 182; y += step) {
    const x0 = y < 142 ? 121 : lerp(JAW, y)
    const x1 = y < 138 ? lerp(CHEEK, y) : lerp(FACE_YX, y) - 5
    rows.push({ y, x0, x1 })
  }
  return rows
}

// A hair row as a wave; its ends ease back onto the baseline so the silhouette stays clean.
const wave = (s: Seg, i: number, amp: number, len: number, cut = 0) => {
  const x0 = s.x0 + cut
  const span = s.x1 - x0
  const n = Math.max(2, Math.ceil(span / 2.5))
  let d = ''
  for (let k = 0; k <= n; k++) {
    const x = x0 + (span * k) / n
    const e = Math.min(1, (x - x0) / 7, (s.x1 - x) / 7)
    const y = s.y + amp * e * Math.sin((x / len) * TAU + i * 1.1)
    d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(2)}`
  }
  return d
}

// Where the analysis drops landmarks (head coordinates). The first five carry the chips.
const LM: [number, number][] = [
  [ex(32, 1), 32], // hair, front edge: texture
  [ex(62, -1), 62], // hair, back: porosity
  [ex(122, -1), 122], // the sides: the cut
  [160, 182], // beard
  [162, 91], // brow
  [167, 47], // hairline
  [122, 106], // sideburn
  [177, 139], // moustache
  [57, 152], // nape
]

// Each loop reads a new (made-up) selfie: its curl, what the hair is like, and the cut it recommends.
// The grid tile gets the short words (its chips are small); the panel gets the full ones.
const VARIANTS = [
  {
    amp: 2.3,
    len: 19,
    fade: 84,
    full: ['TYPE 2B', 'LOW POROSITY', 'FADE · #2 SIDES', 'BEARD · 3 MM', 'BROWS · TIDY'],
    short: ['TYPE 2B', 'LOW POROSITY', 'FADE · #2', 'BEARD 3MM'],
  },
  {
    amp: 2.6,
    len: 11,
    fade: 112,
    full: ['TYPE 3A', 'HIGH POROSITY', 'LOW TAPER', 'BEARD · FULL', 'BROWS · KEEP'],
    short: ['TYPE 3A', 'HIGH POROSITY', 'LOW TAPER', 'FULL BEARD'],
  },
]
const PAYOFF = 2 // the chip that turns sky blue: the cut
const ORDER = [0, 1, 4, 3, 2] // chips land top to bottom on each side, the cut last

// ---- Compositions ----

type Spot = { side: 1 | -1; ax: number; cy: number }
type Layout = {
  vb: string
  s: number
  tx: number
  ty: number
  step: number // hair row spacing (head units)
  beard: number // beard row spacing
  lm: number // landmark size
  short: boolean // short chip words
  fs: number // chip text size
  h: number // chip height
  spots: Spot[] // one per chip; fewer spots = fewer chips
  box: [number, number, number, number] // the detection corners
  lead: number // seconds to wait before the corners lock on (the panel copy waits for the panel to open)
}

// The wide grid tile: the head in the middle, the read-out on both sides.
const TILE: Layout = {
  vb: '0 0 400 196',
  s: 0.78,
  tx: 119,
  ty: 5,
  step: 10,
  beard: 7,
  lm: 8,
  short: true,
  fs: 11,
  h: 19,
  spots: [
    { side: 1, ax: 290, cy: 30 },
    { side: -1, ax: 114, cy: 40 },
    { side: -1, ax: 116, cy: 124 },
    { side: 1, ax: 286, cy: 168 },
  ],
  box: [124, 2, 276, 190],
  lead: 0,
}

// The phone grid tile is nearly square and small: just the head, with fewer, wider-spaced rows.
const NARROW: Layout = { ...TILE, vb: '108 -4 184 202', step: 14, beard: 10, lm: 10, spots: [] }

// The opened panel: bigger, with a fifth chip for the brows.
const OPEN: Layout = {
  vb: '0 0 440 380',
  s: 1.15,
  tx: 100,
  ty: 52,
  step: 8,
  beard: 5,
  lm: 6.4,
  short: false,
  fs: 9,
  h: 18,
  spots: [
    { side: 1, ax: 330, cy: 74 },
    { side: -1, ax: 106, cy: 104 },
    { side: -1, ax: 112, cy: 224 },
    { side: 1, ax: 330, cy: 292 },
    { side: 1, ax: 338, cy: 150 },
  ],
  box: [108, 46, 336, 330],
  lead: 0.9,
}

// The opened panel on a phone is a short, wide box: the view widens to fill it, so four chips with the short
// words can be set larger.
const OPEN_SM: Layout = { ...OPEN, vb: '-36 0 512 380', short: true, fs: 13, h: 24, spots: OPEN.spots.slice(0, 4) }

const useWide = () => {
  const [wide, setWide] = useState(true)
  useLayoutEffect(() => {
    const m = window.matchMedia('(min-width: 768px)')
    const f = () => setWide(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

const accent = () => {
  const v = typeof window === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  return v ? `rgb(${v.split(/\s+/).join(', ')})` : '#4DA3FF'
}

export default function HairStylArt({ active, open = false }: ArtProps) {
  const wide = useWide()
  const L = open ? (wide ? OPEN : OPEN_SM) : wide ? TILE : NARROW
  const root = useRef<SVGSVGElement>(null)
  const api = useRef<{ play: () => void; rest: () => void } | null>(null)

  const hair = useMemo(() => hairRows(L.step), [L.step])
  const beard = useMemo(() => beardRows(L.beard), [L.beard])
  const gx = (x: number) => L.tx + x * L.s
  const gy = (y: number) => L.ty + y * L.s
  const pad = L.h * 0.45

  // Leader lines: out of the landmark at 45 degrees to the chip's height, then straight in.
  const leader = (k: number) => {
    const sp = L.spots[k]
    const lx = gx(LM[k][0])
    const ly = gy(LM[k][1])
    const d = Math.abs(sp.cy - ly)
    let kx = lx + sp.side * d
    if (sp.side * (sp.ax - kx) < 4) kx = sp.ax - sp.side * 4
    return `M${lx.toFixed(1)} ${ly.toFixed(1)} L${kx.toFixed(1)} ${sp.cy} H${sp.ax}`
  }

  useLayoutEffect(() => {
    const svg = root.current!
    let tick: (() => void) | null = null
    const ctx = gsap.context((self) => {
      const q = (s: string) => gsap.utils.toArray<SVGElement>(s, svg)
      const rowEls = q('[data-hs-row]') as SVGPathElement[]
      const lms = q('[data-hs-lm]')
      const leaders = q('[data-hs-leader]')
      const chipGs = q('[data-hs-chip]')
      const boxes = q('[data-hs-box]')
      const texts = q('[data-hs-text]') as SVGTextElement[]
      const corners = q('[data-hs-corner]')
      const scan = q('[data-hs-scan]')[0]
      const paper = getComputedStyle(svg).color
      const blue = accent()
      const reduce = prefersReducedMotion()
      const n = L.spots.length
      const lastY = hair[hair.length - 1].y

      // Every hair row's live shape; the ticker redraws them while the scene plays.
      const rows = hair.map((s, i) => ({ s, i, amp: REST.amp, len: REST.len, cut: 0 }))
      const draw = () => rows.forEach((r) => rowEls[r.i].setAttribute('d', wave(r.s, r.i, r.amp, r.len, r.cut)))
      draw()

      // How wide each chip opens for each variant's words (measured in the real font).
      const widths = VARIANTS.map((v) =>
        texts.map((t, k) => {
          t.textContent = (L.short ? v.short : v.full)[k]
          const w = t.getComputedTextLength() + pad * 2
          t.textContent = ''
          return w
        }),
      )

      const Y0 = L.box[1] // the scan runs from the top corners to just under the chin
      const Y1 = gy(196)
      const SCAN = 1.1
      const when = (y: number) => SCAN * gsap.utils.clamp(0, 1, (y - Y0) / (Y1 - Y0))

      gsap.set(corners, { autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set(lms, { scale: 0, transformOrigin: '50% 50%' })
      if (n) gsap.set([...leaders, ...chipGs], { autoAlpha: 0 })
      gsap.set(scan, { autoAlpha: 0, y: Y0 })
      gsap.set(rowEls, { strokeDasharray: SOLID })

      let running = false
      let cur: gsap.core.Timeline | null = null

      const chipClosed = (k: number) => ({ attr: { x: L.spots[k].ax, width: 0 } })
      const chipOpen = (k: number, vi: number) => {
        const sp = L.spots[k]
        const w = widths[vi][k]
        return { attr: { x: sp.side < 0 ? sp.ax - w : sp.ax, width: w } }
      }

      // One reading: scan, landmarks, chips, then the cut previews in sky blue. Returns the time the payoff settles.
      const reading = (tl: gsap.core.Timeline, vi: number, t0: number) => {
        const v = VARIANTS[vi]
        if (n) {
          tl.set(chipGs, { autoAlpha: 1 }, t0)
            .set(texts, { textContent: '', fill: paper }, t0)
            .set(leaders, { drawSVG: '0% 0%', autoAlpha: 1, stroke: paper }, t0)
          boxes.forEach((b, k) => tl.set(b, { ...chipClosed(k), fillOpacity: 0, stroke: paper }, t0))
        }

        tl.set(scan, { autoAlpha: 1, y: Y0 }, t0)
          .to(scan, { y: Y1, duration: SCAN, ease: 'none' }, t0)
          .to(scan, { autoAlpha: 0, duration: 0.2, ease: 'none' }, t0 + SCAN - 0.1)
        rows.forEach((r) => tl.to(r, { amp: v.amp, len: v.len, cut: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }, t0 + when(gy(r.s.y))))
        lms.forEach((el, i) => tl.to(el, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, t0 + when(gy(LM[i][1])) + 0.04))

        const order = ORDER.filter((k) => k < n)
        const t1 = t0 + SCAN + 0.02
        order.forEach((k, j) => {
          const tk = t1 + j * 0.16
          tl.to(leaders[k], { drawSVG: '0% 100%', duration: 0.38, ease: 'power2.inOut' }, tk)
            .to(boxes[k], { ...chipOpen(k, vi), duration: 0.55, ease: 'expo.out' }, tk + 0.3)
            .to(texts[k], { scrambleText: { text: (L.short ? v.short : v.full)[k], chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#', speed: 0.6 }, duration: 0.6, ease: 'none' }, tk + 0.32)
        })

        // The payoff: the cut previews on the head (the faded rows flatten, pull in and break up into a sky-blue
        // gradient, bottom row first) while its chip fills.
        const tp = t1 + (order.length - 1) * 0.16 + 0.8
        if (n > PAYOFF) {
          tl.to(boxes[PAYOFF], { fillOpacity: 1, stroke: blue, duration: 0.35, ease: 'power2.out' }, tp)
            .to(texts[PAYOFF], { fill: INK, duration: 0.35, ease: 'power2.out' }, tp)
            .to(leaders[PAYOFF], { stroke: blue, duration: 0.35 }, tp)
        }
        const cut = rows.filter((r) => r.s.y >= v.fade).reverse()
        cut.forEach((r, j) => {
          const k = (r.s.y - v.fade) / Math.max(1, lastY - v.fade)
          const f = 0.82 - 0.7 * k // share of each dash period that stays ink
          const t = tp + j * 0.07
          tl.to(r, { amp: 0, cut: 3 + 6 * k, duration: 0.7, ease: 'power3.out' }, t).to(
            rowEls[r.i],
            { stroke: blue, strokeDasharray: `${(PERIOD * f).toFixed(2)} ${(PERIOD * (1 - f)).toFixed(2)}`, duration: 0.6, ease: 'power2.out' },
            t,
          )
        })
        return tp + 0.7 + cut.length * 0.07
      }

      // Clearing back to a calm head before the next selfie.
      const clear = (tl: gsap.core.Timeline, t: number) => {
        ORDER.filter((k) => k < n).forEach((k, j) => {
          tl.to(texts[k], { scrambleText: { text: '', chars: '01#', speed: 1 }, duration: 0.3, ease: 'none' }, t + j * 0.05)
            .to(boxes[k], { ...chipClosed(k), duration: 0.4, ease: 'power3.in' }, t + j * 0.05)
            .to(leaders[k], { drawSVG: '100% 100%', duration: 0.35, ease: 'power2.in' }, t + 0.15 + j * 0.05)
        })
        if (n > PAYOFF) tl.to(boxes[PAYOFF], { fillOpacity: 0, stroke: paper, duration: 0.25 }, t).to(texts[PAYOFF], { fill: paper, duration: 0.2 }, t)
        tl.to(lms, { scale: 0, duration: 0.3, ease: 'power2.in', stagger: 0.03 }, t)
          .to(rows, { amp: REST.amp, len: REST.len, cut: 0, duration: 0.6, ease: 'power3.inOut' }, t + 0.2)
          .to(rowEls, { stroke: paper, strokeDasharray: SOLID, duration: 0.5, ease: 'power2.inOut' }, t + 0.2)
      }

      const loop = (vi: number) => {
        const tl = gsap.timeline({ onComplete: () => void (running && self.add(() => loop((vi + 1) % VARIANTS.length))) })
        cur = tl
        const done = reading(tl, vi, 0.05)
        clear(tl, done + 2.2)
      }

      const start = () => {
        if (tick) return
        tick = draw
        gsap.ticker.add(tick)
      }
      const stop = () => {
        if (tick) gsap.ticker.remove(tick)
        tick = null
      }

      api.current = {
        play: () => {
          if (running) return
          running = true
          if (reduce) {
            // A still of a finished reading.
            self.add(() => {
              const tl = gsap.timeline({ paused: true })
              gsap.set(corners, { autoAlpha: 1 })
              const end = reading(tl, 0, 0)
              tl.seek(end + 0.5)
              gsap.set(scan, { autoAlpha: 0 })
              draw()
              cur = tl
            })
            return
          }
          self.add(() => {
            // Pick up cleanly from wherever an interrupted rest left things.
            gsap.killTweensOf([...rows, ...rowEls, ...lms])
            gsap.to(rowEls, { stroke: paper, strokeDasharray: SOLID, duration: 0.3 })
            gsap.to(lms, { scale: 0, duration: 0.2 })
            start()
            // The detection corners find the face and lock on with a small tap, then the first reading starts.
            const tl = gsap.timeline()
            cur = tl
            tl.fromTo(corners, { autoAlpha: 0, scale: 1.22 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' }, L.lead)
              .to(corners, { scale: 0.97, duration: 0.12, ease: 'power2.inOut', yoyo: true, repeat: 1 }, L.lead + 0.42)
              .call(() => void (running && self.add(() => loop(0))), undefined, L.lead + 0.3)
          })
        },
        rest: () => {
          if (!running) return
          running = false
          cur?.kill()
          cur = null
          self.add(() => {
            gsap.to(corners, { autoAlpha: 0, scale: 1.08, duration: 0.35, ease: 'power2.in', overwrite: true })
            gsap.to(scan, { autoAlpha: 0, duration: 0.2, overwrite: true })
            if (n) gsap.to([...chipGs, ...leaders], { autoAlpha: 0, duration: 0.25, overwrite: true })
            gsap.to(lms, { scale: 0, duration: 0.3, ease: 'power2.in', overwrite: true })
            gsap.to(rowEls, { stroke: paper, strokeDasharray: SOLID, duration: reduce ? 0 : 0.5, overwrite: true })
            if (reduce) {
              rows.forEach((r) => Object.assign(r, REST, { cut: 0 }))
              draw()
              return
            }
            gsap.to(rows, {
              amp: REST.amp,
              len: REST.len,
              cut: 0,
              duration: 0.7,
              ease: 'power3.out',
              overwrite: true,
              onComplete: () => void (!running && (draw(), stop())),
            })
          })
        },
      }
    }, root)
    return () => {
      api.current = null
      if (tick) gsap.ticker.remove(tick)
      ctx.revert()
    }
  }, [L, hair])

  useEffect(() => {
    if (active || open) api.current?.play()
    else api.current?.rest()
  }, [active, open, L])

  const [bx0, by0, bx1, by1] = L.box
  const arm = open ? 20 : 15
  const r = open ? 9 : 7
  const corner = (x: number, y: number, sx: number, sy: number) =>
    `M${x} ${y + sy * arm} V${y + sy * r} Q${x} ${y} ${x + sx * r} ${y} H${x + sx * arm}`

  return (
    <svg ref={root} viewBox={L.vb} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      {/* Leaders sit under the head, so the landmark squares cap them */}
      {L.spots.map((_, k) => (
        <path key={k} data-hs-leader d={leader(k)} fill="none" stroke="currentColor" strokeWidth="1.5" {...NS} />
      ))}

      <g transform={`translate(${L.tx} ${L.ty}) scale(${L.s})`}>
        {hair.map((s, i) => (
          <path key={`h${i}`} data-hs-row d={wave(s, i, REST.amp, REST.len)} fill="none" stroke="currentColor" strokeWidth="3" {...NS} />
        ))}
        {beard.map((s, i) => (
          <path
            key={`b${i}`}
            d={`M${s.x0.toFixed(1)} ${s.y} H${s.x1.toFixed(1)}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="2.5 3"
            {...NS}
          />
        ))}
        <path d={FACE} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...NS} />
        <path d={NAPE} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...NS} />
        <path d={EAR} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...NS} />
        <path d={EAR_IN} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...NS} />
        <path d={EYE} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...NS} />
        <path d={BROW} fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" {...NS} />
        {LM.map(([x, y], i) => (
          <rect key={i} data-hs-lm x={x - L.lm / 2} y={y - L.lm / 2} width={L.lm} height={L.lm} fill={INK} stroke="currentColor" strokeWidth="2" {...NS} />
        ))}
      </g>

      {/* The camera's detection corners and the scan line */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path data-hs-corner d={corner(bx0, by0, 1, 1)} {...NS} />
        <path data-hs-corner d={corner(bx1, by0, -1, 1)} {...NS} />
        <path data-hs-corner d={corner(bx0, by1, 1, -1)} {...NS} />
        <path data-hs-corner d={corner(bx1, by1, -1, -1)} {...NS} />
      </g>
      <g data-hs-scan>
        <line x1={bx0 - 6} x2={bx1 + 6} y1="0" y2="0" stroke="currentColor" strokeWidth="2.5" {...NS} />
        <line x1={bx0 + 4} x2={bx1 - 4} y1="-5" y2="-5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" {...NS} />
        <line x1={bx0 + 10} x2={bx1 - 10} y1="-10" y2="-10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" {...NS} />
      </g>

      {/* The read-out */}
      {L.spots.map((sp, k) => (
        <g key={k} data-hs-chip>
          <rect
            data-hs-box
            x={sp.ax}
            y={sp.cy - L.h / 2}
            width="0"
            height={L.h}
            rx={L.h / 2}
            fill="rgb(var(--accent))"
            fillOpacity="0"
            stroke="currentColor"
            strokeWidth="2"
            {...NS}
          />
          <text
            data-hs-text
            x={sp.side < 0 ? sp.ax - pad : sp.ax + pad}
            y={sp.cy}
            dy="0.36em"
            textAnchor={sp.side < 0 ? 'end' : 'start'}
            className="font-mono"
            fontSize={L.fs}
            letterSpacing={L.fs * 0.06}
            fill="currentColor"
          />
        </g>
      ))}
    </svg>
  )
}
