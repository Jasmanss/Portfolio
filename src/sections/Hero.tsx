import { useLayoutEffect, useRef } from 'react'
import Shape from '../components/Shapes'
import { floatShapes, gsap, prefersReducedMotion, scrollToTarget } from '../lib/motion'

// Each word becomes a row of letters that can rise into place; words never break mid-letter.
function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, w) => (
        <span key={w} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom whitespace-nowrap mr-[0.22em] last:mr-0">
          {[...word].map((ch, i) => (
            <span key={i} data-char className="inline-block will-change-transform">
              {ch}
            </span>
          ))}
        </span>
      ))}
    </>
  )
}

export default function Hero() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    // On the very first visit the loader is still up, so wait for it to lift.
    const delay = sessionStorage.getItem('js-loaded') ? 0.25 : 1.6
    let stopFloat = () => {}
    const ctx = gsap.context(() => {
      stopFloat = floatShapes(el)
      if (prefersReducedMotion()) return
      gsap
        .timeline({ delay })
        .from('[data-char]', { yPercent: 115, rotate: 12, duration: 1.1, ease: 'expo.out', stagger: 0.035 })
        .from('[data-float] > div', { scale: 0, duration: 1.2, ease: 'back.out(1.8)', stagger: 0.08 }, 0.2)
        .from('[data-fade]', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 0.6)
    }, el)
    return () => {
      stopFloat()
      ctx.revert()
    }
  }, [])

  return (
    <section id="top" ref={root} className="relative container-xl min-h-[100svh] pt-28 md:pt-24 pb-10 flex flex-col justify-center overflow-hidden">
      <h1 className="type-display text-[clamp(4.5rem,15vw,15rem)] relative z-10">
        <span className="block">
          <Letters text="Jasman" />
        </span>
        <span className="block pl-[12vw]">
          <Letters text="builds things" />
        </span>
      </h1>

      <div className="mt-12 md:mt-16 flex flex-wrap items-center justify-between gap-6 relative z-10">
        <p data-fade className="brace max-w-sm">
          CS + AI at Oakland University, software engineering intern at Motherson. I make AI products that actually ship.
        </p>
        <button data-fade type="button" onClick={() => scrollToTarget('#work')} className="pill border-green text-green hover:bg-green hover:text-night">
          See the work ↓
        </button>
      </div>

      {/* Floating shapes: data-depth leans toward the cursor, data-speed drifts on scroll. */}
      <div data-float data-depth="0.6" data-speed="0.4" className="absolute left-[4%] top-[12%] md:left-[6%] md:top-[10%]">
        <div>
          <Shape kind="flower" size={96} />
        </div>
      </div>
      <div data-float data-depth="-0.8" data-speed="0.8" className="absolute right-[6%] top-[18%]">
        <div>
          <Shape kind="ring" size={140} />
        </div>
      </div>
      <div data-float data-depth="1" data-speed="0.3" className="absolute left-[46%] top-[52%] md:top-[48%] z-20">
        <div>
          <Shape kind="squiggle" size={120} />
        </div>
      </div>
      <div data-float data-depth="-0.5" data-speed="1.1" className="absolute right-[18%] bottom-[14%] hidden md:block">
        <div>
          <Shape kind="asterisk" size={84} />
        </div>
      </div>
      <div data-float data-depth="0.4" data-speed="0.6" className="absolute left-[30%] bottom-[8%]">
        <div>
          <Shape kind="diamond" size={56} />
        </div>
      </div>
    </section>
  )
}
