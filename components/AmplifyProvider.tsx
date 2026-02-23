'use client';

import { Amplify } from 'aws-amplify';
import { useEffect } from 'react';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
      ...(process.env.NEXT_PUBLIC_AWS_OAUTH_DOMAIN && {
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_AWS_OAUTH_DOMAIN,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_IN || 'http://localhost:3000/auth/callback'],
            redirectSignOut: [process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_OUT || 'http://localhost:3000/'],
            responseType: 'code' as const
          }
        }
      })
    }
  }
};

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Amplify.configure(amplifyConfig);
  }, []);

  return <>{children}</>;
}