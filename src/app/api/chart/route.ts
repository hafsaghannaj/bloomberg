import { NextRequest, NextResponse } from 'next/server';
import { getChart, rangeToInterval } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') || '1M';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol param required' }, { status: 400 });
  }

  try {
    const interval = rangeToInterval(range);
    const data = await getChart(symbol.toUpperCase(), range, interval);

    const quotes = data.quotes.map((q: Record<string, unknown>) => ({
      time: Math.floor(new Date(q.date as string).getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

    return NextResponse.json(quotes, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('Chart API error:', err);
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 });
  }
}
