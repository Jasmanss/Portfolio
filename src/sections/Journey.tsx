import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ABOUT, EXPERIENCE, NOW, PROJECTS, SKILLS } from '../data/content'
import { PROJECT_LOOK } from '../data/look'
import Shape from '../components/Shapes'
import Playground from '../components/Playground'
import ProjectLinks from '../components/ProjectLinks'
import AskChat from '../components/AskChat'
import { GitHubActivity, LocalTime } from '../components/LiveNow'
import { TransitionLink } from '../components/Transition'
import { gsap, journeyStops, prefersReducedMotion, scrollToTarget, ScrollTrigger } from '../lib/motion'

// Stops on the progress bar, in track order. `work` is an alias so old /#work links land on the first project.
const STOPS = [
  { id: 'hello', label: 'Hello' },
  { id: 'make', label: 'What I make' },
  { id: PROJECTS[0].slug, label: 'Work' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'now', label: 'Now' },
  { id: 'ask', label: 'Ask' },
]

const PLAY_ITEMS = [
  { kind: 'flower' as const, size: 120 },
  { kind: 'ring' as const, size: 150 },
  { kind: 'squiggle' as const, size: 130 },
  { kind: 'asterisk' as const, size: 100 },
  { kind: 'capsule' as const, size: 120 },
  { kind: 'diamond' as const, size: 80 },
  { kind: 'flower' as const, size: 70, colors: ['#A89BFF', '#3CC8F0'] as [string, string] },
]

// Plain words plus stickers: [text, colour class, tilt].
const LINE: (string | [string, string, number])[] = [
  'I build',
  ['client portals', 'bg-lilac', -2],
  'for freelancers,',
  ['an agent', 'bg-orange', 2],
  'that runs my Mac,',
  ['a hair coach', 'bg-pink', -1.5],
  'in your pocket and',
  ['a job tracker', 'bg-sky', 2.5],
  'that follows up.',
]

const CHIP_COLOURS = ['text-green', 'text-pink', 'text-orange', 'text-lilac', 'text-sky', 'text-cream']

function Panel({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} data-panel className={`relative shrink-0 min-h-[100svh] md:h-full overflow-hidden ${className}`}>
      {children}
    </section>
  )
}

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, w) => (
        <span key={w} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom whitespace-nowrap mr-[0.22em] last:mr-0">
          {[...word].map((ch, i) => (
            <span key={i} data-char className="inline-block">
              {ch}
            </span>
          ))}
        </span>
      ))}
    </>
  )
}

