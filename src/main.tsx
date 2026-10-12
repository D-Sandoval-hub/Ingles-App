import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './ui/router';
import './styles.css';

// Service worker: guarda la app para usarla sin conexión y se actualiza solo.
registerSW({ immediate: true });

// Pide almacenamiento persistente para que el navegador no borre tus datos por falta de espacio.
if ('storage' in navigator && 'persist' in navigator.storage) {
  void navigator.storage.persist().catch(() => undefined);
}

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root');
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
