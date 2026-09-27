import { useParams } from 'react-router-dom'
import { PROJECTS } from '../data/content'
import { medium, PROJECT_LOOK } from '../data/look'
import ProjectLinks from '../components/ProjectLinks'
import Page from '../components/Page'
import { GoldFrame, PictureLamp } from '../components/Museum'
import { TransitionLink } from '../components/Transition'
import NotFound from './NotFound'

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi']

// A painting's catalogue entry: the work on the left, the curator's card on the right.
export default function CaseStudy() {
  const { slug } = useParams()
  const index = PROJECTS.findIndex((p) => p.slug === slug)
  if (index < 0) return <NotFound />
  const p = PROJECTS[index]
  const look = PROJECT_LOOK[p.slug]
  const next = PROJECTS[(index + 1) % PROJECTS.length]
  const nextLook = PROJECT_LOOK[next.slug]

  return (
    <Page key={p.slug}>
      <div className="mx-auto grid max-w-[1400px] gap-14 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="md:sticky md:top-32 md:self-start">
          <figure data-reveal className="relative mx-auto mt-10 w-fit">
            <PictureLamp />
            <GoldFrame>
              <img
                src={look.painting}
                alt={`${look.artwork}, an oil painting standing in for ${p.title}`}
                className="block max-h-[68vh] w-full object-cover"
                style={{ aspectRatio: `${look.aspect}` }}
              />
            </GoldFrame>
          </figure>
        </div>

        <article data-reveal className="parchment relative p-6 shadow-[0_30px_50px_-20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(138,100,36,0.5)] md:p-10">
          <p className="type-label">
            Cat. no. {look.numeral} · The Sidhu Collection
          </p>
          <h1 className="mt-3 font-caps text-[clamp(2.4rem,4.5vw,4rem)] leading-none tracking-[0.03em]">{p.title}</h1>
          <p className="mt-2 text-[clamp(1.3rem,2vw,1.7rem)] italic leading-tight">{look.artwork}</p>
          <p className="mt-2 text-mute">Jasman Sidhu · {medium(p.stack)}</p>

          <div className="my-8 flex items-center gap-3 text-gold-deep" aria-hidden>
            <span className="h-px flex-1 bg-rule" />❦<span className="h-px flex-1 bg-rule" />
          </div>

          <p className="type-label">The commission</p>
          <p className="mt-2 text-[19px] leading-snug">{p.summary}</p>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="type-label">You hand it</dt>
              <dd className="mt-1 text-[22px] italic leading-tight">“{p.input}”</dd>
            </div>
            <div>
              <dt className="type-label">It hands back</dt>
              <dd className="mt-1 text-[22px] italic leading-tight text-red">{p.output}</dd>
            </div>
          </dl>

          <p className="type-label mt-10">Curator’s notes</p>
          <ol className="mt-3 space-y-4">
            {p.highlights.map((h, i) => (
              <li key={h} className="grid grid-cols-[2.2rem_1fr] gap-2 border-t border-rule pt-4 text-[17px] leading-snug">
                <span className="font-caps text-gold-deep">{ROMAN[i]}.</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>

          <dl className="mt-10 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
            <div>
              <dt className="type-label">Materials</dt>
              <dd className="mt-1 text-[16px]">{p.stack.join(', ')}</dd>
            </div>
            <div>
              <dt className="type-label">Provenance</dt>
              <dd className="mt-1 text-[16px]">
                <ProjectLinks project={p} />
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <nav aria-label="Next painting" className="mx-auto mt-28 max-w-[1400px] text-center">
        <p className="type-caps text-gold/80">Continue through the gallery</p>
        <TransitionLink
          to={`/work/${next.slug}`}
          label={next.title}
          data-cursor="view"
          data-cursor-label="Next"
          data-cursor-color="#F3DC8E"
          className="group mt-6 inline-flex flex-col items-center gap-6 md:flex-row md:gap-10"
        >
          <span className="block w-[min(220px,50vw)] transition-transform duration-700 group-hover:-rotate-2 group-hover:scale-105">
            <GoldFrame>
              <img src={nextLook.painting} alt="" className="block w-full object-cover" style={{ aspectRatio: `${nextLook.aspect}` }} />
            </GoldFrame>
          </span>
          <span className="text-left">
            <span className="type-label block text-gold/70">No. {nextLook.numeral}</span>
            <span className="gilt-text block font-serif text-[clamp(3rem,7vw,6rem)] italic leading-none">{next.title} →</span>
          </span>
        </TransitionLink>
      </nav>
    </Page>
  )
}
