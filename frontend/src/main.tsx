import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
// @ts-ignore
import process from 'process'
import EventEmitter from 'events'

// Polyfill Node globals for WalletConnect / Ethers in browser
window.Buffer = window.Buffer || Buffer
window.process = window.process || process
// @ts-ignore
window.EventEmitter = window.EventEmitter || EventEmitter

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
