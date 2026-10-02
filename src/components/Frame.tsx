import { useLocation } from 'react-router-dom'
import { TransitionLink } from './Transition'
import { scrollToTarget } from '../lib/motion'

const LINKS = [
  ['About', '#about'],
  ['Work', '#work'],
  ['Now', '#now'],
  ['Contact', '#contact'],
] as const

// Top corners: a mark on the left, the menu on the right. On the home page the hero decodes them in.
export default function Frame() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  // The home hero carries its own bar; lab pages bring their own chrome.
  if (home || pathname.startsWith('/lab')) return null
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between px-5 pt-5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper mix-blend-difference">
      <TransitionLink to="/" label="Jasman Sidhu" data-frame-link className="pointer-events-auto hover:text-accent">
        JS
      </TransitionLink>
      <nav aria-label="Main" className="pointer-events-auto flex gap-5">
        {LINKS.map(([label, hash]) =>
          home ? (
            <button key={label} data-frame-link type="button" onClick={() => scrollToTarget(hash)} className="uppercase hover:text-accent">
              {label}
            </button>
          ) : (
            <TransitionLink key={label} data-frame-link to={`/${hash}`} label="Jasman Sidhu" className="hover:text-accent">
              {label}
            </TransitionLink>
          ),
        )}
      </nav>
    </header>
  )
}
