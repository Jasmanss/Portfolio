import { useLayoutEffect, useRef } from 'react'
import { SIGNATURE } from '../data/signature'
import { gsap, prefersReducedMotion } from '../lib/motion'

// Writes the signature stroke by stroke, in the order it was signed, as the block scrolls in.
// With `auto`, it signs itself once on mount instead of following the scroll.
export default function Signature({ className = '', auto = false }: { className?: string; auto?: boolean }) {
  const svg = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const el = svg.current
    if (!el || !SIGNATURE) return
    const paths = Array.from(el.querySelectorAll('path'))
    const lengths = paths.map((p) => p.getTotalLength())
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lengths[i]}`
      p.style.strokeDashoffset = prefersReducedMotion() ? '0' : `${lengths[i]}`
    })
    if (prefersReducedMotion()) return

    const total = lengths.reduce((a, b) => a + b, 0)
    const ctx = gsap.context(() => {
      const tl = auto
        ? gsap.timeline({ delay: 1.2 })
        : gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 45%', scrub: 0.6 } })
      const scale = auto ? 2.2 : 1
      paths.forEach((p, i) =>
        tl.to(p, { strokeDashoffset: 0, duration: (lengths[i] / total) * scale, ease: auto ? 'power1.inOut' : 'none' }),
      )
    }, el)
    return () => ctx.revert()
  }, [auto])

  if (!SIGNATURE) return null
  return (
    <svg
      ref={svg}
      viewBox={SIGNATURE.viewBox}
      role="img"
      aria-label="Jasman's signature"
      className={className}
    >
      {SIGNATURE.strokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
