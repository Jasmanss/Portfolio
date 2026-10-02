import React from 'react'
import ReactDOM from 'react-dom/client'
import PortfolioPage from './PortfolioPage.tsx'
import './index.css'

if (import.meta.env.DEV) {
  const hex = new URLSearchParams(location.search).get('accent')
  if (hex && /^[0-9a-f]{6}$/i.test(hex)) document.documentElement.style.setProperty('--accent', [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' '))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PortfolioPage />
  </React.StrictMode>,
)
