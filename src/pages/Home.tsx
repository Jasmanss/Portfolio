import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import HeroLight from '../components/HeroLight'
import type { LightControl, Rgb } from '../components/HeroLight'
import { LINKS } from '../data/content'
import { frameSequence } from '../lib/sequence'
import { gsap, lockScroll, prefersReducedMotion, ScrollTrigger, scrollToTarget, SplitText } from '../lib/motion'

const SCRAMBLE = '01<>/\\{}[]#*+=-_'
// What the letter wheels spin through before they land (no descenders, so nothing peeks into the next letter).
const JUNK = '0123456789ABCDEFHKMNPRTUVWXZ#%*+='
const TILES = ['J', 'Portlkit', 'Ember', 'Haven', 'S', 'Imperium', 'Callback', 'HairStyl', 'Contact']

// The site's one accent, clear sky blue (the same as --accent in index.css).
const ACCENT: Rgb = [77, 163, 255]

// The time in Sterling Heights, for the bar at the bottom.
function useClock() {
  const read = () =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit' }).format(new Date())
  const [time, setTime] = useState(read)
  useEffect(() => {
    const id = setInterval(() => setTime(read()), 15000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Home() {
  const root = useRef<HTMLElement>(null)
  const light = useRef<LightControl>({ light: 0, cursor: 1, load: 0, boot: 1, accent: ACCENT }).current
  const time = useClock()

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const hero = el.querySelector<HTMLElement>('[data-hero]')!
    const name = el.querySelector<HTMLElement>('[data-name]')!
    const first = el.querySelector<HTMLElement>('[data-first]')!
    const last = el.querySelector<HTMLElement>('[data-last]')!

    // The name spans the width with a gap in the middle, whatever the screen.
    const fit = () => {
      name.style.fontSize = '100px'
      const natural = first.offsetWidth + last.offsetWidth
      const pad = parseFloat(getComputedStyle(name).paddingLeft) * 2
      const share = innerWidth < 768 ? 0.9 : 0.84
      name.style.fontSize = `${((name.clientWidth - pad) * share * 100) / natural}px`
    }
    fit()

    if (prefersReducedMotion()) {
      Object.assign(light, { light: 1, cursor: 0, boot: 0 })
      gsap.set('[data-hint], [data-window], [data-mark], [data-loader]', { autoAlpha: 0 })
      window.addEventListener('resize', fit)
      return () => window.removeEventListener('resize', fit)
    }

    // Always start at the top, held still until the loader is done.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    lockScroll(true)

    // What the loader waits for: the fonts and a first pass of the sequence's frames.
    const ready = { fonts: 0, frames: 0 }
    document.fonts?.ready.then(() => (ready.fonts = 1))
    const player = frameSequence(el.querySelector<HTMLCanvasElement>('[data-seq]')!, '/sequence/hero', (s) => (ready.frames = s))

    const ctx = gsap.context(() => {
      // Layout measurements that ignore transforms, so they stay right on every refresh.
      const W = () => hero.clientWidth
      const H = () => hero.clientHeight
      const nameY = () => name.offsetTop + name.offsetHeight / 2
      const small = () => Math.min(380, W() * 0.58) / (name.clientWidth - parseFloat(getComputedStyle(name).paddingLeft) * 2)

      const chars = SplitText.create('[data-first], [data-last]', { type: 'chars' }).chars as HTMLElement[]
      const links = gsap.utils.toArray<HTMLElement>('[data-scramble]', el)
      const labels = links.map((l) => l.textContent ?? '')
      links.forEach((l) => (l.textContent = ''))

      // ---- The loader: a counter that rolls from 000 to 100 while the light blooms in behind it,
      // then its wheels keep rolling and land on the letters of the name.
      gsap.set(name, { y: H() / 2 - nameY(), scale: small(), autoAlpha: 0 })
      gsap.set('[data-line] > span', { yPercent: 110 })
      gsap.set('[data-rule]', { scaleX: 0, transformOrigin: 'left center' })
      gsap.set('[data-clock]', { autoAlpha: 0 })
      const wheels = gsap.utils.toArray<HTMLElement>('[data-wheel]', el)
      const odometer = (v: number) => {
        const ones = v % 10
        const carry = Math.max(0, ones - 9)
        const tensDigit = Math.floor(v / 10) % 10
        const tens = tensDigit + carry
        const hundreds = Math.floor(v / 100) + (tensDigit === 9 ? carry : 0)
        ;[hundreds, tens, ones].forEach((p, i) => (wheels[i].style.transform = `translateY(${-p}em)`))
      }
      const shown = { v: 0 }
      const t0 = performance.now()
      const count = () => {
        const elapsed = (performance.now() - t0) / 1000
        // Never faster than 1.6 s so it reads, never stuck past 7 s if something fails to load.
        const real = elapsed > 7 ? 1 : ready.fonts * 0.3 + ready.frames * 0.7
        const target = Math.min(real, elapsed / 1.6)
        shown.v += (target - shown.v) * 0.1
        if (target >= 1 && shown.v > 0.996) shown.v = 1
        odometer(shown.v * 100)
        light.load = shown.v
        if (shown.v === 1) {
          gsap.ticker.remove(count)
          ctx.add(land)
        }
      }
      gsap.ticker.add(count)

      // Each letter becomes a little wheel of random characters that spins down onto the real letter.
      const land = () => {
        // The fonts have arrived by now, so size the name with them before it shows (the first fit ran with the
        // fallback font, and the refresh after this would otherwise make the name jump).
        fit()
        gsap.set(name, { y: H() / 2 - nameY(), scale: small() })
        const tl = gsap.timeline({ onComplete: () => ctx.add(buildScroll) })
        tl.to('[data-count]', { yPercent: -70, autoAlpha: 0, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' }, 0)
          .set(name, { autoAlpha: 1 }, 0.25)
        chars.forEach((c, i) => {
          const letter = c.textContent ?? ''
          const spins = 5 + (i % 4)
          const junk = Array.from({ length: spins }, () => JUNK[(Math.random() * JUNK.length) | 0])
          // The hidden letter keeps the box its real size; the wheel sits on top of it and is clipped to it.
          // Each character gets a 1.4em slot (a 0.8em line, then a gap) so the ones above and below never peek in.
          c.innerHTML = `<span class="invisible">${letter}</span><span class="absolute inset-x-0 top-0 block">${[...junk, letter]
            .map((g) => `<span class="block h-[1.4em]">${g}</span>`)
            .join('')}</span>`
          c.style.position = 'relative'
          c.style.clipPath = 'inset(-0.14em -0.12em -0.2em -0.12em)'
          const strip = c.lastElementChild as HTMLElement
          tl.fromTo(
            strip,
            { y: 0 },
            {
              y: `${-spins * 1.4}em`,
              duration: 1.1,
              ease: 'power4.out',
              onComplete: () => {
                c.textContent = letter
                c.style.clipPath = ''
                c.style.position = ''
              },
            },
            0.25 + i * 0.05,
          )
        })
        tl.to(light, { boot: 0, duration: 1.4, ease: 'power2.inOut' }, 0.5)
          .to(light, { light: 0.3, duration: 1.6, ease: 'power2.out' }, 0.6)
          .to('[data-hint]', { autoAlpha: 1, duration: 0.8 }, 1.3)
          .call(() => lockScroll(false), [], 1.1)
      }

      // ---- The scroll: the hero builds, the name splits and the window opens.
      const buildScroll = () => {
        // The window between the two halves of the name: a rectangle revealed with a clip path, marked at its
        // corners with white crop marks.
        const win = { cx: 0, cy: 0, w: 0, h: 0 }
        const winEl = el.querySelector<HTMLElement>('[data-window]')!
        const marks = gsap.utils.toArray<HTMLElement>('[data-mark]', el)
        const quote = el.querySelector<HTMLElement>('[data-quote] > figure')!
        const apply = () => {
          const l = win.cx - win.w / 2
          const t = win.cy - win.h / 2
          winEl.style.clipPath = `inset(${t}px ${W() - l - win.w}px ${H() - t - win.h}px ${l}px)`
          const at = [
            [l, t, 1, 1],
            [l + win.w, t, -1, 1],
            [l, t + win.h, 1, -1],
            [l + win.w, t + win.h, -1, -1],
          ]
          marks.forEach((m, i) => (m.style.transform = `translate(${at[i][0]}px, ${at[i][1]}px) scale(${at[i][2]}, ${at[i][3]})`))
        }

        const seq = { p: 0 }
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${innerHeight * 5}`, pin: true, scrub: 1, invalidateOnRefresh: true },
        })

        // 1. The hero builds itself: the light pours in and the name grows into place.
        tl.fromTo(light, { light: 0.3 }, { light: 1, duration: 18, ease: 'power1.in' }, 0)
          .fromTo(name, { y: () => H() / 2 - nameY(), scale: small }, { y: 0, scale: 1, duration: 18, ease: 'power3.inOut' }, 0)
          .to('[data-hint]', { autoAlpha: 0, duration: 4 }, 0)
          .fromTo('[data-line] > span', { yPercent: 110 }, { yPercent: 0, duration: 8, stagger: 2, ease: 'power3.out' }, 8)
          .fromTo('[data-rule]', { scaleX: 0 }, { scaleX: 1, duration: 9, ease: 'power2.inOut' }, 9)
          .fromTo('[data-clock]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 5 }, 11)
        links.forEach((l, i) => tl.to(l, { scrambleText: { text: labels[i], chars: SCRAMBLE, speed: 0.6 }, duration: 5 }, 12 + i * 0.8))

        // 2. The split: the name rises and its halves slide apart; a window opens between them.
        tl.to('[data-tag], [data-bar]', { autoAlpha: 0, duration: 4 }, 28)
          .to(name, { y: () => H() / 2 - nameY(), duration: 16, ease: 'power2.inOut' }, 30)
          .to(first, { x: () => -(first.offsetLeft + first.offsetWidth * 0.8), duration: 18, ease: 'power2.inOut' }, 30)
          .to(last, { x: () => W() - last.offsetLeft - last.offsetWidth * 0.2, duration: 18, ease: 'power2.inOut' }, 30)
          .to([first, last], { opacity: 0.4, duration: 12 }, 34)
          .fromTo(
            win,
            { cx: () => W() / 2, cy: nameY, w: 0, h: () => parseFloat(name.style.fontSize) * 0.5 },
            { cy: () => H() / 2, w: () => W() * 0.6, h: () => H() * 0.52, duration: 16, ease: 'power2.inOut', onUpdate: apply },
            32,
          )

        // 3. The motion sequence plays inside the window as it grows to fill the screen.
        tl.to(seq, { p: 1, duration: 56, onUpdate: () => player.set(seq.p) }, 34)
          .fromTo('[data-seq]', { scale: 1.18 }, { scale: 1, duration: 56 }, 34)
          .to(win, { w: () => W() * 0.9, h: () => H() * 0.8, duration: 16, ease: 'power2.inOut', onUpdate: apply }, 48)
          .to(marks, { autoAlpha: 1, duration: 4 }, 52)
          .fromTo(quote, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 4, ease: 'power2.out' }, 40)
          .to([first, last], { autoAlpha: 0, duration: 8 }, 68)
          .to(quote, { autoAlpha: 0, duration: 4 }, 70)
          .to(win, { w: W, h: H, duration: 14, ease: 'power2.inOut', onUpdate: apply }, 72)
          .to(marks, { autoAlpha: 0, duration: 4 }, 76)

        // 4. The hands hold full screen for a beat, then scroll away as the grid comes up (no fade to black, so
        // there's no empty screen in between). The light is hidden behind the window by now; switch it off.
        tl.to(light, { light: 0, cursor: 0, duration: 6 }, 84).to({}, { duration: 2 }, 90)

        // The grid (placeholder for now): tiles land from the middle outwards.
        gsap.from('[data-tile] > *', {
          scale: 0,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'back.out(1.6)',
          stagger: { amount: 0.5, from: 'center', grid: [3, 3] },
          scrollTrigger: { trigger: '[data-grid]', start: 'top 90%' },
        })
        ScrollTrigger.refresh()
      }

      return () => {
        gsap.ticker.remove(count)
        links.forEach((l, i) => (l.textContent = labels[i]))
      }
    }, el)

    ScrollTrigger.addEventListener('refreshInit', fit)
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', fit)
      ctx.revert()
      player.destroy()
      lockScroll(false)
    }
  }, [light])

  const go = () => scrollToTarget('#grid')

  return (
    <main ref={root}>
      <section data-hero className="relative h-[100svh] overflow-hidden bg-ink">
        <HeroLight control={light} className="absolute inset-0 block h-full w-full" />

        {/* The loader: an odometer counting to 100 */}
        <div data-loader aria-hidden className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
          <p data-count className="flex font-mono text-[clamp(40px,4.4vw,68px)] font-light leading-none text-paper">
            {[0, 1, 2].map((d) => (
              <span key={d} className="relative block h-[1em] w-[0.62em] overflow-hidden">
                <span data-wheel className="absolute inset-x-0 top-0 block text-center">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => (
                    <span key={i} className="block h-[1em] leading-[1em]">
                      {n}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </p>
        </div>

        {/* The window that opens between the halves of the name */}
        <div data-window className="absolute inset-0 z-10 overflow-hidden [clip-path:inset(50%)]">
          <canvas data-seq aria-hidden className="absolute inset-0 block h-full w-full" />
        </div>
        {/* Crop marks at the window's corners */}
        {['tl', 'tr', 'bl', 'br'].map((k) => (
          <span key={k} data-mark aria-hidden className="invisible absolute left-0 top-0 z-30 block opacity-0">
            <span className="absolute left-[-34px] top-[-1px] block h-[2px] w-[24px] bg-paper" />
            <span className="absolute left-[-1px] top-[-34px] block h-[24px] w-[2px] bg-paper" />
          </span>
        ))}

        {/* A quote in the middle of the window from when it opens until just before the hands touch */}
        <div data-quote className="pointer-events-none absolute inset-0 z-30 grid place-items-center px-6">
          <figure className="invisible max-w-[56vw] text-center opacity-0 [text-shadow:0_0_28px_rgba(0,0,0,0.85)]">
            <blockquote className="font-serif text-[20px] italic leading-tight text-paper [-webkit-text-stroke:0.03em_currentColor] md:text-[36px]">
              “What I cannot create, I do not understand.”
            </blockquote>
            <figcaption className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-accent md:text-[13px]">Richard Feynman</figcaption>
          </figure>
        </div>

        <p data-tag className="absolute left-5 top-5 z-20 max-w-[34ch] text-[15px] leading-[1.35] text-paper md:left-8 md:top-8 md:text-[17px]">
          <span data-line className="block overflow-hidden">
            <span className="block">
              Software engineer, <em className="font-serif text-[1.14em] italic">building AI tools</em>,
            </span>
          </span>
          <span data-line className="block overflow-hidden">
            <span className="block">from the first commit to production.</span>
          </span>
        </p>

        <h1
          data-name
          aria-label="Jasman Sidhu"
          className="pointer-events-none absolute inset-x-0 bottom-[68px] z-[5] flex items-baseline justify-between whitespace-nowrap px-5 leading-[0.8] text-paper md:bottom-[84px] md:px-8"
        >
          <span data-first className="font-sans font-[450] tracking-[-0.055em]">
            Jasman
          </span>
          <span data-last className="font-serif text-[1.06em] italic tracking-[-0.02em]">
            Sidhu<span className="text-accent">.</span>
          </span>
        </h1>

        <div data-bar className="absolute inset-x-5 bottom-5 z-20 md:inset-x-8 md:bottom-6">
          <div data-rule className="h-px bg-paper/30" />
          <div className="mt-3.5 flex items-center justify-between text-[12px] uppercase tracking-[0.02em] text-paper md:grid md:grid-cols-3 md:text-[14px]">
            <p data-clock className="whitespace-nowrap">
              → <span className="hidden md:inline">Sterling Heights, </span>MI <span className="text-paper/55">{time}</span>
            </p>
            <nav aria-label="Profiles" className="hidden items-center justify-center gap-4 md:flex">
              <a data-scramble href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-accent">
                GitHub
              </a>
              <span className="text-paper/35">/</span>
              <a data-scramble href={LINKS.linkedin} target="_blank" rel="noreferrer" className="hover:text-accent">
                LinkedIn
              </a>
              <span className="text-paper/35">/</span>
              <a data-scramble href={LINKS.resume} target="_blank" rel="noreferrer" className="hover:text-accent">
                Résumé
              </a>
            </nav>
            <nav aria-label="Main" className="flex justify-end gap-5 md:gap-8">
              {['Work', 'About', 'Contact'].map((label) => (
                <button key={label} data-scramble type="button" onClick={go} className="uppercase hover:text-accent">
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <p data-hint aria-hidden className="invisible absolute bottom-6 left-1/2 z-20 -translate-x-1/2 type-label opacity-0">
          Scroll
        </p>
      </section>

      {/* Placeholder for the grid, the next thing we build */}
      <section id="grid" data-grid className="relative grid h-[100svh] grid-cols-3 grid-rows-3 bg-ink">
        {TILES.map((t, i) => (
          <div key={t} data-tile className={`grid place-items-center border-[#1d1d1d] ${i % 3 < 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''}`}>
            {t === 'J' ? (
              <span className="font-sans text-[16vmin] font-[450] leading-none tracking-[-0.05em]">J</span>
            ) : t === 'S' ? (
              <span className="font-serif text-[17vmin] italic leading-none">S</span>
            ) : (
              <span className="type-label">{t}</span>
            )}
          </div>
        ))}
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 type-label">grid · placeholder until we build it</p>
      </section>
    </main>
  )
}
