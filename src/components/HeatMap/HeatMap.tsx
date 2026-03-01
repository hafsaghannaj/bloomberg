'use client';

import { useQuotes } from '@/hooks/useQuote';
import { useTerminalStore } from '@/store/terminal';
import { formatPercent } from '@/lib/format';

const SECTORS: { name: string; symbols: { symbol: string; name: string; weight: number }[] }[] = [
  {
    name: 'Technology',
    symbols: [
      { symbol: 'AAPL', name: 'AAPL', weight: 7 },
      { symbol: 'MSFT', name: 'MSFT', weight: 6.5 },
      { symbol: 'NVDA', name: 'NVDA', weight: 5 },
      { symbol: 'GOOGL', name: 'GOOGL', weight: 4 },
      { symbol: 'META', name: 'META', weight: 2.5 },
      { symbol: 'AVGO', name: 'AVGO', weight: 2 },
    ],
  },
  {
    name: 'Consumer',
    symbols: [
      { symbol: 'AMZN', name: 'AMZN', weight: 4 },
      { symbol: 'TSLA', name: 'TSLA', weight: 2 },
      { symbol: 'HD', name: 'HD', weight: 1.5 },
      { symbol: 'MCD', name: 'MCD', weight: 1 },
    ],
  },
  {
    name: 'Healthcare',
    symbols: [
      { symbol: 'UNH', name: 'UNH', weight: 2 },
      { symbol: 'JNJ', name: 'JNJ', weight: 1.8 },
      { symbol: 'LLY', name: 'LLY', weight: 2.5 },
      { symbol: 'PFE', name: 'PFE', weight: 1 },
    ],
  },
  {
    name: 'Financial',
    symbols: [
      { symbol: 'BRK-B', name: 'BRK.B', weight: 2 },
      { symbol: 'JPM', name: 'JPM', weight: 1.8 },
      { symbol: 'V', name: 'V', weight: 1.5 },
      { symbol: 'MA', name: 'MA', weight: 1.2 },
    ],
  },
  {
    name: 'Energy',
    symbols: [
      { symbol: 'XOM', name: 'XOM', weight: 1.5 },
      { symbol: 'CVX', name: 'CVX', weight: 1.2 },
    ],
  },
  {
    name: 'Industrials',
    symbols: [
      { symbol: 'CAT', name: 'CAT', weight: 1 },
      { symbol: 'GE', name: 'GE', weight: 1.2 },
      { symbol: 'BA', name: 'BA', weight: 0.8 },
    ],
  },
];

const ALL_SYMBOLS = SECTORS.flatMap((s) => s.symbols.map((sym) => sym.symbol));

function getHeatColor(pct: number): string {
  if (pct >= 3) return '#004d22';
  if (pct >= 2) return '#003d1c';
  if (pct >= 1) return '#002e15';
  if (pct >= 0.5) return '#001f0e';
  if (pct >= 0) return '#050f05';
  if (pct >= -0.5) return '#0f0505';
  if (pct >= -1) return '#1f0000';
  if (pct >= -2) return '#330000';
  if (pct >= -3) return '#4d0000';
  return '#660000';
}

export default function HeatMap() {
  const { data: quotes, isLoading } = useQuotes(ALL_SYMBOLS);
  const { setActiveSymbol, setActiveView } = useTerminalStore();

  const quoteMap = new Map<string, { pct: number; price: number }>();
  if (quotes) {
    quotes.forEach((q) => {
      quoteMap.set(q.symbol, {
        pct: q.regularMarketChangePercent,
        price: q.regularMarketPrice,
      });
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0" style={{ background: '#001c1c' }}>
        <span className="text-bloomberg-orange text-[9px] font-bold tracking-widest uppercase">
          HEAT MAP
        </span>
        <span className="text-bloomberg-text-muted text-[8px]">S&P 500 TOP HOLDINGS</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-text-muted text-sm animate-pulse">Loading heat map...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {SECTORS.map((sector) => (
              <div key={sector.name}>
                <div className="text-bloomberg-text-muted text-[9px] uppercase tracking-wider px-1 mb-0.5">
                  {sector.name}
                </div>
                <div className="flex gap-0.5 flex-wrap">
                  {sector.symbols.map((sym) => {
                    const data = quoteMap.get(sym.symbol);
                    const pct = data?.pct ?? 0;
                    const minW = Math.max(sym.weight * 14, 50);
                    const minH = Math.max(sym.weight * 8, 36);

                    return (
                      <button
                        key={sym.symbol}
                        onClick={() => {
                          setActiveSymbol(sym.symbol);
                          setActiveView('stock-detail');
                        }}
                        className="rounded-sm flex flex-col items-center justify-center transition-transform hover:scale-105 hover:z-10 relative"
                        style={{
                          backgroundColor: getHeatColor(pct),
                          minWidth: `${minW}px`,
                          minHeight: `${minH}px`,
                          flex: `${sym.weight} 1 0`,
                        }}
                      >
                        <span className="font-bold text-[10px] leading-none" style={{ color: pct >= 0 ? '#00FF66' : '#FF3333' }}>
                          {sym.name}
                        </span>
                        <span className="text-[9px] leading-none mt-0.5" style={{ color: pct >= 0 ? '#00cc52' : '#cc2222' }}>
                          {formatPercent(pct)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
