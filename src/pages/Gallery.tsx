import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EXPERIENCE, LINKS, NOW, PROJECTS } from '../data/content'
import { medium, PROJECT_LOOK } from '../data/look'
import { GoldFrame, GrandfatherClock, Placard, PictureLamp, Stanchions, Window } from '../components/Museum'
import { GitHubActivity } from '../components/LiveNow'
import AskChat from '../components/AskChat'
import Signature from '../components/Signature'
import { afterIntro, TransitionLink } from '../components/Transition'
import { galleryStops, gsap, prefersReducedMotion, ScrollTrigger } from '../lib/motion'

export const ROOMS = [
  { id: 'foyer', label: 'Foyer' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'study', label: 'Study' },
  { id: 'guestbook', label: 'Guestbook' },
]

// Rooms tell the header which one you're standing in.
export const roomEvents = new EventTarget()

function Room({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} data-room={id} className={`relative shrink-0 md:h-full ${className}`}>
      {children}
    </section>
  )
}

// Engraved heading on the wall.
function WallTitle({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <header data-enter className="text-center">
      <p className="type-caps text-gold/80">{kicker}</p>
      <h2 className="gilt-text mt-2 font-serif text-[clamp(2.6rem,5vw,4.5rem)] italic leading-none">{children}</h2>
    </header>
  )
}

