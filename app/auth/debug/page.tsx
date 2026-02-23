'use client';
import { getHostedUIUrl } from '@/lib/amplify.client';
import { useState } from 'react';

export default function AuthDebug() {
  const [showConfig, setShowConfig] = useState(false);

  const envVars = {
    'User Pool ID': process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
    'User Pool Client ID': process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID,
    'Region': process.env.NEXT_PUBLIC_AWS_REGION,
    'OAuth Domain': process.env.NEXT_PUBLIC_AWS_OAUTH_DOMAIN,
    'Redirect Sign In': process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_IN,
    'Redirect Sign Out': process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_OUT,
  };

  let hostedUIUrl = '';
  try {
    hostedUIUrl = getHostedUIUrl();
  } catch (error) {
    hostedUIUrl = `Error: ${error}`;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cognito Hosted UI Configuration</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Hosted UI URL</h2>
        <div className="bg-white p-3 rounded border font-mono text-sm break-all">
          {hostedUIUrl}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          This URL will redirect users to the Cognito Hosted UI with the configured scopes: email, openid, phone, profile
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Environment Configuration</h2>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            {showConfig ? 'Hide' : 'Show'} Config
          </button>
        </div>
        
        {showConfig && (
          <div className="mt-4 space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex items-start gap-4">
                <div className="w-48 font-medium text-sm">{key}:</div>
                <div className="flex-1 font-mono text-sm bg-white p-2 rounded border">
                  {value || '(not set)'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Test Authentication</h2>
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Use these buttons to test different authentication flows:
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = hostedUIUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Direct URL Navigation
            </button>
            <a
              href="/login"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-block"
            >
              Go to Login Page
            </a>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">URL Parameters Explained</h2>
        <div className="space-y-1 text-sm">
          <div><strong>client_id:</strong> {process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID || '(not configured)'}</div>
          <div><strong>response_type:</strong> code (OAuth2 authorization code flow)</div>
          <div><strong>scope:</strong> email+openid+phone+profile (requested user attributes)</div>
          <div><strong>redirect_uri:</strong> {process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_IN || 'http://localhost:3000/auth/callback'}</div>
        </div>
      </div>
    </div>
  );
}