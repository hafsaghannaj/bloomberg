export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { getYieldCurve } from '@/lib/fred';

export async function GET() {
  try {
    const data = await getYieldCurve();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('Yield curve error:', err);
    return NextResponse.json({ error: 'Failed to fetch yield curve' }, { status: 500 });
  }
}
