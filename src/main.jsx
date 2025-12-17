import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './contexts/SessionContext'
import { SessionWatcher } from './components/SessionWatcher'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SessionProvider>
        <SessionWatcher>
          <App />
        </SessionWatcher>
      </SessionProvider>
    </ThemeProvider>
  </StrictMode>,
)
