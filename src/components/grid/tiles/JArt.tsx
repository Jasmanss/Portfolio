import { useLayoutEffect, useRef, useState } from 'react'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import { NOW } from '../../../data/content'
import type { ArtProps } from '../types'

gsap.registerPlugin(DrawSVGPlugin)

// J, the About tile. At rest: a big "J." in the hero's type, the full stop in sky blue like the hero's "Sidhu.".
// Pointed at: the full stop blinks (it was a caret all along), the J bends into the Enter key (its hook straightens
// into the key's arrow) and presses itself, and the caret types two lines out next to it; then the key relaxes back
// into a J and the caret keeps blinking, retyping the second line with another fact now and then (one of them is the
// time where I am, live).

// Font units (Inter Tight at weight 450, 2048 per em, y up). The J is drawn as one stroke down the middle of the real
// glyph, which lets its hook bend into the Enter arrow and back.
const STROKE = 196
const J =
  'M801.3 1490L801.3 428.4Q801.3 313 761 232.2Q720.7 151.4 645.8 109.6Q570.9 67.7 466.8 67.7Q370.6 67.7 295 102.9Q219.4 138.1 176.1 204.1Q132.7 270.1 132.7 361.6L132.7 392.8'
// The same commands, bent into the Enter key: the stem comes down to a corner and runs left to the arrow.
const ENTER =
  'M801.3 1060L801.3 330Q801.3 260 801.3 200Q801.3 98 699.3 98Q620 98 540 98Q460 98 380 98Q300 98 240 98Q190 98 160 98L118 98'
const TIP = 58
const ARM = 230
const ARROW = `M${TIP + ARM} ${98 + ARM}L${TIP} 98L${TIP + ARM} ${98 - ARM}`

// The drawing, in viewBox units (400 x 200).
const VB_W = 400
const VB_H = 200
const S = 0.1 // font units to viewBox units
const BASE = 168 // the J's baseline
const REST_X = 127 // where the J sits on its own ("J." centred)
const ON_X = 66 // where it sits with the lines printed next to it
// The full stop after the J (Inter Tight's own: a round dot right after the J's advance), from the J's origin.
const DOT = { cx: 128.25, cy: -12.5, r: 13.85 }
const FS = 24 // the printed lines' size
const ADV = FS * 0.6 // Geist Mono is 0.6 em wide per character
const TEXT_X = 124 // where the lines start, from the J's origin
const LINE = [BASE - 42, BASE]
const localTime = () =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: NOW.timeZone, timeZoneName: 'short' })
    .format(new Date())
    .toUpperCase()
// The second line's facts, at most 12 characters each so they fit beside the J.
const FACTS: (string | (() => string))[] = ["OAKLAND '27", localTime, 'SWE INTERN']
const read = (f: string | (() => string)) => (typeof f === 'function' ? f() : f)
// What the character under the caret flickers through before it settles.
const CHARS = '01/{}[]#*+=-_%<>'

const restCaret = (jx: number) => ({ x: jx + DOT.cx - DOT.r, y: BASE + DOT.cy - DOT.r, width: DOT.r * 2, height: DOT.r * 2, rx: DOT.r })
const blockCaret = (line: number, chars: number) => ({ x: ON_X + TEXT_X + chars * ADV + 3, y: LINE[line] - 19, width: ADV - 2, height: 22, rx: 1 })

