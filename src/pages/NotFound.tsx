import { useLocation } from 'react-router-dom'
import Page from '../components/Page'
import { GoldFrame } from '../components/Museum'
import { TransitionLink } from '../components/Transition'

// An empty frame where a painting should be.
export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <Page className="flex flex-col items-center">
      <div data-reveal className="mt-10 w-[min(360px,80vw)]">
        <GoldFrame>
          <div className="grid aspect-[4/5] place-items-center bg-[#5a0b10] text-center">
            <p className="gilt-text font-serif text-[clamp(4rem,10vw,7rem)] italic leading-none">404</p>
          </div>
        </GoldFrame>
      </div>
      <p data-reveal className="mt-10 max-w-[34rem] text-center text-[22px] italic text-paper/85">
        This frame is empty. Nothing hangs at <span className="break-all not-italic text-gold-light">{pathname}</span>.
      </p>
      <TransitionLink to="/" label="The Foyer" className="type-caps mt-8 border border-gold/60 px-5 py-3 text-gold-light hover:bg-gold hover:text-ink">
        Return to the foyer
      </TransitionLink>
    </Page>
  )
}
