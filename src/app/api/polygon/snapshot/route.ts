export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { polygonSnapshot, isEquityTicker } from '@/lib/polygon';
import { getQuote } from '@/lib/yahoo';
import { enforceRateLimit, parseSymbol, secureJson } from '@/lib/server/security';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' };

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'polygon-snapshot', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const sym = parseSymbol(req.nextUrl.searchParams.get('symbol'));
  if (!sym) return secureJson({ error: 'valid symbol param required' }, { status: 400 });

  if (isEquityTicker(sym)) {
    try {
      const data = await polygonSnapshot(sym);
      if (data) {
        return secureJson(data, { headers: CACHE_HEADERS });
      }
    } catch {
      // fall through to Yahoo
    }
  }

  // Fallback: Yahoo Finance
  try {
    const data = await getQuote(sym);
    return secureJson(data, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('Snapshot fallback error:', err);
    return secureJson({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
}
