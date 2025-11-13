// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_SITE_DOMAIN!, // e.g. "example.com" (no protocol)
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!, // e.g. "interviewtraker.appspot.com"
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/** Use redirect in prod to avoid COOP/popup issues, popup in dev for convenience */
const isServer = typeof window === 'undefined';
const isProd = process.env.NODE_ENV === 'production';

export async function signInGoogle() {
  if (isServer) return;

  if (isProd) {
    // No popup/opener → no COOP problem
    await signInWithRedirect(auth, googleProvider)
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

// Firestore (unchanged)
function makeDb() {
  if (typeof window === 'undefined') return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}
export const db = makeDb();
