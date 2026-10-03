import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Draggable } from 'gsap/Draggable'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import { useGridNav } from '../nav'

gsap.registerPlugin(Draggable)

// Panel 05, Side quest: a slot machine made of the stack. Three reels of tool names, a lever to pull (or a button, or
// Space), and every pull lands on the real stack of something he built. Seven builds hide in the reels.

type Build = {
  id: string
  name: string
  reels: [string, string, string]
  that: string
  line: string
  tile?: string
}

const BUILDS: Build[] = [
  {
    id: 'portlkit',
    name: 'Portlkit',
    reels: ['Next.js', 'Supabase', 'Vercel'],
    that: 'Portlkit',
    line: 'Client portals for freelancers, built around getting paid.',
    tile: 'portlkit',
  },
  {
    id: 'haven',
    name: 'Haven',
    reels: ['Next.js', 'Supabase', 'Plaid'],
    that: 'Haven',
    line: 'A private money dashboard for a two-person household.',
    tile: 'haven',
  },
  {
    id: 'imperium',
    name: 'Imperium',
    reels: ['FastAPI', 'SQLite', 'Claude API'],
    that: 'Imperium',
    line: 'Text your Mac from your phone. It asks before anything risky.',
    tile: 'imperium',
  },
  {
    id: 'callback',
    name: 'Callback',
    reels: ['React', 'Gmail API', 'Claude API'],
    that: 'Callback',
    line: 'The job tracker that reads your inbox, so statuses update themselves.',
    tile: 'callback',
  },
  {
    id: 'hairstyl',
    name: 'HairStyl',
    reels: ['SwiftUI', 'Supabase', 'OpenAI API'],
    that: 'HairStyl',
    line: 'Reads a selfie and recommends what to do with your hair.',
    tile: 'hairstyl',
  },
  {
    id: 'motherson',
    name: 'Motherson',
    reels: ['Flask', 'SQL', 'Power Automate'],
    that: 'the Motherson app',
    line: 'The maintenance app at Motherson. It replaced paper checklists across 147 machines.',
  },
  {
    id: 'aurelius',
    name: 'Aurelius',
    reels: ['React', 'Supabase', 'Vercel'],
    that: 'the Aurelius store',
    line: 'A live ecommerce frontend for Aurelius, shipped weekly.',
  },
]

// The reels: every build's parts plus decoys from the stack, and one 7 each (three of them is the jackpot). Reel three
// is ordered so a near miss (one notch past a winner) never lands on another winner.
const SEVEN = '7'
const REELS = [
  {
    label: 'Build',
    items: ['Next.js', 'Vite', 'FastAPI', 'TypeScript', SEVEN, 'React', 'Node.js', 'SwiftUI', 'Python', 'Flask', 'Tailwind CSS', 'Swift'],
  },
  {
    label: 'Data',
    items: ['Supabase', 'PostgreSQL', 'SQLite', SEVEN, 'REST APIs', 'Gmail API', 'Ubuntu', 'SQL', 'systemd'],
  },
  {
    label: 'Power',
    items: ['Vercel', 'Ollama', 'Claude API', 'Gunicorn', SEVEN, 'Plaid', 'GitHub Actions', 'OpenAI API', 'pytest', 'Power Automate'],
  },
]
const START = ['TypeScript', 'PostgreSQL', 'GitHub Actions'] // the calm, losing line the machine opens on
const REPS = 8 // each reel's strip is its items this many times over, so a spin has room to run
const CENTER = 2 // the pay line is the middle row
const SCRAMBLE = '01<>/\\{}[]#*+=-_'
const JUNK = '0123456789ABCDEFHKMNPRTUVWXZ#%*+='
const KEY = 'stack-slots:found'

const valid = (t: string[]) => BUILDS.find((b) => b.reels.every((x, i) => x === t[i]))
const notchPast = (b: Build) => {
  const r = REELS[2].items
  return [b.reels[0], b.reels[1], r[(r.indexOf(b.reels[2]) + 1) % r.length]]
}
const readFound = (): string[] => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? BUILDS.filter((b) => v.includes(b.id)).map((b) => b.id) : []
  } catch {
    return []
  }
}
const saveFound = (ids: string[]) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Private mode or blocked storage: the quest just lasts as long as the page.
  }
}

// What the pay line last came up with (n counts results, so each one mounts and animates fresh).
type Result =
  | { kind: 'idle'; n: number }
  | { kind: 'win'; n: number; build: Build }
  | { kind: 'miss'; n: number; got: string[] }
  | { kind: 'done'; n: number }

// The outer two rows of a reel are printed in the grid's halftone; the middle three are solid.
const PRINT: CSSProperties = {
  WebkitMaskImage: 'linear-gradient(#000, #000), radial-gradient(circle, #000 0.9px, transparent 1.4px)',
  maskImage: 'linear-gradient(#000, #000), radial-gradient(circle, #000 0.9px, transparent 1.4px)',
  WebkitMaskSize: '100% 60%, 3px 3px',
  maskSize: '100% 60%, 3px 3px',
  WebkitMaskPosition: '0 50%, 0 0',
  maskPosition: '0 50%, 0 0',
  WebkitMaskRepeat: 'no-repeat, repeat',
  maskRepeat: 'no-repeat, repeat',
}

