import '../styles/globals.css';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';


export const metadata: Metadata = {
title: 'Interview Tracker',
description: 'Track job applications, visualize progress, stay organized.'
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
  <html lang="en">
    <body className="bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </body>
  </html>
);
}