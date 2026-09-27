import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'

type Go = (to: string, command: string) => void
const TransitionContext = createContext<Go>(() => {})

const LOADER_KEY = 'js-loaded'

// Scroll to the hash target (or the top) once a route has rendered.
function settle(hash: string) {
  requestAnimationFrame(() => {
    const el = hash ? document.querySelector(hash) : null
    if (el) scrollToTarget(el as HTMLElement, true)
    else scrollToTarget(0, true)
  })
}

// One green curtain serves both the first-visit loader and every route change.
// It types a command like `> open portlkit`, covers the page, swaps routes, then lifts.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const curtain = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const firstVisit = useRef(!sessionStorage.getItem(LOADER_KEY) && !prefersReducedMotion())

  const typeInto = (tl: gsap.core.Timeline, text: string) => {
    const state = { n: 0 }
    tl.to(state, {
      n: text.length,
      duration: Math.min(0.9, text.length * 0.045),
      ease: 'none',
      onUpdate: () => {
        if (line.current) line.current.textContent = text.slice(0, Math.round(state.n))
      },
    })
  }

  // First visit: the page assembles from a build command.
  useLayoutEffect(() => {
    const el = curtain.current
    if (!el) return
    if (!firstVisit.current) {
      gsap.set(el, { yPercent: -100 })
      return
    }
    sessionStorage.setItem(LOADER_KEY, '1')
    const tl = gsap.timeline({ delay: 0.2 })
    typeInto(tl, 'jasman --build')
    tl.to({}, { duration: 0.35 }).to(el, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
    return () => {
      tl.kill()
    }
  }, [])

  const go = useCallback<Go>(
    (to, cmd) => {
      const el = curtain.current
      const [path, hash = ''] = to.split('#')
      const target = path || '/'
      const samePage = target === location.pathname
      if (samePage) {
        if (hash) scrollToTarget(`#${hash}`)
        else scrollToTarget(0)
        return
      }
      if (!el || busy.current || prefersReducedMotion()) {
        navigate(to)
        settle(hash ? `#${hash}` : '')
        return
      }
      busy.current = true
      if (line.current) line.current.textContent = ''
      const tl = gsap.timeline({
        onComplete: () => {
          busy.current = false
        },
      })
      tl.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' })
      typeInto(tl, cmd)
      tl.add(() => {
        navigate(to)
        settle(hash ? `#${hash}` : '')
      })
        .to({}, { duration: 0.25 })
        .to(el, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' })
    },
    [location.pathname, navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      <div
        ref={curtain}
        aria-hidden
        className="fixed inset-0 z-[100] bg-green text-night flex items-end pointer-events-none"
      >
        <p className="container-xl w-full pb-10 font-mono text-[clamp(1rem,2.4vw,1.75rem)]">
          <span className="text-night/40">&gt; </span>
          <span ref={line} />
          <span className="inline-block w-[0.6em] h-[1.1em] align-[-0.2em] bg-night ml-1 animate-pulse" />
        </p>
      </div>
    </TransitionContext.Provider>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; command?: string }

// An internal link that plays the curtain; modified clicks fall through to the browser.
export function TransitionLink({ to, command, onClick, children, ...rest }: LinkProps) {
  const go = useContext(TransitionContext)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(to, command ?? `open ${to.replace(/^\/(work\/)?/, '').replace('#', '') || 'home'}`)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
