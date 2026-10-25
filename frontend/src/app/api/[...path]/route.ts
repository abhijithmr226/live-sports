import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

async function proxyRequest(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const subpath = path.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/${subpath}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');

    const options: RequestInit = {
      method: req.method,
      headers,
      cache: 'no-store'
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.arrayBuffer();
        if (body.byteLength > 0) {
          options.body = body;
        }
      } catch {
        // No body
      }
    }

    const res = await fetch(targetUrl, options);
    const data = await res.arrayBuffer();
    
    const responseHeaders = new Headers(res.headers);
    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders
    });
  } catch (err: any) {
    // Graceful error handling: NEVER crash with HTTP 500
    return NextResponse.json({
      error: 'Backend streaming service is currently initializing.',
      details: err.message,
      targetUrl,
      hint: 'Ensure BACKEND_URL environment variable is set on Render, or deploy using the unified root Dockerfile.'
    }, { status: 503 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
