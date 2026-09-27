import { useLocation } from 'react-router-dom'
import Hands from '../components/Hands'
import { TransitionLink } from '../components/Transition'

// Nobody's reaching for this page.
export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <main className="flex min-h-[100svh] flex-col justify-center px-5">
      <p className="text-[clamp(6rem,24vw,22rem)] font-medium leading-[0.8] tracking-[-0.06em]">
        404<span className="em text-ember">.</span>
      </p>
      <p className="mt-6 text-[clamp(1.2rem,2vw,1.8rem)] tracking-[-0.02em]">
        Nothing lives at <span className="em text-ash">{pathname}</span>.{' '}
        <TransitionLink to="/" label="Jasman Sidhu" className="underline decoration-1 underline-offset-4 hover:text-ember">
          Go back home
        </TransitionLink>
      </p>
      <Hands className="mt-10 block h-[36vh] w-full opacity-60" />
    </main>
  )
}
