import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateServiceWorker = registerSW({ immediate: true });
window.addEventListener('workoutlog:update-app', () => {
  void updateServiceWorker(true).catch(() => window.location.reload());
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
