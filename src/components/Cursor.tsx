import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/motion'

type Mode = { kind: 'default' | 'link' | 'view' | 'drag' | 'text'; label?: string; color?: string }

// Reads what the pointer is over. Elements opt in with data-cursor="view|drag" (+ data-cursor-label/-color).
function modeFor(target: EventTarget | null): Mode {
  const el = target instanceof Element ? target : null
  const tagged = el?.closest<HTMLElement>('[data-cursor]')
  if (tagged) {
    return {
      kind: (tagged.dataset.cursor as Mode['kind']) ?? 'view',
      label: tagged.dataset.cursorLabel,
      color: tagged.dataset.cursorColor,
    }
  }
  if (el?.closest('input, textarea, [contenteditable="true"]')) return { kind: 'text' }
  if (el?.closest('a, button, [role="button"], label')) return { kind: 'link' }
  return { kind: 'default' }
}

// A two-part cursor: a dot that tracks exactly and a blob that trails, grows into labels, and squishes on click.
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const blob = useRef<HTMLDivElement>(null)
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )
  const [mode, setMode] = useState<Mode>({ kind: 'default' })

  useEffect(() => {
    if (!enabled || !dot.current || !blob.current) return
    document.documentElement.classList.add('has-cursor')
    gsap.set([dot.current, blob.current], { xPercent: -50, yPercent: -50 })
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08, ease: 'power3' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.08, ease: 'power3' })
    const bx = gsap.quickTo(blob.current, 'x', { duration: 0.45, ease: 'power3' })
    const by = gsap.quickTo(blob.current, 'y', { duration: 0.45, ease: 'power3' })
    let last = ''
    const move = (e: PointerEvent) => {
      dx(e.clientX)
      dy(e.clientY)
      bx(e.clientX)
      by(e.clientY)
      const next = modeFor(e.target)
      const key = `${next.kind}|${next.label}|${next.color}`
      if (key !== last) {
        last = key
        setMode(next)
      }
    }
    const down = () => gsap.to(blob.current, { scaleX: 1.25, scaleY: 0.75, duration: 0.15, ease: 'power2.out' })
    const up = () => gsap.to(blob.current, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' })
    const leave = () => gsap.to([dot.current, blob.current], { opacity: 0, duration: 0.2 })
    const enter = () => gsap.to([dot.current, blob.current], { opacity: 1, duration: 0.2 })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.addEventListener('pointerleave', leave)
    document.addEventListener('pointerenter', enter)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('pointerenter', enter)
    }
  }, [enabled])

  if (!enabled) return null

  const size = { default: 36, link: 64, view: 96, drag: 84, text: 6 }[mode.kind]
  const labelled = mode.kind === 'view' || mode.kind === 'drag'
  return (
    <>
      <div
        ref={blob}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200]"
      >
        <div
          className={`flex items-center justify-center rounded-full transition-[width,height,background-color,border-color] duration-300 ease-out ${
            labelled ? 'text-night' : 'border border-cream/70 mix-blend-difference'
          }`}
          style={{
            width: size,
            height: size,
            backgroundColor: labelled ? (mode.color ?? '#2BF27A') : 'transparent',
          }}
        >
          {labelled && <span className="font-mono text-[11px] font-medium">{mode.label ?? (mode.kind === 'drag' ? 'Throw' : 'View')}</span>}
        </div>
      </div>
      <div
        ref={dot}
        aria-hidden
        className={`pointer-events-none fixed left-0 top-0 z-[201] size-1.5 rounded-full bg-cream mix-blend-difference ${
          labelled ? 'opacity-0' : ''
        }`}
      />
    </>
  )
}
