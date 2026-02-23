// lib/auth-middleware.ts
// Middleware for Next.js API routes (/api/*) to handle token verification and user resolution
// NOTE: This is for Next.js server routes only, NOT for API Gateway routes
// API Gateway should handle its own JWT verification via JWT authorizer

import { NextRequest, NextResponse } from 'next/server';
import { verifyCognitoToken, type VerifiedUser } from './amplify-admin';
import { upsertUser, type DbUser } from './db';

export interface AuthenticatedRequest extends NextRequest {
  user: DbUser;
  cognitoUser: VerifiedUser;
}

// Middleware to verify token and resolve user
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Step 1: Verify Cognito token
      const cognitoUser = await verifyCognitoToken(req);
      
      // Step 2: Upsert user in PostgreSQL (find existing or create new)
      const dbUser = await upsertUser(cognitoUser);
      
      // Step 3: Attach user info to request and call handler
      const authenticatedReq = Object.assign(req, {
        user: dbUser,
        cognitoUser: cognitoUser,
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
export async function authenticate(req: NextRequest): Promise<{ user: DbUser; cognitoUser: VerifiedUser }> {
  // Step 1: Verify Cognito token
  const cognitoUser = await verifyCognitoToken(req);
  
  // Step 2: Upsert user in PostgreSQL
  const dbUser = await upsertUser(cognitoUser);
  
  return { user: dbUser, cognitoUser };
}