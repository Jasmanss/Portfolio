import { useLocation } from 'react-router-dom'
import { TransitionLink } from './Transition'
import { scrollToTarget } from '../lib/motion'

const LINKS = [
  ['About', '#about'],
  ['Work', '#work'],
  ['Skills', '#skills'],
  ['Contact', '#contact'],
] as const

// Top-right menu that stays legible over anything by inverting what's behind it.
export default function Frame() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  return (
    <nav aria-label="Main" className="fixed right-5 top-5 z-50 flex gap-5 text-[12px] text-snow mix-blend-difference">
      {LINKS.map(([label, hash]) =>
        home ? (
          <button key={label} data-frame-link type="button" onClick={() => scrollToTarget(hash)} className="hover:opacity-60">
            {label}
          </button>
        ) : (
          <TransitionLink key={label} data-frame-link to={`/${hash}`} label="Jasman Sidhu" className="hover:opacity-60">
            {label}
          </TransitionLink>
        ),
      )}
    </nav>
  )
}
