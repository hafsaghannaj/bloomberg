'use client';

import { useTerminalStore } from '@/store/terminal';
import { useQuotes } from '@/hooks/useQuote';
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/format';
import { X } from 'lucide-react';

export default function Watchlist() {
  const { watchlist, removeFromWatchlist, addTab } = useTerminalStore();

  const symbols = watchlist.map((w) => w.symbol);
  const { data: quotes } = useQuotes(symbols);

  const handleClick = (symbol: string) => {
    addTab(symbol, symbol);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
          Watchlist
        </span>
        <span className="text-bloomberg-text-muted text-[10px]">
          {watchlist.length} ITEMS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-text-muted text-xs">
              Type a ticker and use + WATCHLIST to add
            </span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-bloomberg-text-muted border-b border-bloomberg-border">
                <th className="text-left py-1.5 px-2">Symbol</th>
                <th className="text-right py-1.5 px-2">Last</th>
                <th className="text-right py-1.5 px-2">Chg</th>
                <th className="text-right py-1.5 px-2">Chg%</th>
                <th className="text-right py-1.5 px-2">Vol</th>
                <th className="py-1.5 px-1 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item, idx) => {
                const quote = quotes?.[idx];
                const isPositive = quote
                  ? quote.regularMarketChange >= 0
                  : true;
                return (
                  <tr
                    key={item.symbol}
                    className="border-b border-bloomberg-border/50 hover:bg-bloomberg-bg-hover cursor-pointer"
                    onClick={() => handleClick(item.symbol)}
                  >
                    <td className="py-1.5 px-2 text-bloomberg-orange font-bold">
                      {item.symbol}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-secondary">
                      {quote ? formatPrice(quote.regularMarketPrice) : '...'}
                    </td>
                    <td
                      className={`py-1.5 px-2 text-right font-bold ${
                        isPositive
                          ? 'text-bloomberg-green'
                          : 'text-bloomberg-red'
                      }`}
                    >
                      {quote ? formatChange(quote.regularMarketChange) : '...'}
                    </td>
                    <td
                      className={`py-1.5 px-2 text-right ${
                        isPositive
                          ? 'text-bloomberg-green'
                          : 'text-bloomberg-red'
                      }`}
                    >
                      {quote
                        ? formatPercent(quote.regularMarketChangePercent)
                        : '...'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-muted">
                      {quote ? formatVolume(quote.regularMarketVolume) : '...'}
                    </td>
                    <td className="py-1.5 px-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.symbol);
                        }}
                        className="text-bloomberg-text-muted hover:text-bloomberg-red"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
