import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'
import Scramble from './Scramble'

type Go = (to: string, label: string) => void
const TransitionContext = createContext<Go>(() => {})

// Kept for pages that wait on an intro; this design has none outside the index.
export function afterIntro(cb: () => void) {
  cb()
}

// Between pages the picture cuts to black along a scanline, types where it's going, and cuts back.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const screen = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')
  const [take, setTake] = useState(0)

  useLayoutEffect(() => {
    if (screen.current) gsap.set(screen.current, { autoAlpha: 0 })
  }, [])

  const go = useCallback<Go>(
    (to, name) => {
      const el = screen.current
      if (to === location.pathname) return
      if (!el || busy.current || prefersReducedMotion()) {
        navigate(to)
        requestAnimationFrame(() => scrollToTarget(0, true))
        return
      }
      busy.current = true
      setLabel(`Loading ${name}`)
      setTake((t) => t + 1)
      const bar = el.querySelector('[data-bar]')
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .set(el, { autoAlpha: 1, clipPath: 'inset(50% 0 50% 0)' })
        .to(el, { clipPath: 'inset(0% 0 0% 0)', duration: 0.45, ease: 'expo.inOut' })
        .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, '<0.1')
        .add(() => {
          navigate(to)
          requestAnimationFrame(() => scrollToTarget(0, true))
        })
        .to(el, { clipPath: 'inset(50% 0 50% 0)', duration: 0.5, ease: 'expo.inOut' }, '+=0.15')
        .set(el, { autoAlpha: 0 })
    },
    [location.pathname, navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      <div ref={screen} aria-hidden className="pointer-events-none fixed inset-0 z-[120] grid place-items-center bg-void">
        <div className="w-[min(360px,80vw)]">
          <Scramble text={label} play={take} speed={14} />
          <div className="mt-3 h-px bg-line">
            <div data-bar className="h-full origin-left bg-flame" />
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; label?: string }

// An internal link that plays the cut; modified clicks fall through to the browser.
export function TransitionLink({ to, label, onClick, children, ...rest }: LinkProps) {
  const go = useContext(TransitionContext)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(to, label ?? to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export const useGo = () => useContext(TransitionContext)
