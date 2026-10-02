import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null


// Jump or glide to a position; works with or without smooth scrolling.
export function scrollToTarget(target: number | string | HTMLElement, immediate = false) {
  if (lenis) lenis.scrollTo(target, { immediate, offset: typeof target === 'number' ? 0 : -80 })
  else if (typeof target === 'number') window.scrollTo(0, target)
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView()
}

// Holds the page still (e.g. while the loader runs) and lets it go again.
let locked = false
export function lockScroll(lock: boolean) {
  locked = lock
  if (lenis) lock ? lenis.stop() : lenis.start()
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}

// Smooth scrolling driven by GSAP's ticker so ScrollTrigger and Lenis stay in lockstep.
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({ lerp: 0.1 })
    if (locked) lenis.stop()
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => lenis?.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [])
}

export { gsap, ScrollTrigger, SplitText }

// Gives every [data-float] inside `root` an idle bob, scroll parallax (data-speed) and a lean toward the cursor
// (data-depth). Call inside a gsap.context so it all reverts together.
export function floatShapes(root: HTMLElement) {
  if (prefersReducedMotion()) return () => {}
  const shapes = gsap.utils.toArray<HTMLElement>('[data-float]', root)
  shapes.forEach((el, i) => {
    const inner = el.firstElementChild as HTMLElement | null
    if (inner) {
      gsap.to(inner, {
        y: i % 2 ? 14 : -14,
        rotate: i % 2 ? 10 : -10,
        duration: 2.6 + (i % 3) * 0.7,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }
    const speed = Number(el.dataset.speed ?? 0)
    if (speed) {
      gsap.to(el, {
        yPercent: -speed * 100,
        rotate: speed * 90,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }
  })

  const movers = shapes.map((el) => ({
    depth: Number(el.dataset.depth ?? 0),
    x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
    y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
  }))
  const move = (e: PointerEvent) => {
    const dx = e.clientX / window.innerWidth - 0.5
    const dy = e.clientY / window.innerHeight - 0.5
    movers.forEach((m) => {
      if (!m.depth) return
      m.x(dx * m.depth * 60)
      m.y(dy * m.depth * 60)
    })
  }
  window.addEventListener('pointermove', move)
  return () => window.removeEventListener('pointermove', move)
}
