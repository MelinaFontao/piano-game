import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PianoGame from './PianoGame.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/piano-game/sw.js')
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PianoGame />
  </StrictMode>
)
