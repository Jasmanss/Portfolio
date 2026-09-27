import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { LINKS } from '../data/content'
import { gsap, prefersReducedMotion } from '../lib/motion'

// A scrolling page under the fixed frame. Content lines up with the menu column on wide screens,
// and anything marked [data-reveal] rises in as it scrolls into view.
export default function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) =>
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
        }),
      )
      gsap.from('[data-rise]', { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.55 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <main ref={root} className={`min-h-[100svh] px-4 pt-40 md:pl-[200px] md:pr-5 md:pt-52 ${className}`}>
      {children}
      <footer className="mt-32 flex flex-wrap items-center justify-between gap-4 border-t border-rule py-5 pr-40 md:pr-48">
        <span className="type-label">© {new Date().getFullYear()} Jasman Sidhu</span>
        <span className="flex gap-5">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-red">
            GitHub
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="hover:text-red">
            LinkedIn
          </a>
          <a href={LINKS.resume} target="_blank" rel="noreferrer" className="hover:text-red">
            Resume
          </a>
        </span>
      </footer>
    </main>
  )
}

// A line of the red poster type that slides up out of a mask when the page opens.
export function Poster({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`block overflow-hidden pb-[0.04em] ${className}`}>
      <span data-rise className="block">
        {children}
      </span>
    </span>
  )
}
