'use client';
import Link from 'next/link';
import { signInGoogle, signInHostedUI, getHostedUIUrl } from '@/lib/amplify.client';
import { useUser } from '@/lib/useUser';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  const handleDirectURL = () => {
    try {
      const url = getHostedUIUrl();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get Hosted UI URL:', error);
      alert('Authentication configuration error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Interview Tracker
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose your preferred sign-in method
          </p>
        </div>
        <div className="mt-8 space-y-4">
          {/* Hosted UI (all providers) */}
          <button
            onClick={signInHostedUI}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Cognito Hosted UI
          </button>

          {/* Google specific */}
          <button
            onClick={signInGoogle}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in with Google
          </button>

          {/* Direct URL approach */}
          <button
            onClick={handleDirectURL}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Direct Hosted UI URL
          </button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Development Info</span>
              </div>
            </div>
          </div>

          {/* Development info */}
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Show Hosted UI URL
              </summary>
              <div className="mt-2 p-2 bg-white rounded border text-xs font-mono break-all">
                {(() => {
                  try {
                    return getHostedUIUrl();
                  } catch {
                    return 'Configuration error - check environment variables';
                  }
                })()}
              </div>
            </details>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}