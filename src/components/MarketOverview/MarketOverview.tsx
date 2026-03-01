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
      <div className="px-2 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0" style={{ background: '#001c1c' }}>
        <div className="flex items-center gap-2">
          <span className="text-bloomberg-orange text-[9px] font-bold tracking-widest uppercase">
            GLOBAL MARKETS
          </span>
          <span className="text-bloomberg-text-muted text-[8px]">EQUITIES / FUTURES / FX / CRYPTO</span>
        </div>
        <span className="text-bloomberg-text-muted text-[8px] tabular-nums">
          REFRESH 10S
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-px" style={{ gap: 1 }}>
            {quotes.map((quote) => (
              <MarketTile key={quote.symbol} quote={quote} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
