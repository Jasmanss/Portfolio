import { useLayoutEffect, useRef } from 'react'
import { LINKS } from '../../../data/content'
import { gsap, prefersReducedMotion } from '../../../lib/motion'
import { ago, useActivity, useNow, workingOn } from '../../../lib/now'
import EmberArt from './EmberArt'

// Small mono labels: 11px everywhere, growing a little on big monitors (the same steps as the other panels).
const LABEL = 'huge:text-[clamp(11px,0.3vw+5px,15px)]'
// An inline link: a thin accent underline, with an invisible 44px-tall hit area for thumbs.
const LINK =
  "relative border-b border-accent/60 text-paper before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:text-accent"

// The opened Ember tile: today's fire large on one side; on the other what's being worked on, how many commits
// today, when the last push was, recent public activity, and how the number is worked out. Side by side only on wide
// landscape screens (split:); phones and tablets held upright get the fire and its ruler across the top of the screen
// and the facts beneath (from sm: up, the repo and the numbers side by side). On big monitors (huge:) type and
// spacing grow with the screen.
export default function EmberPanel() {
  const now = useNow()
  const { items, failed } = useActivity(4)
  const countRef = useRef<HTMLSpanElement>(null)
  const counted = useRef(false)

  // Today's number counts up once the panel has opened (and again if it changes while open).
  useLayoutEffect(() => {
    const el = countRef.current
    if (!el) return
    if (now.loading) {
      el.textContent = '–'
      return
    }
    const n = now.commitsToday
    if (prefersReducedMotion()) {
      el.textContent = String(n)
      return
    }
    const from = { v: counted.current ? Number(el.textContent) || 0 : 0 }
    const tween = gsap.to(from, {
      v: n,
      duration: n ? 1.1 : 0.01,
      delay: counted.current ? 0 : 0.9,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = String(Math.round(from.v))),
    })
    counted.current = true
    return () => {
      tween.kill()
    }
  }, [now.commitsToday, now.loading])

  const repo = workingOn(now, 'nothing public yet')
  const source =
    now.source === 'live' ? 'Live from GitHub' : now.source === 'public' ? 'From public GitHub activity' : now.loading ? 'Checking GitHub' : 'GitHub is quiet right now'

  return (
    <div className="grid min-h-full content-start gap-4 px-5 pb-16 pt-20 sm:gap-6 sm:px-10 sm:pb-20 sm:pt-24 split:h-full split:grid-cols-[1.15fr_1fr] split:content-stretch split:gap-14 split:pb-10 huge:gap-[clamp(56px,5vw,140px)] huge:px-[clamp(40px,4vw,112px)] huge:pb-[clamp(40px,5vh,96px)] huge:pt-[clamp(96px,9vh,150px)]">
      <div data-reveal className="relative h-[46svh] min-h-[280px] text-paper split:h-auto split:min-h-0">
        <EmberArt active open />
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-x-10 split:flex split:justify-center split:overflow-y-auto split:pr-2 huge:max-w-[clamp(640px,36vw,960px)]">
        <p data-reveal className={`type-label sm:col-span-2 ${LABEL}`}>
          03 / <span className="text-accent">●</span> {source}
        </p>
        <h2
          data-reveal
          className="mt-3 font-serif text-[clamp(56px,8vw,128px)] italic leading-[0.9] tracking-[-0.02em] sm:col-span-2 sm:text-[clamp(56px,11vw,120px)] split:text-[clamp(56px,8vw,128px)] huge:mt-5 huge:text-[clamp(128px,7.5vw,200px)]"
        >
          Ember<span className="text-accent">.</span>
        </h2>

        <div data-reveal className="mt-8 border-t border-paper/15 pt-6 sm:mt-10 split:mt-8 huge:mt-12 huge:pt-8">
          <p className={`type-label ${LABEL}`}>Currently working on</p>
          <p className="mt-2 break-words text-[clamp(28px,3vw,44px)] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[clamp(32px,4.4vw,48px)] split:text-[clamp(28px,3vw,44px)] huge:mt-3 huge:text-[clamp(44px,2.4vw,64px)]">
            {repo}
          </p>
        </div>

        <dl data-reveal className="mt-8 grid grid-cols-2 gap-6 border-t border-paper/15 pt-6 sm:mt-10 split:mt-8 huge:mt-12 huge:pt-8">
          <div>
            <dt className={`type-label ${LABEL}`}>Commits today</dt>
            <dd className="mt-2 text-[52px] font-medium leading-none tracking-[-0.03em] text-accent tabular-nums sm:text-[60px] split:text-[clamp(44px,5vw,72px)] huge:mt-3 huge:text-[clamp(72px,4.2vw,108px)]">
              <span ref={countRef} />
            </dd>
          </div>
          <div>
            <dt className={`type-label ${LABEL}`}>Last push</dt>
            <dd className="mt-2 text-[24px] leading-tight tracking-[-0.01em] sm:text-[28px] split:text-[clamp(22px,2.2vw,30px)] huge:mt-3 huge:text-[clamp(30px,1.75vw,45px)]">
              {now.lastAt ? ago(now.lastAt) : '–'}
            </dd>
          </div>
        </dl>

        <div data-reveal className="mt-8 border-t border-paper/15 pt-6 sm:col-span-2 sm:mt-10 split:mt-8 huge:mt-12 huge:pt-8">
          <p className={`type-label ${LABEL}`}>Recent public activity</p>
          {failed || (items && !items.length) ? (
            <p className="mt-3 text-[15px] text-paper/60 split:text-[14px] huge:mt-4 huge:text-[clamp(15px,0.5vw+6px,22px)]">
              Nothing to show right now.{' '}
              <a href={LINKS.github} target="_blank" rel="noreferrer" className={LINK}>
                See GitHub ↗
              </a>
            </p>
          ) : !items ? (
            <p className="mt-3 text-[15px] text-paper/60 split:text-[14px] huge:mt-4 huge:text-[clamp(15px,0.5vw+6px,22px)]">Checking GitHub…</p>
          ) : (
            <ul className="mt-3 grid gap-3 text-[15px] leading-snug sm:text-[16px] split:gap-2.5 split:text-[15px] huge:mt-5 huge:gap-4 huge:text-[clamp(15px,0.5vw+6px,22px)]">
              {items.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                  <span className="truncate">
                    <span className="text-paper/50">{a.repo}</span>
                    <span className="text-accent"> / </span>
                    {a.text}
                  </span>
                  <span className={`font-mono text-[11px] uppercase tracking-[0.06em] text-mute ${LABEL}`}>{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p
          data-reveal
          className="mt-8 max-w-[46ch] text-[15px] leading-relaxed text-paper/55 sm:col-span-2 sm:mt-10 split:mt-8 split:text-[13px] huge:mt-12 huge:text-[clamp(13px,0.45vw+5px,19px)]"
        >
          {now.source === 'live'
            ? 'Counts the commits I’ve made today, Detroit time: embers at zero, a full blaze around twelve. Private repos count too, but stay behind the scenes.'
            : 'Counts my public pushes today, Detroit time: embers at zero, a full blaze around twelve. Private repos stay behind the scenes.'}{' '}
          <a href={LINKS.github} target="_blank" rel="noreferrer" className={`whitespace-nowrap ${LINK}`}>
            GitHub ↗
          </a>
        </p>
      </div>
    </div>
  )
}
