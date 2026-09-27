import { useLayoutEffect, useRef } from 'react'
import { ABOUT } from '../data/content'
import Shape from '../components/Shapes'
import { floatShapes, gsap, prefersReducedMotion } from '../lib/motion'

// Phrases in the About text that get a sticker, with their colour and tilt.
const HIGHLIGHTS: [string, string, number][] = [
  ['Oakland University', 'bg-pink', -1.5],
  ['Motherson Group', 'bg-orange', 1.5],
  ['147 machines', 'bg-green', -2],
]

// Split the text into plain words and highlighted phrases, keeping the original order.
function pieces(text: string) {
  const out: (string | [string, string, number])[] = []
  let rest = text
  while (rest) {
    const next = HIGHLIGHTS.map((h) => [rest.indexOf(h[0]), h] as const)
      .filter(([i]) => i >= 0)
      .sort((a, b) => a[0] - b[0])[0]
    if (!next) {
      out.push(...rest.split(' ').filter(Boolean))
      break
    }
    const [i, h] = next
    out.push(...rest.slice(0, i).split(' ').filter(Boolean), h)
    rest = rest.slice(i + h[0].length)
  }
  return out
}

// The statement lights up word by word as it scrolls through; highlighted phrases slap on as stickers.
export default function About() {
  const root = useRef<HTMLElement>(null)
  const text = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let stopFloat = () => {}
    const ctx = gsap.context(() => {
      stopFloat = floatShapes(el)
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: text.current, start: 'top 80%', end: 'bottom 50%', scrub: true },
      })
      gsap.utils.toArray<HTMLElement>('[data-word]', el).forEach((w) => {
        tl.fromTo(w, { opacity: 0.14 }, { opacity: 1, duration: 0.1 })
        const sticker = w.querySelector('[data-sticker]')
        if (sticker) {
          tl.fromTo(sticker, { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: 'back.out(2)' }, '<').fromTo(
            w.querySelector('[data-label]'),
            { color: '#FFF7E0' },
            { color: '#0D0E0C', duration: 0.1 },
            '<0.1',
          )
        }
      })
    }, el)
    return () => {
      stopFloat()
      ctx.revert()
    }
  }, [])

  return (
    <section id="about" ref={root} className="relative container-xl py-28 md:py-40 grid md:grid-cols-12 gap-8 border-t border-line overflow-hidden">
      <p className="md:col-span-3 brace">about me</p>
      <p ref={text} className="md:col-span-9 type-display leading-[1.12] text-[clamp(1.9rem,4vw,3.8rem)] relative z-10">
        {pieces(ABOUT).map((piece, i) =>
          typeof piece === 'string' ? (
            <span key={i} data-word>
              {piece}{' '}
            </span>
          ) : (
            <span key={i} data-word className="relative inline-block mr-[0.25em]" style={{ rotate: `${piece[2]}deg` }}>
              <span data-sticker className={`sticker-paper absolute inset-0 origin-left ${piece[1]}`} aria-hidden />
              <span data-label className="relative px-[0.18em] text-night">{piece[0]}</span>
            </span>
          ),
        )}
      </p>
      <div data-float data-depth="0.5" data-speed="0.7" className="absolute right-[4%] bottom-[8%]">
        <div>
          <Shape kind="diamond" size={90} colors={['#2BF27A', '#3CC8F0']} />
        </div>
      </div>
    </section>
  )
}
