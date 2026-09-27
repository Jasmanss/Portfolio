import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import { TransitionProvider } from './components/Transition'
import Journey from './sections/Journey'
import Contact from './sections/Contact'
import Cursor from './components/Cursor'
import Konami from './components/Konami'
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
      <Journey />
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
        <Cursor />
        <Konami />
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
