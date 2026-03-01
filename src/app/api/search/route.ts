export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q param required' }, { status: 400 });
  }

  try {
    const data = await searchSymbols(query);
    const results = (data.quotes || []).slice(0, 10).map((q: Record<string, unknown>) => ({
      symbol: q.symbol,
      shortname: q.shortname,
      longname: q.longname,
      exchDisp: q.exchDisp,
      typeDisp: q.typeDisp,
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
