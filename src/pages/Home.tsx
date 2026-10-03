import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Grid from '../components/grid/Grid'
import HeroLight from '../components/HeroLight'
import type { LightControl, Rgb } from '../components/HeroLight'
import { LINKS } from '../data/content'
import { frameSequence } from '../lib/sequence'
import { gsap, lockScroll, prefersReducedMotion, ScrollTrigger, scrollToTarget, SplitText } from '../lib/motion'

const SCRAMBLE = '01<>/\\{}[]#*+=-_'
// What the letter wheels spin through before they land (no descenders, so nothing peeks into the next letter).
const JUNK = '0123456789ABCDEFHKMNPRTUVWXZ#%*+='

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
      gsap.set(hero.querySelectorAll('[data-hint], [data-window], [data-mark], [data-loader]'), { autoAlpha: 0 })
      window.addEventListener('resize', fit)
      return () => window.removeEventListener('resize', fit)
    }

    // Always start at the top, held still until the loader is done.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    lockScroll(true)
    // Until the scroll is built, the grid sits right under the hero, where a see-through browser toolbar (iPhone
    // Safari) can show it during the loader. Keep it hidden until then; afterwards it's far below.
    const below = el.querySelector<HTMLElement>('#grid')
    if (below) below.style.visibility = 'hidden'

    // What the loader waits for: the fonts and a first pass of the sequence's frames.
    const ready = { fonts: 0, frames: 0 }
    document.fonts?.ready.then(() => (ready.fonts = 1))
    // Phones and small tablets get the 960px frames (about two thirds of the data), everything bigger the 1280px ones.
    const seqCanvas = hero.querySelector<HTMLCanvasElement>('[data-seq]')!
    const lite = seqCanvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2) <= 1100
    const player = frameSequence(seqCanvas, lite ? '/sequence/hero-sm' : '/sequence/hero', (s) => (ready.frames = s))

    // Every selector below is scoped to the hero, so tiles further down can use the same data- names safely.
    const ctx = gsap.context(() => {
      // Layout measurements that ignore transforms, so they stay right on every refresh.
      const W = () => hero.clientWidth
      const H = () => hero.clientHeight
      // The always-visible part of the hero (see the section's comment); things are centred in this, not in H().
      const stage = hero.querySelector<HTMLElement>('[data-stage]')!
      const S = () => stage.clientHeight || H()
      const nameY = () => name.offsetTop + name.offsetHeight / 2
      // The size the name lands at, before the scroll grows it: 380px wide, a little more on big monitors.
      const small = () =>
        Math.min(Math.max(380, W() * 0.22), W() * 0.58) / (name.clientWidth - parseFloat(getComputedStyle(name).paddingLeft) * 2)

      const chars = SplitText.create([first, last], { type: 'chars' }).chars as HTMLElement[]
      const links = gsap.utils.toArray<HTMLElement>('[data-scramble]', hero)
      const labels = links.map((l) => l.textContent ?? '')
      links.forEach((l) => (l.textContent = ''))

      // ---- The loader: a counter that rolls from 000 to 100 while the light blooms in behind it,
      // then its wheels keep rolling and land on the letters of the name.
      gsap.set(name, { y: S() / 2 - nameY(), scale: small(), autoAlpha: 0 })
      gsap.set('[data-line] > span', { yPercent: 110 })
      gsap.set('[data-rule]', { scaleX: 0, transformOrigin: 'left center' })
      gsap.set('[data-clock]', { autoAlpha: 0 })
      const wheels = gsap.utils.toArray<HTMLElement>('[data-wheel]', hero)
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
        gsap.set(name, { y: S() / 2 - nameY(), scale: small() })
        const tl = gsap.timeline({ onComplete: () => ctx.add(buildScroll) })
        tl.to('[data-count]', { yPercent: -70, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0)
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
        const winEl = hero.querySelector<HTMLElement>('[data-window]')!
        const marks = gsap.utils.toArray<HTMLElement>('[data-mark]', hero)
        const quote = hero.querySelector<HTMLElement>('[data-quote] > figure')!

        // The window's two framed sizes before it fills the screen. On landscape screens it opens wide and short
        // between the halves of the name. On portrait screens (phones, tablets held upright) a share of the height
        // would be a tall sliver of a landscape clip, so there it spans nearly the full width at 5:4, then grows to
        // a square, and the name parts up and down around it instead of sideways.
        const tall = () => W() < S()
        const margin = () => Math.max(24, W() * 0.06)
        const open = { w: () => (tall() ? W() * 0.84 : W() * 0.6), h: () => (tall() ? W() * 0.84 * 0.8 : S() * 0.52) }
        const framed = { w: () => (tall() ? W() - margin() * 2 : W() * 0.9), h: () => (tall() ? W() - margin() * 2 : S() * 0.8) }
        // How far the crop marks reach out from the window's corners (see the marks' classes below).
        const reach = () => (matchMedia('(min-width: 1800px)').matches ? 46 : matchMedia('(min-width: 768px)').matches ? 34 : 18)

        // Where the halves of the name sit. Landscape: they slide out sideways (split.p eases 0 to 1) until only
        // their inner ends show at the screen's edges. Portrait: "Jasman" rides the window's top left corner and
        // "Sidhu." its bottom right one, clear of the crop marks, easing out of the name line as the window opens.
        // One function owns both so a rotation, or scrubbing back up, can never leave them half in one layout.
        const split = { p: 0 }
        // Setters, not gsap.set: this runs on every scroll frame inside the context, which would record each set.
        const [x1, y1, x2, y2] = [
          [first, 'x'],
          [first, 'y'],
          [last, 'x'],
          [last, 'y'],
        ].map(([el, p]) => gsap.quickSetter(el, p as string, 'px') as (v: number) => void)
        const place = () => {
          if (!tall()) {
            name.style.zIndex = ''
            x1(split.p * -(first.offsetLeft + first.offsetWidth * 0.8))
            x2(split.p * (W() - last.offsetLeft - last.offsetWidth * 0.2))
            y1(0)
            y2(0)
            return
          }
          // The halves cross the opening window on their way out, so here they ride above it.
          name.style.zIndex = '15'
          const k = 1 - (1 - Math.min(1, win.w / open.w())) ** 2
          const t = win.cy - win.h / 2
          const ny = name.offsetTop + (gsap.getProperty(name, 'y') as number)
          const gap = reach() + 8
          const left = Math.min(win.cx - win.w / 2, W() / 2 - open.w() / 2)
          x1(k * (left - first.offsetLeft))
          y1(k * (t - gap - (ny + first.offsetTop + first.offsetHeight)))
          x2(k * (W() - left - last.offsetLeft - last.offsetWidth))
          y2(k * (t + win.h + gap - (ny + last.offsetTop)))
        }

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
          if (tall()) place()
        }

        const seq = { p: 0 }
        let built = false
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: () => `+=${innerHeight * 5}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            // A refresh (a resize, a phone's rotation) replays the timeline to the same point with the new sizes but
            // silently, so draw what the onUpdate callbacks would have: otherwise a portrait window stays on a landscape
            // screen until the next scroll.
            onRefresh: () => {
              if (!built) return
              apply()
              place()
              player.set(seq.p)
            },
          },
        })

        // 1. The hero builds itself: the light pours in and the name grows into place.
        tl.fromTo(light, { light: 0.3 }, { light: 1, duration: 18, ease: 'power1.in' }, 0)
          .fromTo(name, { y: () => S() / 2 - nameY(), scale: small }, { y: 0, scale: 1, duration: 18, ease: 'power3.inOut' }, 0)
          .to('[data-hint]', { autoAlpha: 0, duration: 4 }, 0)
          .fromTo('[data-line] > span', { yPercent: 110 }, { yPercent: 0, duration: 8, stagger: 2, ease: 'power3.out' }, 8)
          .fromTo('[data-rule]', { scaleX: 0 }, { scaleX: 1, duration: 9, ease: 'power2.inOut' }, 9)
          .fromTo('[data-clock]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 5 }, 11)
        links.forEach((l, i) => tl.to(l, { scrambleText: { text: labels[i], chars: SCRAMBLE, speed: 0.6 }, duration: 5 }, 12 + i * 0.8))

        // 2. The split: the name rises and its halves part; a window opens between them.
        tl.to('[data-tag], [data-bar]', { autoAlpha: 0, duration: 4 }, 28)
          .to(name, { y: () => S() / 2 - nameY(), duration: 16, ease: 'power2.inOut' }, 30)
          .fromTo(split, { p: 0 }, { p: 1, duration: 18, ease: 'power2.inOut', onUpdate: place }, 30)
          .to([first, last], { opacity: () => (tall() ? 0.6 : 0.4), duration: 12 }, 34)
          .fromTo(
            win,
            { cx: () => W() / 2, cy: nameY, w: 0, h: () => parseFloat(name.style.fontSize) * 0.5 },
            { cy: () => S() / 2, w: open.w, h: open.h, duration: 16, ease: 'power2.inOut', onUpdate: apply },
            32,
          )

        // 3. The motion sequence plays inside the window as it grows to fill the screen.
        tl.to(seq, { p: 1, duration: 56, onUpdate: () => player.set(seq.p) }, 34)
          .fromTo('[data-seq]', { scale: 1.18 }, { scale: 1, duration: 56 }, 34)
          .to(win, { w: framed.w, h: framed.h, duration: 16, ease: 'power2.inOut', onUpdate: apply }, 48)
          .to(marks, { autoAlpha: 1, duration: 4 }, 52)
          .fromTo(quote, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 4, ease: 'power2.out' }, 40)
          .to([first, last], { autoAlpha: 0, duration: 8 }, 68)
          .to(quote, { autoAlpha: 0, duration: 4 }, 70)
          .to(win, { w: W, h: H, cy: () => H() / 2, duration: 14, ease: 'power2.inOut', onUpdate: apply }, 72)
          .to(marks, { autoAlpha: 0, duration: 4 }, 76)

        // 4. The hands hold full screen for a beat, then scroll away as the grid comes up (no fade to black, so
        // there's no empty screen in between). The light is hidden behind the window by now; switch it off.
        tl.to(light, { light: 0, cursor: 0, duration: 6 }, 84).to({}, { duration: 2 }, 90)
        built = true

        ScrollTrigger.refresh()
        if (below) below.style.visibility = ''
      }

      return () => {
        gsap.ticker.remove(count)
        links.forEach((l, i) => (l.textContent = labels[i]))
      }
    }, hero)

    ScrollTrigger.addEventListener('refreshInit', fit)
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', fit)
      ctx.revert()
      player.destroy()
      lockScroll(false)
      if (below) below.style.visibility = ''
    }
  }, [light])

  const go = () => scrollToTarget('#grid')

  return (
    <main ref={root}>
      {/* The hero fills the whole screen, including the strip behind a see-through browser toolbar (iPhone Safari),
          so the light runs under it. Its "stage" is the part that's always visible (100svh): text and centring are
          placed against that, and --chrome is the height of the strip below it. */}
      <section data-hero className="relative h-[100lvh] overflow-hidden bg-ink [--chrome:calc(100lvh-100svh)]">
        <div data-stage aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-[100svh]" />
        <HeroLight control={light} className="absolute inset-0 block h-full w-full" />

        {/* The loader: an odometer counting to 100 */}
        <div data-loader aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 grid h-[100svh] place-items-center">
          <p data-count className="flex font-mono text-[clamp(40px,4.4vw,92px)] font-light leading-none text-paper">
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
            <span className="absolute left-[-18px] top-[-1px] block h-[2px] w-[12px] bg-paper md:left-[-34px] md:w-[24px] huge:left-[-46px] huge:w-[32px]" />
            <span className="absolute left-[-1px] top-[-18px] block h-[12px] w-[2px] bg-paper md:top-[-34px] md:h-[24px] huge:top-[-46px] huge:h-[32px]" />
          </span>
        ))}

        {/* A quote in the middle of the window from when it opens until just before the hands touch */}
        {/* Each half of the line is unbreakable, so where it has to wrap it breaks at the comma. */}
        <div data-quote className="pointer-events-none absolute inset-x-0 top-0 z-30 grid h-[100svh] place-items-center px-6">
          <figure className="invisible max-w-[84vw] text-center opacity-0 [text-shadow:0_0_28px_rgba(0,0,0,0.85)] md:max-w-[56vw]">
            <blockquote className="font-serif text-[clamp(22px,6vw,32px)] italic leading-[1.1] text-paper [-webkit-text-stroke:0.03em_currentColor] md:text-[clamp(22px,5.4vh,36px)] huge:text-[clamp(36px,2.2vw,60px)]">
              <span className="inline-block">“What I cannot create,</span> <span className="inline-block">I do not understand.”</span>
            </blockquote>
            <figcaption className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-accent md:text-[13px] huge:mt-4 huge:text-[clamp(13px,0.65vw,18px)]">
              Richard Feynman
            </figcaption>
          </figure>
        </div>

        <p
          data-tag
          className="absolute left-5 top-5 z-20 max-w-[34ch] text-[15px] leading-[1.35] text-paper md:left-8 md:top-8 md:text-[17px] huge:left-12 huge:top-12 huge:text-[clamp(18px,0.6vw+8px,26px)]"
        >
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
          className="pointer-events-none absolute inset-x-0 bottom-[calc(68px+var(--chrome))] z-[5] flex items-baseline justify-between whitespace-nowrap px-5 leading-[0.8] text-paper md:bottom-[calc(84px+var(--chrome))] md:px-8 huge:bottom-[calc(116px+var(--chrome))] huge:px-12"
        >
          <span data-first className="font-sans font-[450] tracking-[-0.055em]">
            Jasman
          </span>
          <span data-last className="font-serif text-[1.06em] italic tracking-[-0.02em]">
            Sidhu<span className="text-accent">.</span>
          </span>
        </h1>

        <div data-bar className="absolute inset-x-5 bottom-[calc(1.25rem+var(--chrome))] z-20 md:inset-x-8 md:bottom-[calc(1.5rem+var(--chrome))] huge:inset-x-12 huge:bottom-[calc(2.5rem+var(--chrome))]">
          <div data-rule className="h-px bg-paper/30" />
          <div className="mt-3.5 flex items-center justify-between text-[12px] uppercase tracking-[0.02em] text-paper md:grid md:grid-cols-3 md:text-[14px] huge:mt-5 huge:text-[clamp(14px,0.45vw+6px,18px)]">
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
                Resume
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

        <p data-hint aria-hidden className="invisible absolute bottom-[calc(1.5rem+var(--chrome))] left-1/2 z-20 -translate-x-1/2 type-label opacity-0 huge:bottom-[calc(2.5rem+var(--chrome))] huge:text-[13px]">
          Scroll
        </p>
      </section>

      <Grid />
    </main>
  )
}
