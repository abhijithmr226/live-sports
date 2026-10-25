import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CloudCast Sports Studio (Render Web Frontend)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    healthy: true
  });
}
