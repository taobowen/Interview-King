// lib/amplify-admin.ts
// Server-side AWS Cognito JWT verification for Next.js API routes (/api/*)
// NOTE: This is only needed for Next.js server routes, not API Gateway routes
// API Gateway should use its own JWT authorizer for better performance
// Updated to verify access tokens for proper API authorization

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// User info returned from token verification
export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

// JWKS client for getting public keys
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

// Get the signing key
function getKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid!, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error('No signing key found'));
        return;
      }
      resolve(signingKey);
    });
  });
}

// Verify AWS Cognito JWT access token and return user info
export async function verifyCognitoToken(req: Request | any): Promise<VerifiedUser> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get?.('authorization') || req.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const accessToken = authHeader.split('Bearer ')[1];
    
    if (!accessToken) {
      throw new Error('Missing access token');
    }

    // Verify the access token
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(accessToken, async (header, callback) => {
        try {
          const key = await getKey(header);
          callback(null, key);
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Unknown error'));
        }
      }, {
        issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_POOL_ID}`,
        audience: process.env.AWS_USER_POOL_CLIENT_ID,
      }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as jwt.JwtPayload);
        }
      });
    });

    // Verify this is an access token (not ID token)
    if (decoded.token_use !== 'access') {
      throw new Error('Token is not an access token');
    }

    // For access tokens, we only get basic info like sub (user ID)
    // Additional user info would need to be fetched from the database or userInfo endpoint
    return {
      uid: decoded.sub!,
      email: decoded.email, // May not be present in access tokens
      name: decoded.name || decoded.given_name || decoded.family_name, // May not be present
      picture: decoded.picture, // May not be present
    };
  } catch (error) {
    console.error('Cognito access token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}