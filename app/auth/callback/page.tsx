// app/auth/callback/page.tsx  (App Router)
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, getGoogleRedirectResult } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    getGoogleRedirectResult().finally(() => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        router.replace(u ? '/dashboard' : '/login?err=auth');
      });
    });
  }, [router]);

  return <p className="p-4">Signing you in…</p>;
}
