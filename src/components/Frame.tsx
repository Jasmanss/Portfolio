import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LINKS } from '../data/content'
import { TransitionLink } from './Transition'
import { LocalTime } from './LiveNow'
import { ROOMS, roomEvents } from '../pages/Gallery'
import { scrollToTarget } from '../lib/motion'

// The cornice along the top of every page: crest, rooms, and the house's opening hours.
export default function Frame() {
  const { pathname } = useLocation()
  const [room, setRoom] = useState('foyer')
  const home = pathname === '/'

  useEffect(() => {
    const on = (e: Event) => setRoom((e as CustomEvent<string>).detail)
    roomEvents.addEventListener('room', on)
    return () => roomEvents.removeEventListener('room', on)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[64px] items-center gap-6 bg-[#1b0b07]/95 px-4 shadow-[0_6px_14px_rgba(0,0,0,0.55)] md:px-6">
      <div aria-hidden className="gilt absolute inset-x-0 bottom-0 h-[3px]" />
      <TransitionLink to="/" label="The Foyer" className="flex shrink-0 items-center gap-3" aria-label="The Sidhu Collection, home">
        <span className="gilt grid size-[40px] place-items-center rounded-full p-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          <span className="grid size-full place-items-center rounded-full bg-[#1b0b07] font-caps text-[14px] font-bold">
            <span className="gilt-text">JS</span>
          </span>
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="type-caps block text-gold">The Sidhu</span>
          <span className="block font-serif text-[17px] italic text-paper/85">Collection</span>
        </span>
      </TransitionLink>

      <nav aria-label="Rooms" className="mx-auto hidden md:block">
        <ul className="flex gap-[clamp(1rem,2.4vw,2.5rem)]">
          {ROOMS.map((r) => {
            const active = home && room === r.id
            return (
              <li key={r.id}>
                {home ? (
                  <button
                    type="button"
                    onClick={() => scrollToTarget(`#${r.id}`)}
                    aria-current={active ? 'location' : undefined}
                    className={`type-caps relative py-2 transition-colors ${active ? 'text-gold-light' : 'text-gold/60 hover:text-gold-light'}`}
                  >
                    {r.label}
                    <span className={`gilt absolute inset-x-0 bottom-0 h-px origin-center transition-transform duration-500 ${active ? 'scale-x-100' : 'scale-x-0'}`} />
                  </button>
                ) : (
                  <TransitionLink to={`/#${r.id}`} label={`The ${r.label}`} className="type-caps py-2 text-gold/60 transition-colors hover:text-gold-light">
                    {r.label}
                  </TransitionLink>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-5 text-right md:ml-0">
        <p className="hidden text-[15px] leading-tight text-paper/80 lg:block">
          <span className="type-caps block text-gold/70">Open now</span>
          <LocalTime />
        </p>
        <a href={LINKS.resume} target="_blank" rel="noreferrer" className="type-caps border border-gold/60 px-3 py-2 text-gold-light transition-colors hover:bg-gold hover:text-ink">
          Resume
        </a>
      </div>
    </header>
  )
}
