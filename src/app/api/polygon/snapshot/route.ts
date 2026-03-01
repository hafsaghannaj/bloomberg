import { NextRequest, NextResponse } from 'next/server';
import { polygonSnapshot, isEquityTicker } from '@/lib/polygon';
import { getQuote } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol param required' }, { status: 400 });
  }

  const sym = symbol.toUpperCase();

  if (isEquityTicker(sym)) {
    try {
      const data = await polygonSnapshot(sym);
      if (data) {
        return NextResponse.json(data, {
          headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
        });
      }
    } catch {
      // fall through to Yahoo
    }
  }

  // Fallback: Yahoo Finance
  try {
    const data = await getQuote(sym);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
    });
  } catch (err) {
    console.error('Snapshot fallback error:', err);
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
}
