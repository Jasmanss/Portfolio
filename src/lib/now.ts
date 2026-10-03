import { useEffect, useState } from 'react'
import { LINKS, NOW } from '../data/content'

// What Jasman is working on right now, for the Ember tile and its panel.
// With VITE_NOW_ENDPOINT set (the api/now.ts function), the numbers are exact and include private repos. Without
// it, they are approximated from GitHub's public events: one commit per push made today (Detroit time), and the
// repo of the latest public push. Everything is cached for five minutes, one request is shared by every caller,
// and any failure quietly reads as a quiet day.

export type NowSource = 'live' | 'public' | 'none'
// hidden: the repo being worked on is private, so its name is withheld (the commits still count).
export type Now = { commitsToday: number; repo: string | null; hidden: boolean; lastAt: string | null; source: NowSource }
export type NowState = Now & { loading: boolean }
export type Activity = { id: string; text: string; repo: string; at: string }

const USER = LINKS.github.split('/').pop()!
// The live endpoint: VITE_NOW_ENDPOINT on the deployed site; in development the dev server answers /api/now itself
// (see vite.config.ts), and if it has no token yet that fails quietly over to public activity.
const ENDPOINT = (import.meta.env.VITE_NOW_ENDPOINT as string | undefined) || (import.meta.env.DEV ? '/api/now' : undefined)
// Public activity can't see private repos. If nothing public was pushed for this long, the work is assumed to be
// happening in a private repo, and the tile says so ("something behind the scenes") instead of naming an old repo.
const QUIET_PUBLIC = 48 * 60 * 60 * 1000
const TTL = 5 * 60 * 1000
const RETRY = 60 * 1000
const NOW_KEY = 'ember-now'
const EVENTS_KEY = 'ember-events'
// When GitHub can't be reached at all, the honest answer is still "something behind the scenes".
const NONE: Now = { commitsToday: 0, repo: null, hidden: true, lastAt: null, source: 'none' }

// The calendar day an instant falls on in Detroit, as YYYY-MM-DD.
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: NOW.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
const dayOf = (d: Date | string) => dayFormat.format(new Date(d))

// sessionStorage can be missing or throw (private windows, blocked storage), so every access is guarded.
function readCache<T>(key: string): { at: number; data: T } | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const hit = JSON.parse(raw) as { at: number; data: T }
    return Date.now() - hit.at < TTL ? hit : null
  } catch {
    return null
  }
}
function writeCache(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* storage unavailable: the in-memory copy still works */
  }
}

// One shared request per key, reused for five minutes. A failure is remembered for a minute (so a rate-limited
// visitor doesn't send a request every time the panel opens), then the next caller tries again.
function shared<T>(key: string, load: () => Promise<T>, keep: (data: T) => boolean = () => true) {
  let pending: Promise<T> | null = null
  let at = 0
  let ttl = TTL
  return () => {
    if (pending && Date.now() - at < ttl) return pending
    const hit = readCache<T>(key)
    if (hit) {
      at = hit.at
      ttl = TTL
      return (pending = Promise.resolve(hit.data))
    }
    at = Date.now()
    ttl = TTL
    pending = load().then((data) => {
      if (keep(data)) writeCache(key, data)
      else ttl = RETRY
      return data
    })
    pending.catch(() => (ttl = RETRY))
    return pending
  }
}

type GhEvent = {
  id: string
  type: string
  created_at: string
  repo: { name: string }
  payload: { ref?: string; ref_type?: string; action?: string; size?: number }
}

const shortName = (full: string) => full.split('/').pop()!
// The profile README repo (Jasmanss/Jasmanss) isn't really "something I'm working on".
const isProfileRepo = (name: string) => name.toLowerCase() === USER.toLowerCase()

