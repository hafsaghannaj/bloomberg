'use client';

import { useQuotes } from '@/hooks/useQuote';
import MarketTile from './MarketTile';

const MARKET_SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC', '^RUT',
  'GC=F', 'CL=F',
  'EURUSD=X', 'USDJPY=X',
  'BTC-USD', 'ETH-USD',
];

export default function MarketOverview() {
  const { data: quotes, isLoading, error } = useQuotes(MARKET_SYMBOLS);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
          Market Overview
        </span>
        <span className="text-bloomberg-text-muted text-[10px]">
          AUTO-REFRESH 10S
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-text-muted text-sm">
              Loading market data...
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-red text-sm">
              Failed to load market data
            </span>
          </div>
        )}

        {quotes && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
            {quotes.map((quote) => (
              <MarketTile key={quote.symbol} quote={quote} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
