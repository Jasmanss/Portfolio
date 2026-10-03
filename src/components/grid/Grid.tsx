import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { PROJECTS } from '../../data/content'
import { gsap, lockScroll, prefersReducedMotion } from '../../lib/motion'
import { GridNav } from './nav'
import ProjectPanel from './ProjectPanel'
import type { Art } from './types'
import JArt from './tiles/JArt'
import SArt from './tiles/SArt'
import PortlkitArt from './tiles/PortlkitArt'
import EmberArt from './tiles/EmberArt'
import HavenArt from './tiles/HavenArt'
import ImperiumArt from './tiles/ImperiumArt'
import CallbackArt from './tiles/CallbackArt'
import HairStylArt from './tiles/HairStylArt'
import ContactArt from './tiles/ContactArt'
import AboutPanel from './tiles/AboutPanel'
import StackPanel from './tiles/StackPanel'
import EmberPanel from './tiles/EmberPanel'
import ContactPanel from './tiles/ContactPanel'

const SCRAMBLE = '01<>/\\{}[]#*+=-_'
// The halftone a tile's illustration is printed in: dot radius (px) on a 4px grid. At rest the dots are small, so
// the picture reads like the hero's dither; pointed at, they swell until they merge into solid ink.
const DOT_REST = '1.15px'
const DOT_ON = '3.2px'
// How far the crop marks sit inside a tile, and inside the screen when a panel is open.
const MARK_INSET = 12
const MARK_INSET_PHONE = 6
const MARK_INSET_HUGE = 20
const PANEL_INSET = 20

type Tile = { id: string; title: string; kind: string; Art: Art; Panel: ComponentType<{ index: number }> }

const project = (slug: string, Art: Art): Tile => {
  const p = PROJECTS.find((x) => x.slug === slug)!
  return { id: slug, title: p.title, kind: p.kind, Art, Panel: ({ index }) => <ProjectPanel project={p} Art={Art} index={index} /> }
}

const TILES: Tile[] = [
  { id: 'about', title: 'About', kind: 'The person behind all this', Art: JArt, Panel: AboutPanel },
  project('portlkit', PortlkitArt),
  { id: 'now', title: 'Ember', kind: 'What I’m building right now', Art: EmberArt, Panel: EmberPanel },
  project('haven', HavenArt),
  { id: 'stack', title: 'Side quest', kind: 'Pull the lever on my stack', Art: SArt, Panel: StackPanel },
  project('imperium', ImperiumArt),
  project('callback', CallbackArt),
  project('hairstyl', HairStylArt),
  { id: 'contact', title: 'Contact', kind: 'Say hi', Art: ContactArt, Panel: ContactPanel },
]

// Four white L-shaped crop marks, one per corner (the same marks that frame the hero's window).
function Marks({ attr }: { attr: string }) {
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <span key={k} {...{ [attr]: '' }} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 z-30 block opacity-0">
          <span className="absolute left-[-1px] top-[-1px] block h-[2px] w-[18px] bg-paper" />
          <span className="absolute left-[-1px] top-[-1px] block h-[18px] w-[2px] bg-paper" />
        </span>
      ))}
    </>
  )
}

// Where each corner mark goes for a box, plus the flip that turns the one L shape into all four corners.
function corners(l: number, t: number, r: number, b: number) {
  return [
    { x: l, y: t, scaleX: 1, scaleY: 1 },
    { x: r, y: t, scaleX: -1, scaleY: 1 },
    { x: l, y: b, scaleX: 1, scaleY: -1 },
    { x: r, y: b, scaleX: -1, scaleY: -1 },
  ]
}

