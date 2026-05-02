import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'

// Polyfill Node globals for WalletConnect / Ethers in browser
window.Buffer = window.Buffer || Buffer
window.process = window.process || process

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
