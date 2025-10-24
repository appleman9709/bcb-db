import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getServiceWorkerScope, getServiceWorkerUrl } from './lib/pwaUtils'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const swUrl = getServiceWorkerUrl()
    const swScope = getServiceWorkerScope()

    try {
      await navigator.serviceWorker.register(swUrl, { scope: swScope })
    } catch (error) {
      console.error('Service worker registration failed:', error)
      try {
        const fallbackUrl = `${window.location.pathname.replace(/\/[^/]*$/, '/') || '/'}sw.js`
        const fallbackScope = fallbackUrl.replace(/sw\.js$/, '')
        const normalizedFallbackScope = fallbackScope.endsWith('/') ? fallbackScope : `${fallbackScope}/`
        await navigator.serviceWorker.register(fallbackUrl, { scope: normalizedFallbackScope })
      } catch (fallbackError) {
        console.error('Fallback service worker registration failed:', fallbackError)
      }
    }
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
