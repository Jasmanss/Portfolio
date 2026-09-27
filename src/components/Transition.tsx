import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'

type Go = (to: string, label: string) => void
const TransitionContext = createContext<Go>(() => {})

// Kept for pages that wait on an intro; this design has none.
export function afterIntro(cb: () => void) {
  cb()
}

// Land on the hash target (or the top) once the new route has rendered.
function settle(hash: string) {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(hash || 0, true)))
}

// An ember sheet sweeps up with rounded shoulders, names where you're going in the italic serif, and sweeps off the top.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const sheet = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')

  useLayoutEffect(() => {
    if (sheet.current) gsap.set(sheet.current, { yPercent: 100 })
  }, [])

  const go = useCallback<Go>(
    (to, name) => {
      const el = sheet.current
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
      const word = el.querySelector('[data-word]')
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .fromTo(el, { yPercent: 100, borderTopLeftRadius: '50% 18%', borderTopRightRadius: '50% 18%' }, { yPercent: 0, borderTopLeftRadius: '0% 0%', borderTopRightRadius: '0% 0%', duration: 0.75, ease: 'expo.inOut' })
        .fromTo(word, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' }, '-=0.25')
        .add(() => {
          navigate(to)
          settle(hash ? `#${hash}` : '')
        })
        .to(word, { yPercent: -110, duration: 0.45, ease: 'expo.in' }, '+=0.15')
        .to(el, { yPercent: -100, borderBottomLeftRadius: '50% 18%', borderBottomRightRadius: '50% 18%', duration: 0.75, ease: 'expo.inOut' }, '-=0.15')
        .set(el, { yPercent: 100, borderRadius: 0 })
    },
    [location.pathname, navigate],
  )

  return (
    <TransitionContext.Provider value={go}>
      {children}
      <div ref={sheet} aria-hidden className="pointer-events-none fixed inset-0 z-[120] grid place-items-center bg-ember text-night">
        <span className="block overflow-hidden pb-[0.1em]">
          <span data-word className="em block text-[clamp(3.5rem,10vw,9rem)] leading-none">
            {label}
          </span>
        </span>
      </div>
    </TransitionContext.Provider>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; label?: string }

// An internal link that plays the sweep; modified clicks fall through to the browser.
export function TransitionLink({ to, label, onClick, children, ...rest }: LinkProps) {
  const go = useContext(TransitionContext)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(to, label ?? 'Jasman Sidhu')
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export const useGo = () => useContext(TransitionContext)
