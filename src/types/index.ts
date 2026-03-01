export interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  marketCap?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageDailyVolume3Month?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  currency?: string;
  exchange?: string;
}

export interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary: string;
  category: string;
  image?: string;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  addedAt: number;
}

export interface PanelConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  component: PanelType;
}

export type PanelType =
  | 'market-overview'
  | 'stock-detail'
  | 'watchlist'
  | 'news'
  | 'portfolio'
  | 'chart'
  | 'notes'
  | 'price-recorder'
  | 'macro'
  | 'earnings'
  | 'movers'
  | 'sector-rotation';

export interface YieldPoint {
  maturity: string;
  months: number;
  current: number | null;
  yearAgo: number | null;
}

export interface MacroIndicator {
  id: string;
  name: string;
  shortName: string;
  value: number | null;
  change: number | null;
  changeLabel: string;
  unit: string;
  frequency: string;
  date: string;
  status: 'normal' | 'warning' | 'danger';
}

export type RecorderInterval = 1 | 5 | 15 | 30 | 60;

export interface PriceSnapshot {
  id: string;
  timestamp: number;
  ticker: string;
  lastPrice: number;
  openPrice: number;
  change: number;
  pctChange: number;
  volume: number;
  bid?: number;
  ask?: number;
}

export interface RecorderSettings {
  tickers: string[];
  interval: RecorderInterval;
  highlightThreshold: number;
  alertThreshold: number;
  marketOpen: string;
  marketClose: string;
}

export type CommandAction =
  | { type: 'NAVIGATE'; panel: PanelType }
  | { type: 'TICKER'; symbol: string }
  | { type: 'SEARCH'; query: string };

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export interface SearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
}

export interface PolygonLiveTrade {
  price: number;
  size: number;
  timestamp: number;
  symbol: string;
}

export interface PolygonLiveQuote {
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  symbol: string;
}

export type PolygonWsStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated';