// One reel's strip of names (the same strip is drawn twice: grey in the window, paper inside the pay line).
function Strip({ items, tone }: { items: string[]; tone: 'mute' | 'paper' }) {
  return (
    <div
      data-strip
      className={`absolute inset-x-0 top-0 will-change-transform ${tone === 'mute' ? 'text-mute' : 'text-paper'}`}
      {...(tone === 'paper' ? { 'data-lit': '' } : {})}
    >
      {Array.from({ length: REPS }, (_, r) =>
        items.map((s, k) => (
          <div key={`${r}-${k}`} className="flex h-[var(--row)] items-center justify-center px-1 split:whitespace-nowrap">
            {s === SEVEN ? (
              <span className="block origin-center font-serif text-[length:calc(var(--row)*0.78)] italic leading-none [transform:scaleY(var(--smear,1))]">7</span>
            ) : (
              // Phones and upright tablets: sized to the reel and allowed to break onto two lines (GITHUB / ACTIONS),
              // so the names stay legible in a narrow reel. Side by side: one line, as before. Big monitors: sized to the row.
              <span className="block origin-center text-center font-mono text-[length:clamp(11px,13.5cqw,22px)] uppercase leading-[1.08] tracking-[0.04em] [transform:scaleY(var(--smear,1))] split:text-[length:clamp(8px,calc(11cqw_-_1px),22px)] split:leading-none huge:text-[length:clamp(22px,min(calc(var(--row)*0.34),9cqw),36px)]">
                {s}
              </span>
            )}
          </div>
        )),
      )}
    </div>
  )
}

// A white L crop mark (the hero's), flipped into whichever corner it sits in.
function Mark({ x, y }: { x: 'left' | 'right'; y: 'top' | 'bottom' }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute block h-[18px] w-[18px]"
      style={{
        [x]: -12,
        [y]: -12,
        transform: `scale(${x === 'right' ? -1 : 1}, ${y === 'bottom' ? -1 : 1})`,
      }}
    >
      <span className="absolute left-0 top-0 block h-[2px] w-[18px] bg-paper" />
      <span className="absolute left-0 top-0 block h-[18px] w-[2px] bg-paper" />
    </span>
  )
}

