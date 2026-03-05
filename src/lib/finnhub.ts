import { NewsItem } from '@/types';
import { fetchWithTimeout } from '@/lib/http';

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
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
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
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
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
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/calendar/earnings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${encodeURIComponent(apiKey)}`,
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

// ─── Insider Transactions ──────────────────────────────────────────────────────

export interface InsiderTransaction {
  name: string;
  share: number;
  change: number;
  transactionDate: string;
  transactionPrice: number;
  transactionCode: string;
}

export async function getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { data?: Array<Record<string, unknown>> };
    return (data.data ?? [])
      .filter((d) => d.transactionCode === 'P' || d.transactionCode === 'S')
      .slice(0, 30)
      .map((d) => ({
        name: String(d.name ?? ''),
        share: Math.abs(Number(d.share ?? 0)),
        change: Number(d.change ?? 0),
        transactionDate: String(d.transactionDate ?? ''),
        transactionPrice: Number(d.transactionPrice ?? 0),
        transactionCode: String(d.transactionCode ?? ''),
      }));
  } catch {
    return [];
  }
}

// ─── Economic Calendar ─────────────────────────────────────────────────────────

export interface EconomicEvent {
  event: string;
  country: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
}

export async function getEconomicCalendar(): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return getMockEconomicEvents();
  try {
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/calendar/economic?token=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return getMockEconomicEvents();
    const data = await res.json() as { economicCalendar?: Array<Record<string, unknown>> };
    const events = (data.economicCalendar ?? [])
      .map((d) => ({
        event: String(d.event ?? ''),
        country: String(d.country ?? ''),
        time: String(d.time ?? ''),
        impact: (['high', 'medium', 'low'].includes(String(d.impact)) ? String(d.impact) : 'low') as 'high' | 'medium' | 'low',
        actual: d.actual != null ? Number(d.actual) : null,
        estimate: d.estimate != null ? Number(d.estimate) : null,
        prev: d.prev != null ? Number(d.prev) : null,
        unit: String(d.unit ?? ''),
      }))
      .filter((d) => d.event && d.time);
    return events.length > 0 ? events : getMockEconomicEvents();
  } catch {
    return getMockEconomicEvents();
  }
}

function getMockEconomicEvents(): EconomicEvent[] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (offset: number) => {
    const d = new Date(now.getTime() + offset * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 13:30:00`;
  };
  return [
    { event: 'Nonfarm Payrolls', country: 'US', time: dateStr(1), impact: 'high', actual: null, estimate: 185, prev: 256, unit: 'K' },
    { event: 'Unemployment Rate', country: 'US', time: dateStr(1), impact: 'high', actual: null, estimate: 4.1, prev: 4.1, unit: '%' },
    { event: 'CPI (YoY)', country: 'US', time: dateStr(3), impact: 'high', actual: null, estimate: 3.1, prev: 3.4, unit: '%' },
    { event: 'Core CPI (YoY)', country: 'US', time: dateStr(3), impact: 'high', actual: null, estimate: 3.7, prev: 3.9, unit: '%' },
    { event: 'GDP (QoQ)', country: 'US', time: dateStr(5), impact: 'high', actual: null, estimate: 2.3, prev: 3.1, unit: '%' },
    { event: 'FOMC Meeting Minutes', country: 'US', time: dateStr(7), impact: 'high', actual: null, estimate: null, prev: null, unit: '' },
    { event: 'Retail Sales (MoM)', country: 'US', time: dateStr(2), impact: 'medium', actual: null, estimate: 0.3, prev: -0.1, unit: '%' },
    { event: 'ISM Manufacturing PMI', country: 'US', time: dateStr(4), impact: 'medium', actual: null, estimate: 50.4, prev: 49.1, unit: '' },
    { event: 'Consumer Confidence', country: 'US', time: dateStr(4), impact: 'medium', actual: null, estimate: 106.5, prev: 104.1, unit: '' },
    { event: 'Initial Jobless Claims', country: 'US', time: dateStr(0), impact: 'medium', actual: null, estimate: 215, prev: 220, unit: 'K' },
    { event: 'PPI (YoY)', country: 'US', time: dateStr(6), impact: 'medium', actual: null, estimate: 2.4, prev: 2.6, unit: '%' },
    { event: 'Durable Goods Orders', country: 'US', time: dateStr(8), impact: 'medium', actual: null, estimate: 0.5, prev: -0.3, unit: '%' },
  ];
}

export async function getMarketNews(category = 'general'): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return getMockNews();
  }

  try {
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/news?category=${encodeURIComponent(category)}&token=${encodeURIComponent(apiKey)}`,
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
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${encodeURIComponent(apiKey)}`,
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
