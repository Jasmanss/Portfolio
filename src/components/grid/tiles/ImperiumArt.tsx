import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { TextPlugin } from 'gsap/TextPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import type { ArtProps } from '../types'

gsap.registerPlugin(DrawSVGPlugin, TextPlugin)

// Imperium: a phone texts the Mac, a packet runs down the wire, through a policy gate, and the Mac does it. A safe
// request ("open spotify") goes straight through; a destructive one ("email the team") hits the gate as its jaws slam
// shut and parks there until a Confirm card on the phone is tapped before its countdown runs out (the sky-blue moment).
// In the opened panel an audit log prints every step underneath.

const NS = { vectorEffect: 'non-scaling-stroke' } as const
const INK = '#0A0A0A'
const MUTE = '#7C7C7C'
const ACCENT_CSS = 'rgb(var(--accent))'

const WY = 86 // the wire's height
const W0 = 104 // wire leaves the phone
const W1 = 244 // wire reaches the Mac
const PARK = 155 // where a held packet waits, nose against the gate
const INSIDE = 262 // where a packet disappears into the Mac
const pct = (x: number) => `${(((x - W0) / (W1 - W0)) * 100).toFixed(2)}%`

// Script lines the Mac writes for each request: [from x, to x, y]. Rendered as bars; they read as code in print.
const CODE_RUN = [
  [270, 336, 57],
  [278, 330, 67],
  [270, 294, 77],
]
const CODE_SEND = [
  [270, 318, 57],
  [278, 352, 67],
  [270, 306, 77],
]
const CURSOR_X = 268
const CURSOR_Y = 57
const EQ = [0.95, 0.5, 0.85, 0.4, 0.75]

// Demo audit log (made-up times), printed one row per event in the panel.
const LOG = [
  ['09:41:00', 'pair phone', 'token', 'ok'],
  ['09:41:02', 'open spotify', 'safe', 'ran'],
  ['09:41:05', 'email the team', 'destructive', 'held'],
  ['09:41:09', 'email the team', 'confirmed', 'sent'],
]
const LOG_Y = 266
const LOG_STEP = 21

const Y = 4.55 // the tap on Confirm

function accent() {
  const v = typeof window === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  return v ? `rgb(${v.split(/\s+/).join(', ')})` : '#4DA3FF'
}

