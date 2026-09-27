import { LINKS } from '../data/content'
import Page, { Poster } from '../components/Page'
import Signature from '../components/Signature'

const ELSEWHERE = [
  { label: 'GitHub', href: LINKS.github, note: 'Code, including this site' },
  { label: 'LinkedIn', href: LINKS.linkedin, note: 'The formal version' },
  { label: 'Resume', href: LINKS.resume, note: 'One page, PDF' },
]

export default function ContactPage() {
  return (
    <Page>
      <h1 className="type-poster text-red text-[clamp(5rem,19vw,19rem)]">
        <Poster>Say</Poster>
        <Poster>hello</Poster>
      </h1>

      <section className="mt-14 grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div data-reveal>
          <p className="type-label">Open to internships, freelance work and collaborations</p>
          <a
            href={`mailto:${LINKS.email}`}
            className="mt-3 inline-block break-words text-[clamp(1.5rem,3.6vw,3.4rem)] font-medium tracking-[-0.035em] underline decoration-2 underline-offset-[0.15em] hover:text-red"
          >
            {LINKS.email}
          </a>
        </div>
        <Signature auto className="w-[min(420px,80vw)] text-ink md:justify-self-end" />
      </section>

      <ul data-reveal className="mt-24 border-t border-ink">
        {ELSEWHERE.map((l) => (
          <li key={l.label} className="border-b border-rule">
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 md:grid-cols-[1fr_1fr_auto]"
            >
              <span className="type-menu text-[clamp(1.6rem,3vw,2.8rem)] transition-colors group-hover:text-red">{l.label}</span>
              <span className="hidden text-mute md:block">{l.note}</span>
              <span className="text-[20px] transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </Page>
  )
}
