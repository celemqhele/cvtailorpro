
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { App } from './App';

// Root entry point
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Environment detection:
// Check if running in an iframe (embedded/preview) or on specific preview domains.
// In these cases, we use HashRouter (#/route) because the preview server likely 
// doesn't support the server-side history API rewrites required for BrowserRouter.
const isPreviewOrEmbedded = 
  window.self !== window.top || 
  window.location.hostname.includes('googleusercontent.com') ||
  window.location.hostname.includes('webcontainer') ||
  window.location.hostname.includes('stackblitz');

// Select the appropriate router
const Router = isPreviewOrEmbedded ? HashRouter : BrowserRouter;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
