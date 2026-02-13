// lib/db.ts
// Prisma database client and user management utilities

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import type { VerifiedUser } from './firebase-admin';

// Initialize PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Legacy export for compatibility
export const db = prisma;

// Database user type
export interface DbUser {
  id: string;
  uid: string; 
  email?: string | null;
  displayName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Upsert user: find existing or create new user from Firebase token
export async function upsertUser(verifiedUser: VerifiedUser): Promise<DbUser> {
  try {
    const user = await prisma.user.upsert({
      where: {
        uid: verifiedUser.uid,
      },
      update: {
        email: verifiedUser.email,
        displayName: verifiedUser.name,
      },
      create: {
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        displayName: verifiedUser.name,
      },
    });

    return user;
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

// Get user by Firebase UID
export async function getUserByFirebaseUid(uid: string): Promise<DbUser | null> {
  return await prisma.user.findUnique({
    where: { uid },
  });
}

// Get user by database ID
export async function getUserById(id: string): Promise<DbUser | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}