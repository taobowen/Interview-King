// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager, // or omit for single-tab
  memoryLocalCache,
  connectFirestoreEmulator,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE!,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

// Auth
export const auth = getAuth(app);

// Firestore (new way)
function makeDb() {
  // On the server just use the default in-memory cache.
  if (typeof window === 'undefined') return getFirestore(app);

  // In the browser, prefer persistent cache (IndexedDB).
  try {
    return initializeFirestore(app, {
      // single-tab: localCache: persistentLocalCache(),
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(), // keep tabs in sync
      }),
    });
  } catch {
    // If already initialized or persistence unsupported, fall back to memory.
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}
export const db = makeDb();

// Optional: local emulators
// if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
//   if (typeof window !== 'undefined') {
//     connectFirestoreEmulator(db, '127.0.0.1', 8080);
//     connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
//   }
// }

// Sign-in helpers
export const googleProvider = new GoogleAuthProvider();
export const signInGoogle = () => signInWithPopup(auth, googleProvider);
export const signOutAll = () => signOut(auth);
