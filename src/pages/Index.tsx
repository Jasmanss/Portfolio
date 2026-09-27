import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../data/content'
import { PROJECT_LOOK } from '../data/look'
import ProjectLinks from '../components/ProjectLinks'
import { afterIntro, useGo } from '../components/Transition'
import { gsap, prefersReducedMotion } from '../lib/motion'

const N = PROJECTS.length
// The stack and the title list loop forever, so each is built from a few copies of the projects.
const CARDS = N * 3
const ROWS = N * 3
const ROW_H = 172

const mod = (n: number, m: number) => ((n % m) + m) % m
// Signed distance on a loop of length `len`, in [-len/2, len/2).
const wrap = (d: number, len: number) => mod(d + len / 2, len) - len / 2
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Stage = { w: number; h: number; mobile: boolean }

// Where a card sits `d` steps from the current one. Past cards float up and off to the right;
// upcoming ones lie back in a pile at the bottom left, like prints on a desk.
function place(d: number, s: Stage, skew: number) {
  const cardW = s.mobile ? s.w * 0.7 : clamp(s.w * 0.26, 260, 420)
  const cardH = cardW * 0.78
  const cx = s.mobile ? s.w * 0.5 : s.w * 0.47
  const cy = s.mobile ? s.h * 0.42 : s.h * 0.47
  let x: number, y: number, rx: number, ry: number, rz: number, opacity: number
  if (d <= 0) {
    x = -d * s.w * (s.mobile ? 0.12 : 0.11)
    y = d * s.h * 0.47
    rx = -d * 16
    ry = d * 12
    rz = -d * 4
    opacity = s.mobile ? clamp(1 + d * 1.4, 0, 1) : clamp(1 - (-d - 1.2) / 0.6, 0, 1)
  } else {
    const ease = 1 - Math.exp(-d * 1.1)
    x = -ease * s.w * (s.mobile ? 0.08 : 0.12)
    y = ease * s.h * (s.mobile ? 0.3 : 0.4)
    rx = Math.min(d, 1) * 52 + d * 3
    ry = Math.min(d, 1) * 6
    rz = -Math.min(d, 1) * 7 - d * 2
    opacity = clamp(1 - (d - 4) / 0.8, 0, 1)
  }
  return {
    width: cardW,
    height: cardH,
    transform: `translate3d(${cx + x - cardW / 2}px, ${cy + y - cardH / 2}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) skewY(${skew}deg)`,
    opacity,
    zIndex: 1000 - Math.round(Math.abs(d) * 100),
  }
}