const loadEvents = shared<GhEvent[]>(EVENTS_KEY, async () => {
  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=50`)
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
  const events = (await res.json()) as GhEvent[]
  // Keep only what's used, so the cached copy stays small.
  return events.map(({ id, type, created_at, repo, payload }) => ({
    id,
    type,
    created_at,
    repo: { name: repo.name },
    payload: { ref: payload.ref, ref_type: payload.ref_type, action: payload.action, size: payload.size },
  }))
})

// The public approximation: GitHub stopped putting commit counts in public push events, so each push today counts
// as one commit (or its size, if GitHub ever sends it again).
function fromEvents(events: GhEvent[]): Now {
  const today = dayOf(new Date())
  const pushes = events.filter((e) => e.type === 'PushEvent')
  const commitsToday = pushes
    .filter((e) => dayOf(e.created_at) === today)
    .reduce((n, e) => n + Math.max(1, typeof e.payload.size === 'number' ? e.payload.size : 1), 0)
  const latest = pushes.find((e) => !isProfileRepo(shortName(e.repo.name))) ?? pushes[0] ?? events[0]
  if (!latest || Date.now() - new Date(latest.created_at).getTime() > QUIET_PUBLIC)
    return { commitsToday, repo: null, hidden: true, lastAt: null, source: 'public' }
  return { commitsToday, repo: shortName(latest.repo.name), hidden: false, lastAt: latest.created_at, source: 'public' }
}

async function fromEndpoint(url: string): Promise<Now> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Now endpoint responded ${res.status}`)
  const d = (await res.json()) as { commitsToday?: unknown; repo?: unknown; repoPrivate?: unknown; lastAt?: unknown }
  if (typeof d.commitsToday !== 'number') throw new Error('Now endpoint sent something unexpected')
  return {
    commitsToday: Math.max(0, Math.round(d.commitsToday)),
    repo: typeof d.repo === 'string' ? d.repo : null,
    hidden: d.repoPrivate === true && typeof d.repo !== 'string',
    lastAt: typeof d.lastAt === 'string' ? d.lastAt : null,
    source: 'live',
  }
}

const loadNow = shared<Now>(
  NOW_KEY,
  () =>
    (ENDPOINT ? fromEndpoint(ENDPOINT).catch(() => loadEvents().then(fromEvents)) : loadEvents().then(fromEvents)).catch(
      () => NONE,
    ),
  // A failed lookup isn't cached, so a later visit can try again.
  (d) => d.source !== 'none',
)

// In development, ?commits=5 pretends that many commits happened today (to see every size of flame), and ?private
// pretends the current repo is private.
function withOverride(d: Now): Now {
  if (!import.meta.env.DEV || typeof location === 'undefined') return d
  const q = new URLSearchParams(location.search)
  const n = q.get('commits')
  const out = n === null || Number.isNaN(Number(n)) ? d : { ...d, commitsToday: Math.max(0, Number(n)), repo: d.repo ?? 'portfolio' }
  return q.has('private') ? { ...out, repo: null, hidden: true } : out
}

// What to call the thing being worked on: its name, or for a private repo, nothing more than a hint.
export const BEHIND_THE_SCENES = 'something behind the scenes'
export function workingOn(now: Now & { loading?: boolean }, fallback: string) {
  if (now.hidden) return BEHIND_THE_SCENES
  return now.repo ?? (now.loading ? 'checking…' : fallback)
}

// Today's commits, the repo being worked on and when it was last pushed to. Starts from the session cache when
// there is one, so the tile and its panel never flash empty.
export function useNow(): NowState {
  const [state, setState] = useState<NowState>(() => {
    const hit = readCache<Now>(NOW_KEY)
    return hit ? { ...withOverride(hit.data), loading: false } : { ...withOverride(NONE), loading: true }
  })
  useEffect(() => {
    let alive = true
    loadNow().then((d) => alive && setState({ ...withOverride(d), loading: false }))
    return () => {
      alive = false
    }
  }, [])
  return state
}

// Recent public GitHub activity as short human lines (adapted from LiveNow): back-to-back pushes to the same
// branch collapse into one line. Shares the events request with the public fallback above.
function toActivity(events: GhEvent[], max: number): Activity[] {
  const lines: (Activity & { pushes?: number; key?: string })[] = []
  for (const e of events) {
    const repo = shortName(e.repo.name)
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
    if (lines.length > max) break
  }
  return lines.slice(0, max).map(({ id, text, repo, at }) => ({ id, text, repo, at }))
}

export function useActivity(max = 4) {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    loadEvents().then(
      (events) => alive && setItems(toActivity(events, max)),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [max])
  return { items, failed }
}

// "just now", "12m ago", "3h ago", "2d ago".
export function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  // Past a day, whole days: 42 hours reads as "2d ago", the way people say it.
  return `${Math.max(1, Math.round(hours / 24))}d ago`
}

// How big today's fire is, 0..1: nothing with no commits, a low flame at one, saturating around twelve.
export function heatFor(commits: number) {
  if (commits <= 0) return 0
  return 0.4 + 0.6 * Math.min(1, Math.log(commits) / Math.log(12))
}
