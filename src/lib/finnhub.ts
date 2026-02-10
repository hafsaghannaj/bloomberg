import { NewsItem } from '@/types';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

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
