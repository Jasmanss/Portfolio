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
    <div className="flex h-full flex-col border border-line bg-black/40 p-4 normal-case">
      <div ref={log} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto pr-1 text-[12px] leading-relaxed" aria-live="polite">
        <p className="text-dim">jasman@portfolio ~ % ask --about jasman</p>
        {turns.length === 0 ? (
          <div>
            <p className="text-bone/80">Answers come only from what's on this site. Try one:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="border border-line px-2 py-1 text-bone/80 transition-colors hover:border-flame hover:text-flame">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <p key={i} className={t.role === 'user' ? 'text-flame' : 'text-bone/90'}>
              {t.role === 'user' ? '> ' : ''}
              {t.text || <span className="animate-pulse text-dim">thinking…</span>}
            </p>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[12px]">
        <label htmlFor="ask" className="text-flame">
          &gt;
        </label>
        <input
          id="ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="ask about a project, a job, a skill"
          className="min-w-0 flex-1 bg-transparent text-bone caret-flame outline-none placeholder:text-dim"
        />
        <button type="submit" disabled={busy || !draft.trim()} className="uppercase text-bone hover:text-flame disabled:opacity-30">
          Enter ↵
        </button>
      </form>
    </div>
  )
}
