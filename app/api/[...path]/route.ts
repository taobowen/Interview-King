import { NextRequest, NextResponse } from 'next/server';

// API Gateway base URL (server-only environment variable)
const API_BASE_URL = process.env.API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('API_BASE_URL environment variable is required');
}

/**
 * Catch-all API proxy that forwards requests to AWS Lambda via API Gateway
 * Acts as a thin BFF (Backend for Frontend) layer
 * 
 * Routes: /api/{path} → ${API_BASE_URL}/{path}
 * 
 * Architecture:
 * Frontend → Next.js /api/* → API Gateway → Lambda (real backend)
 */
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const apiPath = path.join('/');
    
    // Construct target URL
    const targetUrl = new URL(`/${apiPath}`, API_BASE_URL);
    
    // Preserve query parameters
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    // Prepare request headers (forwarding all headers including Authorization)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Forward all headers except host-specific ones
      if (!['host', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Prepare request body for methods that support it
    let body: BodyInit | null = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      body = await request.blob();
    }

    console.log(`[API Proxy] ${request.method} /api/${apiPath} → ${targetUrl.href}`);

    // Forward request to API Gateway
    const response = await fetch(targetUrl.href, {
      method: request.method,
      headers: headers,
      body: body,
    });

    // Create response with same status and headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Add CORS headers for browser requests
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    const responseBody = await response.blob();

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[API Proxy] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Gateway Error', 
        message: 'Failed to proxy request to backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;