// Hanging cords from the picture rail to the frame's top corners.
function Cords() {
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute bottom-full left-0 h-[clamp(40px,8vh,90px)] w-full">
      <path d="M50 2 L6 100 M50 2 L94 100" stroke="#b8892d" strokeWidth=".6" vectorEffect="non-scaling-stroke" fill="none" />
      <circle cx="50" cy="3" r="2.4" fill="#e9c863" stroke="#6e5114" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// The gallery is one long wall you walk along: scroll down, the house slides by.
// On phones and with reduced motion the rooms simply stack.
export default function Gallery() {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = root.current
    const rail = track.current
    if (!el || !rail) return
    const mm = gsap.matchMedia()
    const rooms = () => gsap.utils.toArray<HTMLElement>('[data-room]', el).filter((r) => r.id)
    // Each painting is a stop too, so /#portlkit walks straight to it.
    const paintings = () => PROJECTS.map((p) => document.getElementById(p.slug)).filter((p): p is HTMLElement => !!p)
    const announce = (id: string) => roomEvents.dispatchEvent(new CustomEvent('room', { detail: id }))

    // Arrival: the name is engraved letter by letter once the curtains part.
    const arrival = gsap.context(() => {
      if (prefersReducedMotion()) return
      gsap.set('[data-letter]', { yPercent: 110, opacity: 0 })
      gsap.set('[data-arrive]', { opacity: 0, y: 20 })
      afterIntro(() => {
        gsap.to('[data-letter]', { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.04 })
        gsap.to('[data-arrive]', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.4 })
      })
      // Drapes breathe.
      gsap.utils.toArray<HTMLElement>('[data-drape]').forEach((d, i) =>
        gsap.to(d, { skewX: i % 2 ? 1.4 : -1.4, duration: 3 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      )
    }, el)

    mm.add(
      { wide: '(min-width: 768px) and (prefers-reduced-motion: no-preference)', narrow: '(max-width: 767px), (prefers-reduced-motion: reduce)' },
      (ctx) => {
        const { wide } = ctx.conditions as { wide: boolean }
        if (!wide) {
          gsap.utils.toArray<HTMLElement>('[data-enter]', el).forEach((item) =>
            gsap.from(item, { y: 50, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 88%' } }),
          )
          rooms().forEach((r) => {
            galleryStops.set(r.id, () => r.getBoundingClientRect().top + window.scrollY - 70)
            ScrollTrigger.create({ trigger: r, start: 'top center', end: 'bottom center', onToggle: (s) => s.isActive && announce(r.id) })
          })
          paintings().forEach((p) => galleryStops.set(p.id, () => p.getBoundingClientRect().top + window.scrollY - 90))
          setLit(null)
          return
        }

        const distance = () => rail.scrollWidth - window.innerWidth
        const walk = gsap.to(rail, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: el, pin: true, scrub: 1, end: () => `+=${distance()}`, invalidateOnRefresh: true },
        })
        const st = walk.scrollTrigger!
        // A painting's stop puts it in the middle of the screen; a room's puts it at the left edge.
        paintings().forEach((p) =>
          galleryStops.set(p.id, () => {
            // The painting sits inside the gallery room, which sits on the track.
            const centre = p.parentElement!.offsetLeft + p.offsetLeft + p.offsetWidth / 2
            const x = Math.max(0, Math.min(centre - window.innerWidth / 2, distance()))
            return st.start + (x / distance()) * (st.end - st.start)
          }),
        )
        rooms().forEach((r) => {
          galleryStops.set(r.id, () => st.start + (Math.min(r.offsetLeft, distance()) / distance()) * (st.end - st.start))
          ScrollTrigger.create({
            trigger: r,
            containerAnimation: walk,
            start: 'left center',
            end: 'right center',
            onToggle: (s) => s.isActive && announce(r.id),
          })
        })

        // Things settle onto the wall as they slide into view.
        gsap.utils.toArray<HTMLElement>('[data-enter]', el).forEach((item) =>
          gsap.from(item, {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: item, containerAnimation: walk, start: 'left 92%' },
          }),
        )
        // Paintings swing on their cords as they arrive, and their lamp comes on while they're in front of you.
        gsap.utils.toArray<HTMLElement>('[data-painting]', el).forEach((p) => {
          gsap.fromTo(
            p,
            { rotate: 5 },
            {
              rotate: 0,
              duration: 2.2,
              ease: 'elastic.out(1, 0.25)',
              scrollTrigger: { trigger: p, containerAnimation: walk, start: 'left 85%', toggleActions: 'play none none reset' },
            },
          )
          ScrollTrigger.create({
            trigger: p,
            containerAnimation: walk,
            start: 'left 75%',
            end: 'right 25%',
            onToggle: (s) => setLit((cur) => (s.isActive ? p.dataset.painting! : cur === p.dataset.painting ? null : cur)),
          })
        })
        // Velvet ropes and the garden sit at different depths from the wall.
        gsap.utils.toArray<HTMLElement>('[data-depth]', el).forEach((item) =>
          gsap.fromTo(
            item,
            { x: () => Number(item.dataset.depth) * window.innerWidth * 0.5 },
            {
              x: () => -Number(item.dataset.depth) * window.innerWidth * 0.5,
              ease: 'none',
              scrollTrigger: { trigger: item, containerAnimation: walk, start: 'left right', end: 'right left', scrub: true },
            },
          ),
        )
      },
    )

    return () => {
      arrival.revert()
      mm.revert()
      galleryStops.clear()
    }
  }, [])

  return (
    <main ref={root} className="relative overflow-hidden md:h-[100svh]">
      <div ref={track} className="damask relative flex flex-col md:h-full md:w-max md:flex-row">
        {/* Picture rail and wainscoting run the whole length of the house */}
        <div aria-hidden className="gilt absolute inset-x-0 top-[72px] hidden h-[6px] shadow-[0_3px_4px_rgba(0,0,0,0.5)] md:block" />
        <div aria-hidden className="wainscot absolute inset-x-0 bottom-0 hidden h-[17%] md:block">
          <div className="gilt h-[9px] shadow-[0_4px_6px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Foyer */}
        <Room id="foyer" className="flex flex-col items-center gap-16 px-6 pb-24 pt-28 md:w-[150vw] md:flex-row md:items-stretch md:gap-0 md:px-0 md:pb-0 md:pt-0">
          <div className="relative h-[70svh] w-[min(520px,90vw)] md:absolute md:left-[4vw] md:top-[14vh] md:h-[66vh] md:w-[38vw]">
            <Window className="h-full" />
          </div>

          <div className="relative text-center md:absolute md:left-[44vw] md:top-[20vh] md:w-[50vw]">
            <p data-arrive className="type-caps text-gold/80">
              The permanent collection of
            </p>
            <h1 className="mt-3 font-serif text-[clamp(3.6rem,9.5vw,10rem)] italic leading-[0.9] drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]">
              {['Jasman', 'Sidhu'].map((word) => (
                <span key={word} className="block overflow-hidden pb-[0.1em]">
                  {[...word].map((ch, i) => (
                    <span key={i} data-letter className="gilt-text inline-block">
                      {ch}
                    </span>
                  ))}
                </span>
              ))}
            </h1>
            <p data-arrive className="mx-auto mt-6 max-w-[34rem] text-[clamp(1.1rem,1.5vw,1.35rem)] text-paper/85">
              Software engineer and builder of useful things. On display: four works, two commissions, and one piece still drying.
            </p>
            <p data-arrive className="type-caps mt-8 hidden text-gold md:block">
              Scroll to walk the gallery →
            </p>
          </div>

          <figure className="relative flex flex-col items-center md:absolute md:left-[104vw] md:top-[17vh]">
            <div data-painting="artist" className="relative origin-top">
              <PictureLamp lit={lit === 'artist' || lit === null} />
              <GoldFrame oval className="w-[min(300px,72vw)] md:w-[clamp(220px,22vw,340px)]">
                <img src="/museum/artist.jpg" alt="A painted portrait of Jasman" className="aspect-[4/5] w-full rounded-[50%] object-cover" />
              </GoldFrame>
            </div>
            <Placard className="mt-8 md:absolute md:left-[calc(100%+2.5rem)] md:top-[45%] md:mt-0">
              <p className="type-label">Gallery entrance</p>
              <p className="mt-1 text-[19px] italic leading-tight">Portrait of the Artist</p>
              <p className="mt-1 text-mute">Jasman Sidhu, computer science (AI) at Oakland University, class of 2027</p>
              <p className="mt-2">Interning at Motherson, building for Aurelius, and shipping his own products after hours.</p>
            </Placard>
          </figure>
        </Room>

        {/* The four works */}
        <Room id="gallery" className="flex flex-col items-center gap-28 px-6 pb-24 md:flex-row md:gap-0 md:px-0 md:pb-0">
          {PROJECTS.map((p) => {
            const look = PROJECT_LOOK[p.slug]
            const tall = look.aspect < 1
            return (
              <div key={p.slug} id={p.slug} className="relative flex shrink-0 flex-col items-center md:h-full md:w-[78vw] md:justify-center">
                <div className="relative md:-ml-[14vw] md:-mt-[8vh]">
                  <div data-painting={p.slug} className="relative origin-[50%_calc(-8vh)]">
                    <Cords />
                    <PictureLamp lit={lit === p.slug} />
                    <TransitionLink
                      to={`/work/${p.slug}`}
                      label={p.title}
                      data-cursor="view"
                      data-cursor-label="View"
                      data-cursor-color="#F3DC8E"
                      aria-label={`${p.title}: view the catalogue entry`}
                      className="block"
                    >
                      <GoldFrame>
                        <img
                          src={look.painting}
                          alt={`${look.artwork}, an oil painting standing in for ${p.title}`}
                          className={`block max-w-[78vw] object-cover ${tall ? 'h-[min(58vh,100vw)]' : 'w-[78vw] md:w-[36vw]'}`}
                          style={{ aspectRatio: `${look.aspect}` }}
                        />
                      </GoldFrame>
                    </TransitionLink>
                  </div>
                </div>
                <Placard className="mt-10 md:absolute md:bottom-[24vh] md:right-[5vw] md:mt-0">
                  <p className="type-label">
                    No. {look.numeral} · {p.kind}
                  </p>
                  <p className="mt-1 font-caps text-[20px] tracking-[0.06em]">{p.title}</p>
                  <p className="text-[16px] italic leading-tight">{look.artwork}</p>
                  <p className="mt-1 text-[14px] text-mute">{medium(p.stack)}</p>
                  <p className="mt-2 text-[15px]">
                    You hand it {p.input}. It hands back {p.output}.
                  </p>
                  <TransitionLink to={`/work/${p.slug}`} label={p.title} className="type-caps mt-3 inline-block text-red hover:underline">
                    Read the catalogue entry →
                  </TransitionLink>
                </Placard>
                <div data-depth="0.25" className="pointer-events-none absolute bottom-[2vh] left-[calc(41%-18vw)] hidden w-[36vw] md:block">
                  <Stanchions className="h-[12vh] w-full drop-shadow-[0_10px_8px_rgba(0,0,0,0.6)]" />
                </div>
              </div>
            )
          })}
        </Room>

        {/* Commissions: the jobs, as framed letters of appointment */}
        <Room id="commissions" className="flex flex-col items-center gap-12 px-6 pb-24 md:w-[110vw] md:justify-center md:gap-10 md:px-[6vw] md:pb-[17vh]">
          <WallTitle kicker="Letters of appointment">Commissions</WallTitle>
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-[4vw]">
            {EXPERIENCE.map((job, i) => (
              <div key={job.org} data-enter className={`relative ${i % 2 ? 'md:mt-10 md:rotate-[1deg]' : 'md:-rotate-[1deg]'}`}>
                <div className="gilt p-[5px] shadow-[0_24px_36px_-12px_rgba(0,0,0,0.8)]">
                  <article className="parchment relative w-[min(430px,88vw)] p-6 md:p-7">
                    <p className="type-label">{job.time}</p>
                    <h3 className="mt-2 font-caps text-[22px] leading-tight tracking-[0.04em]">{job.org}</h3>
                    <p className="italic text-[18px]">
                      {job.role}, {job.place}
                    </p>
                    <ul className="mt-4 space-y-2 text-[15.5px] leading-snug">
                      {job.bullets.slice(0, 3).map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="text-red">❧</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    {/* Wax seal */}
                    <span
                      aria-hidden
                      className="absolute -bottom-5 right-6 grid size-14 place-items-center rounded-full font-caps text-[13px] text-[#f3c9c9] shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                      style={{ background: 'radial-gradient(circle at 35% 30%, #c0313b, #7a0d15 60%, #4a070c)' }}
                    >
                      JS
                    </span>
                  </article>
                </div>
              </div>
            ))}
          </div>
        </Room>

        {/* The study: the live corner of the house */}
        <Room id="study" className="flex flex-col items-center gap-12 px-6 pb-24 md:w-[120vw] md:flex-row md:items-end md:justify-center md:gap-[5vw] md:px-[6vw] md:pb-[9vh]">
          <div className="md:absolute md:left-1/2 md:top-[13vh] md:-translate-x-1/2">
            <WallTitle kicker="Where the work happens">The Study</WallTitle>
          </div>
          <GrandfatherClock className="aspect-[160/460] h-[min(64vh,560px)] shrink-0 drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)] md:mb-[-3vh]" />

          {/* Easel with the canvas in progress */}
          <div data-enter className="relative flex flex-col items-center">
            <svg aria-hidden viewBox="0 0 200 300" className="absolute -bottom-[2vh] h-[58vh] max-h-[480px] w-auto">
              <g stroke="#3a1a0b" strokeWidth="9" strokeLinecap="round">
                <line x1="100" y1="6" x2="30" y2="296" />
                <line x1="100" y1="6" x2="170" y2="296" />
                <line x1="100" y1="6" x2="112" y2="296" />
              </g>
              <rect x="22" y="208" width="156" height="10" fill="#4a2410" />
            </svg>
            <div className="relative mb-[14vh] w-[min(300px,70vw)] rotate-[-2deg] border-[6px] border-[#e9dcc0] bg-[#f4ecd8] p-5 text-ink shadow-[0_16px_24px_rgba(0,0,0,0.6)]">
              <p className="type-label">Work in progress</p>
              <p className="mt-2 text-[22px] italic leading-tight">{NOW.building}</p>
              <p className="mt-4 type-label">Also thinking about</p>
              <p className="mt-1 text-[16px] leading-snug">{NOW.learning}</p>
              <p className="mt-4 text-[13px] text-mute">Wet paint. Please don’t touch.</p>
            </div>
          </div>

          {/* Brass-edged acquisitions ledger */}
          <div data-enter className="gilt w-[min(380px,88vw)] p-[5px] shadow-[0_24px_36px_-12px_rgba(0,0,0,0.8)] md:mb-[12vh]">
            <div className="parchment p-6 text-[16px]">
              <p className="type-label">Recent acquisitions</p>
              <p className="mt-1 mb-4 italic">Fresh from GitHub</p>
              <GitHubActivity />
            </div>
          </div>
        </Room>

        {/* Guestbook: contact on the left page, the curator on the right */}
        <Room id="guestbook" className="flex flex-col items-center gap-8 px-4 pb-24 md:w-[115vw] md:justify-center md:px-[8vw] md:pb-[6vh] md:pt-[80px]">
          <WallTitle kicker="Before you leave">Sign the Guestbook</WallTitle>
          <div data-enter className="relative w-full max-w-[1100px]">
            {/* The book */}
            <div className="rounded-[10px] bg-[#3a1a0b] p-3 shadow-[0_40px_60px_-20px_rgba(0,0,0,0.9)]">
              <div className="grid overflow-hidden rounded-[6px] md:h-[54vh] md:max-h-[540px] md:grid-cols-2">
                <div className="parchment relative flex flex-col p-6 md:p-9 md:shadow-[inset_-30px_0_30px_-20px_rgba(90,60,20,0.45)]">
                  <p className="type-label">Correspondence</p>
                  <p className="mt-2 text-[clamp(1.6rem,2.4vw,2.2rem)] italic leading-tight">Open to internships, freelance work and collaborations.</p>
                  <a href={`mailto:${LINKS.email}`} className="mt-5 break-all font-caps text-[clamp(14px,1.3vw,18px)] tracking-[0.04em] text-red underline underline-offset-4">
                    {LINKS.email}
                  </a>
                  <p className="mt-4 flex gap-5 text-[16px]">
                    <a href={LINKS.github} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                      GitHub
                    </a>
                    <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                      LinkedIn
                    </a>
                    <a href={LINKS.resume} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                      Resume
                    </a>
                  </p>
                  <Signature auto className="mt-auto w-[min(300px,70%)] self-end pt-6 text-ink" />
                </div>
                <div className="parchment border-t border-rule p-3 md:border-l md:border-t-0 md:p-5 md:shadow-[inset_30px_0_30px_-20px_rgba(90,60,20,0.45)]">
                  <AskChat />
                </div>
              </div>
            </div>
          </div>
          <p className="type-caps text-gold/60">© {new Date().getFullYear()} Jasman Sidhu · Thank you for visiting</p>
        </Room>
      </div>
    </main>
  )
}
