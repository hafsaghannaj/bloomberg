'use client';

import { Quote } from '@/types';
import { formatPrice, formatChange, formatPercent } from '@/lib/format';
import Sparkline from '@/components/Chart/Sparkline';
import { useChart } from '@/hooks/useChart';
import { useTerminalStore } from '@/store/terminal';

const DISPLAY_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^DJI': 'DOW JONES',
  '^IXIC': 'NASDAQ',
  '^RUT': 'RUSSELL 2K',
  '^FTSE': 'FTSE 100',
  '^N225': 'NIKKEI 225',
  'GC=F': 'GOLD',
  'SI=F': 'SILVER',
  'CL=F': 'CRUDE OIL',
  'NG=F': 'NAT GAS',
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'BTC-USD': 'BITCOIN',
  'ETH-USD': 'ETHEREUM',
  'SOL-USD': 'SOLANA',
};

interface Props {
  quote: Quote;
}

export default function MarketTile({ quote }: Props) {
  const { data: chartData } = useChart(quote.symbol, '1D');
  const { addTab } = useTerminalStore();

  const sparkData = chartData
    ? chartData
        .filter((d) => d.close != null)
        .map((d) => ({ value: d.close }))
    : [];

  const isPositive = quote.regularMarketChange >= 0;
  const displayName =
    DISPLAY_NAMES[quote.symbol] || quote.shortName || quote.symbol;

  return (
    <button
      onClick={() => addTab(quote.symbol, displayName)}
      className="bg-bloomberg-bg-panel border border-bloomberg-border rounded p-3 hover:border-bloomberg-orange transition-colors text-left w-full"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider">
          {displayName}
        </span>
        <span className="text-bloomberg-text-muted text-[10px]">
          {quote.symbol}
        </span>
      </div>

      <div className="text-lg font-bold text-bloomberg-orange mb-1">
        {formatPrice(quote.regularMarketPrice, quote.currency)}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-bold ${
            isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
          }`}
        >
          {formatChange(quote.regularMarketChange)}
        </span>
        <span
          className={`text-xs ${
            isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
          }`}
        >
          ({formatPercent(quote.regularMarketChangePercent)})
        </span>
      </div>

      <div className="h-[30px]">
        <Sparkline data={sparkData} />
      </div>
    </button>
  );
}