// Selected work as one fixed screen: scroll, swipe or use the arrow keys to deal through the stack.
export default function Index() {
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const rows = useRef<(HTMLLIElement | null)[]>([])
  const pos = useRef({ current: -3, target: -3 })
  const [active, setActive] = useState(0)
  const go = useGo()

  const open = (i: number) => go(`/work/${PROJECTS[i].slug}`, PROJECTS[i].title)

  // Step to the card `k` in a looped list of `len`, or open it if it's already in front.
  const pick = (k: number, len: number) => {
    const p = pos.current
    const d = wrap(k - p.current, len)
    if (Math.abs(d) < 0.5) open(mod(k, N))
    else p.target = Math.round(p.current + d)
  }

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const p = pos.current
    const reduce = prefersReducedMotion()
    let size: Stage = { w: el.clientWidth, h: el.clientHeight, mobile: el.clientWidth < 768 }
    let last = -1
    let prev = p.current
    let skew = 0
    afterIntro(() => (p.target = 0))

    const render = (dt: number) => {
      const k = reduce ? 1 : 1 - Math.pow(0.88, dt * 60)
      p.current += (p.target - p.current) * k
      const vel = (p.current - prev) / Math.max(dt, 0.001)
      prev = p.current
      skew += (clamp(vel * -1.6, -7, 7) - skew) * 0.2
      for (let i = 0; i < CARDS; i++) {
        const card = cards.current[i]
        if (!card) continue
        const s = place(wrap(i - p.current, CARDS), size, reduce ? 0 : skew)
        card.style.width = `${s.width}px`
        card.style.height = `${s.height}px`
        card.style.transform = s.transform
        card.style.opacity = `${s.opacity}`
        card.style.zIndex = `${s.zIndex}`
        card.style.visibility = s.opacity ? 'visible' : 'hidden'
      }
      for (let i = 0; i < ROWS; i++) {
        const row = rows.current[i]
        if (!row) continue
        const d = wrap(i - p.current, ROWS)
        row.style.transform = `translateY(${d * ROW_H}px)`
        row.style.opacity = `${clamp(1 - Math.abs(d) * 0.55, 0, 1)}`
        row.style.filter = `blur(${Math.min(Math.abs(d) * 2.5, 8)}px)`
      }
      const now = mod(Math.round(p.current), N)
      if (now !== last) {
        last = now
        setActive(now)
      }
    }
    const tick = (_t: number, deltaMs: number) => render(deltaMs / 1000)
    gsap.ticker.add(tick)
    render(1 / 60)

    // Wheel and trackpad: a continuous nudge, then settle on a card. Any deliberate nudge
    // (like one notch of a mouse wheel) is enough to deal the next one.
    let settleTimer = 0
    let base: number | null = null
    const settle = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        const from = base ?? Math.round(p.target)
        const moved = p.target - from
        p.target = Math.abs(moved) < 0.15 ? from : Math.abs(moved) < 1 ? from + Math.sign(moved) : Math.round(p.target)
        base = null
      }, 140)
    }
    const wheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : 1
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit
      base ??= Math.round(p.target)
      p.target += clamp(delta * 0.0024, -0.6, 0.6)
      settle()
    }
    // Touch and mouse drags, vertical or horizontal.
    let drag: { y: number; x: number; start: number; moved: boolean } | null = null
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, start: p.target, moved: false }
    }
    const move = (e: PointerEvent) => {
      if (!drag) return
      const dy = e.clientY - drag.y
      const dx = e.clientX - drag.x
      if (Math.hypot(dx, dy) > 6) drag.moved = true
      if (!drag.moved) return
      const along = Math.abs(dy) > Math.abs(dx) ? -dy : -dx
      p.target = drag.start + along / (size.mobile ? 220 : 320)
    }
    let dragged = false
    const up = () => {
      if (!drag) return
      if (drag.moved) {
        p.target = Math.round(p.target)
        dragged = true
        window.setTimeout(() => (dragged = false))
      }
      drag = null
    }
    // Swallow the click that ends a drag, so dealing cards doesn't open one.
    const click = (e: MouseEvent) => {
      if (dragged) e.stopPropagation()
    }
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) p.target = Math.round(p.target) + 1
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) p.target = Math.round(p.target) - 1
      else if (e.key === 'Enter' && document.activeElement === document.body) open(mod(Math.round(p.target), N))
      else return
      e.preventDefault()
    }
    const resize = () => (size = { w: el.clientWidth, h: el.clientHeight, mobile: el.clientWidth < 768 })

    el.addEventListener('wheel', wheel, { passive: true })
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('click', click, true)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    return () => {
      gsap.ticker.remove(tick)
      window.clearTimeout(settleTimer)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('click', click, true)
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', resize)
    }
    // Handlers read everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const p = PROJECTS[active]
  const look = PROJECT_LOOK[p.slug]

  return (
    <main ref={stage} className="fixed inset-0 overflow-hidden touch-none select-none bg-paper">
      <h1 className="sr-only">Jasman Sidhu, software engineer. Selected work.</h1>

      {/* The stack */}
      <div className="absolute inset-0 [perspective:1600px]">
        {Array.from({ length: CARDS }, (_, i) => {
          const proj = PROJECTS[i % N]
          const pl = PROJECT_LOOK[proj.slug]
          return (
            <button
              key={i}
              ref={(b) => {
                cards.current[i] = b
              }}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => pick(i, CARDS)}
              data-cursor="view"
              data-cursor-label={i % N === active ? 'Open' : 'Next'}
              className="absolute left-0 top-0 origin-center overflow-hidden will-change-transform shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
              style={{ backgroundColor: pl.card, visibility: 'hidden' }}
            >
              <img
                src={proj.image}
                alt=""
                draggable={false}
                className={`h-full w-full ${pl.fit === 'cover' ? 'object-cover' : 'object-contain p-[12%]'}`}
              />
            </button>
          )
        })}
      </div>

      {/* Title list, right column */}
      <ul aria-label="Projects" className="pointer-events-none absolute right-[4%] top-1/2 hidden w-[min(300px,24vw)] md:block">
        {Array.from({ length: ROWS }, (_, i) => {
          const proj = PROJECTS[i % N]
          return (
            <li
              key={i}
              ref={(r) => {
                rows.current[i] = r
              }}
              className="absolute inset-x-0 -top-[70px] text-center will-change-transform"
            >
              <button
                type="button"
                tabIndex={i < N ? 0 : -1}
                aria-hidden={i >= N}
                onClick={() => pick(i, ROWS)}
                className="pointer-events-auto group"
              >
                <span className="type-label block">{PROJECT_LOOK[proj.slug].category}</span>
                <span className="mt-1 block type-menu text-[22px] group-hover:text-red transition-colors">{proj.title}</span>
                <span className="mx-auto my-3 block h-px w-3 bg-ink/60" />
                <span className="mx-auto block max-w-[250px] text-ink/80">{proj.kind}.</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Swatches for the card in front */}
      <div aria-hidden className="absolute right-4 top-1/2 hidden -translate-y-1/2 gap-[3px] md:flex md:right-5">
        {look.swatches.map((c, i) => (
          <span key={i} className="block size-[14px] transition-colors duration-700" style={{ backgroundColor: c, transitionDelay: `${i * 80}ms` }} />
        ))}
      </div>

      {/* Details for the card in front, left column */}
      <div key={p.slug} className="animate-fade-up absolute left-5 top-[42%] hidden w-[440px] grid-cols-[176px_1fr] gap-y-10 lg:grid">
        <dl className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 content-start">
          <dt className="type-label">Type</dt>
          <dd>{look.category}</dd>
          <dt className="type-label">Stack</dt>
          <dd>
            {p.stack.map((s) => (
              <span key={s} className="block">
                {s}
              </span>
            ))}
          </dd>
        </dl>
        <dl className="grid grid-cols-[76px_1fr] gap-x-3 gap-y-5 content-start">
          <dt className="type-label">Input</dt>
          <dd>“{p.input}”</dd>
          <dt className="type-label">Output</dt>
          <dd>{p.output}</dd>
          <dt className="type-label">Links</dt>
          <dd>
            <ProjectLinks project={p} className="pointer-events-auto" />
          </dd>
        </dl>
      </div>

      {/* Mobile caption */}
      <div key={`m-${p.slug}`} className="animate-fade-up absolute inset-x-4 bottom-24 text-center md:hidden">
        <p className="type-label">
          {String(active + 1).padStart(2, '0')}/{String(N).padStart(2, '0')} · {look.category}
        </p>
        <button type="button" onClick={() => open(active)} className="type-menu text-[34px] mt-1">
          {p.title} →
        </button>
        <p className="mt-2 text-ink/75">{p.kind}.</p>
      </div>

      {/* Counter */}
      <div aria-hidden className="pointer-events-none absolute bottom-12 left-[200px] z-[1100] hidden text-white mix-blend-difference [--stroke:#fff] md:block">
        <p className="mb-2 text-[13px] opacity-60">Selected work</p>
        <div className="flex items-start font-serif leading-none text-[clamp(90px,13vw,190px)]">
          <span className="type-outline">0</span>
          <span className="type-outline relative inline-block h-[1em] overflow-hidden">
            <span
              className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateY(-${active}em)` }}
            >
              {PROJECTS.map((_, i) => (
                <span key={i} className="block h-[1em]">
                  {i + 1}
                </span>
              ))}
            </span>
          </span>
          <span className="ml-2 mt-1 font-sans text-[13px] leading-none">/{String(N).padStart(2, '0')}</span>
        </div>
      </div>

      <p className="absolute bottom-4 left-4 md:bottom-5 md:left-5">Scroll</p>
    </main>
  )
}
