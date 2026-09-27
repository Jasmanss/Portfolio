import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Frame from './components/Frame'
import { TransitionProvider } from './components/Transition'
import Cursor from './components/Cursor'
import Konami from './components/Konami'
import Home from './pages/Home'
import Entry from './pages/Entry'
import About from './pages/About'
import NotFound from './pages/NotFound'
import { useSmoothScroll } from './lib/motion'

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
          <Route path="/about" element={<About />} />
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
