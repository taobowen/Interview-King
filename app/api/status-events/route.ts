// app/api/status-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/status-events - Get user's status events
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    
    // Get status events with application details
    const events = await prisma.statusEvent.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform to match frontend expectations
    const transformedEvents = events.map(event => ({
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
    console.error('Failed to fetch status events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status events' },
      { status: 500 }
    );
  }
});

// POST /api/status-events - Create new status event
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const { appId, type, from, to } = await req.json();
    
    if (!appId || !to) {
      return NextResponse.json(
        { error: 'appId and to status are required' },
        { status: 400 }
      );
    }

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: {
        id: appId,
        userId: user.id,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }
    
    // Create new status event
    const statusEvent = await prisma.statusEvent.create({
      data: {
        applicationId: appId,
        userId: user.id,
        eventType: type || 'status-change',
        fromStatus: from || null,
        toStatus: to,
      },
    });
    
    return NextResponse.json({
      success: true,
      event: {
        id: statusEvent.id,
        appId: statusEvent.applicationId,
        type: statusEvent.eventType,
        from: statusEvent.fromStatus,
        to: statusEvent.toStatus,
        at: statusEvent.createdAt,
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create status event:', error);
    return NextResponse.json(
      { error: 'Failed to create status event' },
      { status: 500 }
    );
  }
});