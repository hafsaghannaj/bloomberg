import { NextRequest, NextResponse } from 'next/server';
import { getMarketNews, getCompanyNews } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const category = req.nextUrl.searchParams.get('category') || 'general';

  try {
    const data = symbol
      ? await getCompanyNews(symbol.toUpperCase())
      : await getMarketNews(category);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('News API error:', err);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
