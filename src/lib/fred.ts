import type { YieldPoint, MacroIndicator } from '@/types';
import { fetchWithTimeout } from '@/lib/http';

const API_KEY = process.env.FRED_API_KEY ?? '';
const BASE = 'https://api.stlouisfed.org/fred';

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

function parseValue(v: string): number | null {
  if (v === '.' || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

async function fetchObservations(
  seriesId: string,
  limit: number,
  sortOrder: 'desc' | 'asc' = 'desc'
): Promise<FredObservation[]> {
  const url =
    `${BASE}/series/observations` +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${encodeURIComponent(API_KEY)}` +
    `&file_type=json` +
    `&sort_order=${encodeURIComponent(sortOrder)}` +
    `&limit=${limit}`;

  const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = (await res.json()) as FredResponse;
  return json.observations ?? [];
}

async function getLatest(seriesId: string): Promise<{ value: number | null; date: string }> {
  const obs = await fetchObservations(seriesId, 1);
  if (!obs.length) return { value: null, date: '' };
  return { value: parseValue(obs[0].value), date: obs[0].date };
}

async function getLatestN(
  seriesId: string,
  n: number
): Promise<Array<{ value: number | null; date: string }>> {
  const obs = await fetchObservations(seriesId, n);
  return obs.map((o) => ({ value: parseValue(o.value), date: o.date }));
}

// ─── Yield Curve ──────────────────────────────────────────────────────────────

const YIELD_SERIES: Array<{ id: string; maturity: string; months: number }> = [
  { id: 'DGS1MO',  maturity: '1M',  months: 1   },
  { id: 'DGS3MO',  maturity: '3M',  months: 3   },
  { id: 'DGS6MO',  maturity: '6M',  months: 6   },
  { id: 'DGS1',    maturity: '1Y',  months: 12  },
  { id: 'DGS2',    maturity: '2Y',  months: 24  },
  { id: 'DGS3',    maturity: '3Y',  months: 36  },
  { id: 'DGS5',    maturity: '5Y',  months: 60  },
  { id: 'DGS7',    maturity: '7Y',  months: 84  },
  { id: 'DGS10',   maturity: '10Y', months: 120 },
  { id: 'DGS20',   maturity: '20Y', months: 240 },
  { id: 'DGS30',   maturity: '30Y', months: 360 },
];

export async function getYieldCurve(): Promise<YieldPoint[]> {
  const results = await Promise.all(
    YIELD_SERIES.map(async ({ id, maturity, months }) => {
      // Get last 400 days to find current + 1-year-ago values
      const obs = await fetchObservations(id, 400, 'desc');
      const validObs = obs.filter((o) => o.value !== '.' && o.value !== '');

      const current = validObs[0] ? parseValue(validObs[0].value) : null;

      // Find observation ~252 trading days ago (≈1 year)
      const yearAgoObs = validObs[251] ?? validObs[validObs.length - 1];
      const yearAgo = yearAgoObs ? parseValue(yearAgoObs.value) : null;

      return { maturity, months, current, yearAgo };
    })
  );

  return results;
}

// ─── Macro Indicators ─────────────────────────────────────────────────────────

export async function getMacroIndicators(): Promise<MacroIndicator[]> {
  const [
    fedFunds,
    cpiObs,
    coreCpiObs,
    unrate,
    unratePrev,
    payems,
    payemsPrev,
    gdpObs,
    pceObs,
    t10y2y,
    t10y3m,
  ] = await Promise.all([
    getLatest('FEDFUNDS'),
    getLatestN('CPIAUCSL', 14),
    getLatestN('CPILFESL', 14),
    getLatestN('UNRATE', 1),
    getLatestN('UNRATE', 2),
    getLatestN('PAYEMS', 1),
    getLatestN('PAYEMS', 2),
    getLatestN('GDPC1', 2),
    getLatestN('PCEPI', 14),
    getLatest('T10Y2Y'),
    getLatest('T10Y3M'),
  ]);

  const indicators: MacroIndicator[] = [];

  // Fed Funds Rate
  indicators.push({
    id: 'FEDFUNDS',
    name: 'Fed Funds Rate',
    shortName: 'FED FUNDS',
    value: fedFunds.value,
    change: null,
    changeLabel: 'Target rate',
    unit: '%',
    frequency: 'Monthly',
    date: fedFunds.date,
    status: 'normal',
  });

  // CPI YoY
  const cpiCurrent = cpiObs[0]?.value ?? null;
  const cpiYearAgo = cpiObs[12]?.value ?? null;
  const cpiYoY =
    cpiCurrent !== null && cpiYearAgo !== null && cpiYearAgo > 0
      ? ((cpiCurrent - cpiYearAgo) / cpiYearAgo) * 100
      : null;
  const cpiPrevYoY =
    cpiObs[1]?.value !== null && cpiObs[13]?.value !== null && cpiObs[13]!.value! > 0
      ? ((cpiObs[1].value! - cpiObs[13].value!) / cpiObs[13].value!) * 100
      : null;
  indicators.push({
    id: 'CPI',
    name: 'CPI Inflation (YoY)',
    shortName: 'CPI YoY',
    value: cpiYoY,
    change: cpiYoY !== null && cpiPrevYoY !== null ? cpiYoY - cpiPrevYoY : null,
    changeLabel: 'vs prev month',
    unit: '%',
    frequency: 'Monthly',
    date: cpiObs[0]?.date ?? '',
    status: cpiYoY !== null ? (cpiYoY > 4 ? 'danger' : cpiYoY > 2.5 ? 'warning' : 'normal') : 'normal',
  });

  // Core CPI YoY
  const coreCurrent = coreCpiObs[0]?.value ?? null;
  const coreYearAgo = coreCpiObs[12]?.value ?? null;
  const coreYoY =
    coreCurrent !== null && coreYearAgo !== null && coreYearAgo > 0
      ? ((coreCurrent - coreYearAgo) / coreYearAgo) * 100
      : null;
  const corePrevYoY =
    coreCpiObs[1]?.value !== null && coreCpiObs[13]?.value !== null && coreCpiObs[13]!.value! > 0
      ? ((coreCpiObs[1].value! - coreCpiObs[13].value!) / coreCpiObs[13].value!) * 100
      : null;
  indicators.push({
    id: 'CORE_CPI',
    name: 'Core CPI (YoY)',
    shortName: 'CORE CPI',
    value: coreYoY,
    change: coreYoY !== null && corePrevYoY !== null ? coreYoY - corePrevYoY : null,
    changeLabel: 'vs prev month',
    unit: '%',
    frequency: 'Monthly',
    date: coreCpiObs[0]?.date ?? '',
    status: coreYoY !== null ? (coreYoY > 4 ? 'danger' : coreYoY > 2.5 ? 'warning' : 'normal') : 'normal',
  });

  // Unemployment
  const unrateVal = unrate[0]?.value ?? null;
  const unratePrevVal = unratePrev[1]?.value ?? null;
  indicators.push({
    id: 'UNRATE',
    name: 'Unemployment Rate',
    shortName: 'UNEMP',
    value: unrateVal,
    change: unrateVal !== null && unratePrevVal !== null ? unrateVal - unratePrevVal : null,
    changeLabel: 'MoM change',
    unit: '%',
    frequency: 'Monthly',
    date: unrate[0]?.date ?? '',
    status: unrateVal !== null ? (unrateVal > 6 ? 'danger' : unrateVal > 4.5 ? 'warning' : 'normal') : 'normal',
  });

  // Nonfarm Payrolls (MoM change in thousands)
  const payemsVal = payems[0]?.value ?? null;
  const payemsPrevVal = payemsPrev[1]?.value ?? null;
  const payrollsMoM =
    payemsVal !== null && payemsPrevVal !== null ? payemsVal - payemsPrevVal : null;
  indicators.push({
    id: 'PAYEMS',
    name: 'Nonfarm Payrolls',
    shortName: 'PAYROLLS',
    value: payrollsMoM,
    change: null,
    changeLabel: 'MoM (thousands)',
    unit: 'K',
    frequency: 'Monthly',
    date: payems[0]?.date ?? '',
    status: payrollsMoM !== null ? (payrollsMoM < 0 ? 'danger' : payrollsMoM < 50 ? 'warning' : 'normal') : 'normal',
  });

  // Real GDP QoQ annualized
  const gdpCurrent = gdpObs[0]?.value ?? null;
  const gdpPrev = gdpObs[1]?.value ?? null;
  const gdpGrowth =
    gdpCurrent !== null && gdpPrev !== null && gdpPrev > 0
      ? ((gdpCurrent / gdpPrev) ** 4 - 1) * 100
      : null;
  indicators.push({
    id: 'GDPC1',
    name: 'Real GDP Growth',
    shortName: 'GDP QoQ',
    value: gdpGrowth,
    change: null,
    changeLabel: 'Annualized',
    unit: '%',
    frequency: 'Quarterly',
    date: gdpObs[0]?.date ?? '',
    status: gdpGrowth !== null ? (gdpGrowth < 0 ? 'danger' : gdpGrowth < 1 ? 'warning' : 'normal') : 'normal',
  });

  // PCE YoY
  const pceCurrent = pceObs[0]?.value ?? null;
  const pceYearAgo = pceObs[12]?.value ?? null;
  const pceYoY =
    pceCurrent !== null && pceYearAgo !== null && pceYearAgo > 0
      ? ((pceCurrent - pceYearAgo) / pceYearAgo) * 100
      : null;
  const pcePrevYoY =
    pceObs[1]?.value !== null && pceObs[13]?.value !== null && pceObs[13]!.value! > 0
      ? ((pceObs[1].value! - pceObs[13].value!) / pceObs[13].value!) * 100
      : null;
  indicators.push({
    id: 'PCE',
    name: 'PCE Inflation (YoY)',
    shortName: 'PCE YoY',
    value: pceYoY,
    change: pceYoY !== null && pcePrevYoY !== null ? pceYoY - pcePrevYoY : null,
    changeLabel: 'Fed target: 2%',
    unit: '%',
    frequency: 'Monthly',
    date: pceObs[0]?.date ?? '',
    status: pceYoY !== null ? (pceYoY > 4 ? 'danger' : pceYoY > 2.5 ? 'warning' : 'normal') : 'normal',
  });

  // 10Y-2Y Spread
  indicators.push({
    id: 'T10Y2Y',
    name: '10Y-2Y Spread',
    shortName: '10Y-2Y',
    value: t10y2y.value,
    change: null,
    changeLabel: t10y2y.value !== null && t10y2y.value < 0 ? 'INVERTED' : 'Normal',
    unit: '%',
    frequency: 'Daily',
    date: t10y2y.date,
    status: t10y2y.value !== null ? (t10y2y.value < -0.5 ? 'danger' : t10y2y.value < 0 ? 'warning' : 'normal') : 'normal',
  });

  // 10Y-3M Spread
  indicators.push({
    id: 'T10Y3M',
    name: '10Y-3M Spread',
    shortName: '10Y-3M',
    value: t10y3m.value,
    change: null,
    changeLabel: t10y3m.value !== null && t10y3m.value < 0 ? 'INVERTED' : 'Normal',
    unit: '%',
    frequency: 'Daily',
    date: t10y3m.date,
    status: t10y3m.value !== null ? (t10y3m.value < -0.5 ? 'danger' : t10y3m.value < 0 ? 'warning' : 'normal') : 'normal',
  });

  return indicators;
}
