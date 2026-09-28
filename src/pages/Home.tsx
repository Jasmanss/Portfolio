import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ABOUT, EXPERIENCE, LINKS, SKILLS } from '../data/content'
import { ENTRIES } from '../data/entries'
import Hands from '../components/Hands'
import type { HandsControl } from '../components/Hands'
import AskChat from '../components/AskChat'
import { TransitionLink } from '../components/Transition'
import { gsap, prefersReducedMotion, scrollToTarget, ScrollTrigger, SplitText } from '../lib/motion'

const WORK = ENTRIES.slice(0, 4)
const FACTS = [
  { n: 147, suffix: '', label: 'machines off paper' },
  { n: 150, suffix: '+', label: 'TestFlight users' },
  { n: 2, suffix: '', label: 'products live' },
]
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

// The hero's version: the same name, split so it can be built letter by letter, with the full stop
// drawn as a round dot the spark can land on.
function HeroName({ className = '' }: { className?: string }) {
  return (
    <h1 aria-label="Jasman Sidhu" className={`flex items-end justify-between gap-[0.2em] leading-[0.8] tracking-[-0.045em] ${className}`}>
      <span data-first aria-hidden className="whitespace-nowrap font-medium">
        Jasman
      </span>
      <span data-last aria-hidden className="em flex items-baseline whitespace-nowrap tracking-[-0.02em]">
        <span data-last-word>Sidhu</span>
        <span data-period className="ml-[0.03em] inline-block size-[0.13em] rounded-full bg-ember" />
      </span>
    </h1>
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
  // The edge labels only appear once the hero has finished building.
  const [built, setBuilt] = useState(false)
  // The hero's hands start pushed out past the edges and far apart; the scroll brings them in.
  const handsCtl = useRef<HandsControl>({ reach: 0, spread: 1 }).current

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = prefersReducedMotion()
    let unfollow = () => {}
    const ctx = gsap.context(() => {
      // Hero. The ember light drifts on its own and leans toward the cursor.
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
        unfollow = () => window.removeEventListener('pointermove', move)
      }

      // The hero builds itself as you scroll. It starts as one red dot between where two hands will be;
      // the hands arrive and point at it, the name writes itself underneath, the dot drops down to become
      // the name's full stop, and then the light, the words, the numbers and the menu fill in.
      const nav = document.querySelectorAll<HTMLElement>('[data-frame-link]')
      if (reduce) {
        handsCtl.spread = 0
        handsCtl.reach = 0.14
        gsap.set('[data-dot]', { autoAlpha: 0 })
        gsap.set('[data-hint], [data-count]', { autoAlpha: 0 })
        setBuilt(true)
      } else {
        const first = SplitText.create('[data-first]', { type: 'chars', mask: 'chars' })
        const last = SplitText.create('[data-last-word]', { type: 'chars' })
        const intro = SplitText.create('[data-intro]', { type: 'lines', mask: 'lines' })
        const dot = el.querySelector<HTMLElement>('[data-dot]')!
        const home = el.querySelector<HTMLElement>('[data-dot-home]')!
        const period = el.querySelector<HTMLElement>('[data-period]')!
        const countEl = el.querySelector<HTMLElement>('[data-count]')!
        // Where the dot has to travel to land on the full stop, measured from untransformed anchors.
        const trip = () => {
          const a = home.getBoundingClientRect()
          const b = period.getBoundingClientRect()
          return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: b.width / a.width }
        }
        const count = { v: 0 }
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '[data-hero]',
            start: 'top top',
            end: () => `+=${innerHeight * 2.6}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (st) => setBuilt(st.progress > 0.92),
          },
        })
        tl.to(count, { v: 100, duration: 92, onUpdate: () => void (countEl.textContent = `(${String(Math.round(count.v)).padStart(2, '0')})`) }, 0)
          .to('[data-hint]', { autoAlpha: 0, duration: 4 }, 0)
          .to('[data-dot-ring]', { autoAlpha: 0, duration: 3 }, 2)
          // 1. The hands slide in from the edges and point at the dot.
          .to(handsCtl, { spread: 0, duration: 20, ease: 'power2.out' }, 2)
          // 2. "Jasman" rises letter by letter; "Sidhu" writes itself in, left to right.
          .from(first.chars, { yPercent: 110, duration: 7, stagger: 2.6, ease: 'power3.out' }, 20)
          .fromTo('[data-last]', { clipPath: 'inset(-25% 100% -25% -5%)' }, { clipPath: 'inset(-25% -8% -25% -5%)', duration: 18, ease: 'power1.inOut' }, 27)
          .from(last.chars, { yPercent: 35, rotation: -12, autoAlpha: 0, duration: 6, stagger: 2.8, ease: 'power3.out' }, 27)
          // 3. The spark leaves the gap on an arc and lands as the full stop. The hands lean after it.
          .to(dot, { x: () => trip().x, duration: 12, ease: 'power1.inOut' }, 46)
          .to(dot, { y: () => Math.min(0, trip().y) - innerHeight * 0.1, duration: 5, ease: 'power2.out' }, 46)
          .to(dot, { y: () => trip().y, duration: 7, ease: 'power2.in' }, 51)
          .to(dot, { scale: () => trip().scale, duration: 12, ease: 'power1.inOut' }, 46)
          .set(dot, { autoAlpha: 0 }, 58)
          .fromTo(period, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 58)
          .fromTo(period, { scale: 1.6 }, { scale: 1, duration: 3, ease: 'back.out(3)' }, 58)
          .to(handsCtl, { reach: 0.14, duration: 12, ease: 'power1.inOut' }, 46)
          // 4. The ember light blooms behind everything.
          .fromTo('[data-glow]', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 0.85, scale: 1, duration: 22, ease: 'power2.out' }, 57)
          .fromTo('[data-grain]', { autoAlpha: 0 }, { autoAlpha: 0.12, duration: 12 }, 60)
          // 5. Then the words, the menu, the rule and the numbers fill in.
          .from(intro.lines, { yPercent: 110, duration: 8, stagger: 2, ease: 'power3.out' }, 64)
          .from(nav, { yPercent: -140, autoAlpha: 0, duration: 6, stagger: 1.6, ease: 'power3.out' }, 66)
          .fromTo('[data-rule]', { scaleX: 0 }, { scaleX: 1, duration: 12, ease: 'power2.inOut' }, 70)
          .from('[data-row-item]', { yPercent: 110, duration: 6, stagger: 2.4, ease: 'power3.out' }, 74)
          .to('[data-count]', { autoAlpha: 0, duration: 4 }, 93)
          .to({}, { duration: 0 }, 100)
        el.querySelectorAll<HTMLElement>('[data-fact]').forEach((f, i) => {
          const n = { v: 0 }
          tl.to(n, { v: Number(f.dataset.fact), duration: 10, ease: 'power2.out', onUpdate: () => void (f.textContent = String(Math.round(n.v))) }, 77 + i * 2)
        })
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
      <p aria-hidden className={`pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 type-label text-snow mix-blend-difference transition-opacity duration-500 md:block ${built ? 'opacity-100' : 'opacity-0'}`}>
        ({String(pct).padStart(2, '0')})
      </p>
      <p aria-hidden className={`pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 type-label text-snow mix-blend-difference transition-opacity duration-500 md:block ${built ? 'opacity-100' : 'opacity-0'}`}>
        <span key={section} className="animate-fade-up inline-block">
          {section}
        </span>
      </p>
      {/* Hero: built by the scroll, from a single red dot */}
      <section id="top" data-hero className="relative h-[100svh] overflow-hidden">
        <div data-glow aria-hidden className="absolute inset-0">
          <div data-blobs className="absolute inset-0 blur-[90px]">
            <div data-blob className="absolute left-[18%] top-[-10%] size-[55vw] rounded-full bg-ember opacity-90" />
            <div data-blob className="absolute left-[48%] top-[5%] size-[40vw] rounded-full bg-[#FF8A3D] opacity-70" />
            <div data-blob className="absolute left-[30%] top-[35%] size-[45vw] rounded-full bg-[#1a0604]" />
          </div>
        </div>
        <div data-grain aria-hidden className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-night" />

        {/* The hands, pointing at the spark */}
        <Hands control={handsCtl} className="absolute inset-x-0 top-[10vh] z-10 block h-[min(52vh,520px)] w-full" />

        {/* The spark: where the fingertips meet, and later the full stop */}
        <span data-dot-home aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(10vh+min(52vh,520px)*0.46)] size-[18px] -translate-x-1/2 -translate-y-1/2" />
        <span data-dot aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(10vh+min(52vh,520px)*0.46)] z-20 -ml-[9px] -mt-[9px] size-[18px] rounded-full bg-ember shadow-[0_0_24px_4px_rgba(255,59,31,0.55)]">
          <span data-dot-ring className="absolute inset-[-10px] animate-ping rounded-full border border-ember/70" />
        </span>
        <p data-count aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(10vh+min(52vh,520px)*0.46+34px)] z-20 -translate-x-1/2 type-label text-snow/70">
          (00)
        </p>
        <p data-hint aria-hidden className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 type-label">
          Scroll to begin
        </p>

        <p data-intro className="absolute left-5 top-14 z-10 max-w-[260px] text-[12px] leading-snug text-snow/85 md:top-5">
          Jasman Sidhu, software engineer, building useful products through code, AI and a lot of iteration.
        </p>

        <div className="absolute inset-x-5 bottom-8 z-10">
          <HeroName className="text-[13.6vw] md:text-[clamp(4rem,15.5vw,17rem)]" />
          <div data-rule className="mt-5 h-px origin-left bg-snow/30" />
          <div className="mt-3 flex items-start justify-between gap-6 text-[12px] text-snow/70">
            <span className="overflow-hidden">
              <span data-row-item className="block">
                Oakland University · CS, AI concentration
              </span>
            </span>
            <span className="hidden overflow-hidden md:block">
              <span data-row-item className="flex gap-6">
                {FACTS.map((f) => (
                  <span key={f.label}>
                    <span data-fact={f.n} className="text-snow">
                      {f.n}
                    </span>
                    <span className="text-snow">{f.suffix}</span> {f.label}
                  </span>
                ))}
              </span>
            </span>
            <span className="overflow-hidden text-right">
              <span data-row-item className="block">
                Sterling Heights, MI
              </span>
            </span>
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
