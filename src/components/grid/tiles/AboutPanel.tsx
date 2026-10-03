import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ABOUT, EXPERIENCE, LINKS, NOW } from '../../../data/content'
import { gsap, prefersReducedMotion } from '../../../lib/motion'

// The About panel: who I am, in my own words, next to my portrait printed in the hero's 1-bit sky-blue dither.

// One or two lines per role; the full bullets live on the resume.
const SHORT: Record<string, string[]> = {
  'Motherson Group': [
    'Built the preventive-maintenance app (Python, Flask, SQL) that replaced paper checklists on 147 machines: scan a QR code, finish the job from a phone.',
    'Added MTTR and MTBF dashboards, Teams alerts through Power Automate, and 400+ pytest tests on an on-prem Ubuntu server.',
  ],
  'Aurelius Holdings LLC': [
    'Build the storefront of a live ecommerce site in React, TypeScript and Vite: components, routed pages, cart state and pricing rules.',
    'Wired to Supabase for products, orders and sign-in, with weekly releases on Vercel.',
  ],
}
const short = (org: string, bullets: string[]) => SHORT[org] ?? bullets.slice(0, 2).map((b) => b.split('. ')[0].replace(/\.?$/, '.'))

// The time where I am, ticking.
function useLocalTime() {
  const read = () =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: NOW.timeZone, timeZoneName: 'short' }).format(new Date())
  const [time, setTime] = useState(read)
  useEffect(() => {
    const id = setInterval(() => setTime(read()), 10000)
    return () => clearInterval(id)
  }, [])
  return time
}

// The portrait as a 1-bit print: 3px cells through an 8x8 Bayer matrix, midtones in sky blue and highlights in paper,
// the same recipe as the hero's light. When the panel opens a print head sweeps down and lays it in, and the cursor
// shines a little extra light wherever it goes.
const CELL = 3
const SRC = '/darkjasman.jpg'
// The crop, as fractions of the painting: framed in on the face. The top of the crop stays put (just above the hair)
// whatever the box's shape, so a squarer box (phones, tablets) loses the shirt, not the head; a box much wider than
// it is tall (a phone held sideways) zooms out until at least half the painting's height shows.
const ZOOM = 1.5
const FOCUS = { x: 0.49, y: 0.45 }
const MIN_SPAN = 0.5
// How tall the print head's glowing band is, as a fraction of the portrait.
const BAND = 0.07
const BAYER = (() => {
  let b = [[0]]
  for (let n = 1; n < 8; n *= 2) {
    const next: number[][] = []
    for (let y = 0; y < n * 2; y++) {
      next.push([])
      for (let x = 0; x < n * 2; x++) next[y].push(b[y % n][x % n] * 4 + [0, 2, 3, 1][(y >= n ? 2 : 0) + (x >= n ? 1 : 0)])
    }
    b = next
  }
  return b.flat().map((v) => (v + 0.5) / 64)
})()

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Two passes of a box blur (close enough to a gaussian), clamped at the edges.
function blur(a: Float32Array, w: number, h: number, r: number) {
  const out = Float32Array.from(a)
  const tmp = new Float32Array(a.length)
  const n = 2 * r + 1
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w
      let sum = 0
      for (let k = -r; k <= r; k++) sum += out[row + Math.min(w - 1, Math.max(0, k))]
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / n
        sum += out[row + Math.min(w - 1, x + r + 1)] - out[row + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x]
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / n
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
      }
    }
  }
  return out
}

