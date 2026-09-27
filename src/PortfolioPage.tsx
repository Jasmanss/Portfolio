import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import { TransitionProvider } from './components/Transition'
import Hero from './sections/Hero'
import Statement from './sections/Statement'
import Marquee from './sections/Marquee'
import Work from './sections/Work'
import About from './sections/About'
import Experience from './sections/Experience'
import Contact from './sections/Contact'
import CaseStudy from './pages/CaseStudy'
import NotFound from './pages/NotFound'
import { scrollToTarget, useSmoothScroll } from './lib/motion'

const Sign = import.meta.env.DEV ? lazy(() => import('./pages/Sign')) : null

function Home() {
  const { hash } = useLocation()
  // Arriving at /#work from another page or a shared link lands on that section.
  useLayoutEffect(() => {
    if (hash) requestAnimationFrame(() => scrollToTarget(hash, true))
  }, [hash])

  return (
    <main>
      <Hero />
      <Statement />
      <Work />
      <Marquee />
      <About />
      <Experience />
      <Contact />
    </main>
  )
}

export default function PortfolioPage() {
  useSmoothScroll()
  return (
    <BrowserRouter>
      <TransitionProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work/:slug" element={<CaseStudy />} />
          {Sign && (
            <Route
              path="/sign"
              element={
                <Suspense fallback={null}>
                  <Sign />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TransitionProvider>
    </BrowserRouter>
  )
}
