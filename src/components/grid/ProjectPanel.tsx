import type { Project } from '../../data/content'
import type { Art } from './types'

type Props = { project: Project; Art: Art; index: number }

// Small mono labels: 11px everywhere, growing a little on big monitors.
const LABEL = 'huge:text-[clamp(11px,0.3vw+5px,15px)]'

// The opened project: its illustration large on one side, and on the other what it is, what you hand it and what
// you get back, how it's built, and where to see it. Everything marked data-reveal staggers in once the panel opens.
// Side by side only on wide landscape screens (split:); phones and tablets held upright stack the art over the copy,
// with the art given a big share of the screen. On big monitors type and spacing grow with the screen and the copy
// keeps a readable line length.
export default function ProjectPanel({ project: p, Art, index }: Props) {
  const links = [
    p.live && { label: 'Live', href: p.live },
    p.code && { label: 'Code', href: p.code },
    p.video && { label: 'Demo video', href: p.video },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="grid min-h-full content-start gap-8 px-5 pb-16 pt-20 sm:gap-12 sm:px-10 sm:pb-20 sm:pt-24 split:h-full split:grid-cols-[1.15fr_1fr] split:content-stretch split:gap-14 split:pb-10 huge:gap-[clamp(56px,5vw,140px)] huge:px-[clamp(40px,4vw,112px)] huge:pb-[clamp(40px,5vh,96px)] huge:pt-[clamp(96px,9vh,150px)]">
      <div data-reveal className="relative h-[42svh] min-h-[240px] text-paper sm:h-[46svh] split:h-auto split:min-h-0">
        <Art active open />
      </div>

      <div className="flex flex-col sm:max-w-[680px] split:max-w-none split:justify-center split:overflow-y-auto split:pr-2">
        <p data-reveal className={`type-label ${LABEL}`}>
          {String(index + 1).padStart(2, '0')} / {p.kind}
        </p>
        <h2
          data-reveal
          className="mt-3 font-serif text-[clamp(56px,8vw,128px)] italic leading-[0.9] tracking-[-0.02em] sm:text-[clamp(56px,11vw,120px)] split:text-[clamp(56px,8vw,128px)] huge:text-[clamp(128px,7.5vw,200px)]"
        >
          {p.title}
          <span className="text-accent">.</span>
        </h2>

        <dl
          data-reveal
          className="mt-8 grid max-w-[44em] gap-4 border-t border-paper/15 pt-6 text-[15px] leading-snug sm:text-[17px] huge:mt-12 huge:gap-5 huge:pt-8 huge:text-[clamp(17px,0.55vw+7px,25px)]"
        >
          <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:gap-6 huge:grid-cols-[clamp(120px,8vw,190px)_1fr]">
            <dt className={`type-label pt-1 ${LABEL}`}>You hand it</dt>
            <dd className="text-paper/70">{p.input}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:gap-6 huge:grid-cols-[clamp(120px,8vw,190px)_1fr]">
            <dt className={`type-label pt-1 ${LABEL}`}>You get back</dt>
            <dd>{p.output}</dd>
          </div>
        </dl>

        <ul className="mt-8 grid max-w-[44em] gap-3 text-[14px] leading-relaxed text-paper/75 sm:text-[15px] huge:mt-12 huge:gap-4 huge:text-[clamp(15px,0.5vw+6px,22px)]">
          {p.highlights.map((h) => (
            <li key={h} data-reveal className="grid grid-cols-[14px_1fr] gap-2 huge:grid-cols-[1.1em_1fr] huge:gap-3">
              <span className="text-accent">→</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <ul data-reveal className="mt-8 flex flex-wrap gap-2 huge:mt-12 huge:gap-3" aria-label="Built with">
          {p.stack.map((s) => (
            <li
              key={s}
              className="rounded-full border border-paper/20 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-paper/80 huge:px-4 huge:py-1.5 huge:text-[clamp(11px,0.3vw+5px,15px)]"
            >
              {s}
            </li>
          ))}
        </ul>

        {/* Each link keeps its thin underline look but carries an invisible 44px-tall hit area for thumbs. */}
        {links.length > 0 && (
          <p data-reveal className="mt-8 flex flex-wrap gap-6 font-mono text-[12px] uppercase tracking-[0.06em] huge:mt-12 huge:gap-9 huge:text-[clamp(12px,0.3vw+6px,16px)]">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="relative border-b border-accent/60 pb-0.5 text-paper before:absolute before:-inset-x-3 before:-inset-y-[14px] before:content-[''] hover:text-accent"
              >
                {l.label} ↗
              </a>
            ))}
          </p>
        )}
        {!links.length && <p data-reveal className={`mt-8 type-label huge:mt-12 ${LABEL}`}>Private for now: it runs on real data.</p>}
      </div>
    </div>
  )
}
