import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getQuotes } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  try {
    const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase());
    const data =
      symbolList.length === 1
        ? [await getQuote(symbolList[0])]
        : await getQuotes(symbolList);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (err) {
    console.error('Quote API error:', err);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
