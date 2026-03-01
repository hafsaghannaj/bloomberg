export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { polygonAggs } from '@/lib/polygon';
import { getChart } from '@/lib/yahoo';

const SECTORS = [
  { symbol: 'XLK',  name: 'Technology',          short: 'TECH' },
  { symbol: 'XLC',  name: 'Comm. Services',       short: 'COMM' },
  { symbol: 'XLY',  name: 'Consumer Disc.',       short: 'CDIS' },
  { symbol: 'XLF',  name: 'Financials',           short: 'FINS' },
  { symbol: 'XLI',  name: 'Industrials',          short: 'INDU' },
  { symbol: 'XLV',  name: 'Health Care',          short: 'HLTH' },
  { symbol: 'XLE',  name: 'Energy',               short: 'ENRG' },
  { symbol: 'XLP',  name: 'Consumer Staples',     short: 'CSTAP' },
  { symbol: 'XLB',  name: 'Materials',            short: 'MATL' },
  { symbol: 'XLRE', name: 'Real Estate',          short: 'REAL' },
  { symbol: 'XLU',  name: 'Utilities',            short: 'UTIL' },
];

interface DailyBar { time: number; close: number }

async function fetchDaily(symbol: string): Promise<DailyBar[]> {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const from = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Polygon first
  const poly = await polygonAggs(symbol, 1, 'day', from, to);
  if (poly.length > 50) return poly.map(d => ({ time: d.time, close: d.close }));

  // Yahoo fallback
  try {
    const y = await getChart(symbol, '1Y', '1d');
    const quotes = y?.quotes ?? [];
    return (quotes as Record<string, unknown>[])
      .filter(q => q.close != null)
      .map(q => ({
        time: Math.floor(new Date(q.date as string).getTime() / 1000),
        close: q.close as number,
      }));
  } catch {
    return [];
  }
}

function ret(closes: number[], lookback: number): number {
  if (closes.length < lookback + 1) return 0;
  const cur = closes[closes.length - 1];
  const past = closes[closes.length - 1 - lookback];
  return past === 0 ? 0 : (cur - past) / past;
}

function ytdRet(bars: DailyBar[]): number {
  if (bars.length === 0) return 0;
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
  const idx = bars.findIndex(b => b.time >= yearStart);
  if (idx < 0) return 0;
  const cur = bars[bars.length - 1].close;
  const base = bars[idx].close;
  return base === 0 ? 0 : (cur - base) / base;
}

export async function GET() {
  try {
    const allSyms = [...SECTORS.map(s => s.symbol), 'SPY'];
    const allBars = await Promise.all(allSyms.map(fetchDaily));

    const spyBars = allBars[allBars.length - 1];
    const spyCloses = spyBars.map(b => b.close);

    const spy = {
      r1d:  ret(spyCloses, 1),
      r1w:  ret(spyCloses, 5),
      r1m:  ret(spyCloses, 21),
      r3m:  ret(spyCloses, 63),
      r1y:  ret(spyCloses, 252),
      rYTD: ytdRet(spyBars),
    };

    const sectors = SECTORS.map((s, i) => {
      const bars   = allBars[i];
      const closes = bars.map(b => b.close);

      const r1d  = ret(closes, 1);
      const r1w  = ret(closes, 5);
      const r1m  = ret(closes, 21);
      const r3m  = ret(closes, 63);
      const r1y  = ret(closes, 252);
      const rYTD = ytdRet(bars);

      const price = closes[closes.length - 1] ?? 0;

      // Relative strength vs SPY
      const rs1d = r1d - spy.r1d;
      const rs1w = r1w - spy.r1w;
      const rs1m = r1m - spy.r1m;
      const rs3m = r3m - spy.r3m;

      // Momentum = how much RS is accelerating (1W RS vs 1M RS)
      const momentum = rs1w - rs1m;

      return {
        symbol:   s.symbol,
        name:     s.name,
        short:    s.short,
        price,
        r1d, r1w, r1m, r3m, r1y, rYTD,
        rs1d, rs1w, rs1m, rs3m,
        rsScore:  rs1m,   // quadrant X-axis default
        momentum,          // quadrant Y-axis
      };
    });

    return NextResponse.json(
      { sectors, spy, updatedAt: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('Sector rotation error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
