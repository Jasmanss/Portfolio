import { useLocation } from 'react-router-dom'
import Page, { Poster } from '../components/Page'
import { TransitionLink } from '../components/Transition'

export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <Page>
      <h1 className="type-poster text-red text-[clamp(7rem,30vw,30rem)]">
        <Poster>404</Poster>
      </h1>
      <p data-reveal className="mt-8 max-w-[640px] text-[clamp(1.4rem,2.6vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.025em]">
        Nothing lives at <span className="break-all text-mute">{pathname}</span>.{' '}
        <TransitionLink to="/" className="underline decoration-2 underline-offset-4 hover:text-red">
          See the work instead →
        </TransitionLink>
      </p>
    </Page>
  )
}
