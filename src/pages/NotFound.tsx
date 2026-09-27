import { useLocation } from 'react-router-dom'
import AsciiFlame from '../components/AsciiFlame'
import Scramble from '../components/Scramble'
import { TransitionLink } from '../components/Transition'

// The candle's gone out here.
export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <main className="fixed inset-0 grid place-items-center bg-void text-center">
      <div className="pointer-events-none absolute left-1/2 top-[8vh] h-[40vh] w-[300px] -translate-x-1/2 opacity-40">
        <AsciiFlame intensity={0.35} className="h-full w-full" />
      </div>
      <div className="relative mt-[20vh]">
        <p className="type-cond text-[clamp(6rem,20vw,16rem)]">404</p>
        <p className="mt-2 text-dim">
          <Scramble text={`No signal at ${pathname}`} />
        </p>
        <TransitionLink to="/" label="/index" className="bracket mt-8 hover:text-flame">
          <Scramble text="Back to the index" hover />
        </TransitionLink>
      </div>
    </main>
  )
}
