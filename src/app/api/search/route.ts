export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { searchSymbols } from '@/lib/yahoo';
import { enforceRateLimit, parseSearchQuery, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'search', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const query = parseSearchQuery(req.nextUrl.searchParams.get('q'));
  if (!query) return secureJson({ error: 'valid q param required' }, { status: 400 });

  try {
    const data = await searchSymbols(query);
    const results = (data.quotes || []).slice(0, 10).map((q: Record<string, unknown>) => ({
      symbol: q.symbol,
      shortname: q.shortname,
      longname: q.longname,
      exchDisp: q.exchDisp,
      typeDisp: q.typeDisp,
    }));

    return secureJson(results, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('Search API error:', err);
    return secureJson({ error: 'Failed to search' }, { status: 500 });
  }
}
