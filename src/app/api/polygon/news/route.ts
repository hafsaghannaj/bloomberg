export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { polygonNews } from '@/lib/polygon';
import { getMarketNews, getCompanyNews } from '@/lib/finnhub';
import { enforceRateLimit, parseSymbol, secureJson } from '@/lib/server/security';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'polygon-news', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const rawSymbol = req.nextUrl.searchParams.get('symbol');
  const sym = parseSymbol(rawSymbol);
  if (rawSymbol && !sym) return secureJson({ error: 'invalid symbol' }, { status: 400 });

  // Try Polygon news first
  try {
    const data = await polygonNews(sym ?? undefined);
    if (data.length > 0) {
      return secureJson(data, { headers: CACHE_HEADERS });
    }
  } catch {
    // fall through to Finnhub
  }

  // Fallback: Finnhub
  try {
    const data = sym ? await getCompanyNews(sym) : await getMarketNews('general');
    return secureJson(data, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('News fallback error:', err);
    return secureJson({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
