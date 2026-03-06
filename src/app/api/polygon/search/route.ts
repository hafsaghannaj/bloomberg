export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { polygonSearch } from '@/lib/polygon';
import { searchSymbols } from '@/lib/yahoo';
import { enforceRateLimit, parseSearchQuery, secureJson } from '@/lib/server/security';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'polygon-search', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const q = parseSearchQuery(req.nextUrl.searchParams.get('q'));
  if (!q) return secureJson({ error: 'valid q param required' }, { status: 400 });

  // Try Polygon first
  try {
    const data = await polygonSearch(q);
    if (data.length > 0) {
      return secureJson(data, { headers: CACHE_HEADERS });
    }
  } catch {
    // fall through to Yahoo
  }

  // Fallback: Yahoo search
  try {
    const raw = (await searchSymbols(q)) as {
      quotes?: Array<{
        symbol: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        typeDisp?: string;
      }>;
    };
    const results = (raw.quotes ?? []).slice(0, 10).map((r) => ({
      symbol: r.symbol,
      shortname: r.shortname,
      longname: r.longname,
      exchDisp: r.exchDisp,
      typeDisp: r.typeDisp,
    }));
    return secureJson(results, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('Search fallback error:', err);
    return secureJson({ error: 'Failed to search' }, { status: 500 });
  }
}
