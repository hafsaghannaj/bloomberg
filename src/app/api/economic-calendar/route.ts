export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { getEconomicCalendar } from '@/lib/finnhub';

export async function GET() {
  try {
    const data = await getEconomicCalendar();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
