'use client';

import { useQuotes } from '@/hooks/useQuote';
import { formatPrice, formatPercent } from '@/lib/format';

const TAPE_SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'BTC-USD', 'ETH-USD', 'GC=F', 'CL=F', 'EURUSD=X',
];

const DISPLAY: Record<string, string> = {
  '^GSPC': 'S&P 500', '^DJI': 'DOW', '^IXIC': 'NASDAQ',
  'GC=F': 'GOLD', 'CL=F': 'OIL', 'EURUSD=X': 'EUR/USD',
  'BTC-USD': 'BTC', 'ETH-USD': 'ETH',
};

export default function TickerTape() {
  const { data: quotes } = useQuotes(TAPE_SYMBOLS);

  if (!quotes || quotes.length === 0) return null;

  const items = quotes.map((q) => {
    const isPositive = q.regularMarketChange >= 0;
    const name = DISPLAY[q.symbol] || q.symbol;
    return { name, price: q.regularMarketPrice, pct: q.regularMarketChangePercent, isPositive, currency: q.currency };
  });

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="h-6 bg-bloomberg-bg-header border-b border-bloomberg-border overflow-hidden relative">
      <div className="ticker-scroll flex items-center h-full whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={`${item.name}-${i}`} className="inline-flex items-center gap-1.5 px-3 text-[11px]">
            <span className="text-bloomberg-amber font-bold">{item.name}</span>
            <span className="text-bloomberg-text-secondary">{formatPrice(item.price, item.currency)}</span>
            <span className={`font-bold ${item.isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'}`}>
              {formatPercent(item.pct)}
            </span>
            <span className="text-bloomberg-border mx-1">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
