// "Ember": a Vercel Function that tells the portfolio's live tile how many commits Jasman has made today
// (America/Detroit day) and which repo he's working in. Like api/ask.ts it deploys separately from the static
// site; point VITE_NOW_ENDPOINT at it.
//
// Needs GITHUB_TOKEN in the function's environment: a fine-grained personal access token owned by Jasmanss,
// with access to all of his repositories and read-only "Contents" (plus the automatic read-only "Metadata").
// It is only ever used here, server side.
// Optional PUBLIC_REPOS: comma-separated repo names that may be shown by name even though they're private.
// Commits in every other private repo still count, but its name never leaves this function: the response
// sends repo: null with repoPrivate: true, and the site says "something behind the scenes".
//
// How it counts: the repos pushed to today, every branch in each, and the unique commits on them that Jasman
// authored since midnight in Detroit. (GitHub's contribution graph only counts default branches, and public
// events no longer carry commit counts, so this walks the branches instead.)
import { LINKS, NOW } from '../src/data/content'

// Node's process.env, declared here so this compiles without @types/node.
declare const process: { env: Record<string, string | undefined> }

const ALLOWED_ORIGINS = ['https://jasmanss.com', 'https://www.jasmanss.com', 'http://localhost:5173']
const USER = LINKS.github.split('/').pop()!
// Repos pushed to most recently that get looked at, and branches per repo. Anything with a commit today was
// pushed today, so the most recent few are enough.
const MAX_REPOS = 8
const MAX_BRANCHES = 15

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get('origin')) })
}

// Midnight today in a time zone, as a Date. Works out the zone's current offset from the wall clock there.
function startOfToday(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const y = Number(parts.year)
  const m = Number(parts.month) - 1
  const d = Number(parts.day)
  const wall = Date.UTC(y, m, d, Number(parts.hour), Number(parts.minute), Number(parts.second))
  const offset = wall - Math.floor(now.getTime() / 1000) * 1000
  return new Date(Date.UTC(y, m, d) - offset)
}

const QUERY = /* GraphQL */ `
  query Now($since: GitTimestamp!, $repos: Int!, $branches: Int!) {
    viewer {
      login
      repositories(first: $repos, ownerAffiliations: [OWNER, COLLABORATOR], orderBy: { field: PUSHED_AT, direction: DESC }) {
        nodes {
          name
          isPrivate
          pushedAt
          refs(refPrefix: "refs/heads/", first: $branches, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
            nodes {
              target {
                ... on Commit {
                  history(first: 100, since: $since) {
                    nodes {
                      oid
                      authoredDate
                      author {
                        user {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

type Commit = { oid: string; authoredDate: string; author: { user: { login: string } | null } | null }
type Repo = {
  name: string
  isPrivate: boolean
  pushedAt: string | null
  refs: { nodes: { target: { history?: { nodes: Commit[] } } | null }[] } | null
}
type Result = { data?: { viewer: { login: string; repositories: { nodes: Repo[] } } | null }; errors?: { message: string }[] }

function json(body: unknown, status: number, headers: Record<string, string>, cache: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  })
}

export async function GET(request: Request) {
  const headers = cors(request.headers.get('origin'))
  const token = process.env.GITHUB_TOKEN
  if (!token) return json({ error: 'GITHUB_TOKEN is not set.' }, 500, headers, 'no-store')

  const since = startOfToday(NOW.timeZone)
  let repos: Repo[]
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'jasmanss-portfolio-ember' },
      body: JSON.stringify({
        query: QUERY,
        variables: { since: since.toISOString(), repos: MAX_REPOS, branches: MAX_BRANCHES },
      }),
    })
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
    const result = (await res.json()) as Result
    if (result.errors?.length || !result.data?.viewer) throw new Error(result.errors?.[0]?.message ?? 'No viewer')
    if (result.data.viewer.login.toLowerCase() !== USER.toLowerCase()) throw new Error(`GITHUB_TOKEN belongs to ${result.data.viewer.login}, not ${USER}`)
    repos = result.data.viewer.repositories.nodes
  } catch (error) {
    console.error('now:', error instanceof Error ? error.message : error)
    return json({ error: 'GitHub is unreachable right now.' }, 502, headers, 'public, s-maxage=60')
  }

  // Unique commits (a commit on several branches counts once) that Jasman authored today.
  const me = USER.toLowerCase()
  const commits = new Set<string>()
  for (const repo of repos) {
    if (!repo.pushedAt || new Date(repo.pushedAt) < since) continue
    for (const ref of repo.refs?.nodes ?? []) {
      for (const c of ref.target?.history?.nodes ?? []) {
        if (c.author?.user?.login.toLowerCase() === me && new Date(c.authoredDate) >= since) commits.add(c.oid)
      }
    }
  }

  // The repo pushed to most recently (skipping the profile README repo when there's anything else).
  const current = repos.find((r) => r.name.toLowerCase() !== me) ?? repos[0]
  const shown = (process.env.PUBLIC_REPOS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const hidden = !!current && current.isPrivate && !shown.includes(current.name.toLowerCase())
  const repo = !current || hidden ? null : current.name

  return json(
    { commitsToday: commits.size, repo, repoPrivate: hidden, lastAt: current?.pushedAt ?? null },
    200,
    headers,
    'public, s-maxage=300, stale-while-revalidate=600',
  )
}
