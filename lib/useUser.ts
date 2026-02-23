// lib/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface UserInfo {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  picture?: string | null;
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      
      // Get ID token claims instead of calling fetchUserAttributes()
      const session = await import('aws-amplify/auth').then(auth => auth.fetchAuthSession());
      const idToken = session.tokens?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token available');
      }

      // Extract claims from ID token
      const claims = idToken.payload;
      
      const userInfo: UserInfo = {
        uid: currentUser.userId,
        email: claims.email as string,
        displayName: claims.name as string || claims.given_name as string,
        name: claims.name as string || claims.given_name as string,
        picture: claims.picture as string
      };
      
      setUser(userInfo);
    } catch (error) {
      console.log('No authenticated user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check user on initial load
    checkUser();

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkUser();
          break;
        case 'signedOut':
          setUser(null);
          break;
        case 'tokenRefresh':
          checkUser();
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, uid: user?.uid ?? null, loading };
}
