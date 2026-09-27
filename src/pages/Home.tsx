import { useEffect, useState } from 'react'
import { ENTRIES, pad } from '../data/entries'
import type { Entry } from '../data/entries'
import AsciiFlame from '../components/AsciiFlame'
import Scramble from '../components/Scramble'
import { TransitionLink } from '../components/Transition'
import { prefersReducedMotion } from '../lib/motion'

const SEEN_KEY = 'signal-discovered'

// A numbered diamond, the anchor of each slot.
function Diamond({ n, on }: { n: number; on: boolean }) {
  return (
    <span className="relative grid h-[22px] w-[60px] place-items-center">
      <svg viewBox="0 0 60 22" aria-hidden className="absolute inset-0 h-full w-full">
        <path d="M1 11 30 1 59 11 30 21Z" fill={on ? '#E8E6DF' : 'none'} stroke="#E8E6DF" strokeOpacity={on ? 1 : 0.6} strokeWidth="1" />
      </svg>
      <span className={`relative text-[10px] ${on ? 'text-void' : ''}`}>{n}</span>
    </span>
  )
}

// One slot: name above (or below, on the bottom row), type · diamond · platform, and the role.
function Slot({ entry, n, bottom, shown, active, onFocus }: { entry: Entry; n: number; bottom: boolean; shown: boolean; active: boolean; onFocus: (slug: string | null) => void }) {
  const lines = [
    <p key="name" className="text-center">
      <Scramble text={entry.line} play={shown ? (active ? 'on' : 'off') : false} hidden delay={n * 90} />
    </p>,
    <div key="row" className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <Scramble text={entry.type} play={shown} hidden delay={120 + n * 90} className="text-left text-dim" />
      <Diamond n={n} on={active} />
      <Scramble text={entry.platform} play={shown} hidden delay={160 + n * 90} className="text-right text-dim" />
    </div>,
    <p key="role" className="text-center text-dim">
      <Scramble text={entry.role} play={shown} hidden delay={200 + n * 90} />
    </p>,
  ]
  return (
    <TransitionLink
      to={`/work/${entry.slug}`}
      label={`/work/${entry.slug}`}
      onMouseEnter={() => onFocus(entry.slug)}
      onMouseLeave={() => onFocus(null)}
      onFocus={() => onFocus(entry.slug)}
      onBlur={() => onFocus(null)}
      data-cursor="view"
      data-cursor-label="Open"
      data-cursor-color="#E8E6DF"
      className="relative flex flex-col gap-3 px-6 py-3"
    >
      {/* Viewfinder corners while hovered */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
        <span className="absolute left-0 top-0 size-3 border-l border-t border-bone" />
        <span className="absolute right-0 top-0 size-3 border-r border-t border-bone" />
        <span className="absolute bottom-0 left-0 size-3 border-b border-l border-bone" />
        <span className="absolute bottom-0 right-0 size-3 border-b border-r border-bone" />
      </span>
      {bottom ? [...lines].reverse() : lines}
    </TransitionLink>
  )
}

// The index: a candle in the dark, six projects around the edges, and their footage on hover.
export default function Home() {
  const [stage, setStage] = useState<'intro' | 'lit' | 'open'>(() => (sessionStorage.getItem(SEEN_KEY) ? 'open' : 'intro'))
  const [focus, setFocus] = useState<string | null>(null)

  useEffect(() => {
    if (stage !== 'intro') return
    const t = window.setTimeout(() => setStage('lit'), prefersReducedMotion() ? 0 : 2600)
    return () => window.clearTimeout(t)
  }, [stage])

  const discover = () => {
    sessionStorage.setItem(SEEN_KEY, '1')
    setStage('open')
  }
  const shown = stage === 'open'
  const top = ENTRIES.slice(0, 3)
  const bottom = ENTRIES.slice(3, 6)

  return (
    <main className="fixed inset-0 overflow-hidden bg-void">
      <h1 className="sr-only">Jasman Sidhu, software engineer. Selected work.</h1>

      {/* Footage */}
      {ENTRIES.map((e) => (
        <div
          key={e.slug}
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-700 ${focus === e.slug ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={e.still}
            alt=""
            className={`animate-flicker h-full w-full object-cover transition-transform ease-out ${
              focus === e.slug ? 'scale-100 duration-[7000ms]' : 'scale-[1.12] duration-700'
            }`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7))]" />
          <div className="scanlines absolute inset-0 opacity-60" />
          <div className="absolute inset-0 grid place-items-center">
            <p className="relative px-[0.35em] py-[0.12em] type-cond text-[clamp(4rem,11vw,10rem)] text-bone">
              <span className="absolute left-0 top-0 h-full w-[0.28em] border-y-[0.07em] border-l-[0.07em] border-bone" />
              <span className="absolute right-0 top-0 h-full w-[0.28em] border-y-[0.07em] border-r-[0.07em] border-bone" />
              {e.name}
            </p>
          </div>
        </div>
      ))}
      <div aria-hidden className="grain pointer-events-none absolute -inset-[10%] opacity-[0.07]" />

      {/* The candle */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[12vh] h-[64vh] w-[min(420px,80vw)] -translate-x-1/2 transition-opacity duration-700 ${
          focus ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* The glow it casts into the dark */}
        <div
          className={`absolute left-1/2 top-[55%] size-[min(900px,160vw)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-[2000ms] ${stage === 'intro' ? 'opacity-0' : 'opacity-100'}`}
          style={{ background: 'radial-gradient(circle, rgba(255,122,43,0.13), rgba(255,122,43,0.04) 35%, transparent 65%)' }}
        />
        <AsciiFlame intensity={stage === 'intro' ? 0 : 1} className="relative h-full w-full" />
      </div>

      {/* Intro line, then the call to discover */}
      <div className="absolute inset-x-4 top-[24vh] text-center">
        {stage === 'intro' && (
          <>
            <Scramble as="p" text="Jasman Sidhu — software engineer" speed={22} />
            <Scramble as="p" text="I build products that take what people have and hand back something they can use" delay={500} speed={16} className="text-dim" />
          </>
        )}
      </div>
      {stage === 'lit' && (
        <button
          type="button"
          onClick={discover}
          className="bracket absolute left-1/2 top-[48%] -translate-x-1/2 uppercase hover:text-flame"
          data-cursor="view"
          data-cursor-label="Enter"
          data-cursor-color="#FF7A2B"
        >
          <Scramble text="Discover my projects ↗" delay={300} />
        </button>
      )}
      {shown && !focus && (
        <p className="animate-fade-up absolute left-1/2 top-[48%] -translate-x-1/2 text-dim">
          <Scramble text="Hover a number" delay={900} />
        </p>
      )}

      {/* Slots: three across the top, three across the bottom */}
      <nav aria-label="Projects" className="absolute inset-x-0 top-5 hidden grid-cols-3 md:grid">
        {top.map((e, i) => (
          <Slot key={e.slug} entry={e} n={i + 1} bottom={false} shown={shown} active={focus === e.slug} onFocus={setFocus} />
        ))}
      </nav>
      <nav aria-label="More projects" className="absolute inset-x-0 bottom-5 hidden grid-cols-3 md:grid">
        {bottom.map((e, i) => (
          <Slot key={e.slug} entry={e} n={i + 4} bottom shown={shown} active={focus === e.slug} onFocus={setFocus} />
        ))}
      </nav>

      {/* Phones: a plain list under the candle */}
      {shown && (
        <ol className="absolute inset-x-4 bottom-6 space-y-1 md:hidden">
          {ENTRIES.map((e, i) => (
            <li key={e.slug} className="animate-fade-up border-t border-line" style={{ animationDelay: `${i * 70}ms` }}>
              <TransitionLink to={`/work/${e.slug}`} label={`/work/${e.slug}`} className="flex items-baseline justify-between gap-3 py-2">
                <span className="text-dim">{pad(i + 1)}</span>
                <span className="flex-1">{e.name}</span>
                <span className="text-dim">{e.type}</span>
              </TransitionLink>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
