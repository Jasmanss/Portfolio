import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'

type Go = (to: string, label: string) => void
const TransitionContext = createContext<Go>(() => {})

const LOADER_KEY = 'js-loaded'

// Pages that make an entrance wait for the first-visit poster to clear.
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
    const el = hash ? document.querySelector(hash) : null
    if (el) scrollToTarget(el as HTMLElement, true)
    else scrollToTarget(0, true)
  })
}

// A black panel pushes across the screen between pages, naming where you're headed in the red serif.
// On a first visit it follows a poster of the name and portrait.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const curtain = useRef<HTMLDivElement>(null)
  const intro = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')
  const [showIntro, setShowIntro] = useState(() => {
    const first = !sessionStorage.getItem(LOADER_KEY) && !prefersReducedMotion()
    if (first) introDone = false
    return first
  })

  useLayoutEffect(() => {
    const el = curtain.current
    if (!el) return
    // Parked off to the right; set before first paint so it never flashes.
    gsap.set(el, { xPercent: 100 })
    if (!showIntro || !intro.current) return
    sessionStorage.setItem(LOADER_KEY, '1')
    // A context, so React's dev double-mount reverts the from() states instead of stranding them.
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15 })
        .from('[data-line]', { yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.12 })
        .from('[data-portrait]', { scale: 0, rotate: -30, duration: 0.9, ease: 'back.out(1.6)' }, 0.35)
        .to({}, { duration: 0.5 })
        .to(el, { xPercent: 0, duration: 0.85, ease: 'expo.inOut' })
        .add(() => {
          setShowIntro(false)
          finishIntro()
        })
        .to(el, { xPercent: -100, duration: 0.85, ease: 'expo.inOut' }, '+=0.1')
        .set(el, { xPercent: 100 })
    }, intro.current)
    return () => ctx.revert()
    // Runs once, on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = useCallback<Go>(
    (to, name) => {
      const el = curtain.current
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
      const q = gsap.utils.selector(el)
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .fromTo(el, { xPercent: 100 }, { xPercent: 0, duration: 0.75, ease: 'expo.inOut' })
        .fromTo(q('[data-word]'), { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' }, 0.35)
        .add(() => {
          navigate(to)
          settle(hash ? `#${hash}` : '')
        })
        .to(q('[data-word]'), { yPercent: -105, duration: 0.45, ease: 'expo.in' }, '+=0.1')
        .to(el, { xPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '-=0.2')
        .set(el, { xPercent: 100 })
    },
    [location.pathname, navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      {showIntro && (
        <div ref={intro} aria-hidden className="fixed inset-0 z-[110] flex items-center justify-center bg-white">
          <div className="relative text-center type-poster text-red text-[clamp(5rem,17vw,17rem)]">
            <span className="block overflow-hidden pb-[0.12em]">
              <span data-line className="block">Jasman</span>
            </span>
            <span className="block overflow-hidden -mt-[0.12em]">
              <span data-line className="block">Sidhu</span>
            </span>
            <img
              data-portrait
              src="/jasman1.jpg"
              alt=""
              className="absolute left-1/2 top-1/2 w-[clamp(100px,11vw,180px)] -translate-x-1/2 -translate-y-1/2 rotate-[-6deg] shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      )}
      <div
        ref={curtain}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-ink"
      >
        <span className="block overflow-hidden type-poster text-red text-[clamp(4rem,13vw,13rem)]">
          <span data-word className="block">
            {label}
          </span>
        </span>
      </div>
    </TransitionContext.Provider>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; label?: string }

const nameFor = (to: string) => {
  const slug = to.replace(/^\/(work\/)?/, '').split('#')[0]
  return slug || 'Work'
}

// An internal link that plays the curtain; modified clicks fall through to the browser.
export function TransitionLink({ to, label, onClick, children, ...rest }: LinkProps) {
  const go = useContext(TransitionContext)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(to, label ?? nameFor(to))
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

// Programmatic navigation with the curtain, for things that aren't links (like the card stack).
export const useGo = () => useContext(TransitionContext)
