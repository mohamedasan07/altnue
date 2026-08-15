import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/reset.css'
import './styles/variables.css'
import './styles/globals.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ToastProvider from './components/toast/ToastProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* ToastProvider sits above AuthProvider so session-expiry handling can
          surface its message as a toast. */}
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
