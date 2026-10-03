import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Cursor from '../../components/Cursor'
import { gsap } from '../../lib/motion'
import { brushRadius, createTear, STYLES, type Painting, type Tear } from './tear'

// The "J" tile, worked out in the lab before it goes into the portfolio. A stand-in for the home grid; clicking J
// grows the tile into a small gallery room with one gilt frame. The painting in it is a sky, and visitors hold and drag
// to erase it. Once enough is gone, the sky opens and Jasman's portrait is underneath.

// Same tiles as the placeholder grid on the home page.
const TILES = ['J', 'Portlkit', 'Ember', 'Haven', 'S', 'Imperium', 'Callback', 'HairStyl', 'Contact']

// Two takes on the self-portrait: the original painting, and a 4K upscale that's sharper but more photographic.
const PORTRAITS = [
  { name: 'Upscaled', src: '/lab/frame/me-upscaled.jpg' },
  { name: 'Painted', src: '/lab/frame/me.jpg' },
]
const SKY: Painting = { src: '/lab/frame/clouds.jpg', aspect: 2560 / 1518, focus: [0.5, 0.42], zoom: 1 }
const ME: Omit<Painting, 'src'> = { aspect: 1, focus: [0.5, 0.5], zoom: 1 }

// Erasing this share of the sky opens the rest of it.
const REVEAL_AT = 0.15

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
// Two walls: the pale gallery from the reference, and a dark one with a spotlight to match the grid.
const SIZES = `
.lab-room { --fw: min(94vw, 1560px, calc((100svh - 68px - 190px) * ${ASPECT})); }
@media (max-width: 640px) { .lab-room { --fw: 100vw; } }
.lab-stage { display: grid; align-content: center; justify-content: center;
  grid-template-areas: "frame frame" "cap year"; grid-template-columns: calc(var(--fw) * 0.62) calc(var(--fw) * 0.38); }
.lab-cap { grid-area: cap; padding: 18px 0 0 calc(var(--fw) * ${FRAME.l.toFixed(4)}); }
.lab-year { grid-area: year; justify-self: end; align-self: end; text-align: right;
  padding-right: calc(var(--fw) * ${(1 - FRAME.r).toFixed(4)}); }
@media (min-width: 1024px) {
  .lab-room { --fw: min(100vw - 600px, 1560px, calc((100svh - 68px - 96px) * ${ASPECT})); }
  .lab-stage { grid-template-areas: "cap frame year"; grid-template-columns: 1fr var(--fw) 1fr; align-items: end; }
  .lab-cap { justify-self: end; padding: 0 44px calc(var(--fw) * ${BELOW_OPENING}) 0; }
  .lab-year { justify-self: start; text-align: left; padding: 0 0 calc(var(--fw) * ${BELOW_OPENING}) 44px; }
}
.lab-room[data-wall='light'] { --wall: #ebebed; --fg: #1c1c1e; --fg2: rgb(28 28 30 / .75); --fg3: rgb(28 28 30 / .45);
  --rule: rgb(0 0 0 / .09); --shadow: rgb(48 36 12 / .2); background: var(--wall); }
.lab-room[data-wall='dark'] { --wall: #0f0f10; --fg: #ece9e4; --fg2: rgb(236 233 228 / .72); --fg3: rgb(236 233 228 / .42);
  --rule: rgb(255 255 255 / .08); --shadow: rgb(0 0 0 / .65);
  background: radial-gradient(ellipse 55% 60% at 50% 42%, #2a2621 0%, #151413 55%, #0f0f10 100%); }
`

const STYLE_STORE = 'lab-frame-style'
const PORTRAIT_STORE = 'lab-frame-portrait'
const WALL_STORE = 'lab-frame-wall'
const WALLS = ['light', 'dark'] as const
const serif = { fontFamily: '"Cormorant Garamond", "Instrument Serif", Georgia, serif' }

