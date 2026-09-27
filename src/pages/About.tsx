import { ABOUT, EXPERIENCE, LINKS, NOW, SKILLS } from '../data/content'
import Page, { Poster } from '../components/Page'
import { GitHubActivity, LocalTime } from '../components/LiveNow'

export default function About() {
  return (
    <Page>
      <h1 className="type-poster text-red text-[clamp(4.5rem,15vw,15rem)]">
        <Poster>Hi, I’m</Poster>
        <Poster>Jasman</Poster>
      </h1>

      <section className="mt-16 grid gap-10 md:grid-cols-[1fr_220px] md:gap-16">
        <p data-reveal className="max-w-[900px] text-[clamp(1.4rem,2.6vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.025em]">
          {ABOUT}
        </p>
        <figure data-reveal className="w-[180px] md:w-full rotate-[3deg] self-start bg-white p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.4)]">
          <img src="/jasman1.jpg" alt="A painted portrait of Jasman" className="w-full" />
          <figcaption className="mt-2 text-[11px] text-mute">Oil, sort of. Me, definitely.</figcaption>
        </figure>
      </section>

      <section className="mt-32" aria-labelledby="jobs">
        <h2 id="jobs" className="type-label mb-4">
          Experience
        </h2>
        <ol>
          {EXPERIENCE.map((job) => (
            <li key={job.org} data-reveal className="grid gap-4 border-t border-ink py-6 md:grid-cols-[180px_1fr_1.2fr] md:gap-8">
              <p className="type-label">{job.time}</p>
              <div>
                <p className="type-menu text-[clamp(1.6rem,2.6vw,2.4rem)]">{job.org}</p>
                <p className="mt-1">
                  {job.role} <span className="text-mute">· {job.place}</span>
                </p>
              </div>
              <ul className="space-y-2 text-ink/80">
                {job.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span className="text-red">—</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-32" aria-labelledby="toolbox">
        <h2 id="toolbox" className="type-label mb-4">
          Toolbox
        </h2>
        <div data-reveal className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink pt-6 md:grid-cols-6">
          {SKILLS.map((g) => (
            <div key={g.group}>
              <p className="type-label mb-2">{g.group}</p>
              {g.items.map((i) => (
                <p key={i}>{i}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-32 grid gap-12 md:grid-cols-2" aria-labelledby="now">
        <div data-reveal>
          <h2 id="now" className="type-poster text-red text-[clamp(3.5rem,8vw,7rem)]">
            Right now
          </h2>
          <dl className="mt-8 grid grid-cols-[110px_1fr] gap-y-4 border-t border-ink pt-6 text-[16px]">
            <dt className="type-label">Local time</dt>
            <dd>
              <LocalTime />
            </dd>
            <dt className="type-label">Building</dt>
            <dd>{NOW.building}</dd>
            <dt className="type-label">Thinking about</dt>
            <dd>{NOW.learning}</dd>
            <dt className="type-label">Resume</dt>
            <dd>
              <a href={LINKS.resume} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-red">
                Download the PDF ↗
              </a>
            </dd>
          </dl>
        </div>
        <div data-reveal className="md:pt-[calc(clamp(3.5rem,8vw,7rem)*0.82)]">
          <p className="type-label mb-3 mt-2">Latest on GitHub</p>
          <div className="text-[16px]">
            <GitHubActivity />
          </div>
        </div>
      </section>
    </Page>
  )
}
