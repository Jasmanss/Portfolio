import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

// A scrolling room under the cornice. Anything marked [data-reveal] settles in as it scrolls into view.
export default function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } }),
      )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <main ref={root} className={`damask min-h-[100svh] px-4 pb-24 pt-28 md:px-10 md:pt-32 ${className}`}>
      {children}
      <p className="type-caps mt-24 text-center text-gold/60">© {new Date().getFullYear()} Jasman Sidhu · The Sidhu Collection</p>
    </main>
  )
}
