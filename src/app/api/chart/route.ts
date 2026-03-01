import { NextRequest, NextResponse } from 'next/server';
import { getChart, rangeToInterval } from '@/lib/yahoo';
import { polygonAggs, isEquityTicker } from '@/lib/polygon';

function rangeToPolygonParams(range: string): {
  multiplier: number;
  timespan: string;
  from: string;
  to: string;
} {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let fromDate: Date;
  let multiplier: number;
  let timespan: string;

  switch (range) {
    case '1D':
      fromDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      multiplier = 5; timespan = 'minute'; break;
    case '1W':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      multiplier = 15; timespan = 'minute'; break;
    case '3M':
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      multiplier = 1; timespan = 'day'; break;
    case '1Y':
      fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      multiplier = 1; timespan = 'week'; break;
    case '5Y':
      fromDate = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
      multiplier = 1; timespan = 'month'; break;
    default: // '1M'
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      multiplier = 1; timespan = 'day';
  }

  return { multiplier, timespan, from: fromDate.toISOString().split('T')[0], to };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') || '1M';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol param required' }, { status: 400 });
  }

  const sym = symbol.toUpperCase();

  // Try Polygon first for US equities
  if (isEquityTicker(sym)) {
    try {
      const { multiplier, timespan, from, to } = rangeToPolygonParams(range);
      const data = await polygonAggs(sym, multiplier, timespan, from, to);
      if (data.length > 0) {
        return NextResponse.json(data, {
          headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
        });
      }
    } catch {
      // fall through to Yahoo
    }
  }

  // Fallback: Yahoo Finance
  try {
    const interval = rangeToInterval(range);
    const data = await getChart(sym, range, interval);
    const quotes = data.quotes.map((q: Record<string, unknown>) => ({
      time: Math.floor(new Date(q.date as string).getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));
    return NextResponse.json(quotes, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('Chart API error:', err);
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 });
  }
}
