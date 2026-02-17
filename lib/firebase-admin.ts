// lib/firebase-admin.ts
import admin from 'firebase-admin';

// Check if we're in build/development mode without service account
const isLocalBuild = process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Initialize Firebase Admin SDK only if we have credentials
if (!admin.apps.length && !isLocalBuild) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
      });
    } catch (error) {
      console.warn('Failed to initialize Firebase Admin SDK:', error);
    }
  }
}

// Conditional exports - only available when Firebase Admin is properly initialized
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminFirestore = admin.apps.length > 0 ? admin.firestore() : null;

// User info returned from token verification
export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

// Verify Firebase token and return user info
export async function verifyFirebaseToken(req: Request | any): Promise<VerifiedUser> {
  try {
    // Check if admin is available
    if (!adminAuth) {
      throw new Error('Firebase Admin SDK not initialized - check FIREBASE_SERVICE_ACCOUNT_KEY');
    }

    // Extract token from Authorization header
    const authHeader = req.headers.get?.('authorization') || req.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      throw new Error('Missing ID token');
    }

    // Verify the token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Return user info
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

export default admin;