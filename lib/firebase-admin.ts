// lib/firebase-admin.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (error) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  });
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();

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