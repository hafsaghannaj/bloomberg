'use client';

import { useRef, useEffect, useState } from 'react';
import { useQuotes } from '@/hooks/useQuote';
import { usePolygonLive } from '@/hooks/usePolygonLive';
import { formatPrice, formatPercent } from '@/lib/format';
import type { PolygonLiveTrade } from '@/types';

const TAPE_SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'JPM', 'GS',
  'BTC-USD', 'ETH-USD', 'GC=F', 'CL=F', 'SI=F', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X',
];

// Equity symbols eligible for WS subscription
const EQUITY_TAPE_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'JPM', 'GS'];

const DISPLAY: Record<string, string> = {
  '^GSPC': 'SPX', '^DJI': 'INDU', '^IXIC': 'NDX', '^RUT': 'RTY', '^VIX': 'VIX',
  'GC=F': 'GOLD', 'CL=F': 'WTI', 'SI=F': 'SILVER',
  'BTC-USD': 'BTC/USD', 'ETH-USD': 'ETH/USD',
  'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'GBPUSD=X': 'GBP/USD',
};

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pct: number;
  isPositive: boolean;
  currency: string;
}

export default function TickerTape() {
  const { data: quotes, dataUpdatedAt } = useQuotes(TAPE_SYMBOLS) as {
    data: Array<{
      symbol: string;
      regularMarketPrice: number;
      regularMarketChange: number;
      regularMarketChangePercent: number;
      currency: string;
      shortName?: string;
    }> | undefined;
    dataUpdatedAt: number;
  };

  const { trades, wsStatus } = usePolygonLive(EQUITY_TAPE_SYMBOLS);

  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const tradesRef = useRef<Map<string, PolygonLiveTrade>>(new Map());
  const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map());

  // Flash on REST price updates (skip symbols that have live WS overrides)
  useEffect(() => {
    if (!quotes || quotes.length === 0) return;

    const newFlash = new Map<string, 'up' | 'down'>();
    quotes.forEach((q) => {
      if (tradesRef.current.has(q.symbol)) return; // WS overrides REST for equities
      const prev = prevPricesRef.current.get(q.symbol);
      if (prev !== undefined && prev !== q.regularMarketPrice) {
        newFlash.set(q.symbol, q.regularMarketPrice > prev ? 'up' : 'down');
      }
      prevPricesRef.current.set(q.symbol, q.regularMarketPrice);
    });

    if (newFlash.size > 0) {
      setFlashMap(newFlash);
      const id = setTimeout(() => setFlashMap(new Map()), 800);
      return () => clearTimeout(id);
    }
  }, [dataUpdatedAt, quotes]);

  // Flash on WS trade events
  useEffect(() => {
    tradesRef.current = trades;
    if (trades.size === 0) return;

    const newFlash = new Map<string, 'up' | 'down'>();
    trades.forEach((trade, symbol) => {
      const prev = prevPricesRef.current.get(symbol);
      if (prev !== undefined && prev !== trade.price) {
        newFlash.set(symbol, trade.price > prev ? 'up' : 'down');
      }
      prevPricesRef.current.set(symbol, trade.price);
    });

    if (newFlash.size > 0) {
      setFlashMap(newFlash);
      const id = setTimeout(() => setFlashMap(new Map()), 800);
      return () => clearTimeout(id);
    }
  }, [trades]);

  if (!quotes || quotes.length === 0) {
    return (
      <div
        className="h-5 border-b border-bloomberg-border flex items-center px-3"
        style={{ background: '#001c1c' }}
      >
        <span className="text-bloomberg-text-muted text-[9px] animate-pulse tracking-widest">
          LOADING MARKET DATA...
        </span>
      </div>
    );
  }

  const items: TickerItem[] = quotes.map((q) => {
    const liveTrade = trades.get(q.symbol);
    return {
      symbol: q.symbol,
      name: DISPLAY[q.symbol] || q.symbol,
      price: liveTrade?.price ?? q.regularMarketPrice,
      change: q.regularMarketChange,
      pct: q.regularMarketChangePercent,
      isPositive: q.regularMarketChange >= 0,
      currency: q.currency,
    };
  });

  const doubled = [...items, ...items];

  return (
    <div
      className="h-5 border-b border-bloomberg-border overflow-hidden relative shrink-0"
      style={{ background: '#030303' }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #030303 0%, transparent 100%)' }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(270deg, #030303 0%, transparent 100%)' }}
      />

      {/* LIVE indicator — shown when WS authenticated */}
      {wsStatus === 'authenticated' && (
        <div className="absolute right-9 top-0 bottom-0 z-20 flex items-center">
          <span className="text-bloomberg-green text-[8px] font-bold animate-pulse tracking-widest">
            ● LIVE
          </span>
        </div>
      )}

      <div className="ticker-scroll flex items-center h-full whitespace-nowrap">
        {doubled.map((item, i) => {
          const flash = flashMap.get(item.symbol);
          return (
            <span
              key={`${item.symbol}-${i}`}
              className={`
                inline-flex items-center gap-1 px-2.5 h-full text-[9px] select-none
                ${flash === 'up' ? 'flash-green' : flash === 'down' ? 'flash-red' : ''}
              `}
            >
              {/* Symbol name */}
              <span className="font-bold tracking-wider" style={{ color: '#CCA800' }}>
                {item.name}
              </span>

              {/* Price */}
              <span className="tabular-nums" style={{ color: '#CCCCCC' }}>
                {formatPrice(item.price, item.currency)}
              </span>

              {/* Change % */}
              <span
                className="font-bold tabular-nums"
                style={{ color: item.isPositive ? '#00FF66' : '#FF3333' }}
              >
                {item.isPositive ? '+' : ''}{formatPercent(item.pct)}
              </span>

              {/* Change abs */}
              <span
                className="tabular-nums text-[8px]"
                style={{ color: item.isPositive ? '#00cc52' : '#cc2222' }}
              >
                ({item.isPositive ? '+' : ''}{item.change.toFixed(2)})
              </span>

              {/* Separator */}
              <span style={{ color: '#003333', marginLeft: 2, marginRight: 2 }}>│</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
