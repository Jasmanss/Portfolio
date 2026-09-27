import { useLayoutEffect, useRef } from 'react'
import Shape from '../components/Shapes'
import { floatShapes, gsap, prefersReducedMotion } from '../lib/motion'

// Plain words, plus stickers: [text, colour class, tilt in degrees].
type Part = string | [string, string, number]

const LINE: Part[] = [
  'I build',
  ['client portals', 'bg-lilac', -2],
  'for freelancers,',
  ['an agent', 'bg-orange', 2],
  'that runs my Mac,',
  ['a hair coach', 'bg-pink', -1.5],
  'in your pocket and',
  ['a job tracker', 'bg-sky', 2.5],
  'that follows up.',
]

// As the section scrolls through, the sentence lights up word by word and each project drops in as a sticker.
export default function Statement() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let stopFloat = () => {}
    const ctx = gsap.context(() => {
      stopFloat = floatShapes(el)
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })
      gsap.utils.toArray<HTMLElement>('[data-bit]', el).forEach((bit) => {
        const sticker = bit.querySelector('[data-sticker]')
        tl.fromTo(bit, { opacity: 0.12 }, { opacity: 1, duration: 0.4 })
        if (sticker) {
          tl.fromTo(
            sticker,
            { scaleX: 0, rotate: 0 },
            { scaleX: 1, rotate: Number(bit.dataset.tilt), duration: 0.5, ease: 'back.out(2)' },
            '<',
          ).fromTo(bit.querySelector('[data-label]'), { color: '#FFF7E0' }, { color: '#0D0E0C', duration: 0.2 }, '<0.2')
        }
      })
      tl.to({}, { duration: 1 })
    }, el)
    return () => {
      stopFloat()
      ctx.revert()
    }
  }, [])

  return (
    <section ref={root} className="relative h-[260vh]" aria-label="What I make">
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col justify-center container-xl">
        <p className="brace mb-8">what I make</p>
        <p className="type-display leading-[1.12] text-[clamp(2.4rem,6.2vw,6.4rem)] max-w-[15ch] md:max-w-none">
          {LINE.map((part, i) =>
            typeof part === 'string' ? (
              <span key={i} data-bit className="inline">
                {part}{' '}
              </span>
            ) : (
              <span key={i} data-bit data-tilt={part[2]} className="relative inline-block mr-[0.25em] my-[0.06em]">
                <span data-sticker className={`sticker-paper absolute inset-0 origin-left ${part[1]}`} aria-hidden />
                <span data-label className="relative px-[0.18em] text-night">
                  {part[0]}
                </span>
              </span>
            ),
          )}
        </p>

        <div data-float data-depth="0.7" data-speed="0.5" className="absolute right-[6%] top-[14%]">
          <div>
            <Shape kind="capsule" size={120} />
          </div>
        </div>
        <div data-float data-depth="-0.6" data-speed="0.9" className="absolute left-[58%] bottom-[10%]">
          <div>
            <Shape kind="flower" size={80} colors={['#A89BFF', '#FFB3EC']} />
          </div>
        </div>
      </div>
    </section>
  )
}
