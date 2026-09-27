import { useLayoutEffect, useRef } from 'react'
import Shape from '../components/Shapes'
import type { ShapeKind } from '../components/Shapes'
import { gsap, prefersReducedMotion } from '../lib/motion'

const ROWS: { words: string[]; shape: ShapeKind; direction: 1 | -1; outline?: boolean }[] = [
  { words: ['Next.js', 'TypeScript', 'Python', 'Swift', 'FastAPI', 'Flask'], shape: 'asterisk', direction: -1 },
  { words: ['Claude API', 'OpenAI', 'Supabase', 'PostgreSQL', 'React', 'Vercel'], shape: 'flower', direction: 1, outline: true },
]

// Two rows of the stack sliding in opposite directions as the page scrolls past.
export default function Marquee() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-row]').forEach((row) => {
        const dir = Number(row.dataset.row)
        gsap.fromTo(
          row,
          { xPercent: dir > 0 ? -25 : 0 },
          {
            xPercent: dir > 0 ? 0 : -25,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} aria-label="Tools I use" className="py-16 md:py-24 overflow-hidden border-y border-line">
      {ROWS.map((row, r) => (
        <div key={r} data-row={row.direction} className="flex w-max items-center gap-[0.35em] whitespace-nowrap type-display text-[clamp(3rem,9vw,8.5rem)] leading-[1.05]">
          {[0, 1].flatMap((copy) =>
            row.words.map((w) => (
              <span key={`${copy}-${w}`} className="flex items-center gap-[0.35em]" aria-hidden={copy === 1}>
                <span className={row.outline ? 'text-transparent [-webkit-text-stroke:2px_#FFF7E0]' : ''}>{w}</span>
                <Shape kind={row.shape} size={64} className="shrink-0 w-[0.6em] h-[0.6em]" />
              </span>
            )),
          )}
        </div>
      ))}
    </section>
  )
}