export default function JArt({ active, open }: ArtProps) {
  const root = useRef<SVGSVGElement>(null)
  const [aspect, setAspect] = useState(2)
  const on = active || !!open

  // On a squarer box (phones) the resting J is framed closer, and the camera pulls back when the lines print.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width && height) setAspect(Math.round((width / height) * 10) / 10)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const restW = Math.min(VB_W, Math.max(170, VB_H * aspect))
  const restVB = `${(VB_W - restW) / 2} 0 ${restW} ${VB_H}`
  const fullVB = `0 0 ${VB_W} ${VB_H}`

  const scene = useRef<{ enter: () => void; leave: () => void } | null>(null)
  const wasOn = useRef(false)

  useLayoutEffect(() => {
    const el = root.current!
    const ctx = gsap.context(() => {
      const jg = el.querySelector<SVGGElement>('[data-j]')!
      const path = el.querySelector<SVGPathElement>('[data-jpath]')!
      const arrow = el.querySelector<SVGPathElement>('[data-arrow]')!
      const caret = el.querySelector<SVGRectElement>('[data-caret]')!
      const lines = gsap.utils.toArray<SVGTextElement>('[data-line]', el)
      const reduce = prefersReducedMotion()
      let tl: gsap.core.Timeline | null = null
      let idle: gsap.core.Timeline | null = null

      const rest = () => {
        gsap.set(el, { attr: { viewBox: restVB } })
        gsap.set(jg, { x: REST_X, y: 0 })
        gsap.set(path, { attr: { d: J } })
        gsap.set(arrow, { drawSVG: '50% 50%', autoAlpha: 0 })
        gsap.set(caret, { attr: restCaret(REST_X), opacity: 1 })
        lines.forEach((l) => (l.textContent = ''))
      }
      rest()

      // Types a line with the caret riding just after it; the character under the caret flickers before it settles.
      const type = (i: number, fact: string | (() => string), duration: number) => {
        const p = { t: 0 }
        let text = ''
        return gsap.to(p, {
          t: 1,
          duration,
          ease: 'none',
          onStart: () => {
            text = read(fact)
            gsap.set(caret, { attr: { y: blockCaret(i, 0).y } })
          },
          onUpdate: () => {
            const n = p.t * text.length
            const k = Math.floor(n)
            const tail = k < text.length && text[k] !== ' ' ? CHARS[(Math.floor(n * 4) * 5) % CHARS.length] : ''
            lines[i].textContent = text.slice(0, k) + tail
            gsap.set(caret, { attr: { x: blockCaret(i, k + (tail ? 1 : 0)).x } })
          },
        })
      }
      // Backspaces a line (whatever it holds when this starts), the caret following unless it's off elsewhere.
      const erase = (i: number, duration: number, follow = true) => {
        const p = { t: 1 }
        let text = ''
        return gsap.to(p, {
          t: 0,
          duration,
          ease: 'none',
          onStart: () => void (text = lines[i].textContent ?? ''),
          onUpdate: () => {
            const k = Math.ceil(p.t * text.length)
            lines[i].textContent = text.slice(0, k)
            if (follow) gsap.set(caret, { attr: { x: blockCaret(i, k).x } })
          },
        })
      }

      // While the lines are up: the caret holds, blinks, then retypes the second line with the next fact.
      const startIdle = () => {
        const loop = (idle = gsap.timeline({ repeat: -1 }))
        FACTS.forEach((_, i) => {
          const next = FACTS[(i + 1) % FACTS.length]
          const at = i * 3.2
          loop
            .to(caret, { opacity: 0, duration: 0.45, ease: 'steps(1)', repeat: 3, yoyo: true }, at + 1)
            .add(erase(1, 0.3), at + 2.8)
            .add(type(1, next, 0.55), at + 3.15)
        })
      }

      const enter = () => {
        tl?.kill()
        idle?.kill()
        if (reduce) {
          gsap.set(el, { attr: { viewBox: fullVB } })
          gsap.set(jg, { x: ON_X })
          lines[0].textContent = 'CS + AI'
          lines[1].textContent = read(FACTS[0])
          gsap.set(caret, { attr: blockCaret(1, read(FACTS[0]).length), opacity: 1 })
          return
        }
        tl = gsap.timeline({ onComplete: startIdle })
        // The full stop blinks twice: it's a caret.
        tl.set(caret, { opacity: 0 }, 0.04)
          .set(caret, { opacity: 1 }, 0.2)
          .set(caret, { opacity: 0 }, 0.36)
          .set(caret, { opacity: 1 }, 0.52)
          .addLabel('go', 0.56)
          // The J slides over and bends into the Enter key; the caret squares up and drops to where the text goes.
          .to(el, { attr: { viewBox: fullVB }, duration: 0.8, ease: 'expo.inOut' }, 'go')
          .to(jg, { x: ON_X, duration: 0.8, ease: 'expo.inOut' }, 'go')
          .to(path, { attr: { d: ENTER }, duration: 0.62, ease: 'power3.inOut' }, 'go+=0.08')
          .set(arrow, { autoAlpha: 1 }, 'go+=0.44')
          .to(arrow, { drawSVG: '0% 100%', duration: 0.34, ease: 'power3.out' }, 'go+=0.44')
          .to(caret, { attr: blockCaret(0, 0), duration: 0.62, ease: 'power3.inOut' }, 'go+=0.1')
          // It presses itself...
          .to(jg, { y: 7, duration: 0.08, ease: 'power2.in' }, 'go+=0.8')
          .to(jg, { y: 0, duration: 0.45, ease: 'back.out(3)' }, 'go+=0.88')
          // ...and the caret types the lines out.
          .add(type(0, 'CS + AI', 0.5), 'go+=0.88')
          .add(type(1, FACTS[0], 0.66), 'go+=1.48')
          // The key lets go and becomes a J again.
          .to(arrow, { drawSVG: '50% 50%', duration: 0.26, ease: 'power2.in' }, 'go+=1.72')
          .set(arrow, { autoAlpha: 0 }, 'go+=1.98')
          .to(path, { attr: { d: J }, duration: 0.7, ease: 'power3.inOut' }, 'go+=1.78')
      }

      // Back to rest from wherever it is: the lines backspace, the caret flies home and rounds into the full stop.
      const leave = () => {
        tl?.kill()
        idle?.kill()
        if (reduce) return rest()
        tl = gsap.timeline()
        tl.add(erase(1, 0.22, false), 0)
          .add(erase(0, 0.18, false), 0.16)
          .set(caret, { opacity: 1 }, 0)
          .to(caret, { attr: restCaret(REST_X), duration: 0.6, ease: 'power3.inOut' }, 0.1)
          .to(arrow, { drawSVG: '50% 50%', duration: 0.2, ease: 'power2.in' }, 0)
          .set(arrow, { autoAlpha: 0 }, 0.2)
          .to(path, { attr: { d: J }, duration: 0.4, ease: 'power3.inOut' }, 0)
          .to(jg, { x: REST_X, y: 0, duration: 0.7, ease: 'expo.inOut' }, 0.06)
          .to(el, { attr: { viewBox: restVB }, duration: 0.7, ease: 'expo.inOut' }, 0.06)
      }

      scene.current = { enter, leave }
    }, el)
    return () => {
      scene.current = null
      ctx.revert()
    }
  }, [restVB, fullVB])

  useLayoutEffect(() => {
    if (on) scene.current?.enter()
    else if (wasOn.current) scene.current?.leave()
    wasOn.current = on
  }, [on, restVB])

  return (
    <svg ref={root} viewBox={restVB} preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible" aria-hidden>
      <g data-j>
        <g transform={`translate(0 ${BASE}) scale(${S} ${-S})`} fill="none" stroke="currentColor" strokeWidth={STROKE}>
          <path data-jpath d={J} strokeLinejoin="round" />
          <path data-arrow d={ARROW} strokeLinejoin="miter" strokeMiterlimit={4} />
        </g>
      </g>
      {LINE.map((y, i) => (
        <text
          key={i}
          data-line
          x={ON_X + TEXT_X}
          y={y}
          fill="currentColor"
          fontSize={FS}
          xmlSpace="preserve"
          className="font-mono font-medium uppercase"
          style={{ whiteSpace: 'pre' }}
        />
      ))}
      <rect data-caret className="fill-accent" {...restCaret(REST_X)} />
    </svg>
  )
}
