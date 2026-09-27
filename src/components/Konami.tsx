import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const GLYPHS = '*#%&@+=<>/{}[]$'

// ↑ ↑ ↓ ↓ ← → ← → B A rains glowing characters over the page.
export default function Konami() {
  const [party, setParty] = useState(0)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let progress = 0
    const key = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      progress = k === CODE[progress] ? progress + 1 : k === CODE[0] ? 1 : 0
      if (progress === CODE.length) {
        progress = 0
        setParty((n) => n + 1)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    if (!party || !layer.current) return
    const pieces = layer.current.querySelectorAll('[data-piece]')
    const reduce = prefersReducedMotion()
    const tl = gsap.timeline({ onComplete: () => setParty(0) })
    tl.fromTo('[data-toast]', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 0)
    if (!reduce) {
      pieces.forEach((p) => {
        tl.fromTo(
          p,
          { x: gsap.utils.random(0, window.innerWidth), y: gsap.utils.random(-400, -80), rotate: gsap.utils.random(-180, 180) },
          {
            y: window.innerHeight + 200,
            x: `+=${gsap.utils.random(-200, 200)}`,
            rotate: `+=${gsap.utils.random(-540, 540)}`,
            duration: gsap.utils.random(1.6, 3),
            ease: 'power1.in',
          },
          gsap.utils.random(0, 0.8),
        )
      })
    }
    tl.to('[data-toast]', { y: 40, opacity: 0, duration: 0.4 }, reduce ? 2 : '>-0.6')
    return () => {
      tl.kill()
    }
  }, [party])

  if (!party) return null
  return (
    <div ref={layer} aria-live="polite" className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      {Array.from({ length: 36 }, (_, i) => (
        <div key={i} data-piece className="absolute left-0 top-0">
          <span className="font-mono font-bold text-ember" style={{ fontSize: 18 + (i % 5) * 10 }}>
            {GLYPHS[i % GLYPHS.length]}
          </span>
        </div>
      ))}
      <p data-toast className="absolute bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap border border-ember bg-night px-5 py-3 text-ember">
        Cheat code accepted. You found the fun part.
      </p>
    </div>
  )
}
