// app/auth/callback/page.tsx  (App Router)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in…');

  // Sync user to database after successful authentication
  const syncUser = async () => {
    try {
      setStatus('Setting up your account…');
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No access token found');
      }

      // Extract email from ID token claims (access tokens don't include email by default)
      let userEmail: string | undefined;
      if (idToken) {
        try {
          const parts = idToken.split('.');
          const decoded = JSON.parse(atob(parts[1]));
          userEmail = decoded.email;
        } catch (err) {
          console.log('Could not decode email from ID token', err);
        }
      }

      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        console.error('User sync failed:', await response.text());
        // Continue anyway - user might already be synced
      }

      setStatus('Redirecting…');
      router.replace('/');
    } catch (error) {
      console.error('Failed to sync user:', error);
      // Continue anyway - don't block login
      router.replace('/');
    }
  };

  useEffect(() => {
    // Listen for auth hub events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          console.log('User successfully signed in');
          syncUser();
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
        await syncUser();
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
      <p className="text-lg">{status}</p>
      <div className="mt-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}
