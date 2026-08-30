'use client';
import Link from 'next/link';
import { signInHostedUI, signOutAll } from '../lib/amplify.client';
import { useUser } from '../lib/useUser';
export default function Navbar() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-semibold">Interview Tracker</Link>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">Dashboard</Link>
            <Link href="/search" className="hover:underline">Search</Link>
            <Link href="/gmail" className="hover:underline">Gmail</Link>
            <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">Interview Tracker</Link>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">Dashboard</Link>
            <Link href="/search" className="hover:underline">Search</Link>
            <Link href="/gmail" className="hover:underline">Gmail</Link>
          {user ? (
            <>
              <span className="text-slate-600 hidden sm:inline">{user.email}</span>
              <button onClick={signOutAll} className="px-3 py-1.5 rounded bg-slate-900 text-white">Sign out</button>
            </>
          ) : (
            <button onClick={signInHostedUI} className="px-3 py-1.5 rounded bg-blue-600 text-white">Sign in / Sign up</button>
          )}
        </nav>
      </div>
    </header>
  );
}