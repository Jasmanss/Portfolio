import { LINKS } from '../data/content'
import { TransitionLink } from './Transition'

const NAV_ITEMS = [
  { href: '/#work', label: 'Work' },
  { href: '/#about', label: 'About' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#contact', label: 'Contact' },
]

// Difference blending keeps the nav legible over both the dark page and the cream contact block.
export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 mix-blend-difference text-cream">
      <div className="container-xl h-16 flex items-center justify-between">
        <TransitionLink to="/" command="cd ~" className="font-display font-bold text-lg tracking-tight">
          Jasman Sidhu
        </TransitionLink>
        <nav className="flex items-center gap-5 md:gap-8">
          {NAV_ITEMS.map((item) => (
            <TransitionLink key={item.href} to={item.href} command="cd ~" className="type-label link-underline hidden md:inline">
              {item.label}
            </TransitionLink>
          ))}
          <a href={LINKS.resume} download className="type-label link-underline">
            Resume
          </a>
          <TransitionLink to="/#contact" command="cd ~" className="type-label link-underline md:hidden">
            Contact
          </TransitionLink>
        </nav>
      </div>
    </header>
  )
}
