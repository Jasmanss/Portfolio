import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Frame from './components/Frame'
import { TransitionProvider } from './components/Transition'
import Cursor from './components/Cursor'
import Konami from './components/Konami'
import Index from './pages/Index'
import About from './pages/About'
import PlaygroundPage from './pages/PlaygroundPage'
import ContactPage from './pages/ContactPage'
import CaseStudy from './pages/CaseStudy'
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
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/contact" element={<ContactPage />} />
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
