import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ABOUT, EXPERIENCE, LINKS, SKILLS } from '../data/content'
import { ENTRIES } from '../data/entries'
import Hands from '../components/Hands'
import AskChat from '../components/AskChat'
import Signature from '../components/Signature'
import { TransitionLink } from '../components/Transition'
import { gsap, prefersReducedMotion, scrollToTarget, ScrollTrigger } from '../lib/motion'

const WORK = ENTRIES.slice(0, 4)
const GALLERY = [...ENTRIES.map((e) => e.still), '/portlkit.jpg', '/callback.jpg', '/hairstyl.jpg', '/jasman1.jpg', ...ENTRIES.slice(0, 3).map((e) => e.still)]

// "Jasman Sidhu." — sans first name, italic serif surname, ember full stop.
export function Name({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-end justify-between gap-[0.2em] leading-[0.8] tracking-[-0.045em] ${className}`}>
      <span className="font-medium">Jasman</span>
      <span className="em tracking-[-0.02em]">
        Sidhu<span className="text-ember">.</span>
      </span>
    </p>
  )
}

function Counter({ n }: { n: string }) {
  return <span className="type-label">({n})</span>
}

function SectionHead({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3">
      <span className="type-label">{children}</span>
      <Counter n={n} />
    </div>
  )
}

export default function Home() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<string | null>(SKILLS[0].group)
  const [section, setSection] = useState('')
  const [pct, setPct] = useState(0)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = prefersReducedMotion()
    let unfollow = () => {}
    const ctx = gsap.context(() => {
      // Hero: the blobs drift on their own and follow the cursor a little.
      if (!reduce) {
        gsap.utils.toArray<HTMLElement>('[data-blob]').forEach((b, i) =>
          gsap.to(b, { xPercent: i % 2 ? 22 : -18, yPercent: i % 2 ? -14 : 16, scale: 1.15, duration: 6 + i * 2, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        )
        const bx = gsap.quickTo('[data-blobs]', 'x', { duration: 1.6, ease: 'power3' })
        const by = gsap.quickTo('[data-blobs]', 'y', { duration: 1.6, ease: 'power3' })
        const move = (e: PointerEvent) => {
          bx((e.clientX / innerWidth - 0.5) * 120)
          by((e.clientY / innerHeight - 0.5) * 80)
        }
        window.addEventListener('pointermove', move)
        gsap.from('[data-name] span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.1, delay: 0.2 })
        gsap.from('[data-hero-fade]', { opacity: 0, y: 12, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.7 })
        // Scrolling away: the name splits and the light dims.
        gsap.to('[data-name] > span:first-child', { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to('[data-name] > span:last-child', { xPercent: 30, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to('[data-blobs]', { opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })
        unfollow = () => window.removeEventListener('pointermove', move)
      }

      // The edge labels track which section you're in and how far down the page you are.
      gsap.utils.toArray<HTMLElement>('[data-section]').forEach((sec) =>
        ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => setSection(s.isActive ? sec.dataset.section! : '') }),
      )
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => setPct(Math.round(s.progress * 100)) })

      // Words and blocks rise in.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((r) =>
        gsap.from(r, { y: reduce ? 0 : 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 88%' } }),
      )

      // Work: the list follows the scroll and a red ribbon draws itself across.
      const items = gsap.utils.toArray<HTMLElement>('[data-work-item]')
      items.forEach((it, i) =>
        gsap.timeline({
          scrollTrigger: { trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setActive(i) },
        }),
      )
      const ribbon = el.querySelector<SVGPathElement>('[data-ribbon]')
      if (ribbon) {
        const len = ribbon.getTotalLength()
        gsap.set(ribbon, { strokeDasharray: len, strokeDashoffset: reduce ? 0 : len })
        if (!reduce) gsap.to(ribbon, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-work]', start: 'top 70%', end: 'bottom 30%', scrub: 1 } })
      }

      // Gallery: fly through a field of screens.
      if (!reduce) {
        const cards = gsap.utils.toArray<HTMLElement>('[data-fly]')
        const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-gallery]', start: 'top top', end: '+=2400', pin: true, scrub: 1 } })
        cards.forEach((c, i) => {
          tl.fromTo(c, { z: -2600, opacity: 0 }, { z: 900, opacity: 1, ease: 'none', duration: 1 }, i * 0.18)
          tl.to(c, { opacity: 0, duration: 0.15, ease: 'none' }, i * 0.18 + 0.85)
        })
        tl.from('[data-gallery-line]', { opacity: 0, y: 20, duration: 0.3 }, 0)
      }

      // Contact: the white sheet rises and squares off.
      if (!reduce) {
        gsap.fromTo(
          '[data-sheet]',
          { scale: 0.92, borderTopLeftRadius: 80, borderTopRightRadius: 80 },
          { scale: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, ease: 'none', scrollTrigger: { trigger: '[data-sheet]', start: 'top bottom', end: 'top 30%', scrub: true } },
        )
      }
    }, el)
    return () => {
      unfollow()
      ctx.revert()
    }
  }, [])

  return (
    <main ref={root}>
      {/* Edge labels: scroll progress on the left, the current section on the right */}
      <p aria-hidden className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 type-label text-snow mix-blend-difference md:block">
        ({String(pct).padStart(2, '0')})
      </p>
      <p aria-hidden className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 type-label text-snow mix-blend-difference md:block">
        <span key={section} className="animate-fade-up inline-block">
          {section}
        </span>
      </p>
      {/* Hero */}
      <section id="top" data-hero className="relative h-[100svh] overflow-hidden">
        <div data-blobs aria-hidden className="absolute inset-0 blur-[90px]">
          <div data-blob className="absolute left-[18%] top-[-10%] size-[55vw] rounded-full bg-ember opacity-90" />
          <div data-blob className="absolute left-[48%] top-[5%] size-[40vw] rounded-full bg-[#FF8A3D] opacity-70" />
          <div data-blob className="absolute left-[30%] top-[35%] size-[45vw] rounded-full bg-[#1a0604]" />
        </div>
        <div aria-hidden className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-night" />

        <p data-hero-fade className="absolute left-5 top-5 max-w-[260px] text-[12px] leading-snug text-snow/85">
          Jasman Sidhu, software engineer, building useful products through code, AI and a lot of iteration.
        </p>

        <div className="absolute inset-x-5 bottom-8">
          <div data-name className="overflow-hidden">
            <Name className="text-[clamp(4rem,15.5vw,17rem)]" />
          </div>
          <div data-hero-fade className="mt-5 flex items-center justify-between border-t border-snow/30 pt-3 text-[12px] text-snow/70">
            <span>Oakland University · CS, AI concentration</span>
            <span className="hidden md:inline">Scroll to explore</span>
            <span>Sterling Heights, MI</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" data-section="About" className="px-5 pb-32 pt-16">
        <SectionHead n="01">About</SectionHead>
        <div className="mt-12 grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-20">
          <div>
            <p data-reveal className="max-w-[18ch] text-[clamp(2rem,4.2vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em]">
              As a <span className="em">software engineer</span>, I build products that take <span className="em">what people have</span> and hand back something useful.
            </p>
            <p data-reveal className="mt-12 max-w-[42ch] text-[14px] leading-relaxed text-snow/75 md:ml-[20%]">
              {ABOUT}
            </p>
          </div>
          <figure data-reveal className="relative overflow-hidden rounded-tl-[120px] rounded-br-[24px]">
            <img src="/jasman1.jpg" alt="A painted portrait of Jasman" className="aspect-[4/5] w-full object-cover grayscale" />
            <div className="absolute inset-0 bg-ember mix-blend-multiply opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
            <figcaption className="absolute bottom-4 left-4 type-label text-snow/80">Self portrait, painted</figcaption>
          </figure>
        </div>
      </section>

      {/* Work */}
      <section id="work" data-section="Projects" data-work className="relative px-5 pb-32">
        <svg aria-hidden viewBox="0 0 1440 1600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <path
            data-ribbon
            d="M-60 180 C 300 120, 520 420, 380 700 S 520 1180, 900 1040 S 1500 760, 1500 1260"
            fill="none"
            stroke="#FF3B1F"
            strokeWidth="70"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative">
          <SectionHead n="02">Selected projects</SectionHead>
          <div className="mt-12 grid gap-10 md:grid-cols-[1.2fr_1fr]">
            <ol>
              {WORK.map((w, i) => (
                <li key={w.slug} data-work-item className="flex h-[30vh] min-h-[160px] items-center">
                  <TransitionLink
                    to={`/work/${w.slug}`}
                    label={w.name}
                    onMouseEnter={() => setActive(i)}
                    data-cursor="view"
                    data-cursor-label="See"
                    data-cursor-color="#FF3B1F"
                    className={`text-[clamp(2.6rem,6vw,6.5rem)] font-medium leading-none tracking-[-0.04em] transition-colors duration-500 ${
                      active === i ? 'text-snow' : 'text-snow/20'
                    }`}
                  >
                    {w.name}
                    <span className="em ml-3 text-[0.45em] text-ash">{w.platform}</span>
                  </TransitionLink>
                </li>
              ))}
            </ol>
            <div className="hidden md:block">
              <div className="sticky top-[20vh]">
                <div className="flex justify-between type-label">
                  <span>{WORK[active].type}</span>
                  <span>Preview</span>
                </div>
                <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[18px]">
                  {WORK.map((w, i) => (
                    <img
                      key={w.slug}
                      src={w.still}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ${active === i ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
                    />
                  ))}
                </div>
                <p key={WORK[active].slug} className="animate-fade-up mt-4 max-w-[40ch] text-snow/80">
                  {WORK[active].tagline} <span className="text-ash">{WORK[active].summary}</span>
                </p>
                <TransitionLink to={`/work/${WORK[active].slug}`} label={WORK[active].name} className="mt-4 inline-flex items-center gap-2 type-label text-snow hover:text-ember">
                  See project <span aria-hidden>→</span>
                </TransitionLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery fly-through */}
      <section id="gallery" data-section="Gallery" data-gallery className="relative h-[100svh] overflow-hidden [perspective:900px]">
        <div className="absolute inset-0 [transform-style:preserve-3d]">
          {GALLERY.map((src, i) => {
            const angle = i * 2.4
            const r = 26 + (i % 3) * 8
            return (
              <img
                key={i}
                data-fly
                src={src}
                alt=""
                className="absolute left-1/2 top-1/2 w-[clamp(140px,16vw,260px)] rounded-[10px] object-cover shadow-2xl"
                style={{ aspectRatio: '16/10', marginLeft: `${Math.cos(angle) * r}vw`, marginTop: `${Math.sin(angle) * r * 0.6}vh`, translate: '-50% -50%' }}
              />
            )
          })}
        </div>
        <p data-gallery-line className="absolute left-1/2 top-1/2 w-[min(520px,85vw)] -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(1.4rem,2.2vw,2.1rem)] leading-tight tracking-[-0.02em]">
          Every project is a chance to <span className="em">learn</span>, <span className="em">ship</span> and push my limits.
        </p>
      </section>

      {/* Skills */}
      <section id="skills" data-section="Skills" className="px-5 pb-32 pt-24">
        <SectionHead n="03">Skills</SectionHead>
        <div className="mt-12 grid gap-12 md:grid-cols-2">
          <div data-reveal>
            <p className="max-w-[26ch] text-[clamp(1.2rem,1.8vw,1.7rem)] font-bold uppercase leading-[1.05] tracking-[-0.01em]">
              Computer science student at Oakland University, concentrating in AI, shipping products people actually use.
            </p>
            <a href={`mailto:${LINKS.email}`} className="mt-6 inline-block type-label text-snow hover:text-ember">
              Contact me ●
            </a>
            <svg viewBox="0 0 120 60" aria-hidden className="mt-16 w-[110px] text-ember">
              <path d="M0 30h104M78 6l26 24-26 24" fill="none" stroke="currentColor" strokeWidth="9" />
            </svg>
          </div>
          <ul data-reveal>
            {SKILLS.map((g) => {
              const isOpen = open === g.group
              return (
                <li key={g.group} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : g.group)}
                    className="flex w-full items-center justify-between py-4 text-left text-[clamp(1.1rem,1.6vw,1.5rem)] tracking-[-0.02em] hover:text-ember"
                  >
                    {g.group}
                    <span className={`text-ash transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-500 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <p className="overflow-hidden text-snow/70">
                      <span className="block pb-4">{g.items.join(' · ')}</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Experience table */}
        <div data-reveal className="mt-28">
          <p className="type-label mb-3">Experience & education</p>
          {[
            ...EXPERIENCE.map((j) => [j.org, j.role, j.place, j.time]),
            ['Oakland University', 'B.S. Computer Science, AI concentration', 'Rochester, MI', 'Graduating May 2027'],
          ].map(([a, b, c, d]) => (
            <div key={a} className="grid grid-cols-2 gap-2 border-t border-line px-2 py-3 text-[13px] transition-colors duration-200 hover:bg-snow hover:text-night md:grid-cols-4">
              <span>{a}</span>
              <span>{b}</span>
              <span className="text-ash">{c}</span>
              <span className="text-ash md:text-right">{d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact sheet */}
      <section id="contact" data-section="Contact" className="px-2 md:px-3">
        <div data-sheet className="origin-bottom overflow-hidden rounded-t-[24px] bg-snow px-5 pb-16 pt-10 text-night md:px-10">
          <div className="flex items-center justify-between">
            <span className="type-label">Contact</span>
            <Counter n="04" />
          </div>
          <h2 className="mt-10 text-[clamp(4rem,12vw,12rem)] font-semibold leading-[0.85] tracking-[-0.05em]">Contact</h2>
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            <div>
              <p className="type-label">Open to internships, freelance work and collaborations</p>
              <a href={`mailto:${LINKS.email}`} className="mt-3 block break-all text-[clamp(1.6rem,3vw,2.8rem)] font-medium tracking-[-0.03em] hover:text-ember">
                {LINKS.email}
              </a>
              <Signature auto className="mt-10 w-[min(320px,70vw)] text-night" />
            </div>
            <div className="h-[340px] rounded-[16px] bg-night text-snow">
              <AskChat />
            </div>
          </div>
        </div>
      </section>

      {/* Footer: the hands */}
      <footer className="relative overflow-hidden px-5 pt-6">
        <div className="relative z-10 grid grid-cols-3 text-[12px] uppercase">
          <p>
            {LINKS.email}
            <br />© {new Date().getFullYear()}
          </p>
          <p className="flex flex-col">
            <a href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-ember">
              GitHub
            </a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="hover:text-ember">
              LinkedIn
            </a>
            <a href={LINKS.resume} target="_blank" rel="noreferrer" className="hover:text-ember">
              Resume
            </a>
          </p>
          <p className="flex flex-col items-end">
            {[
              ['Work', '#work'],
              ['About', '#about'],
              ['Contact', '#contact'],
            ].map(([l, h]) => (
              <button key={l} type="button" onClick={() => scrollToTarget(h)} className="uppercase hover:text-ember">
                {l}
              </button>
            ))}
          </p>
        </div>
        <Hands className="relative -mt-4 block h-[min(52vh,520px)] w-full" />
        <Name className="relative z-10 -mt-[6vw] pb-4 text-[clamp(4rem,15.5vw,17rem)]" />
      </footer>
    </main>
  )
}
