import { useEffect, useLayoutEffect, useRef } from 'react'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

gsap.registerPlugin(DrawSVGPlugin)

// Haven: three account streams (checking, card, brokerage) run into a house; inside it, net worth climbs as bars.
// When a webhook lands, a sky-blue packet races down one stream, lights the house's outline both ways round, and the
// newest bar shoots up past the top, so the whole chart rescales to fit it (the climb never runs out of room).

type Geo = {
  vb: string
  L: number // walls
  R: number
  top: number // where the walls meet the roof
  floor: number
  ax: number // roof apex
  ay: number
  sx: number // stream sources (x, then one y per stream)
  sy: number[]
  ey: number[] // where each stream enters the left wall
  n: number // bars
  x0: number
  slot: number
  bw: number
  hmax: number // the tallest bar after a rescale
  ring: number
  rest: number[] // the calm chart, as fractions of the tallest bar
}

const TILE: Geo = {
  vb: '0 0 400 210',
  L: 212,
  R: 372,
  top: 102,
  floor: 192,
  ax: 292,
  ay: 16,
  sx: 28,
  sy: [46, 102, 158],
  ey: [134, 146, 158],
  n: 7,
  x0: 225,
  slot: 20,
  bw: 13,
  hmax: 76,
  ring: 18,
  rest: [0.3, 0.4, 0.35, 0.5, 0.6, 0.77, 1],
}

// The opened panel is nearly square, so the house grows taller and the chart gets more bars.
const OPEN: Geo = {
  vb: '0 20 400 320',
  L: 178,
  R: 378,
  top: 160,
  floor: 300,
  ax: 278,
  ay: 50,
  sx: 24,
  sy: [100, 178, 256],
  ey: [228, 242, 256],
  n: 9,
  x0: 194,
  slot: 19.5,
  bw: 12,
  hmax: 120,
  ring: 22,
  rest: [0.24, 0.3, 0.27, 0.36, 0.44, 0.42, 0.58, 0.76, 1],
}

// Each stream has its own texture (screen px, since strokes don't scale): squares, short dashes, long dashes.
const DASH = ['3 5', '10 5', '24 5']
const PERIOD = [8, 15, 29]
const LABELS = ['Checking', 'Card', 'Brokerage']
// Which stream each webhook arrives on, and how much the household's net worth moves with it (mostly up, sometimes
// a dip), in turn. Made up, and deliberately abstract.
const ORDER = [1, 0, 2, 0, 2, 1, 2]
const MOVE = [1.26, 1.18, 0.9, 1.3, 1.2, 0.93, 1.24, 1.16]

// A stream runs right, turns down (or up) with a rounded corner, and runs into the wall. The top stream turns
// furthest right so the three nest like a staircase and never cross.
const lanePath = (g: Geo, i: number) => {
  const s = g.sx + 9
  const y = g.sy[i]
  const e = g.ey[i]
  if (Math.abs(e - y) < 1) return `M${s} ${y} H${g.L}`
  const tx = g.L - 44 - i * 28
  const r = Math.min(10, Math.abs(e - y) / 2)
  const d = Math.sign(e - y)
  return `M${s} ${y} H${tx - r} Q${tx} ${y} ${tx} ${y + d * r} V${e - d * r} Q${tx} ${e} ${tx + r} ${e} H${g.L}`
}

