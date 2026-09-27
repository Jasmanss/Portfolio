import { useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ENTRIES, pad } from '../data/entries'
import Scramble from '../components/Scramble'
import { TransitionLink } from '../components/Transition'
import { gsap, prefersReducedMotion } from '../lib/motion'
import NotFound from './NotFound'

// One project, full screen: the footage behind, the name huge in the corner, the facts in mono.
export default function Entry() {
  const { slug } = useParams()
  const index = ENTRIES.findIndex((e) => e.slug === slug)
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (index < 0 || !root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-still]', { scale: 1.15 }, { scale: 1, duration: 2.4, ease: 'expo.out' })
      gsap.to('[data-still]', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.from('[data-title]', { yPercent: 105, duration: 1.2, ease: 'expo.out', delay: 0.3 })
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }),
      )
    }, root)
    return () => ctx.revert()
  }, [index])

  if (index < 0) return <NotFound />
  const e = ENTRIES[index]
  const next = ENTRIES[(index + 1) % ENTRIES.length]
  const facts = [
    ['Role', e.role],
    ['Stack', e.stack.join(', ')],
    ['Type', e.type],
    ['Platform', e.platform],
  ]

  return (
    <main ref={root} key={e.slug}>
      <section data-hero className="relative h-[100svh] overflow-hidden">
        <img data-still src={e.still} alt="" className="animate-flicker absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-void/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-void/40 via-transparent to-void/80" />
        <div className="scanlines absolute inset-0 opacity-50" />

        <TransitionLink to="/" label="/index" className="absolute left-5 top-5 hover:text-flame">
          <Scramble text="Back" hover />
        </TransitionLink>
        <p className="absolute right-5 top-5">
          {pad(index + 1)} — {pad(ENTRIES.length)}
        </p>

        <div className="absolute right-5 top-[16vh] w-[min(520px,calc(100vw-2.5rem))] md:right-[5vw]">
          <p className="type-cond text-[clamp(1.8rem,3vw,2.8rem)]">
            <Scramble text={e.tagline} speed={20} />
          </p>
          <p className="mt-5 max-w-[46ch] text-bone/80">
            <Scramble text={e.summary} speed={6} delay={300} />
          </p>
          {e.links.length > 0 && (
            <p className="mt-6 flex gap-6">
              {e.links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-flame">
                  <span className="size-[6px] rounded-full bg-flame" />
                  <Scramble text={`${l.label} ↗`} hover />
                </a>
              ))}
            </p>
          )}
          <dl className="mt-8 grid grid-cols-[90px_1fr] gap-x-4 gap-y-1">
            {facts.map(([k, v], i) => (
              <div key={k} className="contents">
                <dt className="text-dim">{k}</dt>
                <dd>
                  <Scramble text={v} delay={500 + i * 120} speed={10} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <h1 className="absolute bottom-4 left-4 overflow-hidden md:bottom-5 md:left-5">
          <span data-title className="block type-cond text-[clamp(4.5rem,15vw,15rem)]">
            {e.name}
          </span>
        </h1>
        <p className="absolute bottom-5 right-5 hidden items-center gap-3 md:flex">
          Scroll <span className="animate-bounce">↓</span>
        </p>
      </section>

      {e.input && (
        <section className="border-t border-line px-5 py-24 md:px-[5vw] md:py-32">
          <p className="text-dim">Input → output</p>
          <p data-reveal className="mt-6 type-cond text-[clamp(2.2rem,5.5vw,5.5rem)] text-dim">“{e.input}”</p>
          <p data-reveal className="mt-4 type-cond text-[clamp(2.2rem,5.5vw,5.5rem)]">
            <span className="text-flame">→</span> {e.output}
          </p>
        </section>
      )}

      <section className="border-t border-line px-5 py-24 md:px-[5vw] md:py-32">
        <p className="text-dim">Notes</p>
        <ol className="mt-8">
          {e.notes.map((n, i) => (
            <li key={n} data-reveal className="grid gap-3 border-t border-line py-6 md:grid-cols-[120px_1fr]">
              <span className="text-flame">{pad(i + 1)}</span>
              <p className="max-w-[70ch] text-[clamp(13px,1.2vw,16px)] normal-case leading-relaxed tracking-normal text-bone/90">{n}</p>
            </li>
          ))}
        </ol>
      </section>

      <TransitionLink
        to={`/work/${next.slug}`}
        label={`/work/${next.slug}`}
        data-cursor="view"
        data-cursor-label="Next"
        data-cursor-color="#E8E6DF"
        className="group relative block h-[70svh] overflow-hidden border-t border-line"
      >
        <img src={next.still} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 transition-[transform,opacity] duration-[1200ms] ease-out group-hover:scale-100 group-hover:opacity-70" />
        <div className="scanlines absolute inset-0 opacity-50" />
        <p className="absolute left-5 top-5 text-dim">Next project</p>
        <p className="absolute bottom-4 left-4 type-cond text-[clamp(4rem,13vw,13rem)] md:bottom-5 md:left-5">{next.name}</p>
      </TransitionLink>
    </main>
  )
}
