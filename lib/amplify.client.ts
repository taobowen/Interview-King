// lib/amplify.client.ts
'use client';

import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  getCurrentUser,
  signInWithRedirect,
  fetchAuthSession
} from 'aws-amplify/auth';

// Configure Amplify
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
            scopes: ['openid', 'email', 'profile', 'phone'],
            redirectSignIn: [process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_IN || 'http://localhost:3000/auth/callback'],
            redirectSignOut: [process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_OUT || 'http://localhost:3000/'],
            responseType: 'code' as const
          }
        }
      })
    }
  }
};

Amplify.configure(amplifyConfig);

// Google Sign In function
export async function signInGoogle() {
  try {
    await signInWithRedirect({
      provider: 'Google'
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// General Hosted UI login (will show Cognito login page with all configured providers)
export async function signInHostedUI() {
  try {
    await signInWithRedirect();
  } catch (error) {
    console.error('Hosted UI sign-in error:', error);
    throw error;
  }
}

// Get Hosted UI login URL for direct navigation
export function getHostedUIUrl() {
  const domain = process.env.NEXT_PUBLIC_AWS_OAUTH_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGN_IN || 'http://localhost:3000/auth/callback');
  
  if (!domain || !clientId) {
    throw new Error('Missing OAuth domain or client ID configuration');
  }
  
  const url = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+phone+profile&redirect_uri=${redirectUri}`;
  return url;
}

// Sign out function
export async function signOutAll() {
  try {
    await signOut();
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUserInfo() {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    const idToken = session.tokens?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token available');
    }

    // Extract claims from ID token (for user info)
    const claims = idToken.payload;
    
    return {
      uid: user.userId,
      email: claims.email as string,
      name: claims.name as string || claims.given_name as string || claims.family_name as string,
      picture: claims.picture as string
    };
  } catch (error) {
    throw new Error('No authenticated user');
  }
}

// Get ID token
export async function getIdToken() {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    if (!token) {
      throw new Error('No ID token available');
    }
    
    return token;
  } catch (error) {
    console.error('Failed to get ID token:', error);
    throw error;
  }
}