export default function HavenArt({ active, open }: ArtProps) {
  const g = open ? OPEN : TILE
  const root = useRef<SVGSVGElement>(null)
  const api = useRef<{ play: () => void; rest: () => void } | null>(null)

  useLayoutEffect(() => {
    const svg = root.current!
    const ctx = gsap.context((self) => {
      const q = (s: string) => gsap.utils.toArray<SVGElement>(s, svg)
      const bars = q('[data-hv-bar]')
      const srcs = q('[data-hv-src]')
      const lanes = q('[data-hv-lane]')
      const comets = q('[data-hv-comet]')
      const overs = q('[data-hv-over]')
      const unders = q('[data-hv-under]')
      const ring = q('[data-hv-ring]')[0]
      const tag = q('[data-hv-tag]')[0] as SVGElement | undefined
      const paper = getComputedStyle(svg).color
      const accent = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/\s+/).join(',')})`
      const reduce = prefersReducedMotion()
      const blue = [...comets, ...overs, ...unders, ring, ...(tag ? [tag] : [])]

      const at = (i: number, v: number) => {
        const h = v * g.hmax
        return { x: g.x0 + i * g.slot, y: g.floor - h, height: h }
      }

      let vals = g.rest.slice()
      let order = bars.slice() // the bar elements, by slot from the left
      let n = 0
      let live: gsap.core.Timeline[] = []
      let running = false

      gsap.set([...bars, ...srcs], { fill: paper })
      gsap.set([...comets, ...overs, ...unders], { drawSVG: '0% 0%', autoAlpha: 0 })
      gsap.set(ring, { autoAlpha: 0 })
      if (tag) gsap.set(tag, { autoAlpha: 0 })

      // The streams keep flowing while the scene plays (and coast to a stop when it doesn't).
      const flow = gsap.timeline({ paused: true }).timeScale(0)
      lanes.forEach((el, i) => flow.to(el, { strokeDashoffset: -PERIOD[i], duration: PERIOD[i] / 34, ease: 'none', repeat: -1 }, 0))

      // One webhook: a packet leaves its account, races down the stream and into the wall; the outline lights up both
      // ways round the house and meets at the far corner, where the new bar lands; then the chart rescales to fit.
      const build = () => {
        const lane = ORDER[n % ORDER.length]
        const next = vals[vals.length - 1] * MOVE[n++ % MOVE.length]
        const kept = vals.slice(1)
        const all = [...kept, next]
        const max = Math.max(...all)
        const out = order[0]
        const prevNew = order[order.length - 1]
        const nextOrder = [...order.slice(1), out]

        const tl = gsap.timeline({ onComplete: () => void (live = live.filter((t) => t !== tl)) })
        live.push(tl)

        const c = comets[lane]
        tl.fromTo(srcs[lane], { fill: accent }, { fill: paper, duration: 0.7, ease: 'power1.in' }, 0)
          .set(c, { autoAlpha: 1 }, 0)
          .fromTo(c, { drawSVG: '0% 0%' }, { drawSVG: '0% 16%', duration: 0.18, ease: 'power1.in' }, 0)
          .to(c, { drawSVG: '84% 100%', duration: 0.55, ease: 'power2.in' }, 0.18)
          .to(c, { drawSVG: '100% 100%', duration: 0.1, ease: 'none' }, 0.73)
          .set(c, { autoAlpha: 0 }, 0.83)

        const hit = 0.8
        tl.set(ring, { attr: { cy: g.ey[lane] } }, hit)
          .fromTo(ring, { attr: { r: 3 }, autoAlpha: 1 }, { attr: { r: g.ring }, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, hit)
          .fromTo([overs[lane], unders[lane]], { drawSVG: '0% 0%', autoAlpha: 1 }, { drawSVG: '0% 100%', duration: 0.5, ease: 'power2.inOut' }, hit)
          .to([overs[lane], unders[lane]], { drawSVG: '100% 100%', duration: 0.5, ease: 'power2.in' }, hit + 0.55)
        if (tag) tl.set(tag, { attr: { y: g.ey[lane] - 9 } }, hit).fromTo(tag, { autoAlpha: 1, x: -6 }, { x: 0, duration: 0.35, ease: 'power3.out' }, hit).to(tag, { autoAlpha: 0, duration: 0.4 }, hit + 1.05)

        // The window scrolls: the oldest bar slides out under the wall, the rest move over one.
        tl.to(prevNew, { fill: paper, duration: 0.4, ease: 'none' }, hit)
          .to(out, { attr: { x: g.x0 - g.slot, y: g.floor, height: 0 }, duration: 0.5, ease: 'power3.inOut' }, hit)
        kept.forEach((_, i) => tl.to(order[i + 1], { attr: { x: g.x0 + i * g.slot }, duration: 0.5, ease: 'power3.inOut' }, hit + i * 0.025))

        // The new bar lands at the old scale (a new high pokes past the top), then everything rescales to fit it.
        const grow = hit + 0.45
        tl.set(out, { attr: at(g.n - 1, 0), fill: accent }, grow).to(out, { attr: at(g.n - 1, next), duration: 0.55, ease: 'back.out(2.2)' }, grow)
        all.forEach((v, i) => tl.to(nextOrder[i], { attr: at(i, v / max), duration: 0.7, ease: 'power3.inOut' }, grow + 0.6 + (g.n - 1 - i) * 0.02))
        tl.call(() => void (running && step()), undefined, 2.15)

        vals = all.map((v) => v / max)
        order = nextOrder
      }
      const step = () => void self.add(build)

      api.current = {
        play: () => {
          if (running) return
          running = true
          if (reduce) return void gsap.set(order[order.length - 1], { fill: accent })
          self.add(() => {
            gsap.killTweensOf(bars)
            flow.play()
            gsap.to(flow, { timeScale: 1, duration: 0.5, ease: 'power2.out', overwrite: true })
          })
          step()
        },
        rest: () => {
          if (!running) return
          running = false
          live.forEach((t) => t.kill())
          live = []
          vals = g.rest.slice()
          self.add(() => {
            gsap.to(flow, { timeScale: 0, duration: 0.7, ease: 'power2.out', overwrite: true, onComplete: () => void flow.pause() })
            gsap.to(blue, { autoAlpha: 0, duration: 0.3, overwrite: true })
            gsap.to(srcs, { fill: paper, duration: 0.3, overwrite: true })
            order.forEach((el, i) =>
              gsap.to(el, { attr: at(i, vals[i]), fill: paper, duration: reduce ? 0 : 0.7, ease: 'power3.inOut', overwrite: true }),
            )
          })
        },
      }
    }, root)
    return () => {
      api.current = null
      ctx.revert()
    }
  }, [g])

  useEffect(() => {
    if (active || open) api.current?.play()
    else api.current?.rest()
  }, [active, open])

  const house = `M${g.L} ${g.floor} V${g.top} L${g.ax} ${g.ay} L${g.R} ${g.top} V${g.floor} Z`
  const clip = `M${g.L + 5} ${g.floor} V${g.top + 3} L${g.ax} ${g.ay + 8} L${g.R - 5} ${g.top + 3} V${g.floor} Z`
  const clipId = open ? 'haven-clip-open' : 'haven-clip'
  const ns = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none', stroke: 'currentColor' }

  return (
    <svg ref={root} viewBox={g.vb} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d={clip} />
        </clipPath>
      </defs>

      {/* The accounts and their streams */}
      {g.sy.map((y, i) => (
        <g key={i}>
          <path data-hv-lane d={lanePath(g, i)} strokeWidth="3.5" strokeDasharray={DASH[i]} {...ns} />
          <rect data-hv-src x={g.sx - 5} y={y - 5} width="10" height="10" fill="currentColor" />
          {open && (
            <text x={g.sx - 5} y={y - 13} className="font-mono" fontSize="8" letterSpacing="0.5" fill="#7C7C7C">
              {LABELS[i].toUpperCase()}
            </text>
          )}
        </g>
      ))}

      {/* Net worth, inside */}
      <g clipPath={`url(#${clipId})`}>
        {g.rest.map((v, i) => (
          <rect key={i} data-hv-bar x={g.x0 + i * g.slot} y={g.floor - v * g.hmax} width={g.bw} height={v * g.hmax} fill="currentColor" />
        ))}
      </g>
      <path d={house} strokeWidth="3.5" strokeLinejoin="miter" {...ns} />

      {/* The webhook, in sky blue */}
      <g className="text-accent">
        {g.sy.map((_, i) => (
          <g key={i}>
            <path data-hv-comet d={lanePath(g, i)} strokeWidth="4.5" {...ns} />
            <path data-hv-over d={`M${g.L} ${g.ey[i]} V${g.top} L${g.ax} ${g.ay} L${g.R} ${g.top} V${g.floor}`} strokeWidth="3.5" strokeLinejoin="miter" {...ns} />
            <path data-hv-under d={`M${g.L} ${g.ey[i]} V${g.floor} H${g.R}`} strokeWidth="3.5" strokeLinejoin="miter" {...ns} />
          </g>
        ))}
        <circle data-hv-ring cx={g.L} cy={g.ey[0]} r="3" strokeWidth="3" {...ns} />
        {open && (
          <text data-hv-tag x={g.L + 9} y={g.ey[0] - 9} className="font-mono" fontSize="8" letterSpacing="0.5" fill="currentColor">
            WEBHOOK
          </text>
        )}
      </g>

      {open && (
        <text x={g.L} y={g.floor + 20} className="font-mono" fontSize="8" letterSpacing="0.5" fill="#7C7C7C">
          NET WORTH
        </text>
      )}
    </svg>
  )
}
