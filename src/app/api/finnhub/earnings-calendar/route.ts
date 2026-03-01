import { NextResponse } from 'next/server';
import { getEarningsCalendar } from '@/lib/finnhub';

export async function GET() {
  const now = new Date();
  const from = now.toISOString().split('T')[0];
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await getEarningsCalendar(from, to);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
