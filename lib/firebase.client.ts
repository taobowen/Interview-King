'use client';

// lib/firebase.client.ts
// Client-only Firebase Web SDK module
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_SITE_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/** Use redirect in prod to avoid COOP/popup issues, popup in dev for convenience */
const isProd = process.env.NODE_ENV === 'production';

export async function signInGoogle() {
  if (isProd) {
    // No popup/opener → no COOP problem
    await signInWithRedirect(auth, googleProvider);
    // Control resumes on the redirect handler page
    return;
  } else {
    // Local dev: popup is fine
    return signInWithPopup(auth, googleProvider);
  }
}

/** Call on your redirect handler page to finish sign-in */
export function getGoogleRedirectResult() {
  return getRedirectResult(auth);
}

export const signOutAll = () => signOut(auth);