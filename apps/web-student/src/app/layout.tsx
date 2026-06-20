import './globals.css';
import React from 'react';

export const metadata = {
  title: 'QGP Student - Question Generator Platform',
  description: 'Student portal for taking quizzes, practicing, and reviewing question feedback.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
