'use client';
import Link from 'next/link';
import { auth, signInGoogle, signOutAll } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';


export default function Navbar() {
// If you don't want the hooks pkg, replace with onAuthStateChanged listener
const [user] = (useAuthState as any)(auth);
return (
    <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="font-semibold">Interview Tracker</Link>
            <nav className="ml-auto flex items-center gap-4 text-sm">
                <Link href="/applications" className="hover:underline">Applications</Link>
                <Link href="/add" className="hover:underline">Add</Link>
                <Link href="/import" className="hover:underline">Import CSV</Link>
            {user ? (
                <>
                    <span className="text-slate-600 hidden sm:inline">{user.email}</span>
                    <button onClick={signOutAll} className="px-3 py-1.5 rounded bg-slate-900 text-white">Sign out</button>
                </>
            ) : (
                <button onClick={signInGoogle} className="px-3 py-1.5 rounded bg-slate-900 text-white">Sign in</button>
            )}
            </nav>
        </div>
    </header>
);
}