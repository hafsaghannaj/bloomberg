'use client';

import dynamic from 'next/dynamic';
import { useTerminalStore } from '@/store/terminal';
import { useQuote } from '@/hooks/useQuote';
import { useQuoteSummary } from '@/hooks/useQuoteSummary';
import { formatPrice, formatChange, formatPercent } from '@/lib/format';
import FundamentalsPanel from './FundamentalsPanel';

const PriceChart = dynamic(() => import('@/components/Chart/PriceChart'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-bloomberg-bg-panel">
      <span className="text-bloomberg-text-muted text-sm">Loading chart...</span>
    </div>
  ),
});

export default function StockDetail() {
  const { activeSymbol, addToWatchlist, watchlist } = useTerminalStore();
  const { data: quote, isLoading, error } = useQuote(activeSymbol);
  const { data: summary } = useQuoteSummary(activeSymbol);

  if (!activeSymbol) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-bloomberg-text-muted text-sm">
          Type a ticker in the command bar to view details
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-bloomberg-text-muted text-sm">
          Loading {activeSymbol}...
        </span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-bloomberg-red text-sm">
          Failed to load data for {activeSymbol}
        </span>
      </div>
    );
  }

  const isPositive = quote.regularMarketChange >= 0;
  const isInWatchlist = watchlist.some((w) => w.symbol === activeSymbol);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0" style={{ background: '#001c1c' }}>
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider" style={{ color: '#FFFF00' }}>
                {activeSymbol}
              </span>
              <span className="text-[9px] px-1 border border-bloomberg-border" style={{ color: '#006262' }}>
                US EQUITY
              </span>
            </div>
            <div className="text-[9px] mt-0.5 truncate max-w-[200px]" style={{ color: '#009090' }}>
              {quote.shortName || quote.longName}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold tabular-nums" style={{ color: '#CCA800', fontSize: 18 }}>
              {formatPrice(quote.regularMarketPrice, quote.currency)}
            </span>
            <div className="flex flex-col">
              <span
                className="font-bold text-[11px] tabular-nums"
                style={{ color: isPositive ? '#00FF66' : '#FF3333' }}
              >
                {isPositive ? '▲' : '▼'} {formatChange(quote.regularMarketChange)}
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: isPositive ? '#00cc52' : '#cc2222' }}
              >
                {formatPercent(quote.regularMarketChangePercent)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => addToWatchlist(activeSymbol)}
          disabled={isInWatchlist}
          className="text-[9px] border px-2 py-1 font-bold tracking-wider transition-colors"
          style={{
            borderColor: isInWatchlist ? '#006262' : '#CCA800',
            color: isInWatchlist ? '#006262' : '#CCA800',
            cursor: isInWatchlist ? 'default' : 'pointer',
          }}
        >
          {isInWatchlist ? '★ WATCHLIST' : '+ WATCHLIST'}
        </button>
      </div>

      {/* Chart */}
      <div className="h-[280px] shrink-0">
        <PriceChart symbol={activeSymbol} />
      </div>

      {/* Fundamentals panel — tabbed, fills remaining height */}
      <div className="flex-1 min-h-0 border-t border-bloomberg-border">
        {summary ? (
          <FundamentalsPanel summary={summary as Record<string, unknown>} quote={quote} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[9px]" style={{ color: '#006262' }}>Loading fundamentals…</span>
          </div>
        )}
      </div>
    </div>
  );
}
