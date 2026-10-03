import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

gsap.registerPlugin(MotionPathPlugin)

// Callback: a job board that moves its own cards. At rest a sky-blue email waits above the Applied column; pointed
// at, it rings (a callback), drops onto an Applied card and the card hops to Interviewing, lighting up blue. Then a
// card that has gone silent dithers away a month at a time (the hero's 1-bit Bayer dither, 75/50/25%), turns into a
// dashed ghost and drifts over to Closed. In the panel an inbox sits above the board (each email flies out of it)
// and the company then replies, so the ghost dithers back in and hops home. Then the board refreshes like a
// split-flap display and it all happens again.

const W = 368 // the full five-column board (and the panel's inbox)
const COL_W = 64
const GAP = 9
const X0 = 6
const INK = '#0A0A0A'
const MUTE = '#7C7C7C'
const LABELS = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Closed']

// 4x4 Bayer thresholds and the size of one dither pixel in viewBox units (about 2px in the tile, 4px in the panel).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const PX = 2
const LEVELS = [12, 8, 4] // 75%, 50%, 25% of the pixels still lit: one step per silent month

function Dither({ id, level }: { id: string; level: number }) {
  return (
    <pattern id={id} width={PX * 4} height={PX * 4} patternUnits="userSpaceOnUse">
      {BAYER.map((b, i) =>
        b < level ? <rect key={i} x={(i % 4) * PX} y={Math.floor(i / 4) * PX} width={PX} height={PX} fill="currentColor" /> : null,
      )}
    </pattern>
  )
}

type Layout = {
  h: number
  header: number
  y0: number
  cardH: number
  pitch: number
  cols: string[][] // Wishlist, Applied, Interviewing (Offer starts empty)
  closed: number // cards already sitting in Closed
  show: number[] // which of the five columns are drawn
}

const ALL = [0, 1, 2, 3, 4]
const TILE: Layout = { h: 172, header: 38, y0: 50, cardH: 22, pitch: 29, cols: [['w1', 'w2'], ['a1', 'a2', 'a3'], ['i1']], closed: 1, show: ALL }
// Phones get a near-square tile, so the board keeps only the three columns the story needs: Applied, Interview, Closed.
const COMPACT: Layout = { ...TILE, h: 150, cols: [[], ['a1', 'a2', 'a3'], ['i1']], show: [1, 2, 4] }
const OPEN: Layout = {
  h: 316,
  header: 128,
  y0: 140,
  cardH: 24,
  pitch: 32,
  cols: [['w1', 'w2', 'w3'], ['a1', 'a2', 'a3', 'a4'], ['i1', 'i2']],
  closed: 2,
  show: ALL,
}

const PHONE = '(max-width: 767px)'
const onPhoneChange = (cb: () => void) => {
  const m = window.matchMedia(PHONE)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
const isPhone = () => window.matchMedia(PHONE).matches

// The panel's inbox: four rows on show, two new emails waiting above (clipped) that scroll in one at a time.
const INBOX_Y = 30
const ROW = 20
const ROWS = [
  { k: 'reply', slot: -2, w: 118 },
  { k: 'mail', slot: -1, w: 156 },
  { k: 'r0', slot: 0, w: 132 },
  { k: 'r1', slot: 1, w: 92 },
  { k: 'r2', slot: 2, w: 146 },
  { k: 'r3', slot: 3, w: 108 },
]

const PARK_Y = 17 // the tile's waiting email, centred above the Applied column
const stroke = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 2 }

function Card({ id, c, s, x, y, h }: { id: string; c: number; s: number; x: number; y: number; h: number }) {
  const m = y + h / 2
  return (
    <g data-card={id} data-c={c} data-s={s}>
      <g data-body>
        <rect data-outline x={x} y={y} width={COL_W} height={h} rx={3} fill="none" stroke="currentColor" {...stroke} />
        <rect data-ghost x={x} y={y} width={COL_W} height={h} rx={3} fill="none" stroke={MUTE} strokeDasharray="5 4" opacity={0} {...stroke} />
        <rect data-fill x={x} y={y} width={COL_W} height={h} rx={3} fill="currentColor" />
        <rect data-blue x={x} y={y} width={0} height={h} rx={3} className="fill-accent" />
        <g data-knock fill={INK}>
          <circle cx={x + 11} cy={m} r={4.5} />
          <rect x={x + 21} y={m - 5} width={31} height={3} rx={1.5} />
          <rect x={x + 21} y={m + 2} width={19} height={3} rx={1.5} />
        </g>
      </g>
    </g>
  )
}