// The home page as one long sideways trip: scroll down, the world slides left.
// On phones and with reduced motion it simply stacks vertically.
export default function Journey() {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useLayoutEffect(() => {
    const el = root.current
    const rail = track.current
    if (!el || !rail) return
    const firstVisit = !sessionStorage.getItem('js-loaded')
    const mm = gsap.matchMedia()

    // Intro: letters rise, runs in every layout.
    const intro = gsap.context(() => {
      if (prefersReducedMotion()) return
      gsap.from('[data-char]', { yPercent: 115, rotate: 12, duration: 1.1, ease: 'expo.out', stagger: 0.03, delay: firstVisit ? 1.6 : 0.25 })
      gsap.from('[data-hello-fade]', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: firstVisit ? 2 : 0.6 })
    }, el)

    mm.add(
      { wide: '(min-width: 768px) and (prefers-reduced-motion: no-preference)', narrow: '(max-width: 767px) and (prefers-reduced-motion: no-preference)' },
      (ctx) => {
        const { wide } = ctx.conditions as { wide: boolean }
        const panels = gsap.utils.toArray<HTMLElement>('[data-panel]', el)

        if (!wide) {
          // Vertical stack: plain scroll-in reveals.
          gsap.utils.toArray<HTMLElement>('[data-enter]', el).forEach((item) =>
            gsap.from(item, { y: 60, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 88%' } }),
          )
          panels.forEach((p) => journeyStops.set(p.id, () => p.getBoundingClientRect().top + window.scrollY))
          journeyStops.set('work', journeyStops.get(PROJECTS[0].slug)!)
          return
        }

        const distance = () => rail.scrollWidth - window.innerWidth
        const slide = gsap.to(rail, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            pin: true,
            scrub: 1,
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              gsap.set(bar.current, { scaleX: self.progress })
              const x = self.progress * distance() + window.innerWidth / 2
              const idx = STOPS.reduce((best, s, i) => {
                const p = document.getElementById(s.id)
                return p && p.offsetLeft <= x ? i : best
              }, 0)
              setActive(idx)
            },
          },
        })
        const st = slide.scrollTrigger!

        // Each stop maps to the scroll position that puts its panel at the left edge.
        panels.forEach((p) =>
          journeyStops.set(p.id, () => st.start + (Math.min(p.offsetLeft, distance()) / distance()) * (st.end - st.start)),
        )
        journeyStops.set('work', journeyStops.get(PROJECTS[0].slug)!)

        // Things arrive as their panel slides in.
        gsap.utils.toArray<HTMLElement>('[data-enter]', el).forEach((item, i) =>
          gsap.from(item, {
            y: 90,
            rotate: i % 2 ? 4 : -4,
            opacity: 0,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: item, containerAnimation: slide, start: 'left 88%' },
          }),
        )
        // Big shapes spin with the journey.
        gsap.utils.toArray<HTMLElement>('[data-spin]', el).forEach((s) =>
          gsap.to(s, {
            rotate: 220,
            ease: 'none',
            scrollTrigger: { trigger: s, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
          }),
        )
        // The sentence lights up and its stickers slap on as it crosses the screen.
        const make = el.querySelector('#make')
        const words = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: make, containerAnimation: slide, start: 'left 60%', end: 'right 95%', scrub: 0.6 },
        })
        gsap.utils.toArray<HTMLElement>('[data-bit]', make).forEach((bit) => {
          words.fromTo(bit, { opacity: 0.12 }, { opacity: 1, duration: 0.4 })
          const sticker = bit.querySelector('[data-sticker]')
          if (sticker) {
            words
              .fromTo(sticker, { scaleX: 0, rotate: 0 }, { scaleX: 1, rotate: Number(bit.dataset.tilt), duration: 0.5, ease: 'back.out(2)' }, '<')
              .fromTo(bit.querySelector('[data-label]'), { color: '#FFF7E0' }, { color: '#0D0E0C', duration: 0.2 }, '<0.2')
          }
        })

        return () => {
          journeyStops.clear()
        }
      },
    )

    // Layout shifts (fonts, images) move the stops; recompute once everything has loaded.
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      intro.revert()
      mm.revert()
      journeyStops.clear()
    }
  }, [])

  return (
    <div ref={root} className="relative md:h-[100svh] md:overflow-hidden">
      <div ref={track} className="flex flex-col md:flex-row md:h-full md:w-max">
        {/* 1. Hello: the name, with shapes you can throw around behind it. */}
        <Panel id="hello" className="w-full md:w-screen">
          <Playground items={PLAY_ITEMS} className="absolute inset-0" />
          <div className="pointer-events-none relative z-10 container-xl h-full min-h-[100svh] flex flex-col justify-center pt-20 pb-24">
            <p data-hello-fade className="w-fit sticker bg-pink -rotate-3 text-xl md:text-2xl font-display font-semibold">
              hi, I’m
            </p>
            <h1 className="mt-4 type-display text-[clamp(4.5rem,14vw,14rem)]">
              <span className="block">
                <Words text="Jasman" />
              </span>
              <span className="block md:pl-[10vw]">
                <Words text="builds things" />
              </span>
            </h1>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
              <p data-hello-fade className="brace max-w-sm">
                CS + AI at Oakland University, software engineering intern at Motherson. Psst, the shapes are throwable.
              </p>
              <p data-hello-fade className="font-mono text-sm text-green hidden md:block">
                keep scrolling, the page moves this way →
              </p>
            </div>
          </div>
        </Panel>

        {/* 2. The one-sentence pitch. */}
        <Panel id="make" className="w-full md:w-[115vw] flex items-center">
          <div className="container-xl md:max-w-none md:px-[8vw] py-24">
            <p className="brace mb-8">what I make</p>
            <p className="type-display leading-[1.12] text-[clamp(2.6rem,6.4vw,7rem)] md:max-w-[22ch]">
              {LINE.map((part, i) =>
                typeof part === 'string' ? (
                  <span key={i} data-bit>
                    {part}{' '}
                  </span>
                ) : (
                  <span key={i} data-bit data-tilt={part[2]} className="relative inline-block mr-[0.25em] my-[0.06em]">
                    <span data-sticker className={`sticker-paper absolute inset-0 origin-left ${part[1]}`} aria-hidden />
                    <span data-label className="relative px-[0.18em] text-night">
                      {part[0]}
                    </span>
                  </span>
                ),
              )}
            </p>
          </div>
          <div data-spin className="absolute right-[6%] top-[12%] hidden md:block">
            <Shape kind="capsule" size={160} />
          </div>
        </Panel>

        {/* 3. One full-colour scene per project. */}
        {PROJECTS.map((p, i) => {
          const look = PROJECT_LOOK[p.slug]
          return (
            <Panel key={p.slug} id={p.slug} className={`w-full md:w-screen text-night ${look.bg}`}>
              <div data-spin className="absolute -right-24 -bottom-24 opacity-25 md:opacity-30">
                <Shape kind={look.shape} size={520} colors={['#FFFFFF', look.hex]} />
              </div>
              <div className="relative container-xl md:max-w-none md:px-[6vw] h-full min-h-[100svh] grid md:grid-cols-12 gap-10 items-center pt-24 pb-28">
                <div className="md:col-span-6">
                  <p data-enter className="font-mono text-[13px] text-night/70">
                    {`{ project ${String(i + 1).padStart(2, '0')} of ${String(PROJECTS.length).padStart(2, '0')} · ${p.kind} }`}
                  </p>
                  <h2 data-enter className="mt-4 type-display text-[clamp(4rem,10vw,11rem)]">
                    {p.title}
                  </h2>
                  <p data-enter className="mt-6 font-display font-semibold text-[clamp(1.4rem,2.2vw,2.1rem)] leading-tight max-w-xl">
                    “{p.input}”
                  </p>
                  <p data-enter className="mt-3 font-mono text-[15px]">→ {p.output}</p>
                  <div data-enter className="mt-8 flex flex-wrap items-center gap-5">
                    <TransitionLink to={`/work/${p.slug}`} className="pill border-night text-night hover:bg-night hover:text-cream">
                      Explore {p.title} →
                    </TransitionLink>
                    <ProjectLinks project={p} className="[&_a]:text-night" />
                  </div>
                </div>
                <TransitionLink
                  to={`/work/${p.slug}`}
                  data-enter
                  data-cursor="view"
                  data-cursor-label="Open"
                  data-cursor-color="#FFF7E0"
                  aria-label={`${p.title} case study`}
                  className="md:col-span-6 block"
                >
                  <div className={`rounded-[2rem] bg-night p-3 shadow-[0_30px_60px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out hover:rotate-0 ${i % 2 ? 'rotate-3' : '-rotate-3'}`}>
                    <img src={p.image} alt={p.imageAlt} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-[1.4rem]" />
                  </div>
                </TransitionLink>
              </div>
            </Panel>
          )
        })}

        {/* 4. Day jobs. */}
        <Panel id="jobs" className="w-full md:w-[max(100vw,1400px)]">
          <div className="container-xl md:max-w-none md:px-[6vw] h-full min-h-[100svh] flex flex-col justify-center pt-24 pb-28">
            <p className="brace">where I work right now</p>
            <h2 className="mt-3 type-display text-[clamp(3.5rem,8vw,8rem)]">
              Day <span className="sticker bg-sky rotate-2 inline-block">jobs</span>
            </h2>
            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {EXPERIENCE.map((e, i) => (
                <article key={e.org} data-enter className="rounded-[2rem] bg-[#161714] border border-line p-7 md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={`sticker text-lg font-display font-bold ${i ? 'bg-lilac rotate-2' : 'bg-orange -rotate-2'}`}>{e.org}</span>
                    <span className="font-mono text-[12px] text-muted">
                      {e.time} · {e.place}
                    </span>
                  </div>
                  <h3 className="mt-5 type-display text-[clamp(1.8rem,2.6vw,2.6rem)]">{e.role}</h3>
                  <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-cream/85">
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
            <ul data-enter className="mt-8 flex flex-wrap gap-2">
              {SKILLS.flatMap((s) => s.items).map((item, i) => (
                <li key={item} className={`rounded-full border border-line bg-[#161714] px-3.5 py-1.5 font-mono text-[12px] ${CHIP_COLOURS[i % CHIP_COLOURS.length]}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* 5. Right now: live time, status, GitHub. */}
        <Panel id="now" className="w-full md:w-screen bg-cream text-night">
          <div className="container-xl md:max-w-none md:px-[6vw] h-full min-h-[100svh] grid md:grid-cols-12 gap-10 content-center pt-24 pb-28">
            <div className="md:col-span-7">
              <p className="font-mono text-[12px] text-night/60">{'{ live from Michigan }'}</p>
              <h2 className="mt-3 type-display text-[clamp(3.5rem,8vw,8rem)]">
                Right <span className="sticker bg-green -rotate-2 inline-block">now</span>
              </h2>
              <p data-enter className="mt-6 font-mono text-[15px]">
                <LocalTime />
              </p>
              <dl data-enter className="mt-8 space-y-5">
                <div>
                  <dt className="font-mono text-[12px] text-night/60">Building</dt>
                  <dd className="font-display font-semibold text-[clamp(1.5rem,2.4vw,2.2rem)] leading-tight">{NOW.building}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[12px] text-night/60">Thinking about</dt>
                  <dd className="font-display font-semibold text-[clamp(1.5rem,2.4vw,2.2rem)] leading-tight">{NOW.learning}</dd>
                </div>
              </dl>
              <p data-enter className="mt-8 max-w-xl text-night/75 leading-relaxed">
                {ABOUT}
              </p>
            </div>
            <div data-enter className="md:col-span-5 rounded-[2rem] bg-night/[0.06] p-6 md:p-8 self-center">
              <p className="font-mono text-[12px] text-night/60 mb-4">Latest on GitHub</p>
              <GitHubActivity />
            </div>
          </div>
        </Panel>

        {/* 6. Ask my portfolio. */}
        <Panel id="ask" className="w-full md:w-screen">
          <div className="container-xl md:max-w-none md:px-[6vw] h-full min-h-[100svh] grid md:grid-cols-12 gap-10 items-center pt-24 pb-28">
            <div className="md:col-span-5">
              <p className="brace">powered by Claude</p>
              <h2 className="mt-3 type-display text-[clamp(3.5rem,7vw,7rem)]">
                Ask my portfolio <span className="sticker bg-orange rotate-2 inline-block">anything</span>
              </h2>
              <p className="mt-6 text-cream/75 max-w-md leading-relaxed">
                Recruiter in a hurry? Ask what you’d ask in an interview. It only knows what’s on this site, so it won’t make things up.
              </p>
            </div>
            <div data-enter className="md:col-span-7 h-[62svh]">
              <AskChat />
            </div>
          </div>
        </Panel>
      </div>

      {/* Progress rail with clickable stops (wide screens only). */}
      <nav aria-label="Journey stops" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden md:block mix-blend-difference text-cream">
        <div className="container-xl md:max-w-none md:px-[6vw] pb-5">
          <div className="h-[3px] rounded-full bg-cream/20 overflow-hidden">
            <div ref={bar} className="h-full origin-left scale-x-0 bg-cream" />
          </div>
          <ol className="mt-3 flex justify-between">
            {STOPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToTarget(`#${s.id}`)}
                  className={`pointer-events-auto font-mono text-[11px] uppercase tracking-[0.14em] transition-opacity ${i === active ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </div>
  )
}
