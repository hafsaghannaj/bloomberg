export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getInsiderTransactions } from '@/lib/finnhub';
import { enforceRateLimit, parseSymbol, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'insider', max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const symbol = parseSymbol(req.nextUrl.searchParams.get('symbol'));
  if (!symbol) return secureJson({ error: 'valid symbol required' }, { status: 400 });

  try {
    const data = await getInsiderTransactions(symbol);
    return secureJson(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch {
    return secureJson([], { status: 200 });
  }
}