export default function ImperiumArt({ active, open = false }: ArtProps) {
  const root = useRef<SVGSVGElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const calmRef = useRef<gsap.core.Timeline | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [tall, setTall] = useState(false)

  // The big copy picks its composition from the box it's given: nearly square gets the audit log underneath.
  useLayoutEffect(() => {
    const el = root.current
    if (!open || !el) return
    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width && height) setTall(width / height < 1.25)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  // One looping timeline, built paused; the rest frame is its time 0.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el)
      const one = (k: string) => q(`[data-k="${k}"]`)[0]
      const A = accent()

      const b1 = one('b1')
      const b2 = one('b2')
      const packet = one('packet')
      const trail = one('trail')
      const jt = one('jt')
      const jb = one('jb')
      const gate = one('gate')
      const card = one('card')
      const ring = one('ring')
      const cursor = one('cursor')
      const app = one('app')
      const env = one('env')
      const run = q('[data-k="run"]')
      const send = q('[data-k="send-code"]')
      const rows = q('[data-k="row"]')
      const clips = q('[data-k="rowclip"]')

      gsap.set([b1, b2], { autoAlpha: 0, transformOrigin: '100% 50%' })
      gsap.set(packet, { x: W0, y: WY, scale: 0, transformOrigin: '50% 50%' })
      gsap.set([trail, ring], { drawSVG: '0% 0%' })
      gsap.set([...run, ...send, one('check'), ...q('[data-k="env-line"]')], { drawSVG: '0%' })
      gsap.set(card, { y: 110 })
      gsap.set(jt, { transformOrigin: '50% 0%' })
      gsap.set(jb, { transformOrigin: '50% 100%' })
      gsap.set(one('tap'), { autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set(app, { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' })
      gsap.set(q('[data-k="eq"]'), { scaleY: 0.35, transformOrigin: '50% 100%' })
      if (clips.length) gsap.set(clips, { attr: { width: 0 } })

      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8, defaults: { ease: 'power3.out' } })
      const press = (k: string, at: number, to = 0.55) =>
        tl.to(one(k), { scale: to, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut', transformOrigin: '50% 50%' }, at)
      // The Mac types a script: the cursor rides the tip of each bar as it prints, in chunky steps.
      const type = (lines: Element[], spec: number[][], at: number) =>
        spec.forEach(([a, b, y], i) => {
          const t = at + i * 0.19
          tl.set(cursor, { x: a + 1 - CURSOR_X, y: y - CURSOR_Y }, t)
            .fromTo(lines[i], { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.17, ease: 'steps(6)', immediateRender: false }, t)
            .to(cursor, { x: b + 1 - CURSOR_X, duration: 0.17, ease: 'steps(6)' }, t)
        })
      const print = (i: number, at: number) =>
        clips[i] && tl.to(clips[i], { attr: { width: 400 }, duration: 0.42, ease: 'steps(16)' }, at)

      // 1. A safe request: straight through the gate, the Mac writes a script and the app opens.
      press('send', 0)
      tl.fromTo(one('paired'), { scale: 1 }, { scale: 1.8, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 50%', immediateRender: false }, 0)
        .fromTo(b1, { autoAlpha: 0, y: 22, scaleX: 0.4 }, { autoAlpha: 1, y: 0, scaleX: 1, duration: 0.42, immediateRender: false }, 0.06)
        .to(one('b1t'), { text: 'open spotify', duration: 0.32, ease: 'none' }, 0.12)
        .to(packet, { scale: 1, duration: 0.16, ease: 'back.out(3)' }, 0.42)
        .to(packet, { x: 174, duration: 0.38, ease: 'power2.in' }, 0.46)
        .fromTo(trail, { drawSVG: '0% 0%' }, { drawSVG: '22% 50%', duration: 0.38, ease: 'power2.in', immediateRender: false }, 0.46)
        .to([jt, jb], { scaleY: 0.78, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.72)
        .to(packet, { x: INSIDE, duration: 0.36, ease: 'power2.out' }, 0.84)
        .to(trail, { drawSVG: '100% 100%', duration: 0.36, ease: 'power2.out' }, 0.84)
        .to(packet, { scale: 0, duration: 0.14, ease: 'power2.in' }, 1.12)
      type(run, CODE_RUN, 1.2)
      tl.to(app, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.7)' }, 1.5)
        .to(q('[data-k="eq"]'), { scaleY: (i: number) => EQ[i], duration: 0.14, ease: 'sine.inOut', stagger: { each: 0.05, repeat: 23, yoyo: true } }, 1.72)
      print(0, 0.1)
      print(1, 1.62)

      // 2. A destructive request: the gate slams, the packet bumps and parks, the phone asks.
      press('send', 1.95)
      tl.to(b1, { y: -20, duration: 0.36 }, 1.98)
        .fromTo(b2, { autoAlpha: 0, y: 22, scaleX: 0.4 }, { autoAlpha: 1, y: 0, scaleX: 1, duration: 0.42, immediateRender: false }, 2.0)
        .to(one('b2t'), { text: 'email the team', duration: 0.36, ease: 'none' }, 2.06)
        .set(packet, { x: W0 }, 2.4)
        .to(packet, { scale: 1, duration: 0.16, ease: 'back.out(3)' }, 2.42)
        .to(packet, { x: PARK, duration: 0.4, ease: 'power2.in' }, 2.46)
        .fromTo(trail, { drawSVG: '0% 0%' }, { drawSVG: `${pct(PARK - 34)} ${pct(PARK - 8)}`, duration: 0.4, ease: 'power2.in', immediateRender: false }, 2.46)
        .to([jt, jb], { scaleY: 58 / 43, duration: 0.24, ease: 'power4.in' }, 2.52)
        .to(gate, { x: 1.6, duration: 0.04, repeat: 5, yoyo: true, ease: 'none' }, 2.76)
        .to(packet, { x: PARK - 9, duration: 0.1, ease: 'power2.out' }, 2.86)
        .to(packet, { x: PARK - 2, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 2.96)
        .to(trail, { drawSVG: `${pct(PARK - 8)} ${pct(PARK - 8)}`, duration: 0.3, ease: 'power2.out' }, 2.86)
        .to(card, { y: 0, duration: 0.5, ease: 'power3.out' }, 3.0)
        .fromTo(ring, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.35, ease: 'power2.out', immediateRender: false }, 3.2)
        .to(ring, { drawSVG: '0% 40%', duration: 1.3, ease: 'none' }, 3.55)
      print(2, 2.95)

      // 3. Confirm: the one sky-blue moment. The gate opens and the email goes.
      tl.fromTo(one('tap'), { autoAlpha: 1, scale: 0.3 }, { autoAlpha: 0, scale: 2.3, duration: 0.55, ease: 'power2.out', immediateRender: false }, Y - 0.12)
      press('btn', Y - 0.1, 0.9)
      tl.addLabel('yes', Y)
        .to(one('btnfill'), { fill: A, duration: 0.2, ease: 'none' }, Y)
        .to(ring, { drawSVG: '0% 100%', stroke: A, duration: 0.4 }, Y)
        .to(one('bang'), { autoAlpha: 0, scale: 0.3, duration: 0.14, ease: 'power2.in', transformOrigin: '50% 50%' }, Y)
        .to(one('check'), { drawSVG: '100%', duration: 0.3, ease: 'power2.out' }, Y + 0.14)
        .to(packet, { fill: A, duration: 0.2, ease: 'none' }, Y)
        .to([jt, jb], { scaleY: 1, duration: 0.55, ease: 'expo.out' }, Y + 0.3)
        .set(trail, { stroke: A }, Y + 0.34)
        .to(packet, { x: INSIDE, duration: 0.5, ease: 'power3.inOut' }, Y + 0.36)
        .fromTo(trail, { drawSVG: `${pct(PARK - 8)} ${pct(PARK - 8)}` }, { drawSVG: `${pct(PARK - 8)} 100%`, duration: 0.4, ease: 'power3.inOut', immediateRender: false }, Y + 0.36)
        .to(trail, { drawSVG: '100% 100%', duration: 0.3, ease: 'power2.in' }, Y + 0.62)
        .to(packet, { scale: 0, duration: 0.14, ease: 'power2.in' }, Y + 0.78)
        .to(app, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in' }, Y + 0.8)
        .to(run, { drawSVG: '100% 100%', duration: 0.18, stagger: 0.04, ease: 'steps(4)' }, Y + 0.8)
      type(send, CODE_SEND, Y + 0.95)
      tl.to(q('[data-k="env-line"]'), { drawSVG: '100%', duration: 0.3, ease: 'power2.inOut', stagger: 0.16 }, Y + 1.2)
        .to(env, { x: 90, y: -52, rotation: -14, duration: 0.45, ease: 'power3.in', transformOrigin: '50% 50%' }, Y + 1.75)
      print(3, Y + 1.25)

      // 4. Back to calm, so the loop starts from the rest frame.
      tl.to(card, { y: 110, duration: 0.45, ease: 'power3.in' }, Y + 1.95)
        .to([b1, b2], { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, Y + 2.25)
        .to(send, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, Y + 2.25)
        .to(cursor, { x: 0, y: 0, duration: 0.3, ease: 'steps(3)' }, Y + 2.3)
        .addLabel('still', Y + 1.72)
      if (rows.length) tl.to(rows, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, Y + 2.25)

      tlRef.current = tl
    }, el)
    return () => {
      calmRef.current?.kill()
      calmRef.current = null
      ctx.revert()
      tlRef.current = null
    }
  }, [tall])

  // Play while pointed at (or open); otherwise ease what's on screen away and settle on the rest frame.
  useEffect(() => {
    const tl = tlRef.current
    const el = root.current
    if (!tl || !el) return
    const on = active || open
    if (prefersReducedMotion()) {
      tl.pause(on ? 'still' : 0)
      return
    }
    const fades = gsap.utils.toArray<SVGElement>('[data-fade]', el)
    calmRef.current?.kill()
    calmRef.current = null
    if (on) {
      gsap.set(fades, { opacity: 1 })
      const call = gsap.delayedCall(open ? 0.6 : 0.05, () => tl.play(0))
      return () => {
        call.kill()
      }
    }
    if (tl.totalTime() === 0) return
    tl.pause()
    calmRef.current = gsap
      .timeline({
        onComplete: () => {
          tl.pause(0)
          gsap.set(fades, { opacity: 1 })
        },
      })
      .to(fades, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0)
      .to(gsap.utils.toArray('[data-rest]', el), { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
  }, [active, open, tall])

  const accentFill = { fill: ACCENT_CSS }
  const accentStroke = { stroke: ACCENT_CSS }

  return (
    <svg
      ref={root}
      viewBox={tall ? '0 -6 400 360' : '0 0 400 200'}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      fill="none"
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}p`}>
          <rect x="17" y="24" width="76" height="161" rx="9" />
        </clipPath>
        <clipPath id={`${uid}m`}>
          <rect x="251" y="43" width="130" height="86" rx="4" />
        </clipPath>
        {tall &&
          LOG.map((_, i) => (
            <clipPath key={i} id={`${uid}r${i}`}>
              <rect data-k="rowclip" x="0" y={LOG_Y + i * LOG_STEP - 13} width="0" height={LOG_STEP} />
            </clipPath>
          ))}
      </defs>

      {/* The phone: paired status on top, an input at the bottom, the chat (and the Confirm card) in between. */}
      <rect x="12" y="10" width="86" height="180" rx="15" stroke="currentColor" strokeWidth="3.5" {...NS} />
      <rect x="43" y="16" width="24" height="5" rx="2.5" fill="currentColor" />
      <circle data-k="paired" data-rest cx="26" cy="35" r="2.6" fill="currentColor" />
      {open && (
        <text x="32" y="37.4" className="font-mono" fontSize="6.5" letterSpacing="0.4" fill="currentColor">
          PAIRED
        </text>
      )}
      <rect x="21" y="164" width="68" height="16" rx="8" stroke="currentColor" strokeWidth="2.5" {...NS} />
      <circle data-k="send" data-rest cx="81" cy="172" r="4.5" fill="currentColor" />
      <g clipPath={`url(#${uid}p)`}>
        <g data-fade>
          <g data-k="b1">
            <rect x="28" y="140" width="62" height="17" rx="6" fill="currentColor" />
            <text data-k="b1t" x="32.5" y="151.4" className="font-mono" fontSize="7.5" fill={INK} />
          </g>
          <g data-k="b2">
            <rect x="20" y="140" width="70" height="17" rx="6" fill="currentColor" />
            <text data-k="b2t" x="24.5" y="151.4" className="font-mono" fontSize="7.5" fill={INK} />
          </g>
          <g data-k="card">
            <rect x="19" y="84" width="72" height="99" rx="10" fill={INK} stroke="currentColor" strokeWidth="2.5" {...NS} />
            <circle cx="55" cy="116" r="15" stroke={MUTE} strokeWidth="3" {...NS} />
            <circle data-k="ring" cx="55" cy="116" r="15" transform="rotate(-90 55 116)" stroke="currentColor" strokeWidth="3" {...NS} />
            <g data-k="bang" fill="currentColor">
              <rect x="53.5" y="107" width="3" height="11" />
              <rect x="53.5" y="121" width="3" height="3" />
            </g>
            <path data-k="check" d="M47.5 116.5l5.5 5.5 10-11" strokeWidth="3" strokeLinejoin="round" style={accentStroke} {...NS} />
            <g data-k="btn">
              <rect data-k="btnfill" x="25" y="146" width="60" height="20" rx="10" fill="currentColor" />
              <text x="55" y="158.5" textAnchor="middle" className="font-mono" fontSize="7" letterSpacing="0.5" fill={INK}>
                CONFIRM
              </text>
            </g>
            <circle data-k="tap" cx="55" cy="156" r="10" stroke="currentColor" strokeWidth="2" {...NS} />
          </g>
        </g>
      </g>

      {/* The wire, and the policy gate in the middle of it. */}
      <path d={`M${W0} ${WY}H${W1}`} stroke="currentColor" strokeWidth="3" strokeDasharray="4 5" {...NS} />
      <g data-k="gate" data-rest>
        <rect x="158" y="22" width="32" height="6" rx="2" fill="currentColor" />
        <rect x="158" y="144" width="32" height="6" rx="2" fill="currentColor" />
        <rect data-k="jt" data-rest x="166" y="27" width="16" height="43" rx="2" fill="currentColor" />
        <rect data-k="jb" data-rest x="166" y="102" width="16" height="43" rx="2" fill="currentColor" />
      </g>
      <g data-fade>
        <path data-k="trail" d={`M${W0} ${WY}H${W1}`} stroke="currentColor" strokeWidth="3" {...NS} />
        <rect data-k="packet" x="-8" y="-5.5" width="16" height="11" rx="2.5" fill="currentColor" />
      </g>

      {/* The Mac: a prompt, the scripts it writes, the app it opens and the email it sends. */}
      <rect x="248" y="40" width="136" height="92" rx="6" stroke="currentColor" strokeWidth="3.5" {...NS} />
      <rect x="234" y="136" width="164" height="7" rx="3.5" fill="currentColor" />
      <polyline points="258,52 264,57 258,62" stroke="currentColor" strokeWidth="3" {...NS} />
      <rect data-k="cursor" data-rest x={CURSOR_X} y={CURSOR_Y - 4} width="6" height="8" fill="currentColor" />
      <g clipPath={`url(#${uid}m)`}>
        <g data-fade>
          {CODE_RUN.map(([a, b, y]) => (
            <path key={`r${y}`} data-k="run" d={`M${a} ${y}H${b}`} stroke="currentColor" strokeWidth="3" {...NS} />
          ))}
          {CODE_SEND.map(([a, b, y]) => (
            <path key={`s${y}`} data-k="send-code" d={`M${a} ${y}H${b}`} stroke="currentColor" strokeWidth="3" {...NS} />
          ))}
          <g data-k="app">
            <rect x="300" y="72" width="72" height="48" rx="5" fill={INK} stroke="currentColor" strokeWidth="3" {...NS} />
            <path d="M309 87v22l17-11z" fill="currentColor" />
            {EQ.map((_, i) => (
              <rect key={i} data-k="eq" x={334 + i * 7} y="89" width="4" height="22" rx="1" fill="currentColor" />
            ))}
          </g>
          <g data-k="env">
            <rect data-k="env-line" x="312" y="86" width="40" height="28" rx="2.5" strokeWidth="3" style={accentStroke} {...NS} />
            <polyline data-k="env-line" points="312,87.5 332,103 352,87.5" strokeWidth="3" strokeLinejoin="round" style={accentStroke} {...NS} />
          </g>
        </g>
      </g>

      {/* The panel's audit log: every request, its tier and what happened. */}
      {tall && (
        <g className="font-mono" fontSize="7.5">
          <text x="0" y="236" fill={MUTE} fontSize="7" letterSpacing="0.45">
            AUDIT LOG
          </text>
          <line x1="0" x2="400" y1="245" y2="245" stroke={MUTE} strokeWidth="1" {...NS} />
          <g data-fade>
            {LOG.map((r, i) => {
              const y = LOG_Y + i * LOG_STEP
              const last = i === LOG.length - 1
              return (
                <g key={i} data-k="row" clipPath={`url(#${uid}r${i})`}>
                  <text x="0" y={y} fill={MUTE}>
                    {r[0]}
                  </text>
                  <text x="70" y={y} fill="currentColor">
                    {r[1]}
                  </text>
                  <text x="196" y={y} fill={MUTE} style={last ? accentFill : undefined}>
                    {r[2]}
                  </text>
                  <text x="400" y={y} textAnchor="end" fill="currentColor" style={last ? accentFill : undefined}>
                    {r[3]}
                  </text>
                  <line x1="0" x2="400" y1={y + 8} y2={y + 8} stroke={MUTE} strokeOpacity="0.35" strokeWidth="1" {...NS} />
                </g>
              )
            })}
          </g>
        </g>
      )}
    </svg>
  )
}
