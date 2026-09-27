import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Frame from './components/Frame'
import { TransitionProvider } from './components/Transition'
import Cursor from './components/Cursor'
import Konami from './components/Konami'
import Gallery from './pages/Gallery'
import CaseStudy from './pages/CaseStudy'
import NotFound from './pages/NotFound'
import { scrollToTarget, useSmoothScroll } from './lib/motion'

const Sign = import.meta.env.DEV ? lazy(() => import('./pages/Sign')) : null

function Home() {
  const { hash } = useLocation()
  // Arriving at /#study from another page or a shared link walks straight to that room.
  useLayoutEffect(() => {
    if (hash) requestAnimationFrame(() => scrollToTarget(hash, true))
  }, [hash])
  return <Gallery />
}

export default function PortfolioPage() {
  useSmoothScroll()
  return (
    <BrowserRouter>
      <TransitionProvider>
        <Frame />
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
