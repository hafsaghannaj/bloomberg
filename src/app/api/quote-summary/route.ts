import { NextRequest, NextResponse } from 'next/server';
import { getQuoteSummary } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol param required' }, { status: 400 });
  }

  try {
    const data = await getQuoteSummary(symbol.toUpperCase());
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('QuoteSummary API error:', err);
    return NextResponse.json({ error: 'Failed to fetch quote summary' }, { status: 500 });
  }
}
