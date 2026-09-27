import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Frame from './components/Frame'
import { TransitionProvider } from './components/Transition'
import Cursor from './components/Cursor'
import Konami from './components/Konami'
import HomePage from './pages/Home'
import Entry from './pages/Entry'
import NotFound from './pages/NotFound'
import { scrollToTarget, useSmoothScroll } from './lib/motion'

// Arriving at /#work from a project page or a shared link lands on that section.
function Home() {
  const { hash } = useLocation()
  useLayoutEffect(() => {
    if (hash) requestAnimationFrame(() => scrollToTarget(hash, true))
  }, [hash])
  return <HomePage />
}

const Sign = import.meta.env.DEV ? lazy(() => import('./pages/Sign')) : null

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
          <Route path="/work/:slug" element={<Entry />} />
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
