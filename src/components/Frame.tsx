import { useLocation } from 'react-router-dom'
import { TransitionLink } from './Transition'
import Scramble from './Scramble'

// Two quiet exits pinned to the screen edges, like the HUD of a camera.
export default function Frame() {
  const { pathname } = useLocation()
  const about = pathname === '/about'
  return (
    <>
      <TransitionLink
        to="/"
        label="/index"
        className={`fixed left-5 top-1/2 z-40 -translate-y-1/2 hover:text-flame ${pathname === '/' ? 'text-bone' : 'text-bone/70'}`}
      >
        <Scramble text="Index" hover />
      </TransitionLink>
      <TransitionLink to="/about" label="/about" className={`fixed right-5 top-1/2 z-40 -translate-y-1/2 hover:text-flame ${about ? 'text-flame' : ''}`}>
        <Scramble text="About" hover />
      </TransitionLink>
    </>
  )
}
