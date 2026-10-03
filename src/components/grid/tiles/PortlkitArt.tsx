import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

gsap.registerPlugin(DrawSVGPlugin)

const PAPER = '#F2F2F2'
const MUTE = '#7C7C7C'
const TOKEN = 'p/7Kq9x'
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

// Everything is measured from the logo's centre. The logo is a circle split down the middle into two half-discs
// (r = radius, g = half the seam) that sit offset by `off` and scaled up by `big` at rest. Opened, the halves swing
// out like doors: each
// flat edge travels out to `edge` while the half folds to `fold` of its width, and the capsule lifts by `lift` to
// make room for the invoice that prints out of its lower edge.
type Layout = {
  w: number
  h: number
  cx: number
  cy: number
  r: number
  g: number
  off: number
  edge: number
  fold: number
  big: number
  lift: number
  stroke: number
  head: number
  rule: number
  rows: number[]
  ring: { x: number; r: number }
  bar: { x: number; w: number; lens: number[]; brand: number }
  slip: { w: number; h: number; amount: number; label: number; tooth: number }
  stamp: { x: number; y: number; w: number; h: number; size: number }
  token: { x: number; size: number }
}

// The tile is a wide box; the opened panel (and a phone's square tile) is nearly square, so it gets a taller
// arrangement with a bigger logo and a roomier portal.
const WIDE: Layout = {
  w: 400,
  h: 200,
  cx: 200,
  cy: 100,
  r: 60,
  g: 3,
  off: 8,
  edge: 124,
  fold: 0.22,
  big: 1.12,
  lift: -30,
  stroke: 2.5,
  head: -39,
  rule: -22,
  rows: [-3, 19, 41],
  ring: { x: -102, r: 6.5 },
  bar: { x: -86, w: 5, lens: [176, 124, 152], brand: 58 },
  slip: { w: 164, h: 60, amount: 22, label: 14, tooth: 4 },
  stamp: { x: 128, y: 40, w: 64, h: 24, size: 13 },
  token: { x: 30, size: 18 },
}

const TALL: Layout = {
  w: 400,
  h: 400,
  cx: 200,
  cy: 200,
  r: 88,
  g: 4,
  off: 12,
  edge: 136,
  fold: 0.2,
  big: 1.15,
  lift: -62,
  stroke: 3,
  head: -56,
  rule: -32,
  rows: [-4, 25, 54],
  ring: { x: -106, r: 8 },
  bar: { x: -88, w: 7, lens: [196, 138, 170], brand: 80 },
  slip: { w: 220, h: 112, amount: 36, label: 22, tooth: 6 },
  stamp: { x: 172, y: 80, w: 96, h: 34, size: 19 },
  token: { x: 10, size: 18 },
}

// A phone's small square tile mostly shows the rest frame, so its logo is printed bigger to hold its own next to
// the J and the S.
const TALL_TILE: Layout = { ...TALL, g: 9, off: 15, big: 1.4, token: { x: 2, size: 16 } }

const half = (L: Layout, side: -1 | 1) =>
  `M ${side * L.g} ${-L.r} A ${L.r} ${L.r} 0 0 ${side === 1 ? 1 : 0} ${side * L.g} ${L.r} Z`

// The slip's sides and torn bottom edge (its top is tucked under the capsule's lower line).
function slipPath(L: Layout) {
  const { w, h, tooth } = L.slip
  const n = Math.round(w / 14)
  const step = w / n / 2
  let d = `M 0 -4 V ${h - tooth}`
  for (let k = 1; k <= n * 2; k++) d += ` L ${k * step} ${k % 2 ? h : h - tooth}`
  return d + ' V -4'
}

const check = (r: number) => {
  const k = r / 7
  return `M ${-3.4 * k} ${0.2 * k} L ${-1 * k} ${2.7 * k} L ${3.6 * k} ${-2.6 * k}`
}

