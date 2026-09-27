import { useEffect, useState } from 'react'
import { LINKS, NOW } from '../data/content'

type Activity = { id: string; text: string; repo: string; at: string }

const CACHE_KEY = 'gh-activity'
const USER = LINKS.github.split('/').pop()!

// Public GitHub events, turned into short human lines. Cached per session to stay under the API's rate limit.
async function loadActivity(): Promise<Activity[]> {
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) return JSON.parse(cached)
  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=30`)
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
  const events = (await res.json()) as {
    id: string
    type: string
    created_at: string
    repo: { name: string }
    payload: { commits?: { message: string }[]; ref_type?: string; action?: string }
  }[]
  const lines = events
    .map((e): Activity | null => {
      const repo = e.repo.name.split('/').pop()!
      switch (e.type) {
        case 'PushEvent': {
          const msg = e.payload.commits?.[e.payload.commits.length - 1]?.message.split('\n')[0]
          return msg ? { id: e.id, text: msg, repo, at: e.created_at } : null
        }
        case 'CreateEvent':
          return e.payload.ref_type === 'repository' ? { id: e.id, text: 'Started a new repo', repo, at: e.created_at } : null
        case 'PullRequestEvent':
          return { id: e.id, text: `${e.payload.action === 'closed' ? 'Merged' : 'Opened'} a pull request`, repo, at: e.created_at }
        default:
          return null
      }
    })
    .filter((a): a is Activity => a !== null)
    .slice(0, 4)
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(lines))
  return lines
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function LocalTime() {
  const format = () =>
    new Intl.DateTimeFormat('en-US', { timeZone: NOW.timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date())
  const hour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: NOW.timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  const [time, setTime] = useState(format)
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 15000)
    return () => window.clearInterval(id)
  })
  const h = hour()
  const mood = h < 6 ? 'probably asleep' : h < 9 ? 'probably on coffee one' : h < 18 ? 'probably shipping' : h < 23 ? 'probably side-projecting' : 'probably still coding'
  return (
    <span>
      {time} in Michigan, {mood}
    </span>
  )
}

export function GitHubActivity() {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    loadActivity().then(setItems, () => setFailed(true))
  }, [])

  if (failed || (items && !items.length)) {
    return (
      <p className="text-night/70">
        Activity is taking a break.{' '}
        <a href={LINKS.github} target="_blank" rel="noreferrer" className="link-underline text-green">
          See GitHub ↗
        </a>
      </p>
    )
  }
  if (!items) return <p className="font-mono text-[13px] text-night/60">Checking GitHub…</p>
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex items-baseline justify-between gap-4 border-t border-night/15 pt-3">
          <span>
            <span className="font-mono text-[12px] text-night/60">{a.repo}</span>
            <span className="block leading-snug">{a.text}</span>
          </span>
          <span className="shrink-0 font-mono text-[12px] text-night/60">{ago(a.at)}</span>
        </li>
      ))}
    </ul>
  )
}
