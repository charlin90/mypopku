import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { inject } from '@vercel/analytics';
import { ClerkProvider } from '@clerk/clerk-react';

inject();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Import your publishable key safely
const env = (import.meta as any).env || {};
const PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key: Please add VITE_CLERK_PUBLISHABLE_KEY to your .env or Vercel settings");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);