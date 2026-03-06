export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getMarketNews, getCompanyNews } from '@/lib/finnhub';
import { polygonNews } from '@/lib/polygon';
import { enforceRateLimit, parseSymbol, secureJson } from '@/lib/server/security';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };
const ALLOWED_CATEGORIES = new Set(['general', 'forex', 'crypto', 'merger']);

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'news', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const rawSymbol = req.nextUrl.searchParams.get('symbol');
  const sym = parseSymbol(rawSymbol);
  if (rawSymbol && !sym) return secureJson({ error: 'invalid symbol' }, { status: 400 });
  const rawCategory = (req.nextUrl.searchParams.get('category') ?? 'general').toLowerCase();
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'general';

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
    const data = sym
      ? await getCompanyNews(sym)
      : await getMarketNews(category);
    return secureJson(data, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('News API error:', err);
    return secureJson({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
