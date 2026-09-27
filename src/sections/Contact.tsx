import { useLayoutEffect, useRef } from 'react'
import { LINKS } from '../data/content'
import Signature from '../components/Signature'
import Shape from '../components/Shapes'
import { floatShapes, gsap, scrollToTarget } from '../lib/motion'

export default function Contact() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let stop = () => {}
    const ctx = gsap.context(() => {
      stop = floatShapes(el)
    }, el)
    return () => {
      stop()
      ctx.revert()
    }
  }, [])

  return (
    <section id="contact" ref={root} className="relative bg-cream text-night overflow-hidden rounded-t-[2.5rem]">
      <div className="container-xl pt-28 md:pt-40 pb-8 relative z-10">
        <p className="font-mono text-[12px] text-night/60">{'{ open to internships, freelance work and collaborations }'}</p>
        <h2 className="mt-6 type-display text-[clamp(4rem,12vw,12rem)]">
          Let’s build
          <br />
          <span className="sticker bg-green -rotate-2 inline-block">something</span>
        </h2>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-10">
          <a
            href={`mailto:${LINKS.email}`}
            className="inline-flex items-center gap-3 rounded-full bg-night text-cream px-7 py-4 font-mono text-sm md:text-base hover:bg-orange hover:text-night transition-colors break-all"
          >
            {LINKS.email} ↗
          </a>
          <Signature className="w-[min(380px,75vw)] text-night" />
        </div>

        <div className="mt-24 md:mt-32 pt-6 border-t border-night/15 flex flex-wrap items-center justify-between gap-6 font-mono text-[12px] text-night/60">
          <span>© {new Date().getFullYear()} Jasman Sidhu</span>
          <div className="flex items-center gap-6">
            <a href={LINKS.github} target="_blank" rel="noreferrer" className="link-underline hover:text-night">
              GitHub
            </a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="link-underline hover:text-night">
              LinkedIn
            </a>
            <a href={LINKS.resume} download className="link-underline hover:text-night">
              Resume
            </a>
          </div>
          <button type="button" onClick={() => scrollToTarget(0)} className="link-underline hover:text-night">
            Back to top ↑
          </button>
        </div>
      </div>

      <div data-float data-depth="0.6" data-speed="0.6" className="absolute right-[6%] top-[10%]">
        <div>
          <Shape kind="flower" size={130} />
        </div>
      </div>
      <div data-float data-depth="-0.7" data-speed="0.9" className="absolute right-[30%] top-[38%] hidden md:block">
        <div>
          <Shape kind="squiggle" size={110} />
        </div>
      </div>
    </section>
  )
}
