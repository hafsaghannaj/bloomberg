import { NewsItem } from '@/types';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// ─── Analyst / Earnings types ─────────────────────────────────────────────────

export interface RecommendationTrend {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface EarningsRecord {
  symbol: string;
  period: string;
  quarter: number;
  year: number;
  actual: number | null;
  estimate: number | null;
  surprise: number | null;
  surprisePercent: number | null;
}

export interface EarningsCalendarItem {
  symbol: string;
  date: string;
  hour: string;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  quarter: number;
  year: number;
}

// ─── Analyst / Earnings functions ─────────────────────────────────────────────

export async function getRecommendationTrend(symbol: string): Promise<RecommendationTrend[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as Array<Record<string, unknown>>;
    return data.slice(0, 6).map((d) => ({
      period: String(d.period ?? ''),
      strongBuy: Number(d.strongBuy ?? 0),
      buy: Number(d.buy ?? 0),
      hold: Number(d.hold ?? 0),
      sell: Number(d.sell ?? 0),
      strongSell: Number(d.strongSell ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getEarningsHistory(symbol: string): Promise<EarningsRecord[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/stock/earnings?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as Array<Record<string, unknown>>;
    return data.slice(0, 8).map((d) => ({
      symbol: String(d.symbol ?? symbol),
      period: String(d.period ?? ''),
      quarter: Number(d.quarter ?? 0),
      year: Number(d.year ?? 0),
      actual: d.actual != null ? Number(d.actual) : null,
      estimate: d.estimate != null ? Number(d.estimate) : null,
      surprise: d.surprise != null ? Number(d.surprise) : null,
      surprisePercent: d.surprisePercent != null ? Number(d.surprisePercent) : null,
    }));
  } catch {
    return [];
  }
}

export async function getEarningsCalendar(from: string, to: string): Promise<EarningsCalendarItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { earningsCalendar?: Array<Record<string, unknown>> };
    return (data.earningsCalendar ?? [])
      .map((d) => ({
        symbol: String(d.symbol ?? ''),
        date: String(d.date ?? ''),
        hour: String(d.hour ?? ''),
        epsEstimate: d.epsEstimate != null ? Number(d.epsEstimate) : null,
        revenueEstimate: d.revenueEstimate != null ? Number(d.revenueEstimate) : null,
        quarter: Number(d.quarter ?? 0),
        year: Number(d.year ?? 0),
      }))
      .filter((d) => d.symbol && d.date);
  } catch {
    return [];
  }
}

export async function getMarketNews(category = 'general'): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return getMockNews();
  }

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/news?category=${category}&token=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return getMockNews();
    const data = await res.json();
    return data.slice(0, 30).map(mapFinnhubNews);
  } catch {
    return getMockNews();
  }
}

export async function getCompanyNews(symbol: string): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return getMockNews(symbol);
  }

  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return getMockNews(symbol);
    const data = await res.json();
    return data.slice(0, 20).map(mapFinnhubNews);
  } catch {
    return getMockNews(symbol);
  }
}

function mapFinnhubNews(item: Record<string, unknown>): NewsItem {
  return {
    id: String(item.id || Math.random()),
    headline: String(item.headline || ''),
    source: String(item.source || 'Unknown'),
    url: String(item.url || ''),
    datetime: Number(item.datetime || 0),
    summary: String(item.summary || ''),
    category: String(item.category || 'general'),
    image: item.image ? String(item.image) : undefined,
  };
}

function getMockNews(symbol?: string): NewsItem[] {
  const prefix = symbol ? `${symbol}: ` : '';
  const now = Math.floor(Date.now() / 1000);
  return [
    { id: '1', headline: `${prefix}Markets rally on strong earnings reports`, source: 'Reuters', url: '#', datetime: now - 300, summary: '', category: 'general' },
    { id: '2', headline: `${prefix}Fed officials signal patience on rate decisions`, source: 'CNBC', url: '#', datetime: now - 900, summary: '', category: 'general' },
    { id: '3', headline: `${prefix}Tech sector leads gains in afternoon trading`, source: 'Bloomberg', url: '#', datetime: now - 1800, summary: '', category: 'general' },
    { id: '4', headline: `${prefix}Oil prices stabilize amid OPEC+ discussions`, source: 'Reuters', url: '#', datetime: now - 3600, summary: '', category: 'general' },
    { id: '5', headline: `${prefix}Treasury yields edge higher on economic data`, source: 'WSJ', url: '#', datetime: now - 5400, summary: '', category: 'general' },
    { id: '6', headline: `${prefix}Global markets mixed ahead of jobs report`, source: 'FT', url: '#', datetime: now - 7200, summary: '', category: 'general' },
    { id: '7', headline: `${prefix}Cryptocurrency markets see renewed interest`, source: 'CoinDesk', url: '#', datetime: now - 9000, summary: '', category: 'crypto' },
    { id: '8', headline: `${prefix}European stocks close higher on banking gains`, source: 'Reuters', url: '#', datetime: now - 10800, summary: '', category: 'general' },
  ];
}
