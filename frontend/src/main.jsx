import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { syncService } from './services/syncService'

// Auto sync is now handled robustly inside App.jsx via Visibility API and interval

// Service worker will be registered by vite-plugin-pwa automatically

const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.hash.includes('print')) {
  root.render(<App />);
} else {
  console.log('🚀 [STARTUP] 0. Application Starting up...');
  root.render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  )
}
