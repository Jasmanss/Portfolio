import { useLayoutEffect, useRef } from 'react'
import Playground from '../components/Playground'
import { Poster } from '../components/Page'
import type { ShapeKind } from '../components/Shapes'
import { gsap, prefersReducedMotion } from '../lib/motion'

const SHAPES: { kind: ShapeKind; size: number; colors?: [string, string] }[] = [
  { kind: 'flower', size: 170 },
  { kind: 'ring', size: 150 },
  { kind: 'asterisk', size: 140 },
  { kind: 'squiggle', size: 160 },
  { kind: 'capsule', size: 130 },
  { kind: 'diamond', size: 120 },
  { kind: 'flower', size: 110, colors: ['#FF4747', '#FFB0B0'] },
  { kind: 'ring', size: 100, colors: ['#0B0B0B', '#6B6B6B'] },
]

// A room of throwable shapes, with the name printed on the floor.
export default function PlaygroundPage() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-rise]', { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.55 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <main ref={root} className="fixed inset-0 overflow-hidden bg-paper">
      <h1 aria-label="Playground" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center type-poster text-red text-[clamp(4rem,17vw,19rem)]">
        <Poster>Play</Poster>
        <Poster>ground</Poster>
      </h1>
      <Playground items={SHAPES} className="absolute inset-0" />
      <p className="pointer-events-none absolute bottom-5 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 text-center text-ink/70 max-md:bottom-14">
        Grab a shape and throw it. Know any cheat codes? ↑↑↓↓←→←→BA
      </p>
    </main>
  )
}
