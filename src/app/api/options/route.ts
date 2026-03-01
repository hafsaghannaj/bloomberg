export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const expiry = req.nextUrl.searchParams.get('expiry');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: Record<string, unknown> = {};
    if (expiry) opts.date = parseInt(expiry);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (yf as any).options(symbol.toUpperCase(), opts);
    return NextResponse.json(
      {
        expirationDates: data.expirationDates ?? [],
        calls: data.options?.[0]?.calls ?? [],
        puts: data.options?.[0]?.puts ?? [],
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('Options error:', err);
    return NextResponse.json({ expirationDates: [], calls: [], puts: [] }, { status: 200 });
  }
}
