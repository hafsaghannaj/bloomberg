export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getQuoteSummary } from '@/lib/yahoo';
import { enforceRateLimit, parseSymbol, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'quote-summary', max: 80, windowMs: 60_000 });
  if (limited) return limited;

  const symbol = parseSymbol(req.nextUrl.searchParams.get('symbol'));
  if (!symbol) return secureJson({ error: 'valid symbol param required' }, { status: 400 });

  try {
    const data = await getQuoteSummary(symbol);
    return secureJson(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('QuoteSummary API error:', err);
    return secureJson({ error: 'Failed to fetch quote summary' }, { status: 500 });
  }
}
