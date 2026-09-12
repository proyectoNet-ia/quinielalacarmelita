import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Recuperación automática de módulos dinámicos ante nuevos despliegues (Vite chunk mismatch)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Nueva versión detectada en producción. Recargando assets actualizados...', event);
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
