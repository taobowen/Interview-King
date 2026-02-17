// app/api/applications/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/applications/search?company=<companyName>
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    const url = new URL(req.url);
    const company = url.searchParams.get('company');
    
    if (!company || company.trim().length < 2) {
      return NextResponse.json({
        success: true,
        applications: []
      });
    }
    
    const companyTerm = company.trim();
    const companyLower = companyTerm.toLowerCase();
    
    // Search for applications with matching company (case-insensitive)
    const applications = await prisma.application.findMany({
      where: {
        userId: user.id,
        OR: [
          { companyLower: companyLower },
          { company: companyTerm },
        ],
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
      take: 5,
    });

    // Transform to match frontend expectations
    const transformedApps = applications.map((app: typeof applications[0]) => ({
      id: app.id,
      title: app.jobTitle?.title || app.titleText,
      company: app.company,
      status: app.status,
      createdAt: app.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      applications: transformedApps
    });
    
  } catch (error) {
    console.error('Failed to search applications:', error);
    return NextResponse.json(
      { error: 'Failed to search applications' },
      { status: 500 }
    );
  }
});