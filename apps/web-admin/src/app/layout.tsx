import './globals.css';
import React from 'react';
import { AuthProvider } from './AuthContext';

export const metadata = {
  title: 'QGP - Question Papers Platform',
  description: 'AI-driven question generator platform and practice arena.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