// Portlkit: a share link's token slides into the split-circle logo, the two halves line up like a lock clicking,
// then swing apart into the client portal. Milestones tick off one by one, the invoice prints out of the portal's
// lower edge and a sky-blue PAID stamp lands on it. At rest it's just the logo.
export default function PortlkitArt({ active, open = false }: ArtProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const [tall, setTall] = useState(open)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const L = tall ? (open ? TALL : TALL_TILE) : WIDE
  const on = active || open

  // Pick the arrangement from the box's shape (and again if it changes).
  useLayoutEffect(() => {
    const el = rootRef.current!
    const pick = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width && height) setTall(width / height < 1.55)
    }
    pick()
    const ro = new ResizeObserver(pick)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const reduce = prefersReducedMotion()
    const ctx = gsap.context((self) => {
      const q = gsap.utils.selector(rootRef)
      const halves = q('[data-half]')
      const body = q('[data-body]')
      const lines = q('[data-line]')
      const head = q('[data-head]')
      const rings = q('[data-ring]')
      const discs = q('[data-disc]')
      const checks = q('[data-check]')
      const bars = q('[data-bar]')
      const slip = q('[data-slip]')
      const jolt = q('[data-jolt]')
      const stamp = q('[data-stamp]')
      const token = q('[data-token]')
      const pill = q('[data-pill]')
      const wraps = q('[data-wrap]')
      const hidden = -(L.slip.h + 10)
      const restY = (i: number) => (i ? L.off : -L.off)
      const rest0 = { x: 0, y: restY, scaleX: L.big, scaleY: L.big }

      // The rest frame: the logo alone.
      gsap.set(halves, {
        ...rest0,
        transformOrigin: (i: number) => (i ? '0% 50%' : '100% 50%'),
      })
      gsap.set(lines, { drawSVG: '50% 50%' })
      gsap.set([rings, discs], { scale: 0, transformOrigin: '50% 50%' })
      gsap.set([checks, bars], { drawSVG: '0%', autoAlpha: 0 })
      gsap.set(head, { autoAlpha: 0 })
      gsap.set(slip, { y: hidden })
      gsap.set(stamp, {
        autoAlpha: 0,
        scale: 2.2,
        rotation: -26,
        transformOrigin: '50% 50%',
      })
      gsap.set(token, { autoAlpha: 0 })
      gsap.set(pill, { drawSVG: '0%', autoAlpha: 0 })

      const slide = L.cx - L.r * L.big * 0.8 - L.token.x
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 })

      // 1. The link's token decodes at the left, then slides into the left half and is gone.
      tl.set(token, { autoAlpha: 1, x: 0 }, 0)
        .to(
          token,
          {
            duration: 0.5,
            scrambleText: { text: TOKEN, chars: CHARS, speed: 0.7 },
            ease: 'none',
          },
          0,
        )
        .to(token, { x: slide, duration: 0.55, ease: 'power3.in' }, 0.42)
        .set(token, { autoAlpha: 0 }, 1.0)
        // 2. The hit closes the seam and the two halves line up: the lock clicks.
        .to(halves[0], { x: L.g * 1.3, duration: 0.09, ease: 'power2.out' }, 0.97)
        .to(halves, { y: 0, duration: 0.34, ease: 'back.out(2.6)' }, 1.0)
        // 3. The halves swing apart into the portal; the capsule rises to leave room below.
        .to(
          halves,
          {
            x: (i: number) => (i ? 1 : -1) * (L.edge - L.g),
            scaleX: L.fold,
            scaleY: 1,
            duration: 0.85,
            ease: 'expo.inOut',
          },
          1.25,
        )
        .to(body, { y: L.lift, duration: 0.85, ease: 'expo.inOut' }, 1.25)
        .to(lines, { drawSVG: '0% 100%', duration: 0.85, ease: 'expo.inOut' }, 1.25)
        // 4. The portal fills in.
        .fromTo(
          head,
          { autoAlpha: 0, x: -10 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: 'power3.out',
          },
          1.7,
        )
        .to(rings, { scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.2)' }, 1.75)
        .set(bars, { autoAlpha: 1 }, 1.8)
        .to(bars, { drawSVG: '100%', duration: 0.5, stagger: 0.07, ease: 'power3.out' }, 1.8)

      // 5. Milestones tick off, one by one.
      L.rows.forEach((_, i) => {
        const t = 2.2 + i * 0.24
        tl.to(discs[i], { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t)
          .set(checks[i], { autoAlpha: 1 }, t + 0.08)
          .to(checks[i], { drawSVG: '100%', duration: 0.2, ease: 'power2.out' }, t + 0.08)
          .to(bars[i], { stroke: PAPER, duration: 0.3, ease: 'none' }, t)
      })

      // 6. The invoice prints out of the portal's lower edge, a line at a time.
      tl.to(slip, { y: 0, duration: 0.5, ease: 'steps(8)' }, 2.95)
        // 7. Paid: the stamp slams on and the slip takes the hit.
        .to(
          stamp,
          {
            autoAlpha: 1,
            scale: 1,
            rotation: -9,
            duration: 0.2,
            ease: 'power4.in',
          },
          3.55,
        )
        .to(
          jolt,
          {
            keyframes: { y: [0, 4, -1, 0], ease: 'none' },
            duration: 0.3,
            ease: 'power2.out',
          },
          3.75,
        )
        .to(
          stamp,
          {
            keyframes: { scaleX: [1, 1.07, 1], scaleY: [1, 0.9, 1] },
            duration: 0.32,
            ease: 'power2.out',
          },
          3.75,
        )
        // ...and the portal's status pill fills in sky blue with it.
        .set(pill, { autoAlpha: 1 }, 3.74)
        .to(pill, { drawSVG: '100%', duration: 0.4, ease: 'power3.out' }, 3.74)
        .addLabel('paid', 4.2)

      // 8. Hold, then fold everything back into the logo.
      const out = 5.4
      tl.to(slip, { y: hidden, duration: 0.45, ease: 'power3.in' }, out)
        .to(checks, { autoAlpha: 0, duration: 0.2 }, out)
        .to(head, { autoAlpha: 0, duration: 0.25 }, out)
        .to(pill, { drawSVG: '100% 100%', duration: 0.25, ease: 'power2.in' }, out)
        .set(pill, { autoAlpha: 0 }, out + 0.25)
        .to([...discs, ...rings], { scale: 0, duration: 0.3, stagger: 0.03, ease: 'power3.in' }, out + 0.05)
        .to(bars, { drawSVG: '0%', duration: 0.3, stagger: 0.03, ease: 'power3.in' }, out + 0.05)
        .set(bars, { autoAlpha: 0, stroke: MUTE }, out + 0.4)
        .set(stamp, { autoAlpha: 0, scale: 2.2, rotation: -26 }, out + 0.5)
        .to(halves, { x: 0, scaleX: L.big, scaleY: L.big, duration: 0.8, ease: 'expo.inOut' }, out + 0.3)
        .to(body, { y: 0, duration: 0.8, ease: 'expo.inOut' }, out + 0.3)
        .to(lines, { drawSVG: '50% 50%', duration: 0.8, ease: 'expo.inOut' }, out + 0.3)
        .to(halves, { y: restY, duration: 0.45, ease: 'power3.inOut' }, out + 1.05)

      let rest: gsap.core.Timeline | null = null
      self.add('set', (play: boolean) => {
        rest?.kill()
        if (reduce) {
          gsap.set(wraps, { autoAlpha: 1 })
          tl.pause().seek(play ? 'paid' : 0)
          return
        }
        if (play) {
          gsap.set(wraps, { autoAlpha: 1 })
          tl.delay(open ? 0.8 : 0.1).restart(true)
          return
        }
        if (tl.paused() || tl.totalTime() === 0) return
        // Ease back to the calm logo from wherever the scene was.
        tl.pause()
        rest = gsap
          .timeline({ defaults: { duration: 0.7, ease: 'expo.inOut' } })
          .to(wraps, { autoAlpha: 0, duration: 0.25, ease: 'power2.out' }, 0)
          .to(halves, rest0, 0.05)
          .to(body, { y: 0 }, 0.05)
          .to(lines, { drawSVG: '50% 50%' }, 0.05)
      })
    }, rootRef)
    ctxRef.current = ctx
    return () => {
      ctxRef.current = null
      ctx.revert()
    }
  }, [tall, open, L])

  useEffect(() => {
    ctxRef.current?.set?.(on)
  }, [on, tall])

  const { cx, cy, r, edge, stroke: sw } = L
  const ns = { vectorEffect: 'non-scaling-stroke' as const }

  return (
    <div ref={rootRef} className="h-full w-full" aria-hidden>
      <svg
        key={tall ? 'tall' : 'wide'}
        viewBox={`0 0 ${L.w} ${L.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <defs>
          <clipPath id={`${uid}-tok`}>
            <rect x={-L.w} y={0} width={L.w + cx - L.g} height={L.h} />
          </clipPath>
          <clipPath id={`${uid}-slot`}>
            <rect x={-L.w} y={r + sw / 2} width={L.w * 3} height={L.h} />
          </clipPath>
        </defs>

        {/* The share link's token */}
        <g data-wrap clipPath={`url(#${uid}-tok)`}>
          <text
            data-token
            x={L.token.x}
            y={cy}
            dominantBaseline="central"
            fill="currentColor"
            className="font-mono"
            fontSize={L.token.size}
            fontWeight={500}
            letterSpacing="0.04em"
          />
        </g>

        <g transform={`translate(${cx} ${cy})`}>
          <g data-body>
            {/* The capsule's top and bottom edges, drawn out as the halves part */}
            {[-r, r].map((y) => (
              <path
                key={y}
                data-line
                d={`M ${-edge} ${y} H ${edge}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={sw}
                {...ns}
              />
            ))}

            {/* The portal: the studio's header and three milestones */}
            <g data-wrap>
              <circle data-head cx={L.ring.x} cy={L.head} r={L.ring.r - 0.5} fill="currentColor" />
              <path
                data-head
                d={`M ${L.bar.x} ${L.head} h ${L.bar.brand}`}
                stroke="currentColor"
                strokeWidth={L.bar.w}
                strokeLinecap="round"
                {...ns}
              />
              <path
                data-head
                d={`M ${edge - 52} ${L.head} h 26`}
                stroke={MUTE}
                strokeWidth={L.bar.w}
                strokeLinecap="round"
                {...ns}
              />
              <path
                data-pill
                d={`M ${edge - 52} ${L.head} h 26`}
                className="stroke-accent"
                strokeWidth={L.bar.w}
                strokeLinecap="round"
                {...ns}
              />
              <path data-head d={`M ${-edge + 14} ${L.rule} H ${edge - 14}`} stroke={MUTE} strokeWidth={2} {...ns} />
              {L.rows.map((y, i) => (
                <g key={y}>
                  <path
                    data-bar
                    d={`M ${L.bar.x} ${y} h ${L.bar.lens[i]}`}
                    fill="none"
                    stroke={MUTE}
                    strokeWidth={L.bar.w}
                    strokeLinecap="round"
                    {...ns}
                  />
                  <circle
                    data-ring
                    cx={L.ring.x}
                    cy={y}
                    r={L.ring.r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    {...ns}
                  />
                  <circle data-disc cx={L.ring.x} cy={y} r={L.ring.r + 1} fill="currentColor" />
                  <path
                    data-check
                    d={check(L.ring.r)}
                    transform={`translate(${L.ring.x} ${y})`}
                    fill="none"
                    className="stroke-ink"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...ns}
                  />
                </g>
              ))}
            </g>

            {/* The invoice, printing out of the capsule's lower edge, and the PAID stamp */}
            <g data-wrap clipPath={`url(#${uid}-slot)`}>
              <g data-slip>
                <g transform={`translate(${-L.slip.w / 2} ${r})`}>
                  <g data-jolt>
                    <path
                      d={slipPath(L)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={sw}
                      strokeLinejoin="round"
                      {...ns}
                    />
                    <path
                      d={`M 14 ${L.slip.label} h ${L.slip.w * 0.26}`}
                      stroke={MUTE}
                      strokeWidth={L.bar.w * 0.7}
                      strokeLinecap="round"
                      {...ns}
                    />
                    <text
                      x={13}
                      y={L.slip.label + L.slip.amount * 1.25}
                      fill="currentColor"
                      className="font-sans"
                      fontSize={L.slip.amount}
                      fontWeight={600}
                      letterSpacing="-0.02em"
                    >
                      $2,400
                    </text>
                    <g transform={`translate(${L.stamp.x} ${L.stamp.y})`}>
                      <g data-stamp>
                        <rect
                          x={-L.stamp.w / 2}
                          y={-L.stamp.h / 2}
                          width={L.stamp.w}
                          height={L.stamp.h}
                          rx={3}
                          className="fill-accent"
                        />
                        <text
                          x={0}
                          y={0}
                          dy="0.36em"
                          textAnchor="middle"
                          className="fill-ink font-mono"
                          fontSize={L.stamp.size}
                          fontWeight={700}
                          letterSpacing="0.12em"
                        >
                          PAID
                        </text>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>

            {/* The logo: two half-discs */}
            <path data-half d={half(L, -1)} fill="currentColor" />
            <path data-half d={half(L, 1)} fill="currentColor" />
          </g>
        </g>
      </svg>
    </div>
  )
}
