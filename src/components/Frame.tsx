import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LINKS } from '../data/content'
import { TransitionLink } from './Transition'
import { LocalTime } from './LiveNow'
import AskChat from './AskChat'

const MENU = [
  { to: '/', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/playground', label: 'Playground' },
  { to: '/contact', label: 'Contact' },
]

// The fixed chrome every page shares: stamp, menu, Michigan clock, inquiries, and the Ask drawer.
export default function Frame() {
  const { pathname } = useLocation()
  const [asking, setAsking] = useState(false)
  const active = (to: string) => (to === '/' ? pathname === '/' || pathname.startsWith('/work') : pathname === to)

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start gap-5 px-4 pt-4 md:px-5 md:pt-5">
        <TransitionLink to="/" aria-label="Jasman Sidhu, home" className="pointer-events-auto flex shrink-0 items-start gap-2">
          <span className="type-menu text-[22px] md:text-[30px] leading-none [writing-mode:vertical-rl] rotate-180 font-bold tracking-[-0.04em]">
            JASMAN<sup className="text-[0.45em] align-super">©</sup>
          </span>
          <span className="hidden md:flex flex-col items-center border border-ink p-[3px]">
            <span className="text-[8px] font-semibold tracking-tight leading-none pb-[3px]">JS</span>
            <img src="/avatar.jpg" alt="" className="w-[30px] h-[42px] object-cover grayscale contrast-150" />
          </span>
          <span className="hidden md:block [writing-mode:vertical-rl] rotate-180 text-[9px] leading-tight text-ink/70">
            copyright {new Date().getFullYear()} · sterling hts, mi
          </span>
        </TransitionLink>

        <div className="md:ml-[88px] flex-1 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_1fr] gap-4">
          <nav aria-label="Main">
            <p className="type-label mb-3 hidden md:block">Menu</p>
            <ul className="pointer-events-auto type-menu text-[17px] md:text-[23px]">
              {MENU.map((m) => (
                <li key={m.to}>
                  <TransitionLink to={m.to} className="group inline-flex items-center gap-2 hover:text-red transition-colors">
                    <span
                      className={`inline-block overflow-hidden transition-[width] duration-500 ease-out ${
                        active(m.to) ? 'w-[1.1em]' : 'w-0 group-hover:w-[1.1em]'
                      }`}
                    >
                      →
                    </span>
                    {m.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="hidden md:block">
            <span className="type-label">Working from</span> Michigan
            <br />
            <span className="text-ink/60">
              <LocalTime />
            </span>
          </p>
          <p className="pointer-events-auto text-right">
            <span className="type-label hidden md:inline">For inquiries&nbsp;&nbsp;</span>
            <a href={`mailto:${LINKS.email}`} className="underline underline-offset-2 hover:text-red">
              <span className="hidden md:inline">{LINKS.email}</span>
              <span className="md:hidden">Email</span>
            </a>
          </p>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setAsking((a) => !a)}
        aria-expanded={asking}
        className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-50 inline-flex items-center gap-2 underline underline-offset-2 hover:text-red"
      >
        {asking ? 'Close chat' : 'Ask my portfolio'}
        <span className={`inline-block transition-transform duration-300 ${asking ? 'rotate-90' : ''}`}>▶</span>
      </button>

      <aside
        aria-label="Ask my portfolio"
        aria-hidden={!asking}
        inert={!asking}
        className={`fixed bottom-14 right-4 md:right-5 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(520px,70svh)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          asking ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-6'
        }`}
      >
        <AskChat />
      </aside>
    </>
  )
}
