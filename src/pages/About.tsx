import { useLayoutEffect, useRef } from 'react'
import { ABOUT, EXPERIENCE, LINKS, NOW, SKILLS } from '../data/content'
import Scramble from '../components/Scramble'
import AskChat from '../components/AskChat'
import Signature from '../components/Signature'
import { GitHubActivity, LocalTime } from '../components/LiveNow'
import { gsap, prefersReducedMotion } from '../lib/motion'

// A section label with a rule, like a chapter marker on a spec sheet.
function Label({ n, children }: { n: string; children: string }) {
  return (
    <p className="flex items-center gap-4 text-dim">
      <span className="text-flame">{n}</span>
      {children}
      <span className="h-px flex-1 bg-line" />
    </p>
  )
}

export default function About() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }),
      )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <main ref={root} className="px-5 pb-16 pt-24 md:px-[9vw] md:pt-32">
      <p className="text-dim">
        <Scramble text="About — Jasman Sidhu, Sterling Heights, MI" />
      </p>
      <h1 className="mt-6 max-w-[22ch] type-cond text-[clamp(3rem,7vw,7rem)]">
        <Scramble text="I build things that hand people back something useful." speed={18} />
      </h1>
      <p data-reveal className="mt-10 max-w-[70ch] text-[clamp(13px,1.2vw,16px)] normal-case leading-relaxed tracking-normal text-bone/85">
        {ABOUT}
      </p>

      <section className="mt-24" aria-label="Experience">
        <Label n="01">Experience</Label>
        {EXPERIENCE.map((j) => (
          <div key={j.org} data-reveal className="grid gap-2 border-b border-line py-6 md:grid-cols-[1fr_1fr_1fr]">
            <p>{j.org}</p>
            <p className="text-bone/80">{j.role}</p>
            <p className="text-dim md:text-right">{j.time}</p>
          </div>
        ))}
      </section>

      <section className="mt-24" aria-label="Skills">
        <Label n="02">Toolbox</Label>
        <div data-reveal className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-6">
          {SKILLS.map((g) => (
            <div key={g.group}>
              <p className="mb-2 text-dim">{g.group}</p>
              {g.items.map((i) => (
                <p key={i}>{i}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24 grid gap-12 md:grid-cols-2" aria-label="Right now">
        <div data-reveal>
          <Label n="03">Right now</Label>
          <dl className="mt-6 grid grid-cols-[110px_1fr] gap-y-3">
            <dt className="text-dim">Local</dt>
            <dd>
              <LocalTime />
            </dd>
            <dt className="text-dim">Building</dt>
            <dd>{NOW.building}</dd>
            <dt className="text-dim">Thinking</dt>
            <dd>{NOW.learning}</dd>
          </dl>
        </div>
        <div data-reveal>
          <Label n="04">Latest commits</Label>
          <div className="mt-6">
            <GitHubActivity />
          </div>
        </div>
      </section>

      <section className="mt-24" aria-label="Ask my portfolio">
        <Label n="05">Ask my portfolio</Label>
        <div data-reveal className="mt-6 h-[360px]">
          <AskChat />
        </div>
      </section>

      <section className="mt-24" aria-label="Contact">
        <Label n="06">Contact</Label>
        <div data-reveal className="mt-8 flex flex-wrap items-end justify-between gap-10">
          <div>
            <p className="text-dim">Open to internships, freelance work and collaborations</p>
            <a href={`mailto:${LINKS.email}`} className="mt-3 block break-all type-cond text-[clamp(2rem,5vw,5rem)] normal-case hover:text-flame">
              {LINKS.email}
            </a>
            <p className="mt-5 flex gap-6">
              {[
                ['GitHub', LINKS.github],
                ['LinkedIn', LINKS.linkedin],
                ['Resume', LINKS.resume],
              ].map(([l, h]) => (
                <a key={l} href={h} target="_blank" rel="noreferrer" className="hover:text-flame">
                  <Scramble text={`${l} ↗`} hover />
                </a>
              ))}
            </p>
          </div>
          <Signature auto className="w-[min(340px,70vw)] text-bone" />
        </div>
      </section>

      <p className="mt-24 flex justify-between border-t border-line pt-5 text-dim">
        <span>© {new Date().getFullYear()} Jasman Sidhu</span>
        <span>Built with React, GSAP and a candle</span>
      </p>
    </main>
  )
}
