'use client';

import { useEffect, useRef, useState } from 'react';
import { getPolygonWS } from '@/lib/polygon-ws';
import { isEquityTicker } from '@/lib/polygon';
import type { PolygonLiveTrade, PolygonLiveQuote, PolygonWsStatus } from '@/types';

export function usePolygonLive(symbols: string[]) {
  const equitySymbols = symbols.filter(isEquityTicker);
  const symbolsKey = equitySymbols.join(',');

  const [trades, setTrades] = useState<Map<string, PolygonLiveTrade>>(new Map());
  const [quotes, setQuotes] = useState<Map<string, PolygonLiveQuote>>(new Map());
  const [wsStatus, setWsStatus] = useState<PolygonWsStatus>('disconnected');

  // Set up WS listeners and trigger connection once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ws = getPolygonWS();

    const handleStatus = (data: unknown) => {
      setWsStatus(data as PolygonWsStatus);
    };

    const handleTrade = (data: unknown) => {
      const msg = data as { sym: string; p: number; s: number; t: number };
      setTrades((prev) => {
        const next = new Map(prev);
        next.set(msg.sym, { price: msg.p, size: msg.s, timestamp: msg.t, symbol: msg.sym });
        return next;
      });
    };

    const handleQuote = (data: unknown) => {
      const msg = data as { sym: string; bp: number; bs: number; ap: number; as: number };
      setQuotes((prev) => {
        const next = new Map(prev);
        next.set(msg.sym, {
          bidPrice: msg.bp,
          bidSize: msg.bs,
          askPrice: msg.ap,
          askSize: msg.as,
          symbol: msg.sym,
        });
        return next;
      });
    };

    ws.on('status', handleStatus);
    ws.on('T', handleTrade);
    ws.on('Q', handleQuote);

    ws.connect();
    setWsStatus(ws.getStatus());

    return () => {
      ws.off('status', handleStatus);
      ws.off('T', handleTrade);
      ws.off('Q', handleQuote);
    };
  }, []);

  // Subscribe / unsubscribe when symbol list changes
  const prevSymbolsKeyRef = useRef('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (equitySymbols.length === 0) return;

    const ws = getPolygonWS();
    const channels = equitySymbols.flatMap((s) => [`T.${s}`, `Q.${s}`]);
    ws.subscribe(channels);
    prevSymbolsKeyRef.current = symbolsKey;

    return () => {
      ws.unsubscribe(channels);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { trades, quotes, wsStatus };
}
