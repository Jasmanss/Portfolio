import { useLayoutEffect, useRef } from 'react'
import { PROJECTS } from '../data/content'
import Shape from '../components/Shapes'
import type { ShapeKind } from '../components/Shapes'
import ProjectLinks from '../components/ProjectLinks'
import { TransitionLink } from '../components/Transition'
import { gsap, prefersReducedMotion } from '../lib/motion'

// Every project gets its own colour and shape, used here and on its case study.
export const PROJECT_LOOK: Record<string, { text: string; bg: string; shape: ShapeKind }> = {
  portlkit: { text: 'text-lilac', bg: 'bg-lilac', shape: 'ring' },
  imperium: { text: 'text-orange', bg: 'bg-orange', shape: 'asterisk' },
  hairstyl: { text: 'text-pink', bg: 'bg-pink', shape: 'flower' },
  callback: { text: 'text-sky', bg: 'bg-sky', shape: 'capsule' },
}

export default function Work() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !root.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-heading] > *', {
        yPercent: 110,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '[data-heading]', start: 'top 85%' },
      })
      gsap.utils.toArray<HTMLElement>('[data-project]').forEach((row) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 80%' } })
        tl.from(row.querySelector('[data-shape]'), { scale: 0, rotate: -120, duration: 1.1, ease: 'back.out(1.6)' })
          .from(row.querySelectorAll('[data-rise]'), { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07 }, 0.1)
          .from(row.querySelector('[data-card]'), { y: 80, rotate: 4, opacity: 0, duration: 1, ease: 'expo.out' }, 0.15)
        // The shape keeps turning while the row is on screen.
        gsap.to(row.querySelector('[data-shape]'), {
          rotate: 180,
          ease: 'none',
          scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="work" ref={root} className="container-xl py-28 md:py-40">
      <div data-heading className="overflow-hidden">
        <p className="brace">selected work, 2025 to now</p>
      </div>
      <h2 data-heading className="mt-4 type-display text-[clamp(3.5rem,10vw,10rem)] overflow-hidden pb-[0.1em]">
        <span className="inline-block">Things I’ve</span>{' '}
        <span className="inline-block sticker bg-green -rotate-2">shipped</span>
      </h2>

      <div className="mt-16 md:mt-24">
        {PROJECTS.map((p) => {
          const look = PROJECT_LOOK[p.slug]
          return (
            <article key={p.slug} data-project className="grid md:grid-cols-12 gap-8 md:gap-10 items-center border-t border-line py-14 md:py-20">
              <div className="md:col-span-2 flex md:block">
                <div data-shape className="w-24 md:w-full max-w-[150px]">
                  <Shape kind={look.shape} size={150} className="w-full h-auto" />
                </div>
              </div>

              <div className="md:col-span-5">
                <p data-rise className={`font-mono text-[13px] ${look.text}`}>
                  {p.kind}
                </p>
                <h3 data-rise className="mt-3 type-display text-[clamp(3rem,6vw,5.5rem)]">
                  {p.title}
                </h3>
                <p data-rise className="mt-5 text-lg leading-relaxed text-cream/85 max-w-md">
                  {p.summary}
                </p>
                <div data-rise className="mt-6 flex flex-wrap gap-2">
                  {p.stack.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted">
                      {s}
                    </span>
                  ))}
                </div>
                <div data-rise className="mt-8 flex flex-wrap items-center gap-5">
                  <TransitionLink to={`/work/${p.slug}`} className="pill">
                    Explore {p.title} →
                  </TransitionLink>
                  <ProjectLinks project={p} />
                </div>
              </div>

              <TransitionLink
                to={`/work/${p.slug}`}
                data-card
                aria-label={`${p.title} case study`}
                className="md:col-span-5 group block"
              >
                <div className={`rounded-3xl p-3 ${look.bg} transition-transform duration-500 ease-out group-hover:-rotate-2 group-hover:scale-[1.02]`}>
                  <img src={p.image} alt={p.imageAlt} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-2xl bg-night" />
                </div>
              </TransitionLink>
            </article>
          )
        })}
      </div>
    </section>
  )
}
