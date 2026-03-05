import type { Quote, ChartDataPoint, SearchResult, NewsItem } from '@/types';
import { fetchWithTimeout } from '@/lib/http';

const API_KEY = process.env.POLYGON_API_KEY ?? '';
const BASE = 'https://api.polygon.io';

const TICKER_MAP: Record<string, string> = {
  '^GSPC':    'I:SPX',
  '^DJI':     'I:DJI',
  '^IXIC':    'I:COMP',
  '^RUT':     'I:R2K',
  '^VIX':     'I:VIX',
  'BTC-USD':  'X:BTCUSD',
  'ETH-USD':  'X:ETHUSD',
  'SOL-USD':  'X:SOLUSD',
  'EURUSD=X': 'C:EURUSD',
  'USDJPY=X': 'C:USDJPY',
  'GBPUSD=X': 'C:GBPUSD',
  'GC=F':     'C:XAUUSD',
  'CL=F':     'C:CLUSD',
  'SI=F':     'C:XAGUSD',
};

export function toPolygonTicker(yahooSymbol: string): string {
  return TICKER_MAP[yahooSymbol] ?? yahooSymbol;
}

export function isEquityTicker(symbol: string): boolean {
  return !symbol.startsWith('^') && !symbol.includes('=') && !symbol.includes('-');
}

// ─── Internal Response Types ─────────────────────────────────────────────────

interface PolygonSnapshotTicker {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  updated: number;
  day: { o: number; h: number; l: number; c: number; v: number; vw: number };
  lastTrade: { p: number; s: number; t: number };
  lastQuote: { P: number; S: number; p: number; s: number };
  prevDay: { o: number; h: number; l: number; c: number; v: number; vw: number };
}

interface PolygonAggsResult {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
  n: number;
}

interface PolygonTickerResult {
  ticker: string;
  name: string;
  primary_exchange: string;
  type: string;
}

interface PolygonNewsResult {
  id: string;
  publisher: { name: string };
  title: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  image_url?: string;
  description: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapSnapshotTicker(t: PolygonSnapshotTicker): Quote {
  const price = t.lastTrade?.p ?? t.day?.c ?? 0;
  const prevClose = t.prevDay?.c ?? 0;
  const change = t.todaysChange ?? price - prevClose;
  const changePct = t.todaysChangePerc ?? (prevClose > 0 ? (change / prevClose) * 100 : 0);

  return {
    symbol: t.ticker,
    shortName: t.ticker,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketVolume: t.day?.v ?? 0,
    regularMarketPreviousClose: prevClose,
    regularMarketOpen: t.day?.o ?? 0,
    regularMarketDayHigh: t.day?.h ?? 0,
    regularMarketDayLow: t.day?.l ?? 0,
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
    currency: 'USD',
    exchange: 'XNAS',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function polygonSnapshot(ticker: string): Promise<Quote | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${encodeURIComponent(API_KEY)}`,
      { next: { revalidate: 5 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { ticker: PolygonSnapshotTicker; status: string };
    if (json.status !== 'OK' || !json.ticker) return null;
    return mapSnapshotTicker(json.ticker);
  } catch {
    return null;
  }
}

export async function polygonSnapshots(tickers: string[]): Promise<Quote[]> {
  if (!API_KEY || tickers.length === 0) return [];
  try {
    const encodedTickers = tickers.map((t) => encodeURIComponent(t)).join(',');
    const res = await fetchWithTimeout(
      `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${encodedTickers}&apiKey=${encodeURIComponent(API_KEY)}`,
      { next: { revalidate: 5 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { tickers: PolygonSnapshotTicker[]; status: string };
    if (json.status !== 'OK' || !json.tickers) return [];
    return json.tickers.map(mapSnapshotTicker);
  } catch {
    return [];
  }
}

export async function polygonAggs(
  ticker: string,
  multiplier: number,
  timespan: string,
  from: string,
  to: string
): Promise<ChartDataPoint[]> {
  if (!API_KEY) return [];
  try {
    const url = `${BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${encodeURIComponent(timespan)}/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=5000&apiKey=${encodeURIComponent(API_KEY)}`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 10 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results: PolygonAggsResult[]; status: string };
    if (json.status !== 'OK' || !json.results) return [];
    return json.results.map((r) => ({
      time: Math.floor(r.t / 1000), // ms → unix seconds
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));
  } catch {
    return [];
  }
}

export async function polygonSearch(query: string): Promise<SearchResult[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetchWithTimeout(
      `${BASE}/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&sort=ticker&order=asc&limit=10&apiKey=${encodeURIComponent(API_KEY)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results: PolygonTickerResult[]; status: string };
    if (json.status !== 'OK' || !json.results) return [];
    return json.results.map((r) => ({
      symbol: r.ticker,
      shortname: r.name,
      exchDisp: r.primary_exchange,
      typeDisp: r.type,
    }));
  } catch {
    return [];
  }
}

export async function polygonNews(symbol?: string): Promise<NewsItem[]> {
  if (!API_KEY) return [];
  try {
    const tickerParam = symbol ? `&ticker=${encodeURIComponent(symbol)}` : '';
    const res = await fetchWithTimeout(
      `${BASE}/v2/reference/news?limit=20${tickerParam}&order=desc&sort=published_utc&apiKey=${encodeURIComponent(API_KEY)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results: PolygonNewsResult[]; status: string };
    if (json.status !== 'OK' || !json.results) return [];
    return json.results.map((r) => ({
      id: r.id,
      headline: r.title,
      source: r.publisher.name,
      url: r.article_url,
      datetime: Math.floor(new Date(r.published_utc).getTime() / 1000),
      summary: r.description ?? '',
      category: r.tickers?.[0] ?? 'general',
      image: r.image_url,
    }));
  } catch {
    return [];
  }
}
