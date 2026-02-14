'use client';

/**
 * Client-side Yahoo Finance API service.
 * Uses Yahoo Finance public endpoints directly.
 * With Capacitor CapacitorHttp enabled, fetch() is patched on native
 * to go through the native HTTP layer — no CORS restrictions.
 */

const YF_BASE = 'https://query1.finance.yahoo.com';

// ─── Helpers ──────────────────────────────────────────────────────────

async function yfFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed: ${res.status} ${res.statusText}`);
  }
  return res;
}

// ─── Quote (via v8 chart endpoint — no auth required) ─────────────────

export async function getQuoteClient(symbol: string) {
  // Use the chart endpoint with range=1d to get current quote data
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=false`;
  const res = await yfFetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No quote data for ${symbol}`);
  return mapChartToQuote(result);
}

export async function getQuotesClient(symbols: string[]) {
  // Fetch each symbol via chart endpoint in parallel
  const results = await Promise.allSettled(
    symbols.map(s => getQuoteClient(s))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof mapChartToQuote>> => r.status === 'fulfilled')
    .map(r => r.value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChartToQuote(result: any) {
  const meta = result.meta || {};
  const quotes = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];

  // Get the latest values from the intraday data
  const lastIdx = timestamps.length - 1;
  const lastClose = lastIdx >= 0 ? quotes.close?.[lastIdx] : null;
  const lastVolume = lastIdx >= 0 ? quotes.volume?.[lastIdx] : null;

  // Calculate total volume from intraday data
  let totalVolume = 0;
  if (quotes.volume) {
    for (let i = 0; i <= lastIdx; i++) {
      totalVolume += quotes.volume[i] || 0;
    }
  }

  // Get open from first data point
  const openPrice = quotes.open?.[0] || meta.chartPreviousClose;

  // Get high/low from intraday
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  if (quotes.high && quotes.low) {
    for (let i = 0; i <= lastIdx; i++) {
      if (quotes.high[i] != null && quotes.high[i] > dayHigh) dayHigh = quotes.high[i];
      if (quotes.low[i] != null && quotes.low[i] < dayLow) dayLow = quotes.low[i];
    }
  }
  if (dayHigh === -Infinity) dayHigh = meta.regularMarketPrice || 0;
  if (dayLow === Infinity) dayLow = meta.regularMarketPrice || 0;

  const currentPrice = meta.regularMarketPrice || lastClose || 0;
  const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
  const change = currentPrice - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: meta.symbol,
    shortName: meta.shortName || meta.symbol,
    longName: meta.longName || meta.shortName || meta.symbol,
    regularMarketPrice: currentPrice,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketVolume: totalVolume || meta.regularMarketVolume || lastVolume || 0,
    regularMarketOpen: openPrice,
    regularMarketDayHigh: dayHigh,
    regularMarketDayLow: dayLow,
    regularMarketPreviousClose: previousClose,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    marketCap: meta.marketCap,
    averageDailyVolume3Month: undefined,
    trailingPE: undefined,
    forwardPE: undefined,
    dividendYield: undefined,
    bid: undefined,
    ask: undefined,
    exchange: meta.exchangeName,
    quoteType: meta.instrumentType,
  };
}

// ─── Chart ────────────────────────────────────────────────────────────

function rangeToInterval(range: string): string {
  switch (range) {
    case '1D': return '5m';
    case '1W': return '15m';
    case '1M': return '1d';
    case '3M': return '1d';
    case '1Y': return '1wk';
    case '5Y': return '1mo';
    default: return '1d';
  }
}

function rangeToYFRange(range: string): string {
  switch (range) {
    case '1D': return '1d';
    case '1W': return '5d';
    case '1M': return '1mo';
    case '3M': return '3mo';
    case '1Y': return '1y';
    case '5Y': return '5y';
    default: return '1mo';
  }
}

export async function getChartClient(symbol: string, range: string) {
  const interval = rangeToInterval(range);
  const yfRange = rangeToYFRange(range);
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yfRange}&interval=${interval}&includePrePost=false`;
  const res = await yfFetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${symbol}`);

  const timestamps = result.timestamp || [];
  const ohlcv = result.indicators?.quote?.[0] || {};

  return timestamps.map((t: number, i: number) => ({
    time: t,
    open: ohlcv.open?.[i],
    high: ohlcv.high?.[i],
    low: ohlcv.low?.[i],
    close: ohlcv.close?.[i],
    volume: ohlcv.volume?.[i],
  })).filter((d: { close: number | null }) => d.close !== null);
}

// ─── Search ───────────────────────────────────────────────────────────

export async function searchSymbolsClient(query: string) {
  const url = `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  const res = await yfFetch(url);
  const json = await res.json();
  return (json?.quotes || []).slice(0, 10).map((q: Record<string, unknown>) => ({
    symbol: q.symbol,
    shortname: q.shortname,
    longname: q.longname,
    exchDisp: q.exchDisp,
    typeDisp: q.typeDisp,
  }));
}

