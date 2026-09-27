import { useLayoutEffect, useRef } from 'react'
import { EXPERIENCE, SKILLS } from '../data/content'
import { gsap, prefersReducedMotion } from '../lib/motion'

const STICKERS = ['bg-orange', 'bg-lilac']
const CHIP_COLOURS = ['text-green', 'text-pink', 'text-orange', 'text-lilac', 'text-sky', 'text-cream']

export default function Experience() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-job]').forEach((card, i) =>
        gsap.from(card, {
          y: 100,
          rotate: i % 2 ? 3 : -3,
          opacity: 0,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: card, start: 'top 85%' },
        }),
      )
      gsap.from('[data-chip]', {
        scale: 0,
        rotate: () => gsap.utils.random(-20, 20),
        duration: 0.6,
        ease: 'back.out(2.2)',
        stagger: 0.02,
        scrollTrigger: { trigger: '[data-chips]', start: 'top 85%' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="experience" ref={root} className="container-xl py-28 md:py-40 border-t border-line">
      <p className="brace">where I work right now</p>
      <h2 className="mt-4 type-display text-[clamp(3.5rem,10vw,10rem)] mb-12 md:mb-16">
        Day <span className="sticker bg-sky rotate-2 inline-block">jobs</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {EXPERIENCE.map((e, i) => (
          <article key={e.org} data-job className="rounded-[2rem] bg-[#161714] border border-line p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`sticker text-lg font-display font-bold ${STICKERS[i % STICKERS.length]} ${i % 2 ? 'rotate-2' : '-rotate-2'}`}>
                {e.org}
              </span>
              <span className="font-mono text-[12px] text-muted">
                {e.time} · {e.place}
              </span>
            </div>
            <h3 className="mt-6 type-display text-[clamp(2rem,3.4vw,3rem)]">{e.role}</h3>
            <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-cream/85">
              {e.bullets.map((b, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-green" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-20">
        <p className="brace">tools I reach for</p>
        <ul data-chips className="mt-6 flex flex-wrap gap-2.5">
          {SKILLS.flatMap((s) => s.items).map((item, i) => (
            <li
              key={item}
              data-chip
              className={`rounded-full border border-line bg-[#161714] px-4 py-2 font-mono text-[13px] ${CHIP_COLOURS[i % CHIP_COLOURS.length]}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
