'use client';

import dynamic from 'next/dynamic';
import { useTerminalStore } from '@/store/terminal';
import { useQuote } from '@/hooks/useQuote';
import { useQuoteSummary } from '@/hooks/useQuoteSummary';
import { formatPrice, formatChange, formatPercent } from '@/lib/format';
import KeyStats from './KeyStats';
import CompanyProfile from './CompanyProfile';

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
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-bloomberg-amber font-bold text-lg">
              {activeSymbol}
            </span>
            <span className="text-bloomberg-text-secondary text-sm">
              {quote.shortName || quote.longName}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold text-bloomberg-orange">
              {formatPrice(quote.regularMarketPrice, quote.currency)}
            </span>
            <span
              className={`text-sm font-bold ${
                isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
              }`}
            >
              {formatChange(quote.regularMarketChange)}
            </span>
            <span
              className={`text-sm ${
                isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
              }`}
            >
              ({formatPercent(quote.regularMarketChangePercent)})
            </span>
          </div>
        </div>
        <button
          onClick={() => addToWatchlist(activeSymbol)}
          disabled={isInWatchlist}
          className={`px-3 py-1.5 text-xs border rounded ${
            isInWatchlist
              ? 'border-bloomberg-text-muted text-bloomberg-text-muted cursor-default'
              : 'border-bloomberg-orange text-bloomberg-orange hover:bg-bloomberg-orange hover:text-black'
          }`}
        >
          {isInWatchlist ? 'IN WATCHLIST' : '+ WATCHLIST'}
        </button>
      </div>

      {/* Chart */}
      <div className="h-[300px] shrink-0">
        <PriceChart symbol={activeSymbol} />
      </div>

      {/* Stats and Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        <div>
          <h3 className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider mb-2">
            Key Statistics
          </h3>
          <KeyStats quote={quote} summary={summary} />
        </div>
        <div>
          <h3 className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider mb-2">
            Company Profile
          </h3>
          <CompanyProfile summary={summary} />
        </div>
      </div>
    </div>
  );
}
