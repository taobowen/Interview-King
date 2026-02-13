// app/api/applications/all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// DELETE /api/applications/all - Delete all applications for a user (for import replace mode)
export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    
    // Delete all applications for this user
    const deletedApplications = await prisma.application.deleteMany({
      where: {
        userId: user.id,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedApplications.count} applications`,
      deletedCount: deletedApplications.count
    });
    
  } catch (error) {
    console.error('Failed to delete all applications:', error);
    return NextResponse.json(
      { error: 'Failed to delete applications' },
      { status: 500 }
    );
  }
});