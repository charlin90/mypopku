
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

const root = ReactDOM.createRoot(rootElement);

async function initApp() {
  try {
    // Fetch the publishable key from our backend API
    const response = await fetch('/api/clerk-config');
    
    if (!response.ok) {
        console.error("Failed to load configuration");
        return;
    }

    const { publishableKey } = await response.json();

    if (!publishableKey) {
        console.error("Missing Clerk Publishable Key");
        return;
    }

    // Render the app only after we have the key
    root.render(
      <React.StrictMode>
        <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </React.StrictMode>
    );

  } catch (error) {
    console.error("Error initializing application:", error);
  }
}

initApp();