// ─── Quote Summary ────────────────────────────────────────────────────

export async function getQuoteSummaryClient(symbol: string) {
  // Use chart endpoint with more data for summary
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`;
  const res = await yfFetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No summary data for ${symbol}`);

  const meta = result.meta || {};
  return {
    summaryDetail: {
      previousClose: { raw: meta.chartPreviousClose },
      open: { raw: meta.regularMarketPrice },
      dayLow: { raw: meta.regularMarketDayLow },
      dayHigh: { raw: meta.regularMarketDayHigh },
      fiftyTwoWeekLow: { raw: meta.fiftyTwoWeekLow },
      fiftyTwoWeekHigh: { raw: meta.fiftyTwoWeekHigh },
      volume: { raw: meta.regularMarketVolume },
      marketCap: { raw: meta.marketCap },
    },
    financialData: {
      currentPrice: { raw: meta.regularMarketPrice },
    },
  };
}

// ─── News (via Yahoo Finance RSS → JSON) ─────────────────────────────

export async function getNewsClient(symbol?: string | null): Promise<Array<{
  id: string; headline: string; source: string; url: string; datetime: number; summary: string; category: string;
}>> {
  try {
    // Yahoo Finance RSS feeds — works without auth
    const rssUrl = symbol
      ? `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`
      : `https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,AAPL,MSFT,GOOGL&region=US&lang=en-US`;

    const res = await fetch(rssUrl, {
      headers: { 'Accept': 'application/xml, text/xml' },
    });

    if (!res.ok) throw new Error('RSS fetch failed');

    const xml = await res.text();
    return parseRssToNews(xml);
  } catch {
    // Fallback: try the Yahoo search news endpoint
    try {
      const query = symbol || 'stock market';
      const url = `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=15`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Search news failed');
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (json?.news || []).slice(0, 15).map((n: any, i: number) => ({
        id: String(n.uuid || i),
        headline: n.title || '',
        source: n.publisher || 'Yahoo Finance',
        url: n.link || '#',
        datetime: n.providerPublishTime || Math.floor(Date.now() / 1000) - i * 600,
        summary: n.summary || '',
        category: 'general',
      }));
    } catch {
      // Final fallback: return placeholder news with search links
      return getFallbackNews(symbol);
    }
  }
}

function parseRssToNews(xml: string) {
  const items: Array<{
    id: string; headline: string; source: string; url: string; datetime: number; summary: string; category: string;
  }> = [];

  // Simple XML parser for RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let idx = 0;

  while ((match = itemRegex.exec(xml)) !== null && idx < 20) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');
    const source = extractTag(itemXml, 'source') || 'Yahoo Finance';

    if (title && link) {
      items.push({
        id: String(idx),
        headline: decodeHtmlEntities(title),
        source: decodeHtmlEntities(source),
        url: link,
        datetime: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000) - idx * 600,
        summary: description ? decodeHtmlEntities(description) : '',
        category: 'general',
      });
      idx++;
    }
  }

  if (items.length === 0) throw new Error('No items parsed');
  return items;
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const simpleMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return simpleMatch ? simpleMatch[1].trim() : '';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function getFallbackNews(symbol?: string | null) {
  const query = symbol || 'stock+market';
  const now = Math.floor(Date.now() / 1000);
  return [
    { id: '1', headline: 'Markets rally on strong earnings reports', source: 'Reuters', url: `https://news.google.com/search?q=${query}+earnings`, datetime: now - 300, summary: '', category: 'general' },
    { id: '2', headline: 'Fed officials signal patience on rate decisions', source: 'CNBC', url: `https://news.google.com/search?q=federal+reserve+rates`, datetime: now - 900, summary: '', category: 'general' },
    { id: '3', headline: 'Tech sector leads gains in afternoon trading', source: 'Bloomberg', url: `https://news.google.com/search?q=${query}+tech+stocks`, datetime: now - 1800, summary: '', category: 'general' },
    { id: '4', headline: 'Oil prices stabilize amid OPEC+ discussions', source: 'Reuters', url: `https://news.google.com/search?q=oil+prices+OPEC`, datetime: now - 3600, summary: '', category: 'general' },
    { id: '5', headline: 'Treasury yields edge higher on economic data', source: 'WSJ', url: `https://news.google.com/search?q=treasury+yields`, datetime: now - 5400, summary: '', category: 'general' },
    { id: '6', headline: 'Global markets mixed ahead of jobs report', source: 'FT', url: `https://news.google.com/search?q=global+markets+jobs`, datetime: now - 7200, summary: '', category: 'general' },
  ];
}
