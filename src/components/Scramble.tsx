import { useEffect, useRef } from 'react'
import type { ElementType } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/[]{}$@!?'

type Props = {
  text: string
  // Change this to replay the decode.
  play?: unknown
  delay?: number
  // Milliseconds per character, left to right.
  speed?: number
  // Replay when hovered.
  hover?: boolean
  // Hidden (not even scrambled) until played.
  hidden?: boolean
  as?: ElementType
  className?: string
}

// Text that decodes itself: every character cycles through random glyphs until its turn to settle.
export default function Scramble({ text, play, delay = 0, speed = 28, hover = false, hidden = false, as: Tag = 'span', className = '' }: Props) {
  const el = useRef<HTMLElement>(null)
  const run = useRef<() => void>(() => {})

  useEffect(() => {
    const node = el.current
    if (!node) return
    if (hidden && !play) {
      node.textContent = ' '
      return
    }
    if (prefersReducedMotion()) {
      node.textContent = text
      return
    }
    let raf = 0
    let timer = 0
    const decode = () => {
      cancelAnimationFrame(raf)
      const start = performance.now()
      const tail = 6 // characters of noise ahead of the settled text
      const frame = (now: number) => {
        const settled = Math.floor((now - start) / speed)
        let out = ''
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          if (i < settled || ch === ' ') out += ch
          else if (i < settled + tail) out += GLYPHS[(Math.random() * GLYPHS.length) | 0]
          else out += ' '
        }
        node.textContent = out
        if (settled < text.length) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }
    run.current = decode
    timer = window.setTimeout(decode, delay)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [text, play, delay, speed, hidden])

  return (
    <Tag className={className} onMouseEnter={hover ? () => run.current() : undefined}>
      <span className="sr-only">{text}</span>
      <span ref={el} aria-hidden>
        {hidden && !play ? ' ' : text}
      </span>
    </Tag>
  )
}