// A line of serif italic where every letter is a little wheel that spins down onto it (the site's loader, again).
function Wheels({ parts }: { parts: { text: string; className?: string }[] }) {
  const words = useMemo(() => {
    const out: {
      ch: string
      className?: string
      spins: number
      junk: string[]
    }[][] = [[]]
    let i = 0
    parts.forEach((p) => {
      for (const ch of p.text) {
        if (ch === ' ') {
          out.push([])
          continue
        }
        const spins = 3 + (i++ % 4)
        out[out.length - 1].push({
          ch,
          className: p.className,
          spins,
          junk: Array.from({ length: spins }, () => JUNK[(Math.random() * JUNK.length) | 0]),
        })
      }
    })
    return out.filter((w) => w.length)
  }, [parts])
  return (
    <>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          {wi > 0 && ' '}
          <span className="inline-block whitespace-nowrap">
            {w.map((c, ci) => (
              <span key={ci} className={`relative inline-block ${c.className ?? ''}`} style={{ clipPath: 'inset(-0.14em -0.16em -0.24em -0.16em)' }}>
                <span className="invisible">{c.ch}</span>
                <span
                  data-wheel
                  data-spins={c.spins}
                  className="absolute inset-x-0 top-0 block"
                  style={{ transform: `translateY(${-c.spins * 1.4}em)` }}
                >
                  {[...c.junk, c.ch, ' '].map((g, k) => (
                    <span key={k} className="block h-[1.4em]">
                      {g}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  )
}

// What the line came up with: the big line spins in letter by letter, then the description and the button print in.
function ResultBody({ result, onOpen }: { result: Result; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const build = result.kind === 'win' ? result.build : null
  const big = useMemo(() => {
    if (result.kind === 'win')
      return [{ text: 'That’s ', className: 'text-paper/55' }, { text: result.build.that }, { text: '.', className: 'text-accent' }]
    if (result.kind === 'miss')
      return [
        { text: 'So close', className: 'text-paper' },
        { text: '.', className: 'text-accent' },
        { text: ' Pull again', className: 'text-paper/55' },
        { text: '.', className: 'text-paper/55' },
      ]
    if (result.kind === 'done') return [{ text: 'Side quest complete' }, { text: '.', className: 'text-accent' }]
    return [
      { text: 'Give it a pull', className: 'text-paper/40' },
      { text: '.', className: 'text-accent' },
    ]
  }, [result])
  const desc =
    result.kind === 'win'
      ? result.build.line
      : result.kind === 'miss'
        ? 'The last reel slipped one notch past a build.'
        : result.kind === 'done'
          ? 'All seven builds found. The lever still works.'
          : 'Seven builds are hiding in these reels.'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || result.kind === 'idle' || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-wheel]',
        { y: 0 },
        {
          y: (_: number, w: HTMLElement) => `${-Number(w.dataset.spins) * 1.4}em`,
          duration: 0.95,
          ease: 'power4.out',
          stagger: 0.028,
        },
      )
      gsap.fromTo(
        '[data-print]',
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.8,
          ease: 'power3.inOut',
          stagger: 0.12,
          delay: 0.3,
        },
      )
    }, el)
    return () => ctx.revert()
  }, [result])

  // On a phone the result prints in below the machine, often under the fold or the browser's toolbar. Scroll just far
  // enough to show the big line and the description, but never so far that the Pull button leaves the screen.
  useEffect(() => {
    const el = ref.current
    if (!el || result.kind === 'idle') return
    const scroller = el.closest<HTMLElement>('[data-lenis-prevent]')
    if (!scroller) return
    const id = requestAnimationFrame(() => {
      const view = scroller.getBoundingClientRect()
      const bottom = Math.min(view.bottom, window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : innerHeight)
      const want = Math.max(...[...el.querySelectorAll<HTMLElement>(':scope > p')].map((p) => p.getBoundingClientRect().bottom))
      const pull = scroller.querySelector<HTMLElement>('[data-pull]')?.getBoundingClientRect()
      const room = pull ? pull.top - view.top - 24 : Infinity
      const by = Math.min(want + 20 - bottom, room)
      if (by > 4) scroller.scrollBy({ top: by, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [result])

  return (
    <div ref={ref} data-result-body>
      <p className="font-serif text-[clamp(40px,6.4vw,60px)] italic leading-[0.95] tracking-[-0.01em] split:text-[clamp(40px,4.4vw,72px)] huge:text-[clamp(72px,4.1vw,108px)]">
        <Wheels parts={big} />
      </p>
      <p data-print className="mt-4 max-w-[38ch] text-[15px] leading-snug text-paper/70 md:text-[16px] huge:mt-6 huge:text-[clamp(17px,0.55vw+8px,22px)]">
        {desc}
      </p>
      {build?.tile && (
        <div data-print className="mt-6 huge:mt-9">
          <button
            type="button"
            onClick={() => onOpen(build.tile!)}
            className="group inline-flex h-12 items-center gap-3 rounded-full border border-accent px-6 font-mono text-[12px] uppercase tracking-[0.06em] text-paper transition-colors hover:bg-accent hover:text-ink focus-visible:bg-accent focus-visible:text-ink split:h-11 split:px-5 huge:h-14 huge:px-7 huge:text-[14px]"
          >
            Open {build.name}
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// A number that rolls like a reel when it changes.
function Digit({ n }: { n: number }) {
  const col = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const yPercent = (-n * 100) / 8
    if (first.current || prefersReducedMotion()) {
      first.current = false
      gsap.set(col.current, { yPercent })
      return
    }
    gsap.to(col.current, {
      yPercent,
      duration: 0.9,
      ease: 'power4.out',
      overwrite: true,
    })
  }, [n])
  return (
    <span className="relative inline-block h-[1.2em] overflow-hidden align-bottom tabular-nums">
      <span className="invisible">0</span>
      <span ref={col} className="absolute inset-x-0 top-0 block">
        {Array.from({ length: 8 }, (_, k) => (
          <span key={k} className="block h-[1.2em] leading-[1.2em]">
            {k}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function StackPanel({ index = 4 }: { index?: number }) {
  const { openTile } = useGridNav()
  const root = useRef<HTMLDivElement>(null)
  const pullBtn = useRef<HTMLButtonElement>(null)
  const pullRef = useRef<() => void>(() => {})
  const [found, setFound] = useState<string[]>(readFound)
  const foundRef = useRef(found)
  foundRef.current = found
  const [result, setResult] = useState<Result>({ kind: 'idle', n: 0 })
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState('')
  const lit = useRef<Set<string>>(new Set(found))
  // How the pulls have gone so far (kept outside the effect so a remount mid-visit can't forget the last result).
  const record = useRef({ pulls: 0, lastMiss: false, lastId: '' })

  // The machine: reels, lever, keyboard, the near misses and the jackpot.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = prefersReducedMotion()
    const css = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/\s+/).join(', ')
    const ACCENT = `rgb(${css || '77, 163, 255'})`
    const PAPER = '#F2F2F2'
    const MUTE = '#7C7C7C'
    let spinning = false
    let ro: ResizeObserver | null = null
    let drag: Draggable | null = null
    let removeKeys = () => {}
    let stopSmear = () => {}

    const ctx = gsap.context(() => {
      const reels = gsap.utils.toArray<HTMLElement>('[data-reel]', el)
      const strips = reels.map((r) => gsap.utils.toArray<HTMLElement>('[data-strip]', r))
      const litStrips = reels.map((r) => r.querySelector<HTMLElement>('[data-lit]')!)
      const labels = gsap.utils.toArray<HTMLElement>('[data-reel-label]', el)
      const parts = gsap.utils.toArray<HTMLElement>('[data-part]', el)
      const pay = gsap.utils.toArray<HTMLElement>('[data-pay]', el)
      const win = el.querySelector<HTMLElement>('[data-window]')!
      const knob = el.querySelector<HTMLElement>('[data-knob]')!
      const knobDot = el.querySelector<HTMLElement>('[data-knob-dot]')!
      const rod = el.querySelector<HTMLElement>('[data-rod]')!
      const lever = el.querySelector<HTMLElement>('[data-lever]')!
      const canvas = el.querySelector<HTMLCanvasElement>('[data-burst]')!

      // Where each reel is, as a (fractional) index into its strip of the row on the pay line.
      const pos = REELS.map((r, i) => r.items.length + r.items.indexOf(START[i]))
      const yp = (i: number, p: number) => ((CENTER - p) / (REELS[i].items.length * REPS)) * 100
      const place = (i: number) => gsap.set(strips[i], { yPercent: yp(i, pos[i]) })
      REELS.forEach((_, i) => place(i))
      // Back to the second lap of the strip once a reel has stopped, so there is always room to spin again.
      const rewind = (i: number) => {
        const n = REELS[i].items.length
        pos[i] = n + (((Math.round(pos[i]) % n) + n) % n)
        place(i)
      }
      // The first index at least `travel` rows ahead whose name is `item`.
      const ahead = (i: number, item: string, travel: number) => {
        const r = REELS[i].items
        const n = r.length
        const to = Math.round(pos[i]) + travel
        return to + ((r.indexOf(item) - (to % n) + n) % n)
      }

      parts.forEach((p) => (p.textContent = '?'))
      gsap.set(pay, { scaleX: 0 })
      const setPart = (i: number, text: string) => {
        if (reduce) parts[i].textContent = text
        else
          gsap.to(parts[i], {
            scrambleText: { text, chars: SCRAMBLE, speed: 1 },
            duration: 0.45,
            overwrite: true,
          })
      }

      // The lever: a rod from the pivot up to the knob. Pulled, the knob comes down the face of the machine, swelling
      // as it passes closest to you, and the rod folds through the pivot and out the bottom.
      let travel = 0
      const sync = () => {
        const t = travel ? gsap.utils.clamp(-0.25, 1, Number(gsap.getProperty(knob, 'y')) / travel) : 0
        gsap.set(rod, { scaleY: 1 - 2 * t })
        gsap.set(knob, {
          scale: 1 + 0.22 * Math.sin(Math.PI * gsap.utils.clamp(0, 1, t)),
        })
      }
      const measure = () => {
        const H = lever.clientHeight
        const r = knob.offsetWidth / 2
        const L = Math.max(20, H / 2 - r - 4)
        travel = 2 * L
        gsap.set(rod, { top: H / 2 - L, height: L })
        gsap.set(knob, { top: H / 2 - L - r })
        drag?.applyBounds({ minY: 0, maxY: travel })
        sync()
      }
      // Let go, the spring snaps it back up against its stop, where it knocks twice and rests.
      let spring: gsap.core.Animation | null = null
      const release = () => {
        spring?.kill()
        if (reduce) {
          gsap.set(knob, { y: 0 })
          return sync()
        }
        const from = Number(gsap.getProperty(knob, 'y')) / (travel || 1)
        const d = { onUpdate: sync }
        spring = gsap
          .timeline()
          .to(knob, { ...d, y: 0, duration: 0.18 + 0.2 * from, ease: 'power3.in' })
          .to(knob, { ...d, y: () => travel * 0.09 * from, duration: 0.12, ease: 'power2.out' })
          .to(knob, { ...d, y: 0, duration: 0.12, ease: 'power2.in' })
          .to(knob, { ...d, y: () => travel * 0.025 * from, duration: 0.07, ease: 'power1.out' })
          .to(knob, { ...d, y: 0, duration: 0.07, ease: 'power1.in' })
      }

      // While the reels run, the names stretch along the direction of travel in proportion to their speed (a smear
      // frame, never a blur), and snap back crisp as they slow down.
      const last = REELS.map(() => 0)
      const smear = () => {
        reels.forEach((r, i) => {
          const y = Number(gsap.getProperty(strips[i][0], 'yPercent'))
          const rows = (Math.abs(y - last[i]) / 100) * REELS[i].items.length * REPS
          last[i] = y
          const perSecond = rows / (gsap.ticker.deltaRatio(60) / 60)
          r.style.setProperty('--smear', (1 + Math.min(perSecond / 26, 1.6)).toFixed(3))
        })
      }
      const smearOn = () => {
        REELS.forEach((_, i) => (last[i] = Number(gsap.getProperty(strips[i][0], 'yPercent'))))
        gsap.ticker.add(smear)
      }
      const smearOff = () => {
        gsap.ticker.remove(smear)
        reels.forEach((r) => r.style.setProperty('--smear', '1'))
      }
      stopSmear = smearOff

      // Lines the result up: mostly the builds not found yet, and never the same one twice running (a repeat reads as
      // if the machine didn't spin at all).
      const choose = () => {
        const have = new Set(foundRef.current)
        const w = BUILDS.map((b): number => (b.id === record.current.lastId ? 0 : have.has(b.id) ? 1 : 3.2))
        let k = Math.random() * w.reduce((a, b) => a + b, 0)
        for (let i = 0; i < BUILDS.length; i++) if ((k -= w[i]) <= 0) return BUILDS[i]
        return BUILDS[BUILDS.length - 1]
      }

      const exitResult = (tl: gsap.core.Timeline) => {
        const wheels = el.querySelectorAll<HTMLElement>('[data-result-body] [data-wheel]')
        const prints = el.querySelectorAll<HTMLElement>('[data-result-body] [data-print]')
        if (reduce) return
        if (wheels.length)
          tl.to(
            wheels,
            {
              y: (_: number, w: HTMLElement) => `${-(Number(w.dataset.spins) + 1) * 1.4}em`,
              duration: 0.4,
              ease: 'power2.in',
              stagger: 0.012,
              overwrite: 'auto',
            },
            0,
          )
        if (prints.length)
          tl.to(
            prints,
            {
              clipPath: 'inset(0% 0% 0% 100%)',
              duration: 0.45,
              ease: 'power3.in',
              overwrite: 'auto',
            },
            0,
          )
      }

      // A dithered shockwave of sky-blue dots on the grid's 4px pitch, rippling out from the pay line.
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
      const burst = () => {
        if (reduce) return
        const box = el.getBoundingClientRect()
        const w = Math.ceil(el.clientWidth)
        const h = Math.ceil(el.scrollHeight)
        canvas.width = w
        canvas.height = h
        canvas.style.height = `${h}px`
        const g = canvas.getContext('2d')
        if (!g) return
        const wr = win.getBoundingClientRect()
        const cx = wr.left - box.left + wr.width / 2
        const cy = wr.top - box.top + wr.height / 2
        const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy))
        const reach = Math.min(far, 900)
        g.fillStyle = ACCENT
        const grow = gsap.parseEase('power3.out')
        const dim = gsap.parseEase('power2.in')
        const s = { p: 0 }
        gsap.to(s, {
          p: 1,
          duration: 1.5,
          ease: 'none',
          onUpdate: () => {
            const p = s.p
            const R = reach * grow(p)
            const W = 30 + 150 * p
            const fade = 1 - dim(p)
            g.clearRect(0, 0, w, h)
            const x0 = Math.max(0, Math.floor((cx - R - W) / 4) * 4)
            const x1 = Math.min(w, cx + R + W)
            const y0 = Math.max(0, Math.floor((cy - R - W) / 4) * 4)
            const y1 = Math.min(h, cy + R + W)
            for (let y = y0; y < y1; y += 4) {
              for (let x = x0; x < x1; x += 4) {
                const d = Math.hypot(x - cx, y - cy)
                let k = 1 - Math.abs(d - R) / W
                if (k <= 0) continue
                if (d < R) k *= 0.55 // the wake behind the front thins out
                if (k * fade > (BAYER[((y >> 2) & 3) * 4 + ((x >> 2) & 3)] + 0.5) / 16) g.fillRect(x, y, 2, 2)
              }
            }
          },
          onComplete: () => g.clearRect(0, 0, w, h),
        })
      }

      // The jackpot, once all seven are found: every reel flashes through and locks on 7, the line goes sky blue,
      // the dots burst out and the quest is marked complete.
      const celebrate = () => {
        spinning = true
        setBusy(true)
        const tl = gsap.timeline({
          onComplete: () => {
            spinning = false
            setBusy(false)
          },
        })
        if (!reduce) smearOn()
        exitResult(tl)
        tl.to(litStrips, { color: PAPER, duration: 0.2 }, 0).to(pay, { scaleX: 0, duration: 0.25, ease: 'power2.in' }, 0)
        if (!reduce) parts.forEach((_, i) => tl.call(() => setPart(i, '?'), [], 0.05 * i))
        let lock = 0
        REELS.forEach((_, i) => {
          const to = ahead(i, SEVEN, REELS[i].items.length * 2)
          const t0 = 0.12 + i * 0.05
          const dur = reduce ? 0 : 1.05 + i * 0.1
          tl.to(strips[i], { yPercent: yp(i, to + 0.14), duration: dur, ease: 'power4.out' }, t0)
            .to(
              strips[i],
              {
                yPercent: yp(i, to),
                duration: reduce ? 0 : 0.45,
                ease: 'elastic.out(1, 0.45)',
                onComplete: () => rewind(i),
              },
              t0 + dur,
            )
            .call(() => setPart(i, '7'), [], t0 + dur)
            .to(labels[i], { color: PAPER, duration: 0.2 }, t0 + dur)
          pos[i] = to
          lock = Math.max(lock, t0 + dur)
        })
        tl.call(smearOff, [], lock)
        tl.to(litStrips, { color: ACCENT, duration: 0.15, stagger: 0.05, overwrite: 'auto' }, lock)
          .set(pay, { transformOrigin: '50% 50%' }, lock)
          .to(pay, { scaleX: 1, duration: reduce ? 0 : 0.6, ease: 'expo.out' }, lock)
          .call(() => void ctx.add(burst), [], lock)
          .call(
            () => {
              setResult((r) => ({ kind: 'done', n: r.n + 1 }))
              setLive('7, 7, 7. Side quest complete: all seven builds found.')
            },
            [],
            lock + 0.1,
          )
        if (!reduce)
          tl.to(
            '[data-chip]',
            {
              y: -7,
              duration: 0.18,
              ease: 'power2.out',
              yoyo: true,
              repeat: 1,
              stagger: 0.05,
            },
            lock + 0.2,
          )
      }

      // Everything that happens once the third reel settles.
      const land = (got: string[], hit: Build | undefined) => {
        const tl = gsap.timeline()
        if (hit) {
          tl.set(pay, { transformOrigin: '0% 50%' })
            .to(pay, { scaleX: 1, duration: reduce ? 0 : 0.7, ease: 'power3.inOut' }, 0)
            .to(
              litStrips,
              {
                color: ACCENT,
                duration: reduce ? 0 : 0.2,
                stagger: reduce ? 0 : 0.14,
                overwrite: 'auto',
              },
              0.05,
            )
          const had = foundRef.current
          const fresh = !had.includes(hit.id)
          const next = fresh ? BUILDS.filter((b) => had.includes(b.id) || b.id === hit.id).map((b) => b.id) : had
          tl.call(
            () => {
              setResult((r) => ({ kind: 'win', n: r.n + 1, build: hit }))
              if (fresh) {
                setFound(next)
                saveFound(next)
              }
              setLive(`${got.join(', ')}. That’s ${hit.that}. ${hit.line} Found ${next.length} of 7.`)
            },
            [],
            reduce ? 0 : 0.2,
          )
          if (fresh && next.length === BUILDS.length) tl.call(() => void ctx.add(celebrate), [], reduce ? 0 : 2.4)
          else
            tl.call(
              () => {
                spinning = false
                setBusy(false)
              },
              [],
              reduce ? 0 : 0.5,
            )
        } else {
          // So close: the line starts to light, then gives up two thirds of the way across.
          tl.set(pay, { transformOrigin: '0% 50%' })
          if (!reduce)
            tl.to(pay, { scaleX: 0.64, duration: 0.5, ease: 'power3.out' }).to(pay, { scaleX: 0, duration: 0.35, ease: 'power2.in' }, '+=0.1')
          tl.call(
            () => {
              setResult((r) => ({ kind: 'miss', n: r.n + 1, got }))
              setLive(`${got.join(', ')}. So close. Pull again.`)
              spinning = false
              setBusy(false)
            },
            [],
            reduce ? 0 : 0.15,
          )
        }
      }

      const spin = () => {
        const build = choose()
        const near = notchPast(build)
        const h = record.current
        const miss = h.pulls > 0 && !h.lastMiss && Math.random() < 0.22 && !valid(near)
        h.pulls++
        h.lastMiss = miss
        h.lastId = build.id
        const got = miss ? near : [...build.reels]

        const tl = gsap.timeline()
        if (!reduce) smearOn()
        exitResult(tl)
        tl.to(litStrips, { color: PAPER, duration: 0.2 }, 0)
          .set(pay, { transformOrigin: '100% 50%' }, 0)
          .to(pay, { scaleX: 0, duration: reduce ? 0 : 0.3, ease: 'power2.in' }, 0)
          .to(labels, { color: MUTE, duration: 0.2 }, 0)
        // (With reduced motion the reels jump straight to the result below, so the line never blanks to '?'.)
        if (!reduce) parts.forEach((_, i) => tl.call(() => setPart(i, '?'), [], 0.04 * i))

        let end = 0
        REELS.forEach((r, i) => {
          const n = r.items.length
          const slip = miss && i === 2
          const to = ahead(i, build.reels[i], Math.round(n * (2 + i * 0.6)) + 3) + (slip ? 1 : 0)
          const from = pos[i]
          pos[i] = to
          if (reduce) {
            rewind(i)
            setPart(i, got[i])
            gsap.set(labels[i], { color: PAPER })
            return
          }
          // Wind back a notch as the lever goes down, then spin up and run down hard, left to right.
          tl.to(strips[i], { yPercent: yp(i, from - 0.3), duration: 0.22, ease: 'power2.out' }, i * 0.04)
          const t0 = 0.22 + i * 0.08
          const dur = 1.3 + i * 0.42
          const settle = {
            yPercent: yp(i, to),
            duration: 0.45,
            ease: 'elastic.out(1, 0.45)',
            onComplete: () => rewind(i),
          }
          let stop: number
          if (slip) {
            // Comes to rest on the winner... then creeps one notch past it.
            tl.to(
              strips[i],
              {
                yPercent: yp(i, to - 1 + 0.06),
                duration: dur,
                ease: 'power4.out',
              },
              t0,
            )
              .to(
                strips[i],
                {
                  yPercent: yp(i, to + 0.12),
                  duration: 0.42,
                  ease: 'power2.inOut',
                },
                t0 + dur + 0.28,
              )
              .to(strips[i], settle, t0 + dur + 0.7)
            stop = t0 + dur + 0.7
          } else {
            tl.to(strips[i], { yPercent: yp(i, to + 0.16), duration: dur, ease: 'power4.out' }, t0).to(strips[i], settle, t0 + dur)
            stop = t0 + dur
          }
          tl.call(() => setPart(i, got[i]), [], stop).to(labels[i], { color: PAPER, duration: 0.25 }, stop)
          end = Math.max(end, stop)
        })
        tl.call(smearOff, [], reduce ? 0 : end)
        tl.call(() => void ctx.add(() => land(got, miss ? undefined : build)), [], reduce ? 0 : end + 0.12)
      }

      // Pulling, from the lever (already down) or from the button / keyboard / a tap on the knob (lever runs itself).
      const pull = (byHand = false) => {
        if (spinning) return
        spinning = true
        setBusy(true)
        ctx.add(() => {
          if (byHand || reduce) {
            spin()
            if (!byHand) release()
            return
          }
          spring?.kill()
          gsap.to(knob, {
            y: travel,
            duration: 0.24,
            ease: 'power3.in',
            onUpdate: sync,
            onComplete: release,
          })
          gsap.delayedCall(0.14, () => void ctx.add(spin))
        })
      }
      pullRef.current = () => pull(false)

      let fired = false
      drag = Draggable.create(knob, {
        type: 'y',
        bounds: { minY: 0, maxY: 0 },
        allowContextMenu: false,
        onPress() {
          fired = false
          spring?.kill()
          gsap.to(knobDot, { scale: 0.86, duration: 0.15, ease: 'power2.out' })
        },
        onDrag() {
          sync()
          if (!fired && this.y >= travel * 0.97) {
            fired = true
            pull(true)
            this.endDrag(this.pointerEvent)
          }
        },
        onRelease() {
          gsap.to(knobDot, {
            scale: 1,
            duration: 0.5,
            ease: 'elastic.out(1, 0.4)',
          })
          if (!fired && this.y > travel * 0.5) {
            fired = true
            pull(true)
          }
          release()
        },
        onClick() {
          if (!fired) pull(false)
        },
      })[0]
      measure()
      ro = new ResizeObserver(measure)
      ro.observe(lever)

      // A one-time tug on the lever once the panel has printed in, so it reads as something to grab.
      if (!reduce)
        gsap
          .timeline({ delay: 1.5 })
          .to(knob, {
            y: () => travel * 0.14,
            duration: 0.3,
            ease: 'power2.inOut',
            onUpdate: sync,
          })
          .add(release)

      // Space or Enter pulls, unless a control has focus (that control keeps its own keys).
      const key = (e: KeyboardEvent) => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        if (e.metaKey || e.ctrlKey || e.altKey) return
        const t = e.target as HTMLElement | null
        if (t?.closest?.('a, button, input, textarea, select, [contenteditable="true"]')) return
        e.preventDefault()
        if (!e.repeat) pull(false)
      }
      window.addEventListener('keydown', key)
      removeKeys = () => window.removeEventListener('keydown', key)

      // Once the panel has printed in, hand keyboard focus to the Pull button (unless the visitor has moved it).
      gsap.delayedCall(reduce ? 0 : 1.05, () => {
        const a = document.activeElement as HTMLElement | null
        if (!a || a === document.body || a.matches('[data-close]')) pullBtn.current?.focus({ preventScroll: true })
      })
    }, el)

    return () => {
      removeKeys()
      stopSmear()
      ro?.disconnect()
      drag?.kill()
      pullRef.current = () => {}
      ctx.revert()
    }
  }, [])

  // A newly found build lights its chip: sky blue wipes across it and it hops.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const fresh = found.filter((id) => !lit.current.has(id))
    fresh.forEach((id) => {
      lit.current.add(id)
      if (prefersReducedMotion()) return
      const chip = el.querySelector<HTMLElement>(`[data-chip="${id}"]`)
      if (!chip) return
      gsap.fromTo(
        chip.querySelector('[data-fill]'),
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.7,
          ease: 'power3.inOut',
          delay: 0.15,
        },
      )
      gsap.fromTo(
        chip,
        { y: 0 },
        {
          y: -8,
          duration: 0.2,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          delay: 0.15,
        },
      )
    })
  }, [found])

  const done = found.length === BUILDS.length

  return (
    <div ref={root} className="relative min-h-full px-5 pb-12 pt-20 md:flex md:flex-col md:px-10 md:pb-8 md:pt-24 huge:px-16 huge:pb-12 huge:pt-32">
      <canvas data-burst aria-hidden className="pointer-events-none absolute left-0 top-0 z-30 w-full" style={{ imageRendering: 'pixelated' }} />

      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:items-end md:gap-12 huge:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        <div>
          <p data-reveal className="type-label huge:text-[13px]">
            {String(index + 1).padStart(2, '0')} / Side quest
          </p>
          <h2 data-reveal className="mt-3 font-serif text-[clamp(56px,8vw,128px)] italic leading-[0.9] tracking-[-0.02em] huge:mt-5 huge:text-[clamp(128px,7.4vw,190px)]">
            Stack slots<span className="text-accent">.</span>
          </h2>
        </div>
        <p data-reveal className="max-w-[40ch] text-[15px] leading-snug text-paper/70 md:pb-3 md:text-[17px] huge:pb-5 huge:text-[clamp(17px,0.55vw+8px,22px)]">
          Pull the lever. Every spin lands on something I built with these.
        </p>
      </header>

      {/* Stacked (machine, then what came up) on phones and upright tablets; side by side once the screen is wide and
          landscape. The row height sets the size of the whole machine: thumb-sized on phones, scaled to the screen on
          tablets, and growing with the height of a big monitor. */}
      <div className="mt-8 grid gap-8 md:my-auto md:gap-12 md:py-8 split:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] split:items-center split:gap-14 split:py-6 huge:grid-cols-[minmax(0,1fr)_minmax(420px,600px)] huge:gap-24">
        {/* The machine */}
        <div
          data-reveal
          className="[--row:clamp(48px,13.4vw,58px)] md:[--row:clamp(40px,min(7.6vw,9vh),80px)] split:[--row:clamp(42px,7vh,68px)] huge:[--row:clamp(68px,7.4vh,108px)]"
        >
          <div className="flex items-end gap-0">
            <div className="relative min-w-0 flex-1">
              <div aria-hidden className="grid grid-cols-3 pb-3 huge:pb-4">
                {REELS.map((r, i) => (
                  <span key={r.label} data-reel-label className="type-label px-2 md:px-3 huge:px-4 huge:text-[13px]">
                    {String(i + 1).padStart(2, '0')} {r.label}
                  </span>
                ))}
              </div>
              <div data-window aria-hidden className="relative grid h-[calc(var(--row)*5)] grid-cols-3 border border-paper/25">
                {REELS.map((r) => (
                  <div
                    key={r.label}
                    data-reel
                    className="relative overflow-hidden border-l border-paper/10 first:border-l-0"
                    style={{ containerType: 'inline-size' }}
                  >
                    <div className="absolute inset-0" style={PRINT}>
                      <Strip items={r.items} tone="mute" />
                    </div>
                    <div className="absolute inset-x-0 top-[calc(var(--row)*2)] h-[var(--row)] overflow-hidden bg-ink">
                      <div className="absolute inset-x-0 top-[calc(var(--row)*-2)] h-[calc(var(--row)*5)]">
                        <Strip items={r.items} tone="paper" />
                      </div>
                    </div>
                  </div>
                ))}
                {/* The pay line: hairlines in paper, and a sky-blue line that draws across on a win. */}
                {[2, 3].map((k) => (
                  <span
                    key={k}
                    className="pointer-events-none absolute inset-x-0 block h-px bg-paper/35"
                    style={{ top: `calc(var(--row) * ${k} - 0.5px)` }}
                  >
                    <span data-pay className="absolute inset-x-0 -top-px block h-[3px] bg-accent" />
                  </span>
                ))}
                <span className="pointer-events-none absolute -left-[13px] top-[calc(var(--row)*2.5_-_6px)] block h-0 w-0 border-y-[6px] border-l-[8px] border-y-transparent border-l-paper" />
                <Mark x="left" y="top" />
                <Mark x="right" y="top" />
                <Mark x="left" y="bottom" />
                <Mark x="right" y="bottom" />
              </div>
            </div>

            {/* The lever */}
            <div data-lever aria-hidden className="relative h-[calc(var(--row)*5)] w-16 shrink-0 md:w-24 huge:w-32">
              {/* On touch screens (no "press space" hint) the lever says what it's for, in line with the reel labels. */}
              <span className="type-label absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 whitespace-nowrap [@media(pointer:coarse)]:block">Drag ↓</span>
              <span className="absolute left-1/2 top-[22px] bottom-[22px] block w-px -translate-x-1/2 border-l border-dashed border-paper/20" />
              <span className="absolute left-0 top-1/2 block h-3 w-1/2 -translate-y-1/2 border-y border-r border-paper/40 bg-ink huge:h-4" />
              <span data-rod className="absolute left-1/2 block w-[3px] -translate-x-1/2 bg-paper huge:w-1" style={{ transformOrigin: '50% 100%' }} />
              <span className="absolute left-1/2 top-1/2 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink huge:h-[18px] huge:w-[18px]" />
              <span
                data-knob
                data-cursor="drag"
                data-cursor-label="Pull"
                className="absolute left-1/2 -ml-6 block h-12 w-12 cursor-grab touch-none select-none before:absolute before:-inset-3 before:content-[''] active:cursor-grabbing split:-ml-[22px] split:h-11 split:w-11 huge:-ml-8 huge:h-16 huge:w-16"
              >
                <span data-knob-dot className="block h-full w-full rounded-full bg-paper" />
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 pr-16 md:mt-7 md:pr-24 huge:mt-10 huge:pr-32">
            <button
              ref={pullBtn}
              data-pull
              type="button"
              aria-disabled={busy}
              onClick={() => pullRef.current()}
              className={`inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-paper px-7 font-mono text-[13px] uppercase tracking-[0.06em] text-ink transition-[background-color,opacity] duration-300 [@media(hover:hover)]:hover:bg-accent sm:w-auto md:h-12 md:text-[12px] huge:h-16 huge:px-10 huge:text-[15px] ${
                busy ? 'opacity-40' : ''
              }`}
            >
              Pull the lever <span aria-hidden>↓</span>
            </button>
            <span className="type-label hidden [@media(pointer:fine)]:md:inline huge:text-[13px]">or drag it / press space</span>
          </div>
        </div>

        {/* What came up */}
        <div data-reveal className="md:min-h-[300px] huge:min-h-[420px]">
          {/* One line on phones (the pay line is right above it), a label over the readout from tablets up. */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 md:block">
            <p className="type-label huge:text-[13px]">On the line</p>
            <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-paper md:mt-3 md:text-[14px] huge:mt-4 huge:text-[18px]" aria-hidden>
              <span data-part />
              <span className="text-mute"> + </span>
              <span data-part />
              <span className="text-mute"> + </span>
              <span data-part />
            </p>
          </div>
          <div className="mt-4 md:mt-5 huge:mt-7">
            <ResultBody key={result.n} result={result} onOpen={openTile} />
          </div>
        </div>
      </div>

      {/* The side quest */}
      <div
        data-reveal
        className="mt-12 flex flex-col gap-4 border-t border-paper/15 pt-5 md:mt-0 md:flex-row md:items-center md:justify-between md:gap-8 huge:pt-7"
      >
        <p className="type-label flex items-baseline gap-3 whitespace-nowrap text-[12px] split:text-[11px] huge:text-[13px]">
          <span>Side quest</span>
          <span className="text-paper">
            Found <Digit n={found.length} /> / {BUILDS.length}
          </span>
          {done && <span className="text-accent">Complete</span>}
        </p>
        <ul className="flex flex-wrap gap-2 huge:gap-2.5" aria-label={`Builds found: ${found.length} of ${BUILDS.length}`}>
          {BUILDS.map((b) => {
            const on = found.includes(b.id)
            return (
              <li
                key={b.id}
                data-chip={b.id}
                className={`relative overflow-hidden rounded-full border px-3.5 py-2 font-mono text-[12px] uppercase leading-none tracking-[0.06em] split:px-3 split:py-1.5 split:text-[11px] huge:px-4 huge:py-2.5 huge:text-[13px] ${on ? 'border-accent' : 'border-paper/20 text-paper/40'}`}
              >
                <span>{b.name}</span>
                <span
                  data-fill
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-accent text-ink"
                  style={{
                    clipPath: on ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
                  }}
                >
                  {b.name}
                </span>
                <span className="sr-only">{on ? ' (found)' : ' (not found yet)'}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  )
}
