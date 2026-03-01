export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { getEarningsHistory } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const data = await getEarningsHistory(symbol.toUpperCase());
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