function Envelope({ name }: { name: string }) {
  return (
    <g data-env={name} opacity={0}>
      <g data-env-body>
        <rect x={-14} y={-9.5} width={28} height={19} rx={2} className="fill-accent" />
        <path d="M-14 -9.5 L0 1.5 L14 -9.5" fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  )
}

function Inbox({ clip }: { clip: string }) {
  return (
    <g>
      <text x={X0} y={16} className="font-mono" fontSize={7} fill="currentColor" style={{ letterSpacing: '0.06em' }}>
        INBOX
      </text>
      <line x1={X0} x2={W - X0} y1={INBOX_Y - 6} y2={INBOX_Y - 6} stroke="currentColor" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      <clipPath id={clip}>
        <rect x={0} y={INBOX_Y - 4} width={W} height={ROW * 4} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g data-rows>
          {ROWS.map(({ k, slot, w }) => {
            const y = INBOX_Y + slot * ROW
            const fresh = k === 'mail' || k === 'reply'
            return (
              <g key={k}>
                <rect x={X0 + 1} y={y + 1} width={16} height={11} rx={1.5} fill="none" stroke={MUTE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <path d={`M${X0 + 1} ${y + 1} L${X0 + 9} ${y + 7} L${X0 + 17} ${y + 1}`} fill="none" stroke={MUTE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                {fresh && (
                  <g data-glyph={k}>
                    <rect x={X0 + 1} y={y + 1} width={16} height={11} rx={1.5} className="fill-accent" />
                    <path d={`M${X0 + 1} ${y + 1} L${X0 + 9} ${y + 7} L${X0 + 17} ${y + 1}`} fill="none" stroke={INK} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  </g>
                )}
                <rect x={X0 + 26} y={y + 2} width={w} height={3} rx={1.5} fill={fresh ? 'currentColor' : MUTE} />
                <rect x={X0 + 26} y={y + 8} width={Math.round(w * 0.55)} height={2.5} rx={1.25} fill={MUTE} opacity={0.6} />
                <rect x={W - X0 - 24} y={y + 2} width={24} height={3} rx={1.5} fill={MUTE} />
                <line x1={X0} x2={W - X0} y1={y + ROW - 4} y2={y + ROW - 4} stroke={MUTE} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </g>
            )
          })}
        </g>
      </g>
    </g>
  )
}

export default function CallbackArt({ active, open = false }: ArtProps) {
  const root = useRef<SVGSVGElement>(null)
  const ctx = useRef<gsap.Context | null>(null)
  const loop = useRef<gsap.core.Timeline | null>(null)
  const back = useRef<gsap.core.Timeline | null>(null)
  const settle = useRef<(() => void) | null>(null)
  const uid = useId().replace(/:/g, '')
  const clip = `cb-inbox-${uid}`
  const dither = LEVELS.map((_, i) => `cb-dither-${i}-${uid}`)

  const compact = useSyncExternalStore(onPhoneChange, isPhone, () => false) && !open
  const L = open ? OPEN : compact ? COMPACT : TILE
  const colX = (c: number) => X0 + L.show.indexOf(c) * (COL_W + GAP)
  const VW = X0 * 2 + L.show.length * COL_W + (L.show.length - 1) * GAP
  const slotY = (s: number) => L.y0 + s * L.pitch
  const A = L.cols[1]
  const mover = A[0]
  const stale = A[A.length - 1]
  const cards = L.cols.flatMap((ids, c) => ids.map((id, s) => ({ id, c, s, x: colX(c), y: slotY(s) })))
  // The two cards that travel are drawn last so they pass over the others.
  const drawn = [...cards.filter((k) => k.id !== mover && k.id !== stale), ...cards.filter((k) => k.id === mover || k.id === stale)]

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const c = gsap.context(() => {
      const $ = (s: string) => el.querySelector(s) as SVGElement
      const card = (id: string) => $(`[data-card="${id}"]`)
      const part = (id: string, p: string) => $(`[data-card="${id}"] [data-${p}]`)
      const partsOf = (els: Element[], p: string) => els.map((e) => e.querySelector(`[data-${p}]`))
      const rows = el.querySelector('[data-rows]')
      const glyphs = gsap.utils.toArray<SVGElement>('[data-glyph]', el)

      gsap.set('[data-card]', { transformOrigin: '50% 50%' })
      gsap.set('[data-body], [data-env-body]', { transformOrigin: '50% 100%' })
      gsap.set('[data-ping]', { transformOrigin: '50% 50%' })

      // The split-flap refresh: each moved card folds shut, jumps home unseen and folds open again.
      const flip = (out: Element[], into: Element[]) =>
        gsap
          .timeline()
          .to(out, { scaleY: 0, duration: 0.2, ease: 'power2.in', stagger: 0.045 })
          .set(out, { x: 0, y: 0 })
          .set(partsOf(out, 'body'), { rotation: 0, scaleX: 1, scaleY: 1 })
          .set(partsOf(out, 'fill'), { attr: { fill: 'currentColor' } })
          .set(partsOf(out, 'blue'), { attr: { width: 0 } })
          .set(partsOf(out, 'knock'), { opacity: 1 })
          .set(partsOf(out, 'outline'), { opacity: 1 })
          .set(partsOf(out, 'ghost'), { opacity: 0, attr: { 'stroke-dashoffset': 0 } })
          .to(into, { scaleY: 1, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.05 })

      // The inbox scrolls back to where it started, new emails unread again.
      const rewindInbox = () => {
        const r = gsap.timeline()
        if (rows) r.to(rows, { y: 0, duration: 0.6, ease: 'power3.inOut' }).set(glyphs, { opacity: 1 })
        return r
      }

      // The tile's email waiting above the Applied column (the rest frame), popping back in after a loop or on leave.
      const parked = $('[data-env="mail"]')
      const parkedBody = parked.querySelector('[data-env-body]')
      const PARK = { x: colX(1) + COL_W / 2, y: PARK_Y, rotation: 0 }
      if (!open) gsap.set(parked, { ...PARK, scale: 1, autoAlpha: 1, transformOrigin: '50% 50%' })
      const repark = () =>
        gsap
          .timeline()
          .set(parked, { ...PARK, scale: 0, autoAlpha: 1 })
          .set(parkedBody, { rotation: 0, scaleX: 1, scaleY: 1 })
          .to(parked, { scale: 1, duration: 0.55, ease: 'back.out(2.4)' })

      const t = gsap.timeline({ paused: true, repeat: -1, delay: open ? 0.9 : 0 })

      // An email arrives and lands on a card: it squashes, the card squashes, a ring pings out of the card. In the
      // tile it rings where it waits and drops; in the panel it scrolls into the inbox and flies out of its row.
      // Returns the moment it lands.
      const drop = (name: string, x: number, y: number, at: number, hit: string, arrivals: number) => {
        const env = $(`[data-env="${name}"]`)
        const body = env.querySelector('[data-env-body]')
        const ping = $(`[data-ping="${name}"]`)
        let land: number
        if (rows) {
          const gx = X0 + 9
          const gy = INBOX_Y + 6.5
          gsap.set(env, { x: gx, y: gy, rotation: 0, scale: 0.55, transformOrigin: '50% 50%', autoAlpha: 0 })
          t.to(rows, { y: arrivals * ROW, duration: 0.5, ease: 'power3.inOut' }, at)
          const go = at + 0.6
          land = go + 0.7
          t.set(env, { autoAlpha: 1 }, go)
            .set(`[data-glyph="${name}"]`, { opacity: 0 }, go)
            .to(env, { x, duration: 0.7, ease: 'power1.inOut' }, go)
            .to(env, { keyframes: [{ y: gy - 12, duration: 0.22, ease: 'power2.out' }, { y: y - 1, duration: 0.48, ease: 'power2.in' }] }, go)
            .to(env, { scale: 1, duration: 0.35, ease: 'power2.out' }, go)
            .to(env, { keyframes: [{ rotation: -14, duration: 0.35 }, { rotation: 0, duration: 0.35 }], ease: 'sine.inOut' }, go)
        } else {
          // Parked above the column; it rings like a phone, jumps, and drops onto the card.
          land = at + 0.95
          t.to(body, { keyframes: { rotation: [0, -16, 14, -12, 10, -6, 0] }, duration: 0.5, ease: 'none' }, at)
            .to(env, { y: PARK_Y - 7, duration: 0.17, ease: 'power2.out' }, at + 0.5)
            .to(body, { scaleY: 1.12, scaleX: 0.92, duration: 0.17, ease: 'power2.out' }, at + 0.5)
            .to(env, { x, y: y - 1, duration: 0.28, ease: 'power2.in' }, at + 0.67)
            .to(body, { scaleY: 1, scaleX: 1, duration: 0.28, ease: 'power1.in' }, at + 0.67)
        }
        t.to(body, { scaleY: 0.55, scaleX: 1.22, duration: 0.07, ease: 'power1.out' }, land)
          .to(env, { scale: 0, duration: 0.2, ease: 'power3.in' }, land + 0.07)
          .set(env, { autoAlpha: 0 }, land + 0.28)
          .set(body, { scaleX: 1, scaleY: 1 }, land + 0.28)
          .to(part(hit, 'body'), { scaleY: 0.8, scaleX: 1.05, duration: 0.07, ease: 'power1.out' }, land)
          .to(part(hit, 'body'), { scaleY: 1, scaleX: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' }, land + 0.07)
          .set(ping, { opacity: 1, scale: 1 }, land + 0.05)
          .to(ping, { opacity: 0, scale: 1.55, duration: 0.65, ease: 'power2.out' }, land + 0.05)
        return land
      }

      // 1. The inbox moves an Applied card to Interviewing on its own.
      const hop = drop('mail', colX(1) + COL_W / 2, slotY(0) + L.cardH / 2, 0, mover, 1) + 0.45
      const m = card(mover)
      const mb = part(mover, 'body')
      const iCards = L.cols[2].map(card)
      const aRest = A.slice(1).map(card)
      t.to(iCards, { y: L.pitch, duration: 0.5, ease: 'power3.inOut', stagger: 0.05 }, hop)
        .to(m, { y: -6, duration: 0.15, ease: 'power2.out' }, hop)
        .to(m, { x: colX(2) - colX(1), duration: 0.55, ease: 'power2.inOut' }, hop + 0.12)
        .to(m, { keyframes: [{ y: -L.pitch, duration: 0.27, ease: 'power2.out' }, { y: 0, duration: 0.28, ease: 'power2.in' }] }, hop + 0.12)
        .to(mb, { rotation: 7, duration: 0.4, ease: 'power1.inOut' }, hop + 0.1)
        .to(mb, { rotation: 0, scaleY: 0.8, scaleX: 1.05, duration: 0.08, ease: 'power1.out' }, hop + 0.67)
        .to(mb, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, hop + 0.75)
        .to(part(mover, 'blue'), { attr: { width: COL_W }, duration: 0.45, ease: 'power3.out' }, hop + 0.67)
        .to(aRest, { y: -L.pitch, duration: 0.5, ease: 'power3.inOut', stagger: 0.06 }, hop + 0.25)

      // 2. Four silent months: the stale card drains a quarter at a time, turns into a dashed ghost and drifts
      // under the board to Closed.
      const st = hop + 0.85
      const s = card(stale)
      const count = el.querySelector<SVGTextElement>('[data-count]')
      const MONTH = 0.32
      const sf = part(stale, 'fill')
      const sbody = part(stale, 'body')
      dither.forEach((id, i) => t.set(sf, { attr: { fill: `url(#${id})` } }, st + MONTH * (i + 1)))
      t.set(sf, { attr: { fill: 'none' } }, st + MONTH * 4)
        .set(part(stale, 'knock'), { opacity: 0 }, st + MONTH * 4)
        .set(part(stale, 'outline'), { opacity: 0 }, st + MONTH * 4)
        .set(part(stale, 'ghost'), { opacity: 1 }, st + MONTH * 4)
      // Each month lands with a small tick.
      for (let i = 1; i <= 4; i++) t.fromTo(sbody, { scaleY: 0.9 }, { scaleY: 1, duration: 0.24, ease: 'power2.out', immediateRender: false }, st + MONTH * i)
      if (count) {
        const months = { n: 0 }
        t.set(count, { opacity: 1 }, st)
          .to(months, { n: 4, duration: MONTH * 4, ease: 'steps(4)', onUpdate: () => (count.textContent = `${months.n} MO SILENT`) }, st)
          .to(count, { opacity: 0, duration: 0.2 }, st + MONTH * 4 + 0.4)
      }
      const dr = st + MONTH * 4 + 0.2
      const toC = colX(4) - colX(1)
      const home = slotY(A.length - 1)
      t.to(
        s,
        {
          motionPath: { path: [{ x: 24, y: 8 }, { x: toC - 30, y: 8 }, { x: toC, y: slotY(L.closed) - home }], curviness: 1.3 },
          duration: 1.5,
          ease: 'power1.inOut',
        },
        dr,
      )
        .to(part(stale, 'body'), { keyframes: { rotation: [0, -6, 5, -4, 0] }, duration: 1.5, ease: 'sine.inOut' }, dr)
        .to(part(stale, 'ghost'), { attr: { 'stroke-dashoffset': -27 }, duration: 1.5, ease: 'none' }, dr)
      t.addLabel('settled', dr + 1.5)

      // 3. (Panel only) The company replies: the ghost fills back in and hops home to Applied.
      if (open) {
        const rf = drop('reply', colX(4) + COL_W / 2, slotY(L.closed) + L.cardH / 2, dr + 1.8, stale, 2) + 0.1
        t.set(part(stale, 'ghost'), { opacity: 0 }, rf).set(part(stale, 'outline'), { opacity: 1 }, rf)
        ;[...dither].reverse().forEach((id, i) => t.set(sf, { attr: { fill: `url(#${id})` } }, rf + 0.09 * i))
        t.set(sf, { attr: { fill: 'currentColor' } }, rf + 0.27).set(part(stale, 'knock'), { opacity: 1 }, rf + 0.27)
        const rh = rf + 0.6
        const sb = part(stale, 'body')
        t.to(s, { x: 0, duration: 0.8, ease: 'power2.inOut' }, rh)
          .to(s, { keyframes: [{ y: L.y0 - 36 - home, duration: 0.4, ease: 'power2.out' }, { y: -L.pitch, duration: 0.4, ease: 'power2.in' }] }, rh)
          .to(sb, { rotation: -8, duration: 0.5, ease: 'power1.inOut' }, rh)
          .to(sb, { rotation: 0, scaleY: 0.8, scaleX: 1.05, duration: 0.08, ease: 'power1.out' }, rh + 0.8)
          .to(sb, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, rh + 0.88)
      }

      // Hold, then refresh the board.
      const out = open ? [...aRest, m, ...iCards] : [...aRest.filter((e) => e !== s), m, ...iCards, s]
      const refresh = t.duration() + (open ? 1.3 : 1.1)
      t.add(flip(out, [m, ...aRest, ...iCards]), refresh).add(rewindInbox(), refresh)
      if (!open) t.add(repark(), refresh + 0.35)

      loop.current = t
      back.current = null

      // Leaving the tile: anything that moved folds back home the same way.
      settle.current = () => {
        const all = gsap.utils.toArray<SVGGElement>('[data-card]', el)
        const moved = all.filter(
          (k) =>
            gsap.getProperty(k, 'x') !== 0 ||
            gsap.getProperty(k, 'y') !== 0 ||
            gsap.getProperty(k, 'scaleY') !== 1 ||
            k.querySelector('[data-fill]')!.getAttribute('fill') !== 'currentColor' ||
            k.querySelector('[data-blue]')!.getAttribute('width') !== '0',
        )
        const left = (k: Element) => k.getBoundingClientRect().left
        const rest = (k: Element) => Number((k as SVGGElement).dataset.c) * 10 + Number((k as SVGGElement).dataset.s)
        const r = gsap.timeline({ onComplete: () => void loop.current?.pause(0) })
        const envOff =
          !open &&
          (gsap.getProperty(parked, 'y') !== PARK_Y || gsap.getProperty(parked, 'scaleX') !== 1 || gsap.getProperty(parked, 'opacity') !== 1)
        const still = partsOf(all.filter((k) => !moved.includes(k)), 'body')
        r.to(open ? '[data-env], [data-ping], [data-count]' : '[data-ping]', { autoAlpha: 0, duration: 0.2 }, 0).add(rewindInbox(), 0)
        if (still.length) r.to(still, { rotation: 0, scaleX: 1, scaleY: 1, duration: 0.3, ease: 'power2.out' }, 0)
        if (!envOff) r.to(parkedBody, { rotation: 0, scaleX: 1, scaleY: 1, duration: 0.3, ease: 'power2.out' }, 0)
        if (moved.length) r.add(flip([...moved].sort((a, b) => left(a) - left(b)), [...moved].sort((a, b) => rest(a) - rest(b))), 0)
        if (envOff) r.to(parked, { scale: 0, duration: 0.15, ease: 'power2.in' }, 0).add(repark(), 0.3)
        back.current = r
      }
    }, el)
    ctx.current = c
    return () => {
      c.revert()
      loop.current = null
      back.current = null
      settle.current = null
      ctx.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, compact])

  useEffect(() => {
    const t = loop.current
    if (!t) return
    const reduce = prefersReducedMotion()
    if (active || open) {
      back.current?.progress(1).kill()
      back.current = null
      if (reduce) t.pause('settled')
      else t.restart(true)
      return
    }
    if (reduce) {
      t.pause(0)
      return
    }
    if (t.time() === 0 && !t.isActive()) return
    t.pause()
    ctx.current?.add(() => settle.current?.())
  }, [active, open, compact])

  const C = L.closed
  return (
    <svg ref={root} viewBox={`0 0 ${VW} ${L.h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      <defs>
        {dither.map((id, i) => (
          <Dither key={id} id={id} level={LEVELS[i]} />
        ))}
      </defs>
      {open && <Inbox clip={clip} />}

      {/* Column heads; Closed is the dashed grey one. */}
      {LABELS.map((label, c) => L.show.includes(c) && (
        <g key={label}>
          {open && (
            <text x={colX(c)} y={L.header - 9} className="font-mono" fontSize={7} fill={c === 4 ? MUTE : 'currentColor'} style={{ letterSpacing: '0.06em' }}>
              {label.toUpperCase()}
            </text>
          )}
          <line
            x1={colX(c)}
            x2={colX(c) + COL_W}
            y1={L.header}
            y2={L.header}
            stroke={c === 4 ? MUTE : 'currentColor'}
            strokeDasharray={c === 4 ? '6 4' : undefined}
            vectorEffect="non-scaling-stroke"
            strokeWidth={3}
          />
        </g>
      ))}

      {/* Offer: an empty slot waiting. */}
      {L.show.includes(3) && (
        <rect x={colX(3)} y={slotY(0)} width={COL_W} height={L.cardH} rx={3} fill="none" stroke={MUTE} strokeDasharray="3 4" {...stroke} />
      )}

      {/* Closed: rejections, struck through. */}
      {Array.from({ length: C }, (_, s) => (
        <g key={s} stroke={MUTE} {...stroke}>
          <rect x={colX(4)} y={slotY(s)} width={COL_W} height={L.cardH} rx={3} fill="none" />
          <line x1={colX(4) + 9} x2={colX(4) + COL_W - 9} y1={slotY(s) + L.cardH / 2} y2={slotY(s) + L.cardH / 2} />
        </g>
      ))}

      {open && (
        <text data-count x={colX(1)} y={slotY(A.length - 1) + 12} className="font-mono" fontSize={7} fill={MUTE} opacity={0} style={{ letterSpacing: '0.06em' }}>
          0 MO SILENT
        </text>
      )}

      {drawn.map((k) => (
        <Card key={k.id} {...k} h={L.cardH} />
      ))}

      <rect data-ping="mail" x={colX(1)} y={slotY(0)} width={COL_W} height={L.cardH} rx={3} fill="none" className="stroke-accent" opacity={0} {...stroke} />
      {open && <rect data-ping="reply" x={colX(4)} y={slotY(C)} width={COL_W} height={L.cardH} rx={3} fill="none" className="stroke-accent" opacity={0} {...stroke} />}
      <Envelope name="mail" />
      {open && <Envelope name="reply" />}
    </svg>
  )
}
