// app/api/status-events/by-app/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/status-events/by-app?appId=<applicationId>
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const url = new URL(req.url);
    const appId = url.searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns the application and get status events
    const events = await prisma.statusEvent.findMany({
      where: {
        applicationId: appId,
        userId: user.id,
        application: {
          userId: user.id, // Double-check user owns the application
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform to match frontend expectations
    const transformedEvents = events.map((event: typeof events[0]) => ({
      id: event.id,
      appId: event.applicationId,
      type: event.eventType,
      from: event.fromStatus,
      to: event.toStatus,
      at: event.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      events: transformedEvents
    });
    
  } catch (error) {
    console.error('Failed to fetch status events for app:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status events' },
      { status: 500 }
    );
  }
});