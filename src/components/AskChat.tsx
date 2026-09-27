import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { LINKS } from '../data/content'

type Turn = { role: 'user' | 'assistant'; text: string }

// Deployed separately from the static site; see api/ask.ts.
const ENDPOINT = import.meta.env.VITE_ASK_ENDPOINT as string | undefined

const SUGGESTIONS = ['What is Portlkit?', 'What did Jasman build at Motherson?', 'Is he open to internships?', 'Which project uses Claude?']

// A small chat that answers questions about the portfolio, streamed as it's written.
export default function AskChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef<HTMLDivElement>(null)

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || busy) return
    const history: Turn[] = [...turns, { role: 'user', text }]
    setTurns([...history, { role: 'assistant', text: '' }])
    setDraft('')
    setBusy(true)
    const write = (answer: string) => {
      setTurns([...history, { role: 'assistant', text: answer }])
      requestAnimationFrame(() => log.current?.scrollTo({ top: log.current.scrollHeight }))
    }
    if (!ENDPOINT) {
      write(`The chat isn't switched on yet. For now, email Jasman at ${LINKS.email}.`)
      setBusy(false)
      return
    }
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns: history }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        write(answer)
      }
    } catch {
      write(`Couldn't reach the chat just now. Email Jasman at ${LINKS.email} instead.`)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-line bg-[#161714] p-5 md:p-7">
      <div ref={log} className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-[180px]" aria-live="polite">
        {turns.length === 0 ? (
          <div>
            <p className="text-cream/70">Ask anything about Jasman’s work. Answers come from what’s on this site.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-green hover:text-green transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <p
              key={i}
              className={
                t.role === 'user'
                  ? 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-green px-4 py-2.5 text-night'
                  : 'max-w-[92%] leading-relaxed text-cream/90'
              }
            >
              {t.text || <span className="inline-block animate-pulse font-mono text-muted">thinking…</span>}
            </p>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-5 flex gap-2">
        <label htmlFor="ask" className="sr-only">
          Your question
        </label>
        <input
          id="ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Ask about a project, a job, a skill…"
          className="min-w-0 flex-1 rounded-full border border-line bg-night px-5 py-3 text-cream placeholder:text-muted focus:border-green outline-none"
        />
        <button type="submit" disabled={busy || !draft.trim()} className="pill border-green bg-green text-night hover:bg-cream hover:border-cream disabled:opacity-40">
          Ask
        </button>
      </form>
    </div>
  )
}
