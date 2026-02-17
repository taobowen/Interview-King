// app/api/job-titles/route.ts
// Example: User customizable job titles CRUD API
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/job-titles - Get user's job titles
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    
    // Get user's active job titles
    let jobTitles = await prisma.userJobTitle.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { title: 'asc' },
      ],
    });
    
    // If user has no job titles, create some defaults
    if (jobTitles.length === 0) {
      const defaultTitles = [
        'Software Engineer',
        'Senior Software Engineer', 
        'Frontend Developer',
        'Backend Developer',
        'Full Stack Developer',
        'DevOps Engineer',
        'Data Scientist',
        'Product Manager',
        'Engineering Manager',
        'Other'
      ];
      
      await prisma.userJobTitle.createMany({
        data: defaultTitles.map((title: string, index: number) => ({
          userId: user.id,
          title,
          sortOrder: index,
        })),
      });
      
      // Fetch the newly created job titles
      jobTitles = await prisma.userJobTitle.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
      });
    }
    
    return NextResponse.json({
      success: true,
      jobTitles: jobTitles
    });
    
  } catch (error) {
    console.error('Failed to fetch job titles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job titles' },
      { status: 500 }
    );
  }
});

// POST /api/job-titles - Add new job title
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const { title, sortOrder } = await req.json();
    
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === null || finalSortOrder === undefined) {
      const maxSortOrder = await prisma.userJobTitle.findFirst({
        where: { userId: user.id },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      finalSortOrder = (maxSortOrder?.sortOrder || 0) + 1;
    }
    
    // Add job title
    const newJobTitle = await prisma.userJobTitle.create({
      data: {
        userId: user.id,
        title: title.trim(),
        sortOrder: finalSortOrder,
      },
    });
    
    return NextResponse.json({
      success: true,
      jobTitle: newJobTitle
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create job title:', error);
    
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Job title already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create job title' },
      { status: 500 }
    );
  }
});

// PATCH /api/job-titles?id=<jobTitleId> - Update job title
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const { title, sortOrder } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job title ID is required' },
        { status: 400 }
      );
    }
    
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Update job title
    const updatedJobTitle = await prisma.userJobTitle.updateMany({
      where: {
        id,
        userId: user.id, // Ensure user can only update their own job titles
      },
      data: {
        title: title.trim(),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    
    if (updatedJobTitle.count === 0) {
      return NextResponse.json(
        { error: 'Job title not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Job title updated successfully'
    });
    
  } catch (error) {
    console.error('Failed to update job title:', error);
    
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Job title already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update job title' },
      { status: 500 }
    );
  }
});

// DELETE /api/job-titles?id=<jobTitleId> - Delete job title
export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job title ID is required' },
        { status: 400 }
      );
    }
    
    // Check if job title exists and belongs to user
    const jobTitle = await prisma.userJobTitle.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    
    if (!jobTitle) {
      return NextResponse.json(
        { error: 'Job title not found' },
        { status: 404 }
      );
    }
    
    // Soft delete by setting isActive to false
    await prisma.userJobTitle.update({
      where: { id },
      data: { isActive: false },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Job title deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete job title:', error);
    return NextResponse.json(
      { error: 'Failed to delete job title' },
      { status: 500 }
    );
  }
});

// PUT /api/job-titles/reorder - Reorder job titles
export async function PUT(req: NextRequest) {
  try {
    const { user } = await req.json();
    const { titleIds } = await req.json();
    
    if (!Array.isArray(titleIds)) {
      return NextResponse.json(
        { error: 'titleIds must be an array' },
        { status: 400 }
      );
    }
    
    // Update sort order for each title
    const updates = titleIds.map((titleId: string, index: number) => 
      prisma.userJobTitle.updateMany({
        where: {
          id: titleId,
          userId: user.id,
        },
        data: {
          sortOrder: index + 1,
        },
      })
    );

    await prisma.$transaction(updates);
    
    return NextResponse.json({
      success: true,
      message: 'Job titles reordered successfully'
    });
    
  } catch (error) {
    console.error('Failed to reorder job titles:', error);
    return NextResponse.json(
      { error: 'Failed to reorder job titles' },
      { status: 500 }
    );
  }
}