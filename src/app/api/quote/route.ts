import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getQuotes } from '@/lib/yahoo';
import { polygonSnapshot, polygonSnapshots, isEquityTicker } from '@/lib/polygon';

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase());

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

    return NextResponse.json(ordered, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
    });
  } catch (err) {
    console.error('Quote API error:', err);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
