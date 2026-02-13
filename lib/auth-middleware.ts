// lib/auth-middleware.ts
// Middleware for API routes to handle token verification and user resolution

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, type VerifiedUser } from './firebase-admin';
import { upsertUser, type DbUser } from './db';

export interface AuthenticatedRequest extends NextRequest {
  user: DbUser;
  firebaseUser: VerifiedUser;
}

// Middleware to verify token and resolve user
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Step 1: Verify Firebase token
      const firebaseUser = await verifyFirebaseToken(req);
      
      // Step 2: Upsert user in PostgreSQL (find existing or create new)
      const dbUser = await upsertUser(firebaseUser);
      
      // Step 3: Attach user info to request and call handler
      const authenticatedReq = Object.assign(req, {
        user: dbUser,
        firebaseUser: firebaseUser,
      }) as AuthenticatedRequest;
      
      return await handler(authenticatedReq);
      
    } catch (error) {
      console.error('Authentication failed:', error);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Authentication failed'
        },
        { status: 401 }
      );
    }
  };
}

// Alternative: Manual authentication for more control
export async function authenticate(req: NextRequest): Promise<{ user: DbUser; firebaseUser: VerifiedUser }> {
  // Step 1: Verify Firebase token
  const firebaseUser = await verifyFirebaseToken(req);
  
  // Step 2: Upsert user in PostgreSQL
  const dbUser = await upsertUser(firebaseUser);
  
  return { user: dbUser, firebaseUser };
}