import { useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ENTRIES, pad } from '../data/entries'
import { TransitionLink } from '../components/Transition'
import { gsap, prefersReducedMotion } from '../lib/motion'
import NotFound from './NotFound'

// One project: the name huge over its still, the facts in a quiet grid, then the notes.
export default function Entry() {
  const { slug } = useParams()
  const index = ENTRIES.findIndex((e) => e.slug === slug)
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (index < 0 || !root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-title] > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 0.2 })
      gsap.fromTo('[data-cover]', { clipPath: 'inset(12% 8% 0% 8% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: '[data-cover]', start: 'top 90%', end: 'top 20%', scrub: true } })
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
      )
    }, root)
    return () => ctx.revert()
  }, [index])

  if (index < 0) return <NotFound />
  const e = ENTRIES[index]
  const next = ENTRIES[(index + 1) % ENTRIES.length]

  return (
    <main ref={root} key={e.slug} className="px-5 pt-5">
      <div className="flex justify-between text-[12px]">
        <TransitionLink to="/#work" label="Jasman Sidhu" className="hover:text-ember">
          ← Back
        </TransitionLink>
        <span className="mr-[280px] hidden text-ash md:block">
          ({pad(index + 1)}/{pad(ENTRIES.length)})
        </span>
      </div>

      <h1 data-title className="mt-[18vh] overflow-hidden text-[clamp(4rem,14vw,15rem)] font-medium leading-[0.85] tracking-[-0.05em]">
        <span className="inline-block">{e.name}</span>
        <span className="em inline-block text-ember">.</span>
      </h1>
      <div className="mt-8 grid gap-8 border-t border-line pt-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <p className="text-[clamp(1.3rem,2vw,1.9rem)] leading-tight tracking-[-0.02em]">
          <span className="em">{e.tagline}</span>
        </p>
        {[
          ['Role', e.role],
          ['Type', `${e.type} · ${e.platform}`],
          ['Stack', e.stack.join(', ')],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="type-label">{k}</p>
            <p className="mt-1 text-snow/85">{v}</p>
          </div>
        ))}
      </div>

      <img data-cover src={e.still} alt="" className="mt-16 aspect-[16/9] w-full rounded-[24px] object-cover" />

      <section className="grid gap-12 py-28 md:grid-cols-[1fr_1.4fr]">
        <div data-reveal>
          <p className="type-label">Overview</p>
          <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-snow/85">{e.summary}</p>
          {e.links.length > 0 && (
            <p className="mt-6 flex gap-5 text-[13px] uppercase">
              {e.links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-ember">
                  {l.label} ↗
                </a>
              ))}
            </p>
          )}
        </div>
        <div>
          {e.input && (
            <div data-reveal className="mb-16">
              <p className="type-label">You hand it</p>
              <p className="mt-2 text-[clamp(1.6rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.03em] text-ash">“{e.input}”</p>
              <p className="mt-6 type-label">It hands back</p>
              <p className="mt-2 text-[clamp(1.6rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.03em]">
                <span className="em text-ember">{e.output}</span>
              </p>
            </div>
          )}
          <ol>
            {e.notes.map((n, i) => (
              <li key={n} data-reveal className="grid grid-cols-[60px_1fr] gap-4 border-t border-line py-5 text-[15px] leading-relaxed text-snow/85">
                <span className="text-ash">({pad(i + 1)})</span>
                {n}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <TransitionLink
        to={`/work/${next.slug}`}
        label={next.name}
        data-cursor="view"
        data-cursor-label="Next"
        data-cursor-color="#FF3B1F"
        className="group block border-t border-line py-16"
      >
        <p className="type-label">Next project</p>
        <p className="mt-4 flex items-end justify-between gap-6 text-[clamp(3rem,10vw,10rem)] font-medium leading-[0.85] tracking-[-0.05em] transition-colors group-hover:text-ember">
          {next.name}
          <img src={next.still} alt="" className="hidden w-[min(320px,24vw)] rounded-[14px] opacity-60 transition-opacity group-hover:opacity-100 md:block" />
        </p>
      </TransitionLink>
    </main>
  )
}
