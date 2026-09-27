import { useLocation } from 'react-router-dom'
import { TransitionLink } from '../components/Transition'

// Same input → output grammar as the rest of the site: whatever was typed, and what it resolved to.
export default function NotFound() {
  const { pathname } = useLocation()
  const tokens = pathname.split('/').filter(Boolean)

  return (
    <main className="container-xl min-h-[100svh] pt-32 pb-16 flex flex-col">
      <p className="type-label text-muted">Input</p>
      <p className="mt-10 font-display font-semibold tracking-[-0.035em] leading-[1.4] text-[clamp(2.2rem,6vw,6rem)] break-all">
        {tokens.length ? (
          tokens.map((t, i) => (
            <span key={i} className="relative inline-block mr-[0.26em] px-[0.07em] border-[1.5px] border-green rounded-[0.14em]">
              <span className="absolute -top-[1.35em] left-0 font-mono text-[11px] tracking-normal font-normal text-green">
                /{t}
              </span>
              {t}
            </span>
          ))
        ) : (
          <span>/</span>
        )}
      </p>
      <p className="mt-6 font-mono text-green text-[clamp(1rem,1.9vw,1.6rem)]">→ nothing lives here</p>
      <div className="mt-auto pt-16 border-t border-line">
        <p className="type-label text-muted">Error 404</p>
        <TransitionLink to="/#work" command="cd ~" className="mt-4 inline-block type-display text-[clamp(3rem,9vw,9rem)] hover:text-green transition-colors">
          See the work →
        </TransitionLink>
      </div>
    </main>
  )
}