// The grid after the hero: nine tiles (J, S, five projects, the live ember and contact). Each tile's illustration
// sits printed in halftone; pointing at one brings the hero's crop marks over to frame it, its dots swell into solid
// ink and its little scene plays. Clicking opens it to fill the screen, the same way the hero's window opens.
export default function Grid() {
  const root = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const from = useRef<DOMRect | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const [hover, setHover] = useState(true)
  // Touch screens can't point at a tile, so there the row the scroll is passing through comes alive instead.
  const [lit, setLit] = useState<number[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const pick = () => setHover(mq.matches)
    pick()
    mq.addEventListener('change', pick)
    return () => mq.removeEventListener('change', pick)
  }, [])

  const tiles = () => gsap.utils.toArray<HTMLElement>('[data-tile]', root.current)
  const arts = () => gsap.utils.toArray<HTMLElement>('[data-art]', root.current)
  const marks = () => gsap.utils.toArray<HTMLElement>('[data-grid-mark]', root.current)

  // The tiles print in when the grid scrolls into view: dots grow from nothing, from the middle outwards.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return
      gsap.set(arts(), { '--dot': '0px' })
      gsap.set('[data-tile-label]', { autoAlpha: 0, y: 8 })
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top 75%', once: true, refreshPriority: -1 } })
        .to(arts(), { '--dot': DOT_REST, duration: 1.1, ease: 'power2.out', stagger: { amount: 0.6, from: 'center', grid: 'auto' } })
        .to('[data-tile-label]', { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: { amount: 0.4, from: 'center', grid: 'auto' } }, 0.2)
    }, root)
    return () => ctx.revert()
  }, [])

  // On touch, follow a line across the screen as the page scrolls: the row of tiles crossing it is the live one.
  // The line sits mid-screen and drifts lower over the last half screen of the page, so the bottom row (which can
  // never scroll up to the middle) still gets its turn.
  useEffect(() => {
    if (hover) {
      setLit([])
      return
    }
    let raf = 0
    const measure = () => {
      raf = 0
      const vh = window.innerHeight
      const left = document.documentElement.scrollHeight - (window.scrollY + vh)
      const line = vh * (0.5 + 0.32 * gsap.utils.clamp(0, 1, 1 - left / (vh * 0.5)))
      const next: number[] = []
      tiles().forEach((el, i) => {
        const r = el.getBoundingClientRect()
        if (r.top <= line && r.bottom + 1 > line) next.push(i)
      })
      setLit((prev) => (prev.join() === next.join() ? prev : next))
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [hover])

  // A tile coming alive (pointed at, focused, or on touch scrolled through): its dots merge into solid ink and its
  // description decodes in. Only tiles whose state changed are touched, so the print-in above isn't cut short.
  const was = useRef<boolean[]>([])
  useEffect(() => {
    const kinds = gsap.utils.toArray<HTMLElement>('[data-kind]', root.current)
    arts().forEach((el, i) => {
      const on = active === i || lit.includes(i)
      if ((was.current[i] ?? false) === on) return
      was.current[i] = on
      gsap.to(el, { '--dot': on ? DOT_ON : DOT_REST, duration: on ? 0.55 : 0.8, ease: 'power3.out', overwrite: true })
      if (on) gsap.to(kinds[i], { scrambleText: { text: TILES[i].kind, chars: SCRAMBLE, speed: 0.8 }, duration: 0.7, overwrite: true })
      else gsap.to(kinds[i], { scrambleText: { text: '', chars: SCRAMBLE }, duration: 0.25, overwrite: true })
    })
  }, [active, lit])

  // The crop marks glide over to frame the tile being pointed at; on touch they frame the live row instead, and
  // travel down the grid with it like a viewfinder.
  useEffect(() => {
    const m = marks()
    const target = active !== null ? [active] : lit
    if (!target.length) {
      gsap.to(m, { autoAlpha: 0, duration: 0.3, overwrite: 'auto' })
      return
    }
    const place = (glide: boolean) => {
      const box = root.current!.getBoundingClientRect()
      const rs = target.map((i) => tiles()[i].getBoundingClientRect())
      // The marks keep the same distance from the tile's labels: nearer the edge on phones, further in on big monitors.
      const w = window.innerWidth
      const k = w < 768 ? MARK_INSET_PHONE : w >= 1800 ? MARK_INSET_HUGE : MARK_INSET
      const at = corners(
        Math.min(...rs.map((r) => r.left)) - box.left + k,
        Math.min(...rs.map((r) => r.top)) - box.top + k,
        Math.max(...rs.map((r) => r.right)) - box.left - k,
        Math.max(...rs.map((r) => r.bottom)) - box.top - k,
      )
      m.forEach((el, i) => (glide ? gsap.to(el, { ...at[i], duration: 0.55, ease: 'power3.out', overwrite: 'auto' }) : gsap.set(el, at[i])))
    }
    const appearing = gsap.getProperty(m[0], 'autoAlpha') === 0
    place(!appearing)
    if (appearing) gsap.to(m, { autoAlpha: 1, duration: 0.25, overwrite: 'auto' })
    const reflow = () => place(false)
    window.addEventListener('resize', reflow)
    return () => window.removeEventListener('resize', reflow)
  }, [active, lit])

  // Opening: the panel's clip starts as the tile and grows to the whole screen, its marks travelling with the
  // corners; then the contents stagger in.
  useLayoutEffect(() => {
    const el = panel.current
    const r = from.current
    if (shown === null || !el || !r) return
    lockScroll(true)
    const W = innerWidth
    const H = innerHeight
    const pm = gsap.utils.toArray<HTMLElement>('[data-panel-mark]', el)
    const start = corners(r.left, r.top, r.right, r.bottom)
    const end = corners(PANEL_INSET, PANEL_INSET, W - PANEL_INSET, H - PANEL_INSET)
    const reduce = prefersReducedMotion()
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } })
      tl.fromTo(
        el,
        { clipPath: `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px)` },
        { clipPath: 'inset(0px 0px 0px 0px)', duration: reduce ? 0 : 0.9 },
      )
      pm.forEach((m, i) => tl.fromTo(m, { ...start[i], autoAlpha: 1 }, { ...end[i], duration: reduce ? 0 : 0.9 }, 0))
      tl.from('[data-close]', { autoAlpha: 0, duration: 0.3, ease: 'none' }, reduce ? 0 : 0.6)
      if (!reduce) tl.from('[data-reveal]', { y: 28, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.05 }, 0.55)
    }, el)
    return () => ctx.revert()
  }, [shown])

  const open = (i: number) => {
    if (shown !== null) return
    from.current = tiles()[i].getBoundingClientRect()
    setActive(null)
    setShown(i)
  }

  // From inside an open panel: swap straight to another tile's panel (its contents stagger in again).
  const openTile = (id: string) => {
    const i = TILES.findIndex((t) => t.id === id)
    if (i < 0 || i === shown) return
    if (shown === null) return open(i)
    from.current = new DOMRect(0, 0, innerWidth, innerHeight)
    setShown(i)
  }

  // Closing runs the opening backwards, into wherever the tile is now.
  const closing = useRef(false)
  const close = () => {
    const el = panel.current
    if (shown === null || !el || closing.current) return
    closing.current = true
    const r = tiles()[shown].getBoundingClientRect()
    const W = innerWidth
    const H = innerHeight
    const pm = gsap.utils.toArray<HTMLElement>('[data-panel-mark]', el)
    const end = corners(r.left, r.top, r.right, r.bottom)
    const done = () => {
      closing.current = false
      lockScroll(false)
      setShown(null)
      tiles()[shown]?.focus({ preventScroll: true })
    }
    if (prefersReducedMotion()) return done()
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut', duration: 0.75 }, onComplete: done })
    tl.to('[data-reveal], [data-close]', { autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0)
      .to(el, { clipPath: `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px)` }, 0.1)
    pm.forEach((m, i) => tl.to(m, end[i], 0.1))
  }

  useEffect(() => {
    if (shown === null) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const Open = shown === null ? null : TILES[shown]

  return (
    <section ref={root} id="grid" data-grid aria-label="Work and more" className="relative overflow-x-clip bg-ink" onPointerLeave={() => setActive(null)}>
      {/* Phones: two columns of squares (the last tile runs the full width). Tablets, laptops and monitors: the
          whole grid on one screen, 3x3. A phone held sideways is too short for that, so it gets three columns of
          squares and scrolls. */}
      <div className="grid grid-cols-2 gap-px bg-paper/[0.09] [@media(min-aspect-ratio:1/1)_and_(max-height:559px)]:grid-cols-3 [@media(min-width:768px)_and_(min-height:560px)]:h-[100svh] [@media(min-width:768px)_and_(min-height:560px)]:grid-cols-3 [@media(min-width:768px)_and_(min-height:560px)]:grid-rows-3">
        {TILES.map((t, i) => (
          <button
            key={t.id}
            data-tile
            type="button"
            aria-label={`${t.title}: ${t.kind}`}
            aria-haspopup="dialog"
            onPointerEnter={() => hover && setActive(i)}
            // On touch a tap also focuses the tile on some browsers; only keyboard focus should bring the marks over.
            onFocus={(e) => (hover || e.currentTarget.matches(':focus-visible')) && setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            onClick={() => open(i)}
            className={`relative block overflow-hidden bg-ink text-left text-paper outline-none focus-visible:outline-none [@media(min-width:768px)_and_(min-height:560px)]:aspect-auto ${
              i === TILES.length - 1
                ? 'col-span-2 aspect-[2/1] [@media(min-aspect-ratio:1/1)_and_(max-height:559px)]:col-span-1 [@media(min-aspect-ratio:1/1)_and_(max-height:559px)]:aspect-square [@media(min-width:768px)_and_(min-height:560px)]:col-span-1'
                : 'aspect-square'
            }`}
          >
            <span data-art aria-hidden className="halftone absolute inset-x-5 bottom-12 top-10 block md:inset-x-10 md:bottom-14 md:top-12 [@media(min-width:768px)_and_(max-aspect-ratio:1/1)]:inset-x-6 huge:inset-x-14 huge:bottom-[76px] huge:top-16">
              <t.Art active={(active === i || lit.includes(i)) && shown === null} />
            </span>
            <span data-tile-label className="absolute left-4 top-4 type-label md:left-5 md:top-5 huge:left-8 huge:top-7 huge:text-[clamp(11px,0.4vw+4px,16px)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            {/* The description sits right of the title; in narrow tiles (tablets held upright, phones on their side)
                it wraps onto a second line, and the title lines up with its last line. */}
            <span data-tile-label className="absolute inset-x-4 bottom-4 flex items-baseline justify-between gap-4 [align-items:last_baseline] md:inset-x-5 md:bottom-5 huge:inset-x-8 huge:bottom-7">
              <span className="shrink-0 text-[14px] leading-none md:text-[15px] huge:text-[clamp(15px,0.7vw+2px,22px)]">{t.title}</span>
              <span data-kind className="-mb-[2px] hidden min-w-0 text-right type-label leading-[1.3] md:block huge:text-[clamp(11px,0.4vw+4px,16px)]" />
            </span>
          </button>
        ))}
      </div>
      <Marks attr="data-grid-mark" />

      {Open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={Open.title}
            className="fixed inset-0 z-[150] bg-ink text-paper"
            style={{ clipPath: 'inset(50%)' }}
          >
            <div data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
              <GridNav.Provider value={{ openTile }}>
                <Open.Panel key={shown} index={shown!} />
              </GridNav.Provider>
            </div>
            <Marks attr="data-panel-mark" />
            {/* The padding makes a 44px target for thumbs and the text sits 36px in, just inside the corner mark. Its
                solid ink box (invisible against the panel) keeps a panel's copy from showing through it as it
                scrolls underneath on phones. */}
            <button
              data-close
              type="button"
              onClick={close}
              autoFocus
              className="absolute right-6 top-[22px] z-40 bg-ink p-3 font-mono text-[12px] uppercase leading-[20px] tracking-[0.06em] text-paper hover:text-accent huge:right-9 huge:top-9 huge:text-[clamp(12px,0.3vw+6px,15px)]"
            >
              Close <span aria-hidden>×</span>
            </button>
          </div>,
          document.body,
        )}
    </section>
  )
}
