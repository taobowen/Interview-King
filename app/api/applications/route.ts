// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, authenticate, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/applications - Get user's applications
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    
    const applications = await prisma.application.findMany({
      where: {
        userId: user.id,
      },
      include: {
        jobTitle: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data to match frontend expectations
    const transformedApps = applications.map((app: typeof applications[0]) => ({
      id: app.id,
      title: app.jobTitle?.title || app.titleText,
      company: app.company,
      location: app.location,
      jobUrl: app.jobUrl,
      status: app.status,
      priority: app.priority,
      positionLevel: app.positionLevel,
      notes: app.notes,
      createdAt: app.createdAt,
      statusUpdatedAt: app.statusUpdatedAt,
    }));
    
    return NextResponse.json({
      success: true,
      applications: transformedApps,
      total: transformedApps.length
    });
    
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
});

// POST /api/applications - Create new application
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const body = await req.json();
    
    // Validate required fields
    if (!body.company || !body.title) {
      return NextResponse.json(
        { error: 'Company and title are required' },
        { status: 400 }
      );
    }
    
    // Create new application
    const newApplication = await prisma.application.create({
      data: {
        userId: user.id,
        titleText: body.title,
        company: body.company,
        companyLower: body.company.toLowerCase(),
        location: body.location || null,
        jobUrl: body.jobUrl || null,
        status: body.status || 'Saved',
        priority: body.priority || 'Medium',
        positionLevel: body.positionLevel || 'Unknown',
        notes: body.notes || null,
      },
      include: {
        jobTitle: {
          select: {
            title: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      application: {
        id: newApplication.id,
        title: newApplication.jobTitle?.title || newApplication.titleText,
        company: newApplication.company,
        location: newApplication.location,
        job_url: newApplication.jobUrl,
        status: newApplication.status,
        priority: newApplication.priority,
        position_level: newApplication.positionLevel,
        notes: newApplication.notes,
        createdAt: newApplication.createdAt,
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
});

// PATCH /api/applications?id=<applicationId> - Update application
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await authenticate(req);
    
    const url = new URL(req.url);
    const applicationId = url.searchParams.get('id');
    
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    
    // Update application (only if user owns it)
    const updatedApplication = await prisma.application.updateMany({
      where: {
        id: applicationId,
        userId: user.id,
      },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
        ...(body.notes && { notes: body.notes }),
        ...(body.refusedAt && { refusedAt: new Date(body.refusedAt) }),
      },
    });
    
    if (updatedApplication.count === 0) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the updated application to return
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId: user.id,
      },
      include: {
        jobTitle: {
          select: {
            title: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      application: {
        id: application?.id,
        title: application?.jobTitle?.title || application?.titleText,
        company: application?.company,
        location: application?.location,
        status: application?.status,
        priority: application?.priority,
        notes: application?.notes,
      }
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications?id=<applicationId>
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await authenticate(req);
    
    const url = new URL(req.url);
    const applicationId = url.searchParams.get('id');
    
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    // Delete application (only if user owns it)
    const deletedApplication = await prisma.application.deleteMany({
      where: {
        id: applicationId,
        userId: user.id,
      },
    });
    
    if (deletedApplication.count === 0) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}