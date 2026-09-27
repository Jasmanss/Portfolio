import { EXPERIENCE, PROJECTS } from './content'

// The six slots on the index: four things I built and two places I build them.
export type Entry = {
  slug: string
  name: string
  // "PORTLKIT, CLIENT PORTALS FOR FREELANCERS"
  line: string
  type: string
  platform: string
  role: string
  still: string
  tagline: string
  summary: string
  notes: string[]
  stack: string[]
  links: { label: string; href: string }[]
  input?: string
  output?: string
}

const project = (slug: string, extra: Pick<Entry, 'line' | 'platform' | 'role' | 'tagline'>): Entry => {
  const p = PROJECTS.find((x) => x.slug === slug)!
  return {
    slug,
    name: p.title,
    type: 'Personal',
    still: `/signal/${slug}.jpg`,
    summary: p.summary,
    notes: p.highlights,
    stack: p.stack,
    links: [
      p.live && { label: 'Live', href: p.live },
      p.video && { label: 'Demo', href: p.video },
      p.code && { label: 'Code', href: p.code },
    ].filter(Boolean) as Entry['links'],
    input: p.input,
    output: p.output,
    ...extra,
  }
}

const job = (org: string, extra: Pick<Entry, 'slug' | 'name' | 'line' | 'type' | 'platform' | 'tagline' | 'stack'>): Entry => {
  const j = EXPERIENCE.find((x) => x.org === org)!
  return {
    role: j.role,
    still: `/signal/${extra.slug}.jpg`,
    summary: `${j.role} at ${j.org}, ${j.place}. ${j.time}.`,
    notes: j.bullets,
    links: [],
    ...extra,
  }
}

export const ENTRIES: Entry[] = [
  project('portlkit', {
    line: 'Portlkit, client portals for freelancers',
    platform: 'Web app',
    role: 'Design & full-stack development',
    tagline: 'One portal link. No account needed.',
  }),
  project('imperium', {
    line: 'Imperium, a Mac agent you text',
    platform: 'Mac + mobile',
    role: 'Design & development',
    tagline: 'Your Mac, from your phone, in plain English.',
  }),
  project('hairstyl', {
    line: 'HairStyl, an AI grooming coach',
    platform: 'iOS',
    role: 'iOS design & development',
    tagline: 'A selfie in. A plan for your hair out.',
  }),
  project('callback', {
    line: 'Callback, a self-updating job tracker',
    platform: 'Web app',
    role: 'Design & development',
    tagline: 'A job board that updates itself.',
  }),
  job('Motherson Group', {
    slug: 'motherson',
    name: 'Motherson',
    line: 'Motherson, preventive maintenance',
    type: 'Internship',
    platform: 'Web app',
    tagline: '147 machines. Zero paper checklists.',
    stack: ['Python', 'Flask', 'SQL', 'JavaScript', 'Power Automate', 'pytest', 'Ubuntu'],
  }),
  job('Aurelius Holdings LLC', {
    slug: 'aurelius',
    name: 'Aurelius',
    line: 'Aurelius, a live ecommerce storefront',
    type: 'Part-time',
    platform: 'Web',
    tagline: 'A live storefront, shipped weekly.',
    stack: ['React', 'TypeScript', 'Vite', 'CSS', 'Supabase', 'Vercel'],
  }),
]

export const pad = (n: number) => String(n).padStart(2, '0')
