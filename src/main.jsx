import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './contexts/SessionContext'
import { SessionWatcher } from './components/SessionWatcher'
import { UiSettingsProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UiSettingsProvider>
      <SessionProvider>
        <SessionWatcher>
          <App />
        </SessionWatcher>
      </SessionProvider>
    </UiSettingsProvider>
  </StrictMode>,
)
