/* Index.js*/
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import App from './App'; // Import the App component
import './i18n'; // Import i18n configuration
import './styles.css';
import './styles/common.css';  /* ✅ Import common.css directly */
import './styles/mobile.css';  /* ✅ Mobile responsive overrides (media-query gated) */
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

// ── Service Worker registration (PWA) ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

const isProd = process.env.NODE_ENV === 'production';

// If the URL doesn't already have a hash, redirect to one
if (!window.location.hash && window.location.pathname !== '/' && isProd) {
  const path = window.location.pathname;
  window.location.replace('/#' + path);
}

// Global component to listen for session expiry events
const AppWithSessionHandler = () => {
  useEffect(() => {
    const handleSessionExpired = (event) => {
      // Show success toast (green) with friendly message
      toast.success(event.detail.message, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: { direction: 'rtl', textAlign: 'right' }
      });
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  return (
    <>
      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {/* Real app — same on desktop and mobile, layout adapts via CSS */}
      <App />
    </>
  );
};

ReactDOM.render(isProd ? (
  <HashRouter>
    <AppWithSessionHandler />
  </HashRouter>
) : (
  <BrowserRouter>
    <AppWithSessionHandler />
  </BrowserRouter>
),
  document.getElementById('root')
);