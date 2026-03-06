export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { enforceRateLimit, secureJson } from '@/lib/server/security';

const yahooFinance = new YahooFinance();

const SCREENER_MAP = {
  gainers:    'day_gainers',
  losers:     'day_losers',
  active:     'most_actives',
  shorted:    'most_shorted_stocks',
  undervalued:'undervalued_large_caps',
  growth:     'growth_technology_stocks',
} as const;

type ScreenerKey = keyof typeof SCREENER_MAP;

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'movers', max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const type = (req.nextUrl.searchParams.get('type') ?? 'gainers') as ScreenerKey;
  const scrId = SCREENER_MAP[type] ?? 'day_gainers';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (yahooFinance as any).screener(scrId, { count: 25 });
    const quotes = (result?.quotes ?? []).map((q: Record<string, unknown>) => ({
      symbol: String(q.symbol ?? ''),
      shortName: String(q.shortName ?? q.longName ?? ''),
      regularMarketPrice: Number(q.regularMarketPrice ?? 0),
      regularMarketChange: Number(q.regularMarketChange ?? 0),
      regularMarketChangePercent: Number(q.regularMarketChangePercent ?? 0),
      regularMarketVolume: Number(q.regularMarketVolume ?? 0),
      marketCap: q.marketCap != null ? Number(q.marketCap) : null,
      trailingPE: q.trailingPE != null ? Number(q.trailingPE) : null,
      fiftyTwoWeekHigh: Number(q.fiftyTwoWeekHigh ?? 0),
      fiftyTwoWeekLow: Number(q.fiftyTwoWeekLow ?? 0),
      currency: String(q.currency ?? 'USD'),
    }));

    return secureJson(quotes, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[movers] screener error:', err);
    return secureJson([], { status: 200 });
  }
}
