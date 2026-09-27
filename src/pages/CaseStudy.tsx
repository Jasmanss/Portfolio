import { useParams } from 'react-router-dom'
import { PROJECTS } from '../data/content'
import { PROJECT_LOOK } from '../data/look'
import ProjectLinks from '../components/ProjectLinks'
import Page, { Poster } from '../components/Page'
import { TransitionLink } from '../components/Transition'
import NotFound from './NotFound'

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
      <p className="type-label">
        {String(index + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')} · {look.category}
      </p>
      <h1 className="mt-3 type-poster text-red text-[clamp(4.5rem,16vw,16rem)]">
        <Poster>{p.title}</Poster>
      </h1>

      <section className="mt-12 grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
        <dl data-reveal className="grid grid-cols-[76px_1fr] content-start gap-x-3 gap-y-5">
          <dt className="type-label">Type</dt>
          <dd>{p.kind}</dd>
          <dt className="type-label">Stack</dt>
          <dd>{p.stack.join(', ')}</dd>
          <dt className="type-label">Links</dt>
          <dd>
            <ProjectLinks project={p} />
          </dd>
          <dt className="type-label">Palette</dt>
          <dd className="flex gap-[3px]">
            {look.swatches.map((c) => (
              <span key={c} className="block size-[14px]" style={{ backgroundColor: c }} />
            ))}
          </dd>
        </dl>
        <div data-reveal>
          <p className="type-label">You hand it</p>
          <p className="mt-2 text-[clamp(1.5rem,3vw,2.8rem)] font-medium leading-[1.08] tracking-[-0.03em]">“{p.input}”</p>
          <p className="mt-8 type-label">It hands back</p>
          <p className="mt-2 text-[clamp(1.5rem,3vw,2.8rem)] font-medium leading-[1.08] tracking-[-0.03em]" style={{ color: look.accent }}>
            {p.output}
          </p>
          <p className="mt-10 max-w-[620px] text-[16px] text-ink/80">{p.summary}</p>
        </div>
      </section>

      <figure data-reveal className="mt-20 overflow-hidden" style={{ backgroundColor: look.card }}>
        <img
          src={p.image}
          alt={p.imageAlt}
          className={`aspect-[16/9] w-full ${look.fit === 'cover' ? 'object-cover' : 'object-contain p-[14%]'}`}
        />
      </figure>

      <section className="mt-24" aria-labelledby="built">
        <h2 id="built" className="type-label mb-4">
          What I built
        </h2>
        <ol>
          {p.highlights.map((h, i) => (
            <li key={h} data-reveal className="grid gap-4 border-t border-ink py-7 md:grid-cols-[180px_1fr]">
              <span className="font-serif text-[40px] leading-none text-red">{String(i + 1).padStart(2, '0')}</span>
              <p className="max-w-[900px] text-[clamp(1.2rem,2vw,1.9rem)] font-medium leading-[1.18] tracking-[-0.02em]">{h}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav aria-label="Next project" className="mt-24 border-t border-ink pt-6">
        <p className="type-label">Next project</p>
        <TransitionLink
          to={`/work/${next.slug}`}
          label={next.title}
          data-cursor="view"
          data-cursor-label="Next"
          data-cursor-color={nextLook.accent}
          className="group mt-2 flex items-end justify-between gap-6"
        >
          <span className="type-poster text-[clamp(3.5rem,11vw,11rem)] transition-colors duration-300 group-hover:text-red">{next.title}</span>
          <span className="hidden w-[min(300px,24vw)] shrink-0 overflow-hidden md:block" style={{ backgroundColor: nextLook.card }}>
            <img
              src={next.image}
              alt=""
              className={`aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-105 ${
                nextLook.fit === 'cover' ? 'object-cover' : 'object-contain p-[12%]'
              }`}
            />
          </span>
        </TransitionLink>
      </nav>
    </Page>
  )
}
