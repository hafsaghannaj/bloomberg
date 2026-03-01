export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { polygonSearch } from '@/lib/polygon';
import { searchSymbols } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'q param required' }, { status: 400 });
  }

  // Try Polygon first
  try {
    const data = await polygonSearch(q);
    if (data.length > 0) {
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
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
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('Search fallback error:', err);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
