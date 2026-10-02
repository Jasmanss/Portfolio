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
    payload: { ref?: string; ref_type?: string; action?: string }
  }[]
  // GitHub no longer includes commit messages in public push events, so pushes are summarised and
  // back-to-back pushes to the same branch are collapsed into one line.
  const lines: (Activity & { pushes?: number; key?: string })[] = []
  for (const e of events) {
    const repo = e.repo.name.split('/').pop()!
    const branch = e.payload.ref?.replace('refs/heads/', '')
    const last = lines[lines.length - 1]
    if (e.type === 'PushEvent') {
      const key = `${repo}@${branch}`
      if (last?.key === key) {
        last.pushes! += 1
        last.text = `Pushed ${last.pushes} times to ${branch}`
      } else {
        lines.push({ id: e.id, repo, at: e.created_at, text: `Pushed to ${branch}`, pushes: 1, key })
      }
    } else if (e.type === 'CreateEvent' && e.payload.ref_type === 'repository') {
      lines.push({ id: e.id, repo, at: e.created_at, text: 'Started a new repo' })
    } else if (e.type === 'PullRequestEvent') {
      lines.push({ id: e.id, repo, at: e.created_at, text: `${e.payload.action === 'closed' ? 'Closed' : 'Opened'} a pull request` })
    }
    if (lines.length === 5) break
  }
  const recent = lines.slice(0, 4).map(({ id, text, repo, at }) => ({ id, text, repo, at }))
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(recent))
  return recent
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// The repo of your most recent public push, or null while loading / if GitHub is unreachable.
export function useLatestRepo() {
  const [latest, setLatest] = useState<{ repo: string; at: string } | null>(null)
  useEffect(() => {
    loadActivity().then((items) => items[0] && setLatest({ repo: items[0].repo, at: items[0].at }), () => {})
  }, [])
  return latest
}

export { ago }

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
      <p className="text-ash">
        Activity is taking a break.{' '}
        <a href={LINKS.github} target="_blank" rel="noreferrer" className="underline text-ember">
          See GitHub ↗
        </a>
      </p>
    )
  }
  if (!items) return <p className="text-ash">Checking GitHub…</p>
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <span>
            <span className="text-ash">{a.repo}</span>
            <span className="block leading-snug">{a.text}</span>
          </span>
          <span className="shrink-0 text-ash">{ago(a.at)}</span>
        </li>
      ))}
    </ul>
  )
}
