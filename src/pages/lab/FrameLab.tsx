import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from '../../lib/motion'
import { brushRadius, createTear, STYLES, type Painting, type Tear } from './tear'

// Recreation of a reference: a gilt frame on a pale wall, holding a sky. Hold and drag to erase the paint and find
// Jasman's portrait beneath; scrolling tears the whole surface away, room by room.

type Room = { kind: string; title: string; artist: string; medium: string; year: string; painting: Painting; self?: boolean }

// Two takes on the self-portrait: the original painting, and a 4K upscale that's sharper but more photographic.
const PORTRAITS = [
  { name: 'Upscaled', src: '/lab/frame/me-upscaled.jpg' },
  { name: 'Painted', src: '/lab/frame/me.jpg' },
]

const ROOMS: Room[] = [
  {
    kind: 'Sky study',
    title: 'Clouds',
    artist: 'John Constable, 1822.',
    medium: 'Oil on paper on cardboard.',
    year: '1822',
    painting: { src: '/lab/frame/clouds.jpg', aspect: 2560 / 1518, focus: [0.5, 0.42], zoom: 1 },
  },
  {
    kind: 'Self-portrait',
    title: 'Jasman Sidhu',
    artist: 'Oakland University, 2026.',
    medium: 'Builds practical AI products.',
    year: '2026',
    painting: { src: PORTRAITS[0].src, aspect: 1, focus: [0.5, 0.5], zoom: 1 },
    self: true,
  },
  {
    kind: 'Portrait',
    title: 'Girl with a Pearl Earring',
    artist: 'Johannes Vermeer, c. 1665.',
    medium: 'Oil on canvas, 44.5 × 39 cm.',
    year: '1665',
    painting: { src: '/lab/frame/pearl.jpg', aspect: 2400 / 2273, focus: [0.4, 0.47], zoom: 1 },
  },
  {
    kind: 'Group portrait',
    title: 'The Night Watch',
    artist: 'Rembrandt van Rijn, 1642.',
    medium: 'Oil on canvas, 379.5 × 453.5 cm.',
    year: '1642',
    painting: { src: '/lab/frame/nightwatch.jpg', aspect: 2800 / 2345, focus: [0.48, 0.47], zoom: 1.15 },
  },
]

// The frame art and where its opening sits, as fractions of the image. The canvas fills the opening with a hair of
// overlap under the gilt; the caption lines up with the opening's edges.
const FRAME = { src: '/lab/frame/frame-tall.webp', w: 2023, h: 2017, l: 0.15077, t: 0.14477, r: 0.84923, b: 0.85424 }
const OVERLAP = 0.0015
const pct = (n: number) => `${(n * 100).toFixed(3)}%`
const OPENING = {
  left: pct(FRAME.l - OVERLAP),
  top: pct(FRAME.t - (OVERLAP * FRAME.w) / FRAME.h),
  width: pct(FRAME.r - FRAME.l + OVERLAP * 2),
  height: pct(FRAME.b - FRAME.t + ((OVERLAP * FRAME.w) / FRAME.h) * 2),
}

const ASPECT = (FRAME.w / FRAME.h).toFixed(4)
const BELOW_OPENING = (((1 - FRAME.b) * FRAME.h) / FRAME.w).toFixed(4)

// Phones and tablets: the caption sits under the frame, lined up with the opening's edges.
// Wide screens: caption and year flank the frame, level with the bottom of the opening, so the frame can be taller.
const SIZES = `
.lab-frame { --fw: min(94vw, 1560px, calc((100svh - 68px - 190px) * ${ASPECT})); }
@media (max-width: 640px) { .lab-frame { --fw: 100vw; } }
.lab-stage { display: grid; align-content: center; justify-content: center;
  grid-template-areas: "frame frame" "cap year"; grid-template-columns: calc(var(--fw) * 0.62) calc(var(--fw) * 0.38); }
.lab-cap { grid-area: cap; padding: 18px 0 0 calc(var(--fw) * ${FRAME.l.toFixed(4)}); }
.lab-year { grid-area: year; justify-self: end; align-self: end; text-align: right;
  padding-right: calc(var(--fw) * ${(1 - FRAME.r).toFixed(4)}); }
@media (min-width: 1024px) {
  .lab-frame { --fw: min(100vw - 600px, 1560px, calc((100svh - 68px - 96px) * ${ASPECT})); }
  .lab-stage { grid-template-areas: "cap frame year"; grid-template-columns: 1fr var(--fw) 1fr; align-items: end; }
  .lab-cap { justify-self: end; padding: 0 44px calc(var(--fw) * ${BELOW_OPENING}) 0; }
  .lab-year { justify-self: start; text-align: left; padding: 0 0 calc(var(--fw) * ${BELOW_OPENING}) 44px; }
}
`

const STORE = 'lab-frame-style'
const PORTRAIT_STORE = 'lab-frame-portrait'
const serif = { fontFamily: '"Cormorant Garamond", "Instrument Serif", Georgia, serif' }