function DitherPortrait({ className = '' }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const wrap = box.current!
    const cv = canvas.current!
    const g = cv.getContext('2d')!
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/\s+/).map(Number)
    const st = { scan: prefersReducedMotion() ? 1 : 0, mx: 0.5, my: 0.4, light: 0 }
    let cols = 0
    let rows = 0
    let tone: Float32Array | null = null
    let edge: Float32Array | null = null
    let img: HTMLImageElement | null = null
    let out: ImageData | null = null
    let dead = false

    // How bright each cell is. The painting keeps its face in the dark, so: crop in on it, sharpen it (its brows, eyes
    // and mouth carry the likeness), stretch the levels, cut the backdrop away around the figure, and hold the shirt
    // down so the face leads.
    const measure = () => {
      if (!img) return
      cols = Math.max(1, Math.floor(wrap.clientWidth / CELL))
      rows = Math.max(1, Math.floor(wrap.clientHeight / CELL))
      cv.width = cols
      cv.height = rows
      cv.style.width = `${cols * CELL}px`
      cv.style.height = `${rows * CELL}px`
      const W = img.naturalWidth
      const H = img.naturalHeight
      const s = Math.min(Math.max(cols / W, rows / H) * ZOOM, rows / (MIN_SPAN * H))
      const sw = cols / s
      const sh = rows / s
      const x0 = sw > W ? (W - sw) / 2 : Math.min(W - sw, Math.max(0, FOCUS.x * W - sw / 2))
      const y0 = Math.min(H - sh, Math.max(0, (FOCUS.y - 0.5 / ZOOM) * H))
      const tmp = document.createElement('canvas')
      tmp.width = cols
      tmp.height = rows
      const t = tmp.getContext('2d')!
      t.imageSmoothingQuality = 'high'
      t.drawImage(img, x0, y0, sw, sh, 0, 0, cols, rows)
      const px = t.getImageData(0, 0, cols, rows).data
      const lum = new Float32Array(cols * rows)
      for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
      const soft = blur(lum, cols, rows, Math.max(2, Math.round(cols / 36)))
      tone = new Float32Array(cols * rows)
      // The print dissolves towards the sides instead of stopping at them.
      edge = new Float32Array(cols)
      for (let x = 0; x < cols; x++) edge[x] = smooth(0, 0.1, x / cols) * smooth(0, 0.1, 1 - x / cols)
      for (let y = 0; y < rows; y++) {
        const sy = (y0 + ((y + 0.5) / rows) * sh) / H
        const neckY = smooth(0.45, 0.55, sy)
        const shoulderY = smooth(0.58, 0.68, sy)
        const shirt = 1 - 0.45 * smooth(0.6, 0.75, sy)
        // The print dissolves towards the bottom edge instead of stopping at it.
        const foot = smooth(0, 0.16, 1 - y / rows)
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          const sx = (x0 + ((x + 0.5) / cols) * sw) / W
          const sharp = clamp01(lum[i] + 1.8 * (lum[i] - soft[i]))
          const lev = clamp01((sharp - 0.1) / 0.45)
          const head = 1 - smooth(0.85, 1.05, Math.hypot((sx - 0.485) / 0.27, (sy - 0.345) / 0.28))
          const neck = (1 - smooth(0.8, 1, Math.abs(sx - 0.5) / 0.2)) * neckY
          const shoulders = shoulderY * (1 - smooth(0.9, 1.05, Math.hypot((sx - 0.6) / 0.62, (sy - 1.05) / 0.5)))
          // Below a whisper of light, nothing: stray specks in the hair and the backdrop read as noise.
          const k = lev * Math.max(head, neck, shoulders) * shirt * foot * edge[x]
          tone[i] = k < 0.06 ? 0 : k
        }
      }
      out = g.createImageData(cols, rows)
      draw()
    }

    const draw = () => {
      if (!tone || !out || !edge) return
      const d = out.data
      const r = cols * 0.3
      const lx = st.mx * cols
      const ly = st.my * rows
      // The print head: everything above it is printed, a band just above it glows, nothing below it yet.
      const head = st.scan * (1 + BAND * 2)
      const scanning = st.scan < 1
      for (let y = 0; y < rows; y++) {
        const u = y / rows
        const behind = head - u
        const printed = behind > 0
        const glow = scanning && printed ? Math.max(0, 1 - behind / BAND) : 0
        const bar = scanning && behind > 0 && behind < 1.2 / rows
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          const o = i * 4
          if (!printed) {
            d[o + 3] = 0
            continue
          }
          let k = tone[i] + glow * (0.25 * edge[x] + tone[i] * 0.6)
          if (st.light > 0) {
            const f = Math.max(0, 1 - Math.hypot(x - lx, y - ly) / r)
            k += st.light * 0.32 * f * f
          }
          const b = BAYER[(y & 7) * 8 + (x & 7)]
          if (bar ? (x & 1) === 0 && b < edge[x] : b < Math.min(k * 1.05, 0.97)) {
            const peak = !bar && b < (k - 0.55) * 2.2
            d[o] = peak ? 242 : accent[0]
            d[o + 1] = peak ? 242 : accent[1]
            d[o + 2] = peak ? 242 : accent[2]
            d[o + 3] = 255
          } else d[o + 3] = 0
        }
      }
      g.putImageData(out, 0, 0)
    }

    const ctx = gsap.context(() => {
      const im = new Image()
      im.decoding = 'async'
      im.src = SRC
      im.onload = () => {
        if (dead) return
        img = im
        measure()
        if (st.scan < 1) gsap.to(st, { scan: 1, duration: 1.7, ease: 'power1.inOut', delay: 0.4, onUpdate: draw, onComplete: draw })
      }
    }, wrap)

    const ro = new ResizeObserver(() => measure())
    ro.observe(wrap)

    // The cursor's light glides after it, and fades when it leaves.
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const rect = cv.getBoundingClientRect()
      gsap.to(st, { mx: (e.clientX - rect.left) / rect.width, my: (e.clientY - rect.top) / rect.height, light: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto', onUpdate: draw })
    }
    const leave = () => gsap.to(st, { light: 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto', onUpdate: draw })
    wrap.addEventListener('pointermove', move)
    wrap.addEventListener('pointerleave', leave)

    return () => {
      dead = true
      ro.disconnect()
      wrap.removeEventListener('pointermove', move)
      wrap.removeEventListener('pointerleave', leave)
      gsap.killTweensOf(st)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={box} className={`relative grid w-full place-items-center overflow-hidden ${className}`}>
      <canvas ref={canvas} role="img" aria-label="My portrait, printed as a sky-blue dither" className="block" style={{ imageRendering: 'pixelated' }} />
    </div>
  )
}

// Small mono labels: 11px everywhere, growing a little on big monitors (the same steps as the other panels).
const LABEL = 'huge:text-[clamp(11px,0.3vw+5px,15px)]'

// Three arrangements. Phones: the title, the portrait across the screen (cropped squarer, so it holds the face and
// leaves room for the first lines of text), then everything else in one column. Tablets held upright (and phones
// held sideways, sm:): the portrait takes the right of the first screen with the title set against its foot, and the
// text runs full width beneath it, experience and education side by side. Wide landscape screens (split:): the portrait down the left, everything
// else centred on the right. On big monitors (huge:) type, spacing and the portrait grow with the screen.
export default function AboutPanel({ index = 0 }: { index?: number }) {
  const time = useLocalTime()
  const links = [
    { label: 'Resume', href: LINKS.resume, mark: '↓' },
    { label: 'GitHub', href: LINKS.github, mark: '↗' },
    { label: 'LinkedIn', href: LINKS.linkedin, mark: '↗' },
  ]

  return (
    <div className="flex min-h-full flex-col px-5 pb-16 pt-20 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:content-start sm:gap-x-10 sm:px-10 sm:pb-20 sm:pt-24 split:grid-cols-[minmax(0,0.78fr)_minmax(0,1.62fr)] split:grid-rows-[1fr_auto_auto_1fr] split:content-normal split:gap-x-14 split:pb-10 huge:gap-x-[clamp(56px,5vw,140px)] huge:px-[clamp(40px,4vw,112px)] huge:pb-[clamp(40px,5vh,96px)] huge:pt-[clamp(96px,9vh,150px)]">
      <header className="sm:col-start-1 sm:row-start-1 sm:flex sm:flex-col sm:justify-between sm:pb-9 split:col-start-2 split:row-start-2 split:block split:pb-0">
        <p data-reveal className={`type-label ${LABEL}`}>
          {String(index + 1).padStart(2, '0')} / The person behind all this
        </p>
        <h2
          data-reveal
          className="mt-3 font-serif text-[clamp(56px,8vw,128px)] italic leading-[0.9] tracking-[-0.02em] sm:text-[clamp(56px,11vw,120px)] split:text-[clamp(56px,8vw,128px)] huge:mt-5 huge:text-[clamp(128px,7.5vw,200px)]"
        >
          About<span className="text-accent">.</span>
        </h2>
      </header>

      <figure
        data-reveal
        className="mt-5 w-full sm:col-start-2 sm:row-start-1 sm:mt-0 split:col-start-1 split:row-span-4 split:row-start-1 split:max-w-[440px] split:self-center huge:max-w-[min(34vw,calc((100svh-260px)*0.64))]"
      >
        <DitherPortrait className="aspect-[4/5] max-h-[56svh] sm:max-h-[64svh] split:aspect-[2/3] split:max-h-none" />
        <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.06em] text-mute huge:mt-4 huge:text-[clamp(11px,0.3vw+5px,15px)]">
          <span>{NOW.place}</span>
          <span className="text-paper">
            <span className="mr-2 inline-block h-[6px] w-[6px] translate-y-[-1px] bg-accent" aria-hidden />
            {time}
          </span>
        </figcaption>
      </figure>

      <div className="sm:col-span-2 sm:row-start-2 split:col-span-1 split:col-start-2 split:row-start-3">
        <p
          data-reveal
          className="mt-8 max-w-[40em] text-[17px] leading-snug text-paper/85 sm:mt-12 sm:text-[21px] split:mt-6 split:text-[19px] huge:mt-8 huge:text-[clamp(19px,0.7vw+8px,28px)]"
        >
          {ABOUT}
        </p>

        <div className="mt-10 grid gap-10 border-t border-paper/15 pt-7 sm:grid-cols-[1.3fr_1fr] sm:gap-12 split:mt-8 huge:mt-12 huge:max-w-[clamp(880px,56vw,1400px)] huge:gap-[clamp(48px,4vw,96px)] huge:pt-10">
          <section data-reveal aria-label="Experience">
            <h3 className={`type-label ${LABEL}`}>Experience</h3>
            <ol className="mt-4 grid gap-7 split:gap-6 huge:mt-6 huge:gap-9">
              {EXPERIENCE.map((e) => (
                <li key={e.org}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[17px] leading-tight huge:text-[clamp(17px,0.55vw+7px,25px)]">{e.role}</span>
                    <span className={`type-label ${LABEL}`}>{e.time}</span>
                  </p>
                  <p className="mt-1 text-[15px] text-paper/55 split:text-[14px] huge:mt-1.5 huge:text-[clamp(14px,0.45vw+6px,20px)]">
                    {e.org}, {e.place}
                  </p>
                  <ul className="mt-2.5 grid gap-1.5 text-[15px] leading-relaxed text-paper/75 sm:text-[16px] split:text-[14px] huge:mt-4 huge:gap-2 huge:text-[clamp(15px,0.5vw+6px,22px)]">
                    {short(e.org, e.bullets).map((b) => (
                      <li key={b} className="grid grid-cols-[14px_1fr] gap-2 huge:grid-cols-[1.1em_1fr] huge:gap-3">
                        <span className="text-accent">→</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid content-start gap-10 split:gap-8 huge:gap-12">
            <section data-reveal aria-label="Education">
              <h3 className={`type-label ${LABEL}`}>Education</h3>
              <p className="mt-4 text-[17px] leading-tight huge:mt-6 huge:text-[clamp(17px,0.55vw+7px,25px)]">Oakland University</p>
              <p className="mt-1 text-[15px] text-paper/55 split:text-[14px] huge:mt-1.5 huge:text-[clamp(14px,0.45vw+6px,20px)]">
                Computer Science, concentration in AI
              </p>
              <p className={`mt-2 type-label text-paper/80 huge:mt-3 ${LABEL}`}>Graduating May 2027</p>
            </section>
            <section data-reveal aria-label="Now">
              <h3 className={`type-label ${LABEL}`}>Now</h3>
              <dl className="mt-4 grid gap-3 text-[15px] leading-relaxed sm:text-[16px] split:text-[14px] huge:mt-6 huge:gap-4 huge:text-[clamp(15px,0.5vw+6px,22px)]">
                <div>
                  <dt className="text-paper/55">Building</dt>
                  <dd className="text-paper/90">{NOW.building}</dd>
                </div>
                <div>
                  <dt className="text-paper/55">Thinking about</dt>
                  <dd className="text-paper/90">{NOW.learning}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        {/* Each link keeps its thin underline but carries an invisible 44px-tall hit area for thumbs. */}
        <p
          data-reveal
          className="mt-10 flex flex-wrap gap-x-7 gap-y-4 font-mono text-[13px] uppercase tracking-[0.06em] sm:mt-12 split:mt-9 split:gap-6 split:text-[12px] huge:mt-12 huge:gap-9 huge:text-[clamp(12px,0.3vw+6px,16px)]"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="relative border-b border-accent/60 pb-0.5 text-paper before:absolute before:-inset-x-3 before:-inset-y-[14px] before:content-[''] hover:text-accent"
            >
              {l.label} {l.mark}
            </a>
          ))}
        </p>
      </div>
    </div>
  )
}
