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
    <div className="flex h-full flex-col bg-white p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]">
      <div ref={log} className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-[180px]" aria-live="polite">
        {turns.length === 0 ? (
          <div>
            <p className="type-poster text-red text-[34px]">Ask me</p>
            <p className="mt-2 text-ink/70">Ask anything about Jasman’s work. Answers come from what’s on this site.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="border border-rule px-3 py-1.5 hover:border-ink hover:bg-ink hover:text-paper transition-colors">
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
                  ? 'ml-auto w-fit max-w-[85%] bg-red px-3 py-2 text-ink'
                  : 'max-w-[92%] leading-relaxed text-ink/85'
              }
            >
              {t.text || <span className="inline-block animate-pulse text-mute">thinking…</span>}
            </p>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-4 flex gap-2 border-t border-rule pt-4">
        <label htmlFor="ask" className="sr-only">
          Your question
        </label>
        <input
          id="ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Ask about a project, a job, a skill…"
          className="min-w-0 flex-1 border-b border-ink bg-transparent py-2 placeholder:text-mute focus:border-red outline-none"
        />
        <button type="submit" disabled={busy || !draft.trim()} className="type-menu text-[18px] px-2 hover:text-red disabled:opacity-30">
          Ask
        </button>
      </form>
    </div>
  )
}
