// "Ask my portfolio": a Vercel Function that answers visitor questions about Jasman's work with Claude.
// The site itself is static (GitHub Pages), so this deploys separately; point VITE_ASK_ENDPOINT at it.
// Needs ANTHROPIC_API_KEY in the function's environment.
import Anthropic from '@anthropic-ai/sdk'
import { ABOUT, EXPERIENCE, LINKS, NOW, PROJECTS, SKILLS } from '../src/data/content'

const client = new Anthropic()

const ALLOWED_ORIGINS = ['https://jasmanss.com', 'https://www.jasmanss.com', 'http://localhost:5173']
const MAX_QUESTION_CHARS = 500
const MAX_TURNS = 8

// Everything the assistant is allowed to know. Built once so the prompt is byte-stable and caches.
const SYSTEM = `You answer questions from visitors to Jasman Sidhu's portfolio site.

Use only the facts below. If something isn't covered, say you don't know and suggest emailing Jasman at ${LINKS.email}. Never invent employers, dates, numbers or projects.
Talk about Jasman in the third person, warmly and plainly. Keep answers to 2-4 short sentences unless the visitor asks for detail. Plain text only, no markdown.

About: ${ABOUT}

Right now: building "${NOW.building}"; thinking about "${NOW.learning}". Based in ${NOW.place}.

Experience:
${EXPERIENCE.map((e) => `- ${e.role}, ${e.org} (${e.place}), ${e.time}:\n${e.bullets.map((b) => `  - ${b}`).join('\n')}`).join('\n')}

Projects:
${PROJECTS.map(
  (p) =>
    `- ${p.title} (${p.kind}): ${p.summary}\n${p.highlights.map((h) => `  - ${h}`).join('\n')}\n  Stack: ${p.stack.join(', ')}${
      p.live ? `\n  Live: ${p.live}` : ''
    }${p.code ? `\n  Code: ${p.code}` : ''}`,
).join('\n')}

Skills:
${SKILLS.map((s) => `- ${s.group}: ${s.items.join(', ')}`).join('\n')}

Links: GitHub ${LINKS.github}, LinkedIn ${LINKS.linkedin}. Jasman is open to internships, freelance work and collaborations.`

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get('origin')) })
}

type Turn = { role: 'user' | 'assistant'; text: string }

export async function POST(request: Request) {
  const headers = cors(request.headers.get('origin'))
  let turns: Turn[]
  try {
    const body = (await request.json()) as { turns?: Turn[] }
    turns = (body.turns ?? [])
      .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim())
      .slice(-MAX_TURNS)
      .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_QUESTION_CHARS) }))
  } catch {
    return new Response('Send JSON like {"turns":[{"role":"user","text":"..."}]}.', { status: 400, headers })
  }
  if (!turns.length || turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') {
    return new Response('The conversation must start and end with a question.', { status: 400, headers })
  }

  const stream = client.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 1024,
    // Short conversational answers don't need deep reasoning.
    output_config: { effort: 'low' },
    // If Opus 5 declines, Anthropic re-runs the request on its recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: turns.map((t) => ({ role: t.role, content: t.text })),
  })

  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        const final = await stream.finalMessage()
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode(`That's one I can't answer here. Try emailing Jasman at ${LINKS.email}.`))
        }
      } catch (error) {
        const message =
          error instanceof Anthropic.RateLimitError
            ? 'Lots of questions right now. Try again in a minute.'
            : `Something went wrong on my end. You can always email Jasman at ${LINKS.email}.`
        controller.enqueue(encoder.encode(message))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
