export const LINKS = {
  github: 'https://github.com/Jasmanss',
  linkedin: 'https://www.linkedin.com/in/jasmanss/',
  email: 'jasmansidhu974@gmail.com',
  resume: '/JasmanResume.pdf',
}

export type Project = {
  slug: string
  title: string
  kind: string
  // What a person actually hands the product, and what they get back.
  input: string
  output: string
  summary: string
  highlights: string[]
  stack: string[]
  image: string
  imageAlt: string
  live?: string
  code?: string
  video?: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'portlkit',
    title: 'Portlkit',
    kind: 'White-label client portals for freelancers',
    input: 'invoices, milestones, files and messages spread across five apps',
    output: 'one portal link your client opens, no account needed',
    summary:
      'A full-stack SaaS that puts invoices, milestones, files and messages into one shareable client portal, so clients never have to sign up for anything.',
    highlights: [
      'Built with Next.js, TypeScript and Supabase: invoices, milestones, files and messages live in one portal a client opens from a single link, without creating an account.',
      'Client data is locked down with PostgreSQL row-level security, unguessable share tokens and Server Actions.',
      'Overdue invoices chase themselves: reminders go out automatically through Vercel Cron and Resend.',
    ],
    stack: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Vercel'],
    image: '/portlkit.jpg',
    imageAlt: 'Portlkit landing page',
    live: 'https://portlkit.com',
  },
  {
    slug: 'imperium',
    title: 'Imperium',
    kind: 'Natural-language Mac agent',
    input: 'open Spotify, email the team, push to main',
    output: 'done from your phone, with a yes before anything destructive',
    summary:
      'An agent that runs your Mac from your phone in plain English: open apps, send email and run Git commands, with guardrails around anything that can’t be undone.',
    highlights: [
      'Python and FastAPI on the Mac, the Claude API for understanding requests, and a Next.js app on the phone.',
      'Pairing-token authentication, permission controls and confirmation gates block destructive actions before they run.',
      'Safety evals run in GitHub Actions and fail the build if any of those protections get weaker.',
    ],
    stack: ['Python', 'FastAPI', 'Claude API', 'Next.js', 'TypeScript', 'GitHub Actions'],
    image: '/imperium.png',
    imageAlt: 'Imperium logo',
    code: 'https://github.com/Jasmanss/Imperium',
    video: 'https://youtu.be/jEpbP-iGQTk',
  },
  {
    slug: 'hairstyl',
    title: 'HairStyl',
    kind: 'AI hair and grooming assistant for iOS',
    input: 'a selfie and ‘what do I do with my hair’',
    output: 'grooming recommendations made for your face',
    summary:
      'An iOS assistant that reads a photo of you and recommends what to do with your hair and grooming. It reached 150+ active users through TestFlight.',
    highlights: [
      'Swift and SwiftUI app that analyzes user photos with the OpenAI API and generates personalized recommendations.',
      'Custom AVFoundation camera flow and an async OpenAI client with retry handling.',
      'Supabase authentication and RevenueCat subscriptions, shipped to 150+ active users on TestFlight.',
    ],
    stack: ['Swift', 'SwiftUI', 'OpenAI API', 'Supabase', 'RevenueCat', 'TestFlight'],
    image: '/hairstyl.jpg',
    imageAlt: 'HairStyl app wordmark',
    code: 'https://github.com/Jasmanss/HairStyl',
  },
  {
    slug: 'callback',
    title: 'Callback',
    kind: 'Job application tracker',
    input: 'an inbox full of ‘thanks for applying’ emails',
    output: 'a job board that updates itself',
    summary:
      'A job application tracker that runs entirely in the browser, with no account or server, and reads your inbox so application statuses stay current on their own.',
    highlights: [
      'React, TypeScript and Vite, with board and table views, follow-up reminders, and CSV/JSON import and export.',
      'A Gmail parser updates statuses from LinkedIn, Indeed, Greenhouse, Lever and Workday emails, with an optional Claude fallback for anything it can’t read.',
      'Covered by 20+ Vitest tests, and everything stays on your device.',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'Gmail API', 'Claude API', 'Vitest'],
    image: '/callback.jpg',
    imageAlt: 'Callback landing page with a blue rotary phone',
    live: 'https://jasmanss.github.io/callback/',
    code: 'https://github.com/Jasmanss/callback',
  },
]

export const ABOUT =
  "I study computer science with a concentration in AI at Oakland University, graduating in May 2027. Right now I'm a software engineering intern at Motherson Group, where my maintenance app replaced paper checklists across 147 machines. On my own time I build products that take whatever people actually have, a photo, a half sentence, an inbox full of rejections, and hand back something they can use."

export const EXPERIENCE = [
  {
    role: 'Software Engineering Intern',
    org: 'Motherson Group',
    place: 'Sterling Heights, MI',
    time: 'May 2026 to present',
    bullets: [
      'Built a preventive-maintenance web app with Python, Flask, SQL and JavaScript that replaced paper checklists across 147 machines. Technicians scan a QR code and finish maintenance from their phones.',
      'Built dashboards for MTTR, MTBF and compliance from production records, giving supervisors visibility into equipment performance and audit readiness.',
      'Automated maintenance alerts with Python and Microsoft Power Automate, replacing manual follow-ups with Teams notifications.',
      'Deployed to an on-premise Ubuntu server with Gunicorn, systemd, HTTPS and automated backups, with 400+ pytest tests covering production workflows.',
    ],
  },
  {
    role: 'Frontend Developer (part-time)',
    org: 'Aurelius Holdings LLC',
    place: 'Remote',
    time: 'June 2026 to present',
    bullets: [
      'Built the customer-facing frontend of a live ecommerce site with React, TypeScript, Vite and CSS: reusable components and routed pages for new product features.',
      'Implemented cart state, pricing rules and form validation with React hooks, connected to Supabase for products, orders and customer authentication.',
      'Ship weekly updates through Vercel and fix customer-reported bugs on the production site.',
    ],
  },
]

export const SKILLS: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'SQL', 'Swift', 'HTML/CSS'] },
  {
    group: 'Frameworks',
    items: ['React', 'Next.js', 'Node.js', 'Flask', 'FastAPI', 'SQLAlchemy', 'Vite', 'SwiftUI', 'Tailwind CSS'],
  },
  {
    group: 'Data & infra',
    items: ['PostgreSQL', 'SQLite', 'Supabase', 'REST APIs', 'Ubuntu', 'Gunicorn', 'systemd', 'Vercel'],
  },
  { group: 'Testing & CI', items: ['pytest', 'Vitest', 'XCTest', 'GitHub Actions'] },
  { group: 'AI', items: ['OpenAI API', 'Claude API', 'Ollama'] },
  { group: 'Tools', items: ['Git', 'Power Automate', 'Figma'] },
]


// Shown on the About page. DRAFT: keep this current.
export const NOW = {
  building: 'Getting Portlkit in front of its first freelancers',
  learning: 'How much permission an agent should get before it has to ask',
  timeZone: 'America/Detroit',
  place: 'Sterling Heights, MI',
}
