// Global error shield to prevent Firebase Auth iframe popup assertion issues from crashing the app
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '');
    const code = (reason && typeof reason === 'object') ? (reason as any).code : '';
    if (
      msg.includes('auth/cancelled-popup-request') ||
      msg.includes('auth/popup-blocked') ||
      msg.includes('auth/popup-closed-by-user') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-closed-by-user'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || event.error?.message || '');
    if (
      msg.includes('INTERNAL ASSERTION FAILED: Pending promise was never set') ||
      msg.includes('cancelled-popup-request') ||
      msg.includes('popup-blocked')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

