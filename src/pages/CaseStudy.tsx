import { useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PROJECTS } from '../data/content'
import ProjectLinks from '../components/ProjectLinks'
import Shape from '../components/Shapes'
import { PROJECT_LOOK } from '../sections/Work'
import { TransitionLink } from '../components/Transition'
import Contact from '../sections/Contact'
import NotFound from './NotFound'
import { gsap, prefersReducedMotion } from '../lib/motion'

export default function CaseStudy() {
  const { slug } = useParams()
  const index = PROJECTS.findIndex((p) => p.slug === slug)
  const page = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (index < 0 || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-rise]', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.5 })
      gsap.fromTo(
        '[data-cover]',
        { clipPath: 'inset(18% 8% 18% 8% round 12px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 12px)',
          ease: 'none',
          scrollTrigger: { trigger: '[data-cover]', start: 'top 85%', end: 'top 25%', scrub: true },
        },
      )
      gsap.utils.toArray<HTMLElement>('[data-point]').forEach((el) =>
        gsap.from(el, { opacity: 0, y: 40, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
      )
    }, page)
    return () => ctx.revert()
  }, [index])

  if (index < 0) return <NotFound />
  const p = PROJECTS[index]
  const next = PROJECTS[(index + 1) % PROJECTS.length]
  const look = PROJECT_LOOK[p.slug]
  const nextLook = PROJECT_LOOK[next.slug]

  return (
    <>
      <article ref={page} className="container-xl pt-32 md:pt-40">
        <div className="overflow-hidden">
          <p data-rise className={`font-mono text-[13px] ${look.text}`}>{`{ ${p.kind} }`}</p>
        </div>
        <div className="overflow-hidden mt-4">
          <h1 data-rise className="type-display text-[clamp(4rem,14vw,14rem)] -ml-[0.04em] pb-[0.06em] flex items-center gap-[0.15em]">
            {p.title}
            <Shape kind={look.shape} size={160} className="w-[0.7em] h-[0.7em] shrink-0" />
          </h1>
        </div>

        <div className="mt-10 md:mt-14 grid md:grid-cols-12 gap-x-8 gap-y-10 border-t border-line pt-8">
          <div className="md:col-span-7 space-y-6">
            <div className="overflow-hidden">
              <p data-rise className="type-label text-muted">Input</p>
            </div>
            <div className="overflow-hidden">
              <p data-rise className="font-display font-semibold tracking-[-0.03em] leading-[1.08] text-[clamp(1.75rem,3.4vw,3.2rem)]">
                “{p.input}”
              </p>
            </div>
            <div className="overflow-hidden">
              <p data-rise className={`font-mono text-[clamp(1rem,1.6vw,1.35rem)] ${look.text}`}>→ {p.output}</p>
            </div>
          </div>
          <div className="md:col-span-4 md:col-start-9 space-y-8">
            <div className="overflow-hidden">
              <p data-rise className="text-[17px] leading-relaxed">{p.summary}</p>
            </div>
            <div className="overflow-hidden">
              <div data-rise>
                <p className="type-label text-muted">Built with</p>
                <p className="mt-2 font-mono text-sm leading-relaxed">{p.stack.join(' / ')}</p>
              </div>
            </div>
            <div className="overflow-hidden">
              <div data-rise>
                <ProjectLinks project={p} />
              </div>
            </div>
          </div>
        </div>

        <figure className={`mt-16 md:mt-24 rounded-[1.75rem] p-3 ${look.bg}`}>
          <img
            data-cover
            src={p.image}
            alt={p.imageAlt}
            className="w-full aspect-[16/10] object-cover rounded-2xl bg-night"
          />
        </figure>

        <section className="py-24 md:py-36 grid md:grid-cols-12 gap-8">
          <h2 className="md:col-span-3 type-label text-muted">What I built</h2>
          <ol className="md:col-span-9 space-y-12 md:space-y-16">
            {p.highlights.map((h, i) => (
              <li key={i} data-point className="border-t border-line pt-6 font-display font-medium tracking-[-0.02em] leading-[1.2] text-[clamp(1.4rem,2.4vw,2.2rem)]">
                {h}
              </li>
            ))}
          </ol>
        </section>

        <nav className="border-t border-line py-16 md:py-24" aria-label="Next project">
          <p className="type-label text-muted">Next project</p>
          <TransitionLink
            to={`/work/${next.slug}`}
            className={`group mt-4 inline-flex items-baseline gap-[0.2em] type-display text-[clamp(3.5rem,10vw,10rem)] hover:${nextLook.text} transition-colors`}
          >
            {next.title}
            <span className="inline-block transition-transform duration-500 group-hover:translate-x-[0.15em]">→</span>
          </TransitionLink>
          <p className="mt-4 font-mono text-sm text-muted">“{next.input}”</p>
        </nav>
      </article>
      <Contact />
    </>
  )
}
