import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './contexts/SessionContext'
import { SessionWatcher } from './components/SessionWatcher';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
      <SessionWatcher>
        <App />
      </SessionWatcher>
    </SessionProvider>
  </StrictMode>,
)
