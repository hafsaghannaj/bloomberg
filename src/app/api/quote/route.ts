export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getQuote, getQuotes } from '@/lib/yahoo';
import { polygonSnapshot, polygonSnapshots, isEquityTicker } from '@/lib/polygon';
import { enforceRateLimit, parseSymbolList, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'quote', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  const symbolList = parseSymbolList(req.nextUrl.searchParams.get('symbols'), 25);
  if (!symbolList) return secureJson({ error: 'valid symbols param required' }, { status: 400 });

  try {
    const equitySymbols = symbolList.filter(isEquityTicker);
    const nonEquitySymbols = symbolList.filter((s) => !isEquityTicker(s));

    const results = new Map<string, unknown>();

    // Fetch equity quotes from Polygon
    if (equitySymbols.length === 1) {
      const data = await polygonSnapshot(equitySymbols[0]);
      if (data) results.set(equitySymbols[0], data);
    } else if (equitySymbols.length > 1) {
      const data = await polygonSnapshots(equitySymbols);
      data.forEach((q) => results.set(q.symbol, q));
    }

    // Fetch Yahoo for equity symbols that didn't get Polygon data + all non-equity
    const yahooNeeded = [
      ...equitySymbols.filter((s) => !results.has(s)),
      ...nonEquitySymbols,
    ];

    if (yahooNeeded.length === 1) {
      const data = await getQuote(yahooNeeded[0]);
      if (data?.symbol) results.set(data.symbol, data);
    } else if (yahooNeeded.length > 1) {
      const data = await getQuotes(yahooNeeded);
      data.forEach((q: { symbol: string }) => { if (q?.symbol) results.set(q.symbol, q); });
    }

    // Return in original symbol order
    const ordered = symbolList.map((s) => results.get(s)).filter(Boolean);

    return secureJson(ordered, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
    });
  } catch (err) {
    console.error('Quote API error:', err);
    return secureJson({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
