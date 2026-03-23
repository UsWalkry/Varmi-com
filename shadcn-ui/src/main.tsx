import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/mobile.css';
import { errorLogger } from './lib/errorLogger';
// Debug tools disabled for production
// import './lib/emailConfigDebug';
// import './debug-token-migration';

// Initialize custom error logging system
errorLogger.initializeErrorListeners();

// Sentry init (frontend) - optional, fallback to our custom logger
import * as Sentry from '@sentry/react';
const SENTRY_DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Basic performance tracing for navigation and load
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
  // if (import.meta.env.DEV) {
  //   // Dev mesajı: init başarılıysa bir bilgi mesajı gönderelim
  //   Sentry.captureMessage('Sentry initialized (frontend dev)');
  // }
}
// else if (import.meta.env.DEV) {
//   console.log('Custom error logging system active (Sentry DSN not provided)');
// }

// Dev: test hata tetikleyici
// if (import.meta.env.DEV) {
//   (window as any).throwTestError = () => {
//     throw new Error('Frontend test error: manual trigger');
//   };
// }

// Import debug script for auth testing - DISABLED
// if (import.meta.env.DEV) {
//   import('./debug-auth.js');
//   import('./lib/debugUtils');
//   import('./lib/clearAllData');
//   import('./lib/supabaseDebug');
//   import('./lib/debugCurrentState');
//   import('./lib/createTestListing');
//   import('./lib/resetSystemAndTest');
// }

createRoot(document.getElementById('root')!).render(<App />);

// Register service worker (PWA) only in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}
