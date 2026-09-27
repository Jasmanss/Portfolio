import { useEffect, useRef } from 'react'
import Shape from './Shapes'
import type { ShapeKind } from './Shapes'
import { gsap, prefersReducedMotion } from '../lib/motion'

type Item = { kind: ShapeKind; size: number; colors?: [string, string] }

type Body = {
  el: HTMLDivElement
  r: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
}

const BOUNCE = 0.82
const MAX_SPEED = 2600 // px/s, so a wild fling can't tunnel through walls

// Shapes you can grab and throw. They drift, bounce off the edges and off each other.
export default function Playground({ items, className = '' }: { items: Item[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = box.current
    if (!container) return
    const rect = () => container.getBoundingClientRect()
    let { width, height } = rect()

    // Spread the shapes out on a loose grid so they don't start overlapping.
    const bodies: Body[] = items.map((item, i) => {
      const cols = Math.ceil(Math.sqrt(items.length))
      const cx = ((i % cols) + 0.5) / cols
      const cy = (Math.floor(i / cols) + 0.5) / Math.ceil(items.length / cols)
      return {
        el: refs.current[i]!,
        r: item.size * 0.42,
        x: width * (0.15 + cx * 0.7),
        y: height * (0.15 + cy * 0.7),
        vx: (i % 2 ? 1 : -1) * (30 + i * 12),
        vy: (i % 3 ? -1 : 1) * (24 + i * 9),
        angle: i * 37,
        spin: (i % 2 ? 1 : -1) * 20,
      }
    })

    const paint = () => {
      for (const b of bodies) b.el.style.transform = `translate(${b.x - b.r / 0.42 / 2}px, ${b.y - b.r / 0.42 / 2}px) rotate(${b.angle}deg)`
    }
    paint()
    if (prefersReducedMotion()) return

    let dragged: Body | null = null
    let grab = { dx: 0, dy: 0, lastX: 0, lastY: 0, lastT: 0 }
    let visible = true
    let t = 0

    const step = (_time: number, deltaMs: number) => {
      if (!visible) return
      const dt = Math.min(deltaMs, 40) / 1000
      t += dt
      for (const [i, b] of bodies.entries()) {
        if (b !== dragged) {
          // A gentle wander keeps them alive when nobody is playing.
          b.vx += Math.sin(t * 0.7 + i) * 6 * dt
          b.vy += Math.cos(t * 0.6 + i * 1.3) * 6 * dt
          const drag = Math.pow(0.55, dt)
          b.vx *= drag
          b.vy *= drag
          b.x += b.vx * dt
          b.y += b.vy * dt
        }
        b.spin *= Math.pow(0.6, dt)
        b.angle += (b.spin + b.vx * 0.05) * dt
        if (b.x < b.r) [b.x, b.vx] = [b.r, Math.abs(b.vx) * BOUNCE]
        if (b.x > width - b.r) [b.x, b.vx] = [width - b.r, -Math.abs(b.vx) * BOUNCE]
        if (b.y < b.r) [b.y, b.vy] = [b.r, Math.abs(b.vy) * BOUNCE]
        if (b.y > height - b.r) [b.y, b.vy] = [height - b.r, -Math.abs(b.vy) * BOUNCE]
      }
      // Circle-vs-circle collisions with equal masses.
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i]
          const b = bodies[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.hypot(dx, dy) || 0.001
          const overlap = a.r + b.r - dist
          if (overlap <= 0) continue
          const nx = dx / dist
          const ny = dy / dist
          const aFixed = a === dragged
          const bFixed = b === dragged
          const push = aFixed || bFixed ? overlap : overlap / 2
          if (!aFixed) [a.x, a.y] = [a.x - nx * push, a.y - ny * push]
          if (!bFixed) [b.x, b.y] = [b.x + nx * push, b.y + ny * push]
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
          if (rel <= 0) continue
          const impulse = rel * BOUNCE
          if (!aFixed) [a.vx, a.vy] = [a.vx - impulse * nx * (bFixed ? 2 : 1), a.vy - impulse * ny * (bFixed ? 2 : 1)]
          if (!bFixed) [b.vx, b.vy] = [b.vx + impulse * nx * (aFixed ? 2 : 1), b.vy + impulse * ny * (aFixed ? 2 : 1)]
          a.spin -= impulse * 0.2
          b.spin += impulse * 0.2
        }
      }
      paint()
    }
    gsap.ticker.add(step)

    const local = (e: PointerEvent) => {
      const r = rect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const downs = bodies.map((b) => (e: PointerEvent) => {
      e.preventDefault()
      b.el.setPointerCapture(e.pointerId)
      const [px, py] = local(e)
      dragged = b
      grab = { dx: b.x - px, dy: b.y - py, lastX: px, lastY: py, lastT: performance.now() }
      b.vx = b.vy = 0
      gsap.to(b.el.firstElementChild, { scale: 1.12, duration: 0.2 }) // the wrapper's transform belongs to the physics
    })
    const move = (e: PointerEvent) => {
      if (!dragged) return
      const [px, py] = local(e)
      const now = performance.now()
      const ms = Math.max(now - grab.lastT, 1)
      // Smoothed throw velocity from recent movement.
      dragged.vx = dragged.vx * 0.5 + ((px - grab.lastX) / ms) * 1000 * 0.5
      dragged.vy = dragged.vy * 0.5 + ((py - grab.lastY) / ms) * 1000 * 0.5
      dragged.x = px + grab.dx
      dragged.y = py + grab.dy
      grab = { ...grab, lastX: px, lastY: py, lastT: now }
    }
    const up = () => {
      if (!dragged) return
      const speed = Math.hypot(dragged.vx, dragged.vy)
      if (speed > MAX_SPEED) {
        dragged.vx *= MAX_SPEED / speed
        dragged.vy *= MAX_SPEED / speed
      }
      dragged.spin += dragged.vx * 0.3
      gsap.to(dragged.el.firstElementChild, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      dragged = null
    }
    bodies.forEach((b, i) => b.el.addEventListener('pointerdown', downs[i]))
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    const resize = () => ({ width, height } = rect())
    window.addEventListener('resize', resize)
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    io.observe(container)

    return () => {
      gsap.ticker.remove(step)
      bodies.forEach((b, i) => b.el.removeEventListener('pointerdown', downs[i]))
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('resize', resize)
      io.disconnect()
    }
  }, [items])

  return (
    <div ref={box} className={className || 'relative h-full'}>
      {items.map((item, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          data-cursor="drag"
          data-cursor-color={item.colors?.[0]}
          className="absolute left-0 top-0 touch-none select-none will-change-transform"
          style={{ width: item.size, height: item.size }}
        >
          <Shape kind={item.kind} size={item.size} colors={item.colors} className="pointer-events-none" />
        </div>
      ))}
    </div>
  )
}
