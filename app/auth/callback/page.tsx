// app/auth/callback/page.tsx  (App Router)
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Listen for auth hub events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          console.log('User successfully signed in');
          router.replace('/');
          break;
        case 'signInWithRedirect_failure':
          console.error('Sign in failed:', payload);
          router.replace('/login?err=auth');
          break;
        default:
          break;
      }
    });

    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        router.replace('/');
      } catch (error) {
        console.log('No authenticated user found');
        // Let Hub listener handle the auth flow
      }
    };

    checkAuth();

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="p-4 text-center">
      <p className="text-lg">Signing you in…</p>
      <div className="mt-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}
