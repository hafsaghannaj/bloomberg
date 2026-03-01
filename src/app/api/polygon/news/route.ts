export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { polygonNews } from '@/lib/polygon';
import { getMarketNews, getCompanyNews } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const sym = symbol?.toUpperCase();

  // Try Polygon news first
  try {
    const data = await polygonNews(sym);
    if (data.length > 0) {
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }
  } catch {
    // fall through to Finnhub
  }

  // Fallback: Finnhub
  try {
    const data = sym ? await getCompanyNews(sym) : await getMarketNews('general');
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('News fallback error:', err);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
