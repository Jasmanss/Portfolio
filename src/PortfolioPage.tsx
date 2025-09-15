import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import Spline from '@splinetool/react-spline'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const stagger = { show: { transition: { staggerChildren: 0.08 } } }

const SectionTitle = ({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) => (
  <motion.div variants={fadeUp} className="mb-10 text-center">
    <p className="uppercase tracking-[0.25em] text-gray-500 text-xs">{kicker}</p>
    <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-black">{title}</h2>
    {subtitle && <p className="mt-3 text-black max-w-2xl mx-auto">{subtitle}</p>}
  </motion.div>
)

const PROJECTS = [
  {
    title: 'HAIRSTYL — AI Grooming App',
    description:
      'Analyzes hair, beard, and eyebrows to generate routines. Built with Swift/SwiftUI and OpenAI.',
    tags: ['Swift', 'OpenAI'],
    link: 'https://github.com/Jasman047/HairStyl',
  },
  {
    title: 'Aroma AI — Fragrance Recommender',
    description:
      'Image-to-scent and quiz-based suggestions using Python + OpenCV. Won Best UI/UX at GrizzHacks 7.',
    tags: ['JavaScript', 'Python', 'Node.js'],
    link: 'https://github.com/Jasman047/AromaAI',
    demo: 'https://jasmanss.github.io/AromaAI/',
  },
  {
    title: 'Health AI — Fitness Dashboard',
    description:
      'Tracks workouts, calories, and wellness with real-time charts and a context-aware chatbot.',
    tags: ['MongoDB', 'JavaScript',],
    link: 'https://github.com/Jasman047/HealthAI',
  },
  {
    title: 'Coming Soon!',
    description:
      'Coming Soon!',
    tags: ['Coming Soon!'],
    link: 'https://github.com/Jasman047',
  },
]

const EXPERIENCE = [
  {
    role: 'Frontend Developer & Co-Founder',
    org: 'Vengeance Intelligence LLC',
    time: 'May 2025 — Present',
    bullets: [
      'Co-founded startup building AI-powered grooming app; led frontend development and product strategy.',
      'Built HAIRSTYL iOS app in Swift/SwiftUI with image upload and AI analysis generating personalized hair rotuines.',
      'Implemented user flows (onboarding, capture, results, tracking), reducing drop-off by 30% and increasing engagement.',
      'Scaled to 150+ active users in 4 months through iterative UI improvements and feature releases.',
      'Worked with backend developer to integrate AI processing pipeline, achieving 2 second analysis times while maintaining 80%+ accuracy rates across the app.',
    ],
  },
]

const SKILLS = [
  'React.js',
  'JavaScript',
  'Swift',
  'Python',
  'SQL',
  'Git',
  'Figma',
  'OpenAI',
]

export default function PortfolioPage() {
  // Contact form handler
  function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value || '';
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || '';
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value || '';
    const subject = encodeURIComponent(`Portfolio Contact — ${name}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:jasmansidhu974@gmail.com?subject=${subject}&body=${body}`;
  }


  useEffect(() => {
    const onClick = (e: any) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null
      if (!a) return
      const id = a.getAttribute('href')?.slice(1)
      const el = id ? document.getElementById(id) : null
      if (!el) return
      e.preventDefault()
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div className="min-h-screen bg-white text-black selection:bg-gray-900 selection:text-white relative">
      {/* Spline Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/30"></div>
        <Spline scene="https://prod.spline.design/JEnYR9WO7qiyXh5j/scene.splinecode" />
      </div>
      
      {/* nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur border-b border-gray-200/60 bg-white/70">
        <div className="container-xl h-14 flex items-center justify-between">
          <a href="#home" className="font-semibold tracking-tight">Jasman Sidhu</a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="hover:text-black/70 transition" href="#projects">Projects</a>
            <a className="hover:text-black/70 transition" href="#experience">Experience</a>
            <a className="hover:text-black/70 transition" href="#skills">Skills</a>
            <a className="hover:text-black/70 transition" href="#contact">Contact</a>
            <a href="/JasmanResume.pdf" className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-50" download>
              Resume
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#contact" className="ml-2">
              <button className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 text-sm">Say hi</button>
            </a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section id="home" className="relative isolate pt-28 md:pt-36 z-10">
        {/* subtle grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.05),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container-xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-black">
                <span className="size-1.5 rounded-full bg-green-500" /> Available for internships
              </p>
              <h1 className="mt-6 text-4xl md:text-7xl font-semibold tracking-tight">
                Turning Vision Into Reality.
              </h1>
              <p className="mt-5 text-black max-w-2xl">
              I’m a CS student at Oakland University focused on Artificial Intelligence — building practical projects with real-world impact, clean UI/UX, and solid engineering.
              </p>
              <div className="mt-8 flex items-center md:justify-start justify-center gap-3">
                <a href="#projects"><button className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 text-sm">View projects</button></a>
                <a href="#contact"><button className="rounded-2xl border border-gray-300 text-gray-900 hover:bg-gray-50 px-4 py-2 text-sm">Contact</button></a>
                <a href="/JasmanResume.pdf" download>
                  <button className="rounded-2xl border border-gray-300 text-gray-900 hover:bg-gray-50 px-4 py-2 text-sm">
                    Download résume
                  </button>
                </a>
              </div>
              <div className="mt-5 flex items-center gap-4 justify-center md:justify-start text-sm text-black">
                <a className="hover:text-black underline underline-offset-4" href="https://github.com/Jasman047" target="_blank" rel="noreferrer">GitHub</a>
                <span>•</span>
                <a className="hover:text-black underline underline-offset-4" href="https://www.linkedin.com/in/jasmanpreetsinghs/" target="_blank" rel="noreferrer">LinkedIn</a>
              </div>
            </div>
            {/* portrait */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="flex justify-center">
              <img
                src="./jasman1.jpg"
                alt="Jasman Sidhu"
                className="relative w-full max-w-md aspect-[3/4] object-cover rounded-[2rem] shadow-2xl"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* projects */}
      <section id="projects" className="py-24 relative z-10">
        <div className="container-xl">
          <SectionTitle kicker="Selected Work" title="Projects" subtitle="A few things I've shipped or am building right now." />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {PROJECTS.map((p, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="block group"
              >
                <article className="border border-gray-200 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-56 bg-gray-100 flex items-center justify-center text-gray-400 text-sm overflow-hidden">
                    {p.title.includes('HAIRSTYL') && (
                      <img src="./hairstyl.jpg" alt="HAIRSTYL Project" className="w-full h-full object-cover" />
                    )}
                    {p.title.includes('Aroma AI') && (
                      <img src="./aromaai.png" alt="Aroma AI Project" className="w-full h-full object-cover" />
                    )}
                    {p.title.includes('Health AI') && (
                      <img src="./healthai.png" alt="Health AI Project" className="w-full h-full object-cover" />
                    )}
                    {p.title.includes('Coming Soon') && (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        Coming Soon
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <header className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold text-black">
                        {p.title}
                      </h3>
                    </header>
                    <p className="text-black mt-2">{p.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-700 text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <a 
                        href={p.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                      {p.demo && (
                        <a 
                          href={p.demo} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* experience */}
      <section id="experience" className="py-24 border-t border-gray-200 relative z-10">
        <div className="container-xl">
          <SectionTitle kicker="Background" title="Experience" />
          <div className="space-y-4">
            {EXPERIENCE.map((e, i) => (
              <motion.article key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-black text-xl font-medium">{e.role} · <span className="text-black">{e.org}</span></h3>
                  <p className="text-sm text-black">{e.time}</p>
                </div>
                <ul className="mt-4 grid gap-2 list-disc list-inside text-black">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* skills */}
      <section id="skills" className="py-24 relative z-10">
        <div className="container-xl">
          <SectionTitle kicker="Toolkit" title="Skills" />
          <motion.ul variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-wrap gap-3 justify-center">
            {SKILLS.map((s) => (
              <motion.li
                key={s}
                variants={fadeUp}
                className="px-4 py-2 rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm text-black text-sm transition-transform duration-200 hover:scale-105 hover:-translate-y-0.5 hover:shadow"
              >
                {s}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="py-24 border-t border-gray-200 relative z-10">
        <div className="container-xl">
          <SectionTitle kicker="Get in touch" title="Let's build something" subtitle="I'm open to internships, freelance work, and cool collaborations." />
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
            <form onSubmit={handleContactSubmit} className="grid gap-4">
              <input name="name" required placeholder="Your name" className="px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-500" />
              <input name="email" required type="email" placeholder="Your email" className="px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-500" />
              <textarea name="message" required placeholder="Tell me about your project" rows={4} className="px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-500" />
              <button type="submit" className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 text-sm">Send message</button>
              <p className="text-xs text-gray-500">This opens your mail client to send to jasmansidhu974@gmail.com</p>
            </form>
          </motion.div>
        </div>
      </section>

      {/* footer */}
      <footer className="py-12 border-t border-gray-200 relative z-10">
                  <div className="container-xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-black">
            <p>© {new Date().getFullYear()} Jasman Sidhu. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="mailto:jasmansidhu974@gmail.com" className="hover:text-black">jasmansidhu974@gmail.com</a>
              <a href="https://github.com/Jasman047" target="_blank" rel="noreferrer" className="hover:text-black">GitHub</a>
              <a href="https://www.linkedin.com/in/jasmanpreetsinghs/" target="_blank" rel="noreferrer" className="hover:text-black">LinkedIn</a>
            </div>
        </div>
      </footer>
    </div>
  )
}

