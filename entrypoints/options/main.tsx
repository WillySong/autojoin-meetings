import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initSystemTheme } from '@/lib/theme';
import '@/assets/tailwind.css';

initSystemTheme(); // follow Chrome's light/dark setting

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
