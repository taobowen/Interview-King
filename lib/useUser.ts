'use client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

export function useUser() {
  const [user, loading] = useAuthState(auth);
  return { user, uid: user?.uid, loading };
}
