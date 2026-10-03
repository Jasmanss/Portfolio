import { useEffect, useMemo, useRef, useState } from 'react'
import { LINKS } from '../../../data/content'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import ContactArt from './ContactArt'

const SCRAMBLE = '01<>/\\{}[]#*+=-_'

// The time where I am, ticking by the second.
function useLocalTime() {
  const fmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'America/Detroit', timeZoneName: 'short' }),
    [],
  )
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const parts = fmt.formatToParts(now)
  const zone = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  const time = parts
    .filter((p) => p.type !== 'timeZoneName')
    .map((p) => p.value)
    .join('')
    .trim()
  return { time, zone, iso: now.toISOString() }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / insecure contexts: the hidden-textarea fallback.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// The contact panel: "Say hi.", the email (with copy), where else to find me, and the hands reaching across the
// middle of the screen. Copying the email makes them spark.
export default function ContactPanel({ index = 8 }: { index?: number }) {
  const { time, zone, iso } = useLocalTime()
  const [copied, setCopied] = useState(false)
  const [burst, setBurst] = useState(0)
  const label = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const el = label.current
    if (!el) return
    const text = copied ? 'Copied' : 'Copy'
    if (prefersReducedMotion()) {
      el.textContent = text
      return
    }
    const tw = gsap.to(el, { scrambleText: { text, chars: SCRAMBLE, speed: 1 }, duration: 0.45, overwrite: true })
    return () => {
      tw.kill()
    }
  }, [copied])

  const copy = async () => {
    const ok = await copyText(LINKS.email)
    if (!ok) return
    setCopied(true)
    setBurst((b) => b + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  const links = [
    { label: 'LinkedIn', href: LINKS.linkedin },
    { label: 'GitHub', href: LINKS.github },
    { label: 'Resume', href: LINKS.resume },
  ]

  return (
    <div className="flex min-h-full flex-col px-5 pb-9 pt-20 md:px-10 md:pb-9 md:pt-24 huge:px-16 huge:pb-12 huge:pt-32">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end md:gap-6">
        <div>
          <p data-reveal className="type-label huge:text-[13px]">
            {String(index + 1).padStart(2, '0')} / Contact
          </p>
          <h2 data-reveal className="mt-3 font-serif text-[clamp(56px,8vw,128px)] italic leading-[0.9] tracking-[-0.02em] huge:mt-5 huge:text-[clamp(128px,7.4vw,190px)]">
            Say hi<span className="text-accent">.</span>
          </h2>
        </div>
        <div data-reveal className="grid gap-3 md:max-w-[340px] md:pb-3 md:text-right huge:max-w-[480px] huge:gap-4 huge:pb-5">
          <p className="text-[15px] leading-snug text-paper/80 md:text-[17px] huge:text-[clamp(17px,0.55vw+8px,22px)]">Open to internships, freelance work and collaborations.</p>
          <p className="type-label huge:text-[13px]">
            Sterling Heights, MI <span className="px-1 text-paper/30">/</span>{' '}
            <time dateTime={iso} className="tabular-nums text-paper">
              {time}
            </time>{' '}
            {zone}
          </p>
        </div>
      </div>

      {/* The hands, edge to edge. On phones and upright tablets they're cropped in on the fingertips and run off both
          sides, so they stay big in a narrow screen (ContactArt picks the crop from this box's shape). */}
      <div data-reveal className="relative -mx-5 my-3 min-h-[clamp(220px,34svh,260px)] flex-1 text-paper md:-mx-10 md:my-4 huge:-mx-16 huge:my-6">
        {/* Absolute so the art gets a real height on phones too, where the column only has a min-height. */}
        <div className="absolute inset-0">
          <ContactArt active open burst={burst} />
        </div>
      </div>

      {/* Phones: the email as big as the width allows, then Copy, then the links as a row of thumb-sized targets.
          Upright tablets: Copy and the links share the second row. Side by side: all on one line, as before. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 border-t border-paper/15 pt-6 split:grid-cols-[auto_auto_minmax(0,1fr)] split:gap-y-6 huge:gap-x-7 huge:pt-9">
        <a
          data-reveal
          href={`mailto:${LINKS.email}`}
          className="group relative col-span-2 justify-self-start break-all text-[clamp(22px,calc(8.1vw_-_3px),60px)] font-medium leading-[1.05] tracking-[-0.03em] text-paper split:col-span-1 split:text-[clamp(22px,3.6vw,54px)] huge:text-[clamp(54px,3.6vw,96px)]"
        >
          {LINKS.email}
          <span aria-hidden className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100" />
        </a>
        <div data-reveal className="justify-self-start">
          <button
            type="button"
            onClick={copy}
            aria-label="Copy email address"
            className={`h-12 min-w-[112px] rounded-full border px-6 font-mono text-[13px] uppercase tracking-[0.06em] transition-colors split:h-auto split:min-w-[86px] split:px-4 split:py-2 split:text-[12px] huge:min-w-[120px] huge:px-6 huge:py-3 huge:text-[15px] ${
              copied ? 'border-accent text-accent' : 'border-paper/30 text-paper hover:border-paper'
            }`}
          >
            <span ref={label}>Copy</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Email address copied' : ''}
          </span>
        </div>
        <p
          data-reveal
          className="col-span-2 flex justify-between font-mono text-[13px] uppercase tracking-[0.06em] sm:col-span-1 sm:justify-end sm:gap-7 split:gap-6 split:self-end split:text-[12px] huge:gap-9 huge:text-[15px]"
        >
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="group flex h-12 items-center text-paper split:h-auto">
              <span className="border-b border-accent/60 pb-0.5 group-hover:text-accent">{l.label} ↗</span>
            </a>
          ))}
        </p>
      </div>
    </div>
  )
}
