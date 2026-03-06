export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getChart, rangeToInterval } from '@/lib/yahoo';
import { polygonAggs, isEquityTicker } from '@/lib/polygon';
import {
  enforceRateLimit,
  parseChartRange,
  parseSymbol,
  secureJson,
} from '@/lib/server/security';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' };

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
  const limited = enforceRateLimit(req, { key: 'chart', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const sym = parseSymbol(req.nextUrl.searchParams.get('symbol'));
  if (!sym) return secureJson({ error: 'valid symbol param required' }, { status: 400 });
  const range = parseChartRange(req.nextUrl.searchParams.get('range'));

  // Try Polygon first for US equities
  if (isEquityTicker(sym)) {
    try {
      const { multiplier, timespan, from, to } = rangeToPolygonParams(range);
      const data = await polygonAggs(sym, multiplier, timespan, from, to);
      if (data.length > 0) {
        return secureJson(data, { headers: CACHE_HEADERS });
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
    return secureJson(quotes, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('Chart API error:', err);
    return secureJson({ error: 'Failed to fetch chart' }, { status: 500 });
  }
}
