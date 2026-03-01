import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/yahoo';

interface InputPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}

function std(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  return x.slice(0, n).reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0) / n;
}

function calcBeta(returns: number[], benchReturns: number[]): number {
  const varBench = variance(benchReturns);
  return varBench > 0 ? covariance(returns, benchReturns) / varBench : 1;
}

function calcSharpe(returns: number[], rfDaily = 0.05 / 252): number {
  const excess = returns.map((r) => r - rfDaily);
  const annualVol = std(excess) * Math.sqrt(252);
  return annualVol > 0 ? (mean(excess) * 252) / annualVol : 0;
}

function calcMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = peak > 0 ? (peak - p) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return -maxDD; // returns negative (e.g. -0.12 = -12%)
}

function toReturns(prices: number[]): number[] {
  return prices.slice(1).map((p, i) => (prices[i] > 0 ? (p - prices[i]) / prices[i] : 0));
}

function toCumulative(returns: number[]): number[] {
  let cum = 1;
  return returns.map((r) => {
    cum *= 1 + r;
    return cum - 1;
  });
}

// ─── API handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let positions: InputPosition[];
  try {
    const body = await req.json() as { positions: InputPosition[] };
    positions = body.positions ?? [];
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (positions.length === 0) {
    return NextResponse.json({ error: 'No positions' }, { status: 400 });
  }

  const symbols = [...new Set(positions.map((p) => p.symbol))];
  const allSymbols = [...symbols, 'SPY'];

  // Fetch 1Y daily data for all symbols + SPY in parallel
  const results = await Promise.allSettled(
    allSymbols.map((s) => getChart(s, '1Y', '1d'))
  );

  // Build date → close price map for each symbol
  const priceSeries = new Map<string, Map<string, number>>();
  allSymbols.forEach((sym, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled' || !r.value?.quotes) return;
    const dateMap = new Map<string, number>();
    for (const q of r.value.quotes as Array<Record<string, unknown>>) {
      if (q.date == null || q.close == null) continue;
      const dateStr = new Date(q.date as string).toISOString().split('T')[0];
      dateMap.set(dateStr, Number(q.close));
    }
    priceSeries.set(sym, dateMap);
  });

  const spyMap = priceSeries.get('SPY');
  if (!spyMap || spyMap.size < 20) {
    return NextResponse.json({ error: 'Insufficient SPY data' }, { status: 500 });
  }

  // Find dates where every position symbol AND SPY has a price
  const sortedDates = [...spyMap.keys()].sort();
  const validDates = sortedDates.filter((d) =>
    symbols.every((s) => priceSeries.get(s)?.has(d))
  );

  if (validDates.length < 20) {
    return NextResponse.json({ error: 'Insufficient overlapping data' }, { status: 500 });
  }

  // Price arrays aligned to valid dates
  const getPrices = (sym: string): number[] =>
    validDates.map((d) => priceSeries.get(sym)!.get(d)!);

  const spyPrices = getPrices('SPY');
  const spyReturns = toReturns(spyPrices);

  // Current portfolio weights based on today's prices
  const latestPrice = (sym: string) => {
    const p = getPrices(sym);
    return p[p.length - 1] ?? 0;
  };

  const totalValue = positions.reduce(
    (sum, p) => sum + latestPrice(p.symbol) * p.shares,
    0
  );

  // Aggregate weights (same symbol may appear multiple times)
  const weightMap = new Map<string, number>();
  positions.forEach((p) => {
    const posVal = latestPrice(p.symbol) * p.shares;
    const w = totalValue > 0 ? posVal / totalValue : 1 / positions.length;
    weightMap.set(p.symbol, (weightMap.get(p.symbol) ?? 0) + w);
  });

  // Daily return series for each symbol
  const symReturns = new Map<string, number[]>();
  symbols.forEach((s) => symReturns.set(s, toReturns(getPrices(s))));

  // Portfolio daily returns = weighted sum
  const nDays = spyReturns.length;
  const portReturns = Array.from({ length: nDays }, (_, t) => {
    let r = 0;
    symbols.forEach((s) => {
      r += (weightMap.get(s) ?? 0) * (symReturns.get(s)?.[t] ?? 0);
    });
    return r;
  });

  // Cumulative return series
  const cumPort = toCumulative(portReturns);
  const cumSpy  = toCumulative(spyReturns);

  const RF_ANNUAL = 0.05;

  // ── Portfolio-level metrics ──
  const totalReturn   = cumPort[cumPort.length - 1];
  const spyReturn     = cumSpy[cumSpy.length - 1];
  const annualReturn  = Math.pow(1 + totalReturn, 252 / nDays) - 1;
  const spyAnnual     = Math.pow(1 + spyReturn,  252 / nDays) - 1;
  const beta          = calcBeta(portReturns, spyReturns);
  const alpha         = annualReturn - (RF_ANNUAL + beta * (spyAnnual - RF_ANNUAL));
  const sharpe        = calcSharpe(portReturns);
  const volatility    = std(portReturns) * Math.sqrt(252);
  const maxDD         = calcMaxDrawdown([1, ...cumPort.map((c) => 1 + c)]);
  const winRate       = portReturns.filter((r) => r > 0).length / nDays;

  // ── Per-symbol metrics ──
  const symbolStats = symbols.map((s) => {
    const returns  = symReturns.get(s) ?? [];
    const prices   = getPrices(s);
    const symTotal = prices.length >= 2 ? (prices[prices.length - 1] / prices[0]) - 1 : 0;
    const symDD    = calcMaxDrawdown(prices);
    const symBeta  = calcBeta(returns, spyReturns.slice(0, returns.length));
    const symSharpe = calcSharpe(returns);
    const weight   = weightMap.get(s) ?? 0;

    return {
      symbol:      s,
      weight,
      totalReturn: symTotal,
      annualReturn: Math.pow(1 + symTotal, 252 / Math.max(returns.length, 1)) - 1,
      beta:        symBeta,
      sharpe:      symSharpe,
      maxDrawdown: symDD,
      contribution: weight * symTotal,
    };
  });

  // ── Timeline for chart (subsample to ≤ 80 points) ──
  const step = Math.max(1, Math.floor(validDates.length / 80));
  const timeline = validDates
    .filter((_, i) => i % step === 0 || i === validDates.length - 1)
    .map((date, idx) => {
      const i = Math.min(idx * step, cumPort.length - 1);
      return {
        date: date.slice(5), // MM-DD
        portfolio: +((cumPort[i] ?? 0) * 100).toFixed(2),
        spy:       +((cumSpy[i]  ?? 0) * 100).toFixed(2),
      };
    });

  return NextResponse.json({
    metrics: {
      totalReturn,
      spyReturn,
      annualReturn,
      spyAnnual,
      alpha,
      beta,
      sharpe,
      volatility,
      maxDrawdown: maxDD,
      winRate,
      lookbackDays: nDays,
    },
    symbolStats,
    timeline,
  });
}
