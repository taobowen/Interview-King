'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GmailConnectCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Checking Gmail callback configuration…');
  const scannerCallbackUrl = process.env.NEXT_PUBLIC_GMAIL_OAUTH_CALLBACK_URL || '';

  useEffect(() => {
    const run = async () => {
      const error = searchParams.get('error');
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (error) {
        router.replace(`/gmail?gmailConnectError=${encodeURIComponent(`Google OAuth error: ${error}`)}`);
        return;
      }

      if (!code || !state) {
        router.replace(`/gmail?gmailConnectError=${encodeURIComponent('Missing OAuth code or state.')}`);
        return;
      }

      if (scannerCallbackUrl) {
        try {
          const target = new URL(scannerCallbackUrl);
          searchParams.forEach((value, key) => {
            target.searchParams.set(key, value);
          });

          setStatus('Forwarding OAuth callback to scanner endpoint…');
          window.location.replace(target.toString());
          return;
        } catch {
          // fall through to explicit config error below
        }
      }

      try {
        const bridge = new URL('/api/gmail/connect/callback', window.location.origin);
        searchParams.forEach((value, key) => {
          bridge.searchParams.set(key, value);
        });

        setStatus('Forwarding OAuth callback via local bridge…');
        window.location.replace(bridge.toString());
        return;
      } catch {
        // fall through to explicit config error below
      }

      setStatus('OAuth callback target is misconfigured. Redirecting to Gmail settings…');
      router.replace(
        `/gmail?gmailConnectError=${encodeURIComponent(
          'OAuth callback landed on frontend page and bridge forwarding failed. Set NEXT_PUBLIC_GMAIL_OAUTH_CALLBACK_URL and GMAIL_OAUTH_REDIRECT_URI to your API Gateway GET /gmail/connect/callback endpoint.'
        )}`
      );
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="p-4 text-center">
      <p className="text-lg">{status}</p>
      <div className="mt-4">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}

export default function GmailConnectCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <GmailConnectCallbackInner />
    </Suspense>
  );
}