// Which room's caption to show for a scroll position measured in rooms (0 .. ROOMS.length - 1).
function roomAt(r: number) {
  const i = Math.min(Math.floor(r), ROOMS.length - 2)
  return i + (r - i >= 0.5 ? 1 : 0)
}

export default function FrameLab() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  const year = useRef<HTMLSpanElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const tear = useRef<Tear | null>(null)
  const [room, setRoom] = useState(0)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState(false)
  const [held, setHeld] = useState(false)
  const [erased, setErased] = useState(false)
  const [style, setStyle] = useState(() => stored(STORE, STYLES.length))
  const [portrait, setPortrait] = useState(() => stored(PORTRAIT_STORE, PORTRAITS.length))
  // The renderer is rebuilt when the portrait changes; these carry the current state over to the new one.
  const styleNow = useRef(style)
  const progressNow = useRef(0)
  const shownOnce = useRef(false)

  useEffect(() => {
    if (!document.getElementById('lab-cormorant')) {
      const link = document.createElement('link')
      link.id = 'lab-cormorant'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap'
      document.head.appendChild(link)
    }
    const title = document.title
    document.title = 'Bureau of Underpainting'
    document.body.style.background = '#ebebed'
    return () => {
      document.title = title
      document.body.style.background = ''
    }
  }, [])

  useEffect(() => {
    const paintings = ROOMS.map((r) => (r.self ? { ...r.painting, src: PORTRAITS[portrait].src } : r.painting))
    const t = createTear(canvas.current!, paintings, {
      onReady: () => {
        shownOnce.current = true
        setReady(true)
      },
      onErase: () => setErased(true),
      fadeIn: !shownOnce.current,
    })
    t?.setStyle(styleNow.current)
    t?.setProgress(progressNow.current)
    tear.current = t
    remember(PORTRAIT_STORE, portrait)
    return () => {
      t?.destroy()
      tear.current = null
    }
  }, [portrait])

  useEffect(() => {
    styleNow.current = style
    tear.current?.setStyle(style)
    remember(STORE, style)
  }, [style])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= STYLES.length) setStyle(n - 1)
      if (e.key === 'r') tear.current?.restore()
      if (e.key === 'p') setPortrait((p) => (p + 1) % PORTRAITS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The section pins while scroll tears through the rooms.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * 1.3 * (ROOMS.length - 1)}`,
        pin: true,
        onUpdate: (self) => {
          const r = self.progress * (ROOMS.length - 1)
          progressNow.current = r
          tear.current?.setProgress(r)
          setRoom(roomAt(r))
        },
      })
    }, section)
    return () => ctx.revert()
  }, [])

  // Caption lines rise in; the big year (the painting underneath) scrambles to its new value.
  useEffect(() => {
    const lines = caption.current?.querySelectorAll('[data-line]')
    if (lines?.length) gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out' })
    const next = ROOMS[(room + 1) % ROOMS.length].year
    if (year.current && year.current.textContent !== next) {
      if (!year.current.textContent) year.current.textContent = next
      else gsap.to(year.current, { duration: 0.9, scrambleText: { text: next, chars: '0123456789', speed: 0.5 }, ease: 'none' })
    }
  }, [room])

  const r = ROOMS[room]
  const last = room === ROOMS.length - 1
  const brush = brushRadius(STYLES[style], canvas.current?.clientWidth ?? 620, canvas.current?.clientHeight ?? 620) * 1.6

  return (
    <main className="lab-frame min-h-[100svh] select-none bg-[#ebebed] font-sans text-[#1c1c1e]">
      <style>{SIZES}</style>
      <section ref={section} className="relative flex h-[100svh] flex-col overflow-hidden">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-black/[0.09] px-5 md:px-12">
          <nav aria-label="Lab" className="flex gap-6 text-[10.5px] font-medium uppercase tracking-[0.2em] md:gap-10">
            <a href="#collection" className="hidden hover:opacity-50 sm:inline">Collection</a>
            <a href="#artists" className="hover:opacity-50">Artists</a>
            <a href="#archive" className="hover:opacity-50">Archive</a>
          </nav>
          <a href="/lab/frame" className="text-[19px] uppercase tracking-[0.16em] md:text-[21px]" style={serif}>
            Bureau<span className="hidden md:inline"> of Underpainting</span>
          </a>
        </header>

        <div className="lab-stage flex-1 pb-4">
          <div className="relative" style={{ gridArea: 'frame', width: 'var(--fw)', aspectRatio: `${FRAME.w} / ${FRAME.h}` }}>
            <canvas
              ref={canvas}
              aria-label={`${r.title}. Hold and drag to erase it and see the painting underneath.`}
              role="img"
              className="absolute cursor-none touch-none transition-opacity duration-700"
              style={{ ...OPENING, opacity: ready ? 1 : 0, background: '#d9dde3' }}
              onPointerEnter={(e) => setHover(e.pointerType === 'mouse')}
              onPointerLeave={() => setHover(false)}
              onPointerMove={(e) => {
                if (ring.current) ring.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
              }}
              onPointerDown={() => setHeld(true)}
              onPointerUp={() => setHeld(false)}
              onPointerCancel={() => setHeld(false)}
            />
            {/* First-visit hint, until someone erases. */}
            <div
              aria-hidden
              className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 text-white mix-blend-difference transition-opacity duration-500"
              style={{ left: pct((FRAME.l + FRAME.r) / 2), top: pct((FRAME.t + FRAME.b) / 2), opacity: ready && !erased && !hover ? 1 : 0 }}
            >
              <span className="block h-9 w-9 animate-pulse rounded-full border border-white" />
              <span className="text-[10px] uppercase tracking-[0.22em]">Hold to erase</span>
            </div>
            <img
              src={FRAME.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
              style={{ filter: 'drop-shadow(0 20px 26px rgba(48, 36, 12, 0.2))' }}
            />
          </div>

          <div ref={caption} key={room} className="lab-cap">
            <Line className="text-[9.5px] uppercase tracking-[0.16em] text-black/45 md:text-[10px]">
              Room {String(room + 1).padStart(2, '0')} / {r.kind}
            </Line>
            <Line className="mt-1 text-[21px] italic leading-[1.2] md:text-[26px]" style={serif}>
              {r.title}
            </Line>
            <Line className="mt-1 text-[11px] leading-[1.5] text-black/75 md:text-[12px]">{r.artist}</Line>
            <Line className="text-[11px] leading-[1.5] text-black/75 md:text-[12px]">{r.medium}</Line>
          </div>
          <div className="lab-year">
            <span ref={year} className="block text-[44px] leading-[0.9] md:text-[68px]" style={{ ...serif, fontVariantNumeric: 'oldstyle-nums' }} />
            <p className="mt-2 whitespace-nowrap text-[9px] uppercase tracking-[0.2em] text-black/45 md:text-[9.5px]">
              {last ? (
                <>
                  <span className="sm:hidden">The end</span>
                  <span className="hidden sm:inline">End of the collection</span>
                </>
              ) : (
                <>
                  Scroll<span className="hidden sm:inline"> to go deeper</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="absolute right-5 top-[84px] flex gap-3 text-[9.5px] uppercase tracking-[0.16em] text-black/40 md:right-12">
          <span className="hidden md:inline">Tear</span>
          {STYLES.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setStyle(i)}
              className={i === style ? 'text-black underline underline-offset-4' : 'hover:text-black'}
            >
              <span className="hidden md:inline">{i + 1} </span>
              {s.name}
            </button>
          ))}
          <span className="text-black/20">/</span>
          <button type="button" onClick={() => tear.current?.restore()} className="hover:text-black">
            <span className="hidden md:inline">R </span>Restore
          </button>
          <span className="text-black/20">/</span>
          <button type="button" onClick={() => setPortrait((p) => (p + 1) % PORTRAITS.length)} className="hover:text-black">
            <span className="hidden md:inline">P </span>Me: <span className="text-black">{PORTRAITS[portrait].name}</span>
          </button>
        </div>
      </section>

      {/* Eraser: a ring the size of the brush, over the painting only. Outside the section, which pinning can transform. */}
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 text-white mix-blend-difference transition-opacity duration-200"
        style={{ opacity: hover ? 1 : 0 }}
      >
        <span
          className="absolute rounded-full border border-white transition-transform duration-200 ease-out"
          style={{ width: brush, height: brush, left: -brush / 2, top: -brush / 2, transform: held ? 'scale(0.86)' : 'none' }}
        />
        <span
          className="absolute whitespace-nowrap text-[9.5px] uppercase tracking-[0.2em] transition-opacity duration-200"
          style={{ left: brush / 2 + 10, top: -6, opacity: held ? 0 : 1 }}
        >
          Hold to erase
        </span>
      </div>

      <footer className="flex h-[40svh] items-end justify-between border-t border-black/[0.09] px-5 pb-8 text-[10px] uppercase tracking-[0.16em] text-black/45 md:px-12">
        <span>Paintings: public domain, via Wikimedia Commons</span>
        <span className="hidden sm:inline">Hold to erase · scroll to go deeper</span>
      </footer>
    </main>
  )
}

// Reads a remembered index; storage can be unavailable (private mode), in which case it's just not remembered.
function stored(key: string, count: number) {
  try {
    return Math.min(count - 1, Math.max(0, Number(localStorage.getItem(key)) || 0))
  } catch {
    return 0
  }
}

function remember(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Not remembered this time.
  }
}

function Line({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className="block overflow-hidden">
      <span data-line className={`block ${className ?? ''}`} style={style}>
        {children}
      </span>
    </span>
  )
}