export default function FrameLab() {
  const room = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const jTile = useRef<HTMLButtonElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const tear = useRef<Tear | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState(false)
  const [held, setHeld] = useState(false)
  const [erased, setErased] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [style, setStyle] = useState(() => stored(STYLE_STORE, STYLES.length))
  const [portrait, setPortrait] = useState(() => stored(PORTRAIT_STORE, PORTRAITS.length))
  const [wall, setWall] = useState(() => stored(WALL_STORE, WALLS.length))
  // The renderer is rebuilt when the portrait changes; these carry the current state over to the new one.
  const styleNow = useRef(style)
  const progress = useRef({ v: 0 })
  const openNow = useRef(false)
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
    document.title = 'J · Jasman Sidhu'
    return () => {
      document.title = title
    }
  }, [])

  // The renderer lives as long as the page, so the paintings are already loaded when J opens.
  useEffect(() => {
    const t = createTear(canvas.current!, [SKY, { ...ME, src: PORTRAITS[portrait].src }], {
      onReady: () => {
        shownOnce.current = true
        setReady(true)
      },
      onErase: () => setErased(true),
      fadeIn: !shownOnce.current,
    })
    t?.setStyle(styleNow.current)
    t?.setProgress(progress.current.v)
    t?.setActive(openNow.current)
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
    remember(STYLE_STORE, style)
  }, [style])

  useEffect(() => remember(WALL_STORE, wall), [wall])

  // Opening the sky (1) or painting it back over (0): a circle grows from, or closes onto, the face.
  const reveal = useCallback((to: 0 | 1) => {
    gsap.killTweensOf(progress.current)
    setRevealed(to === 1)
    gsap.to(progress.current, {
      v: to,
      duration: to ? 1.8 : 1.2,
      ease: 'power2.inOut',
      onUpdate: () => tear.current?.setProgress(progress.current.v),
      onComplete: () => {
        if (!to) tear.current?.restore()
      },
    })
  }, [])

  const repaint = useCallback(() => {
    if (progress.current.v > 0) reveal(0)
    else tear.current?.restore()
  }, [reveal])

  // While someone is erasing, check now and then whether enough of the sky is gone.
  useEffect(() => {
    if (!held || revealed) return
    const check = () => {
      if (progress.current.v === 0 && (tear.current?.coverage() ?? 0) >= REVEAL_AT) reveal(1)
    }
    const id = window.setInterval(check, 300)
    return () => {
      window.clearInterval(id)
      check()
    }
  }, [held, revealed, reveal])

  // J grows from its tile into the room; closing shrinks the room back into the tile.
  const tileInset = () => {
    const r = jTile.current!.getBoundingClientRect()
    return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px)`
  }
  const show = useCallback((instant = false) => {
    openNow.current = true
    setOpen(true)
    tear.current?.setActive(true)
    gsap.killTweensOf([room.current, content.current])
    gsap.set(room.current, { visibility: 'visible' })
    if (instant) {
      gsap.set(room.current, { clipPath: 'inset(0px 0px 0px 0px)' })
      gsap.set(content.current, { autoAlpha: 1, y: 0 })
      return
    }
    gsap.fromTo(room.current, { clipPath: tileInset() }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.95, ease: 'expo.inOut' })
    gsap.fromTo(content.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.55, ease: 'expo.out' })
  }, [])
  const hide = useCallback(() => {
    openNow.current = false
    setOpen(false)
    setHover(false)
    gsap.killTweensOf([room.current, content.current])
    gsap.to(content.current, { autoAlpha: 0, duration: 0.25 })
    gsap.to(room.current, {
      clipPath: tileInset(),
      duration: 0.8,
      ease: 'expo.inOut',
      onComplete: () => {
        gsap.set(room.current, { visibility: 'hidden' })
        tear.current?.setActive(false)
      },
    })
  }, [])

  // /lab/frame?open skips the grid, for testing.
  useLayoutEffect(() => {
    gsap.set(room.current, { visibility: 'hidden' })
    if (new URLSearchParams(location.search).has('open')) show(true)
  }, [show])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!openNow.current) return
      if (e.key === 'Escape') hide()
      const n = Number(e.key)
      if (n >= 1 && n <= STYLES.length) setStyle(n - 1)
      if (e.key === 'r') repaint()
      if (e.key === 'p') setPortrait((p) => (p + 1) % PORTRAITS.length)
      if (e.key === 'w') setWall((w) => (w + 1) % WALLS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hide, repaint])

  // Caption lines rise in whenever the caption changes.
  useEffect(() => {
    const lines = caption.current?.querySelectorAll('[data-line]')
    if (lines?.length) gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out' })
  }, [revealed])

  const brush = brushRadius(STYLES[style], canvas.current?.clientWidth ?? 620, canvas.current?.clientHeight ?? 620) * 1.6

  return (
    <main className="h-[100svh] overflow-hidden bg-ink text-paper">
      <style>{SIZES}</style>
      <Cursor />

      {/* Stand-in for the home page grid. */}
      <section aria-label="Grid" className="relative grid h-full grid-cols-3 grid-rows-3">
        {TILES.map((t, i) => {
          const edges = `border-[#1d1d1d] ${i % 3 < 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''}`
          return t === 'J' ? (
            <button
              key={t}
              ref={jTile}
              type="button"
              onClick={(e) => {
                show()
                // The cursor only re-reads what it's over on move; nudge it so the "Meet me" label lets go.
                const { clientX, clientY } = e
                requestAnimationFrame(() => document.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY, bubbles: true })))
              }}
              aria-label="J: who's behind this"
              data-cursor="view"
              data-cursor-label="Meet me"
              className={`group grid place-items-center ${edges}`}
            >
              <span className="font-sans text-[16vmin] font-[450] leading-none tracking-[-0.05em] transition-transform duration-500 ease-out group-hover:scale-110">
                J
              </span>
            </button>
          ) : (
            <div key={t} className={`grid place-items-center ${edges}`}>
              {t === 'S' ? (
                <span className="font-serif text-[17vmin] italic leading-none">S</span>
              ) : (
                <span className="type-label">{t}</span>
              )}
            </div>
          )
        })}
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 type-label">lab · click J</p>
      </section>

      {/* The room behind J. */}
      <div
        ref={room}
        role="dialog"
        aria-modal="true"
        aria-label="Self-portrait"
        aria-hidden={!open}
        data-wall={WALLS[wall]}
        className="lab-room fixed inset-0 z-40 flex select-none flex-col"
        style={{ color: 'var(--fg)' }}
      >
        <div ref={content} className="flex h-full flex-col">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b px-5 md:px-12" style={{ borderColor: 'var(--rule)' }}>
            <button type="button" onClick={hide} className="text-[10.5px] font-medium uppercase tracking-[0.2em] hover:opacity-50">
              ← Grid<span className="hidden md:inline" style={{ color: 'var(--fg3)' }}> · Esc</span>
            </button>
            <span className="text-[19px] uppercase tracking-[0.16em] md:text-[21px]" style={serif}>
              Jasman Sidhu
            </span>
          </header>

          <div className="lab-stage flex-1 pb-4">
            <div className="relative" style={{ gridArea: 'frame', width: 'var(--fw)', aspectRatio: `${FRAME.w} / ${FRAME.h}` }}>
              <canvas
                ref={canvas}
                aria-label={revealed ? 'Portrait of Jasman Sidhu.' : 'A painted sky. Hold and drag to erase it and see who is underneath.'}
                role="img"
                data-cursor="text"
                className="absolute touch-none transition-opacity duration-700"
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
                style={{ filter: 'drop-shadow(0 20px 26px var(--shadow))' }}
              />
            </div>

            <div ref={caption} key={String(revealed)} className="lab-cap">
              <Line className="text-[9.5px] uppercase tracking-[0.16em] md:text-[10px]" style={{ color: 'var(--fg3)' }}>
                J / Self-portrait
              </Line>
              <Line className="mt-1 text-[21px] italic leading-[1.2] md:text-[26px]" style={serif}>
                {revealed ? 'Jasman Sidhu' : 'Under the sky'}
              </Line>
              <Line className="mt-1 text-[11px] leading-[1.5] md:text-[12px]" style={{ color: 'var(--fg2)' }}>
                {revealed ? 'Computer science, Oakland University.' : 'Hold and drag to erase the paint.'}
              </Line>
              <Line className="text-[11px] leading-[1.5] md:text-[12px]" style={{ color: 'var(--fg2)' }}>
                {revealed ? 'Builds practical AI products.' : 'There’s someone underneath.'}
              </Line>
            </div>
            <div className="lab-year">
              <span className="block text-[44px] leading-[0.9] md:text-[68px]" style={{ ...serif, fontVariantNumeric: 'oldstyle-nums' }}>
                2026
              </span>
              {revealed || erased ? (
                <button
                  type="button"
                  onClick={repaint}
                  className="mt-2 whitespace-nowrap text-[9px] uppercase tracking-[0.2em] hover:opacity-50 md:text-[9.5px]"
                  style={{ color: 'var(--fg3)' }}
                >
                  ↺ Paint over
                </button>
              ) : (
                <p className="mt-2 whitespace-nowrap text-[9px] uppercase tracking-[0.2em] md:text-[9.5px]" style={{ color: 'var(--fg3)' }}>
                  Hold to erase
                </p>
              )}
            </div>
          </div>

          {/* Lab controls. */}
          <div className="absolute right-5 top-[84px] flex gap-3 text-[9.5px] uppercase tracking-[0.16em] md:right-12" style={{ color: 'var(--fg3)' }}>
            {STYLES.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setStyle(i)}
                className={i === style ? 'underline underline-offset-4' : 'hover:opacity-60'}
                style={i === style ? { color: 'var(--fg)' } : undefined}
              >
                <span className="hidden md:inline">{i + 1} </span>
                {s.name}
              </button>
            ))}
            <span className="opacity-50">/</span>
            <button type="button" onClick={() => setPortrait((p) => (p + 1) % PORTRAITS.length)} className="hover:opacity-60">
              <span className="hidden md:inline">P </span>Me: <span style={{ color: 'var(--fg)' }}>{PORTRAITS[portrait].name}</span>
            </button>
            <button type="button" onClick={() => setWall((w) => (w + 1) % WALLS.length)} className="hover:opacity-60">
              <span className="hidden md:inline">W </span>Wall: <span style={{ color: 'var(--fg)' }}>{WALLS[wall]}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Eraser: a ring the size of the brush, over the painting only. */}
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 text-white mix-blend-difference transition-opacity duration-200"
        style={{ opacity: hover && open ? 1 : 0 }}
      >
        <span
          className="absolute rounded-full border border-white transition-transform duration-200 ease-out"
          style={{ width: brush, height: brush, left: -brush / 2, top: -brush / 2, transform: held ? 'scale(0.86)' : 'none' }}
        />
        <span
          className="absolute whitespace-nowrap text-[9.5px] uppercase tracking-[0.2em] transition-opacity duration-200"
          style={{ left: brush / 2 + 10, top: -6, opacity: held || revealed ? 0 : 1 }}
        >
          Hold to erase
        </span>
      </div>
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
