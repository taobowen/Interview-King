// lib/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { auth } from './firebase';
import {
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

export function useUser() {
  const [user, setUser] = useState<typeof auth.currentUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      try {
        // Make sure auth survives the Google redirect
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Private mode / no IndexedDB → keep session-only
        await setPersistence(auth, browserSessionPersistence);
      }

      // Fires on initial load, redirect completion, token refresh, sign-in/out
      unsub = onIdTokenChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    })();

    return () => unsub();
  }, []);

  return { user, uid: user?.uid ?? null, loading };
}
