'use client';

import { Quote } from '@/types';
import { formatPrice, formatChange, formatPercent } from '@/lib/format';
import Sparkline from '@/components/Chart/Sparkline';
import { useChart } from '@/hooks/useChart';
import { useTerminalStore } from '@/store/terminal';

const DISPLAY_NAMES: Record<string, string> = {
  '^GSPC': 'SPX',
  '^DJI': 'INDU',
  '^IXIC': 'CCMP',
  '^RUT': 'RTY',
  '^VIX': 'VIX',
  '^FTSE': 'UKX',
  '^N225': 'NKY',
  'GC=F': 'GOLD',
  'SI=F': 'SILVER',
  'CL=F': 'WTI',
  'NG=F': 'NATGAS',
  'EURUSD=X': 'EURUSD',
  'GBPUSD=X': 'GBPUSD',
  'USDJPY=X': 'USDJPY',
  'BTC-USD': 'XBTUSD',
  'ETH-USD': 'ETHUSD',
  'SOL-USD': 'SOLUSD',
};

const FULL_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500 Index',
  '^DJI': 'Dow Jones Ind Avg',
  '^IXIC': 'Nasdaq Composite',
  '^RUT': 'Russell 2000',
  '^VIX': 'CBOE Volatility',
  'GC=F': 'Gold Futures',
  'SI=F': 'Silver Futures',
  'CL=F': 'Crude Oil WTI',
  'EURUSD=X': 'Euro / USD',
  'USDJPY=X': 'USD / Yen',
  'GBPUSD=X': 'GBP / USD',
  'BTC-USD': 'Bitcoin USD',
  'ETH-USD': 'Ethereum USD',
};

interface Props {
  quote: Quote;
}

export default function MarketTile({ quote }: Props) {
  const { data: chartData } = useChart(quote.symbol, '1D');
  const { addTab } = useTerminalStore();

  const sparkData = chartData
    ? chartData.filter((d) => d.close != null).map((d) => ({ value: d.close }))
    : [];

  const isPositive = quote.regularMarketChange >= 0;
  const ticker = DISPLAY_NAMES[quote.symbol] || quote.symbol;
  const fullName = FULL_NAMES[quote.symbol] || quote.shortName || '';

  return (
    <button
      onClick={() => addTab(quote.symbol, ticker)}
      className="text-left w-full border border-bloomberg-border hover:border-bloomberg-orange transition-colors group"
      style={{ background: '#001a1a', padding: '6px 8px' }}
    >
      {/* Top row: ticker + exchange */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="font-bold text-[11px] tracking-wider group-hover:text-bloomberg-orange transition-colors"
          style={{ color: '#CCA800' }}
        >
          {ticker}
        </span>
        <span className="text-[8px]" style={{ color: '#006262' }}>
          {quote.exchange || 'US'}
        </span>
      </div>

      {/* Full name */}
      {fullName && (
        <div
          className="text-[8px] mb-1.5 truncate"
          style={{ color: '#006262' }}
        >
          {fullName}
        </div>
      )}

      {/* Price */}
      <div
        className="font-bold text-[13px] mb-1 tabular-nums"
        style={{ color: '#CCCCCC' }}
      >
        {formatPrice(quote.regularMarketPrice, quote.currency)}
      </div>

      {/* Change row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ color: isPositive ? '#00FF66' : '#FF3333' }}
        >
          {isPositive ? '▲' : '▼'} {formatChange(quote.regularMarketChange)}
        </span>
        <span
          className="text-[9px] tabular-nums"
          style={{ color: isPositive ? '#00cc52' : '#cc2222' }}
        >
          {formatPercent(quote.regularMarketChangePercent)}
        </span>
      </div>

      {/* Sparkline */}
      <div className="h-[24px]">
        <Sparkline data={sparkData} />
      </div>
    </button>
  );
}
