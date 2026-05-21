'use client';

import './globals.css';
import { AuthProvider } from './utils/AuthContext';
import { useState, useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkMode, setDarkMode] = useState(false);
  const [faviconHref, setFaviconHref] = useState('/favicon.png');

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pms')) {
      setFaviconHref('/pms/favicon.png');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={faviconHref} type="image/png" />
        <script src="https://apis.google.com/js/api.js" async defer></script>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-transparent dark:bg-darker">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
