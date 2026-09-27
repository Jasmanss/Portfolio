import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'

type Go = (to: string, label: string) => void
const TransitionContext = createContext<Go>(() => {})

const LOADER_KEY = 'js-loaded'

// Pages that make an entrance wait for the opening curtains.
let introDone = true
const introWaiters: (() => void)[] = []
export function afterIntro(cb: () => void) {
  if (introDone) cb()
  else introWaiters.push(cb)
}
function finishIntro() {
  introDone = true
  introWaiters.splice(0).forEach((cb) => cb())
}

// Scroll to the hash target (or the top) once a route has rendered.
function settle(hash: string) {
  requestAnimationFrame(() => {
    if (hash) scrollToTarget(hash, true)
    else scrollToTarget(0, true)
  })
}

const GATHERED = 0.2

// Theatre curtains: closed with a gilt plaque on a first visit, then drawn open.
// Between pages they close, name the room you're entering, and open again.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const stage = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')
  const [first] = useState(() => {
    const yes = !sessionStorage.getItem(LOADER_KEY) && !prefersReducedMotion()
    if (yes) introDone = false
    return yes
  })

  const parts = () => {
    const q = gsap.utils.selector(stage.current)
    return { left: q('[data-half="left"]'), right: q('[data-half="right"]'), plaque: q('[data-plaque]'), valance: q('[data-valance]') }
  }

  // Draw the curtains open: gather to the sides, then slip away.
  const open = (tl: gsap.core.Timeline) => {
    const { left, right, plaque, valance } = parts()
    tl.to(plaque, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' })
      .to([left, right], { scaleX: GATHERED, duration: 1.3, ease: 'power3.inOut' }, '<0.1')
      .to(left, { xPercent: -100, duration: 0.7, ease: 'power2.in' }, '-=0.35')
      .to(right, { xPercent: 100, duration: 0.7, ease: 'power2.in' }, '<')
      .to(valance, { yPercent: -100, duration: 0.6, ease: 'power2.in' }, '<0.1')
      .set(stage.current, { visibility: 'hidden' })
  }

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    if (!first) {
      gsap.set(el, { visibility: 'hidden' })
      return
    }
    sessionStorage.setItem(LOADER_KEY, '1')
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 })
      tl.from(parts().plaque, { opacity: 0, y: 24, duration: 0.9, ease: 'expo.out' }).to({}, { duration: 0.9 })
      open(tl)
      tl.add(finishIntro, '-=1.1')
    }, el)
    return () => ctx.revert()
    // Runs once, on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = useCallback<Go>(
    (to, name) => {
      const el = stage.current
      const [path, hash = ''] = to.split('#')
      const target = path || '/'
      if (target === location.pathname) {
        scrollToTarget(hash ? `#${hash}` : 0)
        return
      }
      if (!el || busy.current || prefersReducedMotion()) {
        navigate(to)
        settle(hash ? `#${hash}` : '')
        return
      }
      busy.current = true
      setLabel(name)
      const { left, right, plaque, valance } = parts()
      const tl = gsap.timeline({ onComplete: () => void (busy.current = false) })
      tl.set(el, { visibility: 'visible' })
        .set(left, { xPercent: -100, scaleX: GATHERED })
        .set(right, { xPercent: 100, scaleX: GATHERED })
        .set(plaque, { opacity: 0, y: 20 })
        .to(valance, { yPercent: 0, duration: 0.45, ease: 'power2.out' })
        .to([left, right], { xPercent: 0, duration: 0.45, ease: 'power2.out' }, '<')
        .to([left, right], { scaleX: 1, duration: 0.75, ease: 'power3.inOut' })
        .to(plaque, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, '-=0.15')
        .add(() => {
          navigate(to)
          settle(hash ? `#${hash}` : '')
        })
        .to({}, { duration: 0.35 })
      open(tl)
    },
    // parts() only reads the stage ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      <div ref={stage} aria-hidden className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            data-half={side}
            className={`velvet absolute inset-y-0 w-[51%] ${side === 'left' ? 'left-0' : 'right-0'}`}
            style={{ transformOrigin: side === 'left' ? '0 50%' : '100% 50%' }}
          >
            {/* Gold fringe along the hem */}
            <div
              className="absolute inset-x-0 bottom-0 h-[26px]"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #6e5114 0 2px, #f6e27a 2px 4px, #b8892d 4px 5px)',
                maskImage: 'linear-gradient(transparent, #000 30%)',
              }}
            />
            {/* Shadow where the two halves meet */}
            <div className={`absolute inset-y-0 w-[50px] from-black/55 to-transparent ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'}`} />
          </div>
        ))}
        <div data-valance className="absolute inset-x-0 top-0 h-[11vh] min-h-[70px]">
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="stage-valance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d060a" />
                <stop offset=".6" stopColor="#a8162a" />
                <stop offset="1" stopColor="#5e0a10" />
              </linearGradient>
            </defs>
            <path
              d="M0 0H1000V40Q937 100 875 40Q812 100 750 40Q687 100 625 40Q562 100 500 40Q437 100 375 40Q312 100 250 40Q187 100 125 40Q62 100 0 40Z"
              fill="url(#stage-valance)"
            />
            <path
              d="M0 40Q62 100 125 40Q187 100 250 40Q312 100 375 40Q437 100 500 40Q562 100 625 40Q687 100 750 40Q812 100 875 40Q937 100 1000 40"
              fill="none"
              stroke="#d4af5a"
              strokeWidth="4"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
        <div data-plaque className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="gilt p-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
            <div className="bg-[#1b0b07] px-[clamp(1.5rem,5vw,4rem)] py-[clamp(1rem,3vw,2rem)] text-center shadow-[inset_0_0_0_1px_#8a6424]">
              <p className="type-caps text-gold">{label ? 'Now entering' : 'Welcome to'}</p>
              <p className="gilt-text mt-2 whitespace-nowrap font-serif text-[clamp(2rem,5vw,4.5rem)] italic leading-[1.05]">{label || 'The Sidhu Collection'}</p>
              {!label && <p className="type-caps mt-3 text-gold/70">Software, framed · Michigan</p>}
            </div>
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; label?: string }

// An internal link that plays the curtains; modified clicks fall through to the browser.
export function TransitionLink({ to, label, onClick, children, ...rest }: LinkProps) {
  const go = useContext(TransitionContext)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(to, label ?? 'The Gallery')
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export const useGo = () => useContext(TransitionContext)
