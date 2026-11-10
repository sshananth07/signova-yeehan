import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './AdminApp.tsx'
import '../index.css'

// Separate entry from the patient board (admin.html), so board bundles never contain admin code.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
