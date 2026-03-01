'use client';

import { useTerminalStore } from '@/store/terminal';
import { useQuote } from '@/hooks/useQuote';
import { usePolygonLive } from '@/hooks/usePolygonLive';
import { isEquityTicker } from '@/lib/polygon';
import { formatPrice } from '@/lib/format';

// Deterministic order book simulation anchored on real bid/ask when available
function simulateOrderBook(
  price: number,
  liveBid?: number,
  liveAsk?: number
) {
  if (!price || price <= 0) return { bids: [], asks: [] };

  const isHighPrice = price > 500;
  const isMidPrice = price > 50;
  const tickSize = isHighPrice ? 0.10 : isMidPrice ? 0.01 : 0.001;

  const bidAnchor = liveBid ?? price;
  const askAnchor = liveAsk ?? price;

  const r = (n: number) => {
    const x = Math.sin(n * 9301 + price * 49297 + 233280) * 10000;
    return Math.abs(x - Math.floor(x));
  };

  const bids: { price: number; size: number }[] = [];
  const asks: { price: number; size: number }[] = [];

  for (let i = 0; i < 8; i++) {
    const bidPrice = bidAnchor - i * tickSize;
    const askPrice = askAnchor + i * tickSize;
    const bidSize = Math.round((r(i * 3 + 1) * 4800 + 200) / 100) * 100;
    const askSize = Math.round((r(i * 3 + 2) * 4800 + 200) / 100) * 100;
    bids.push({ price: bidPrice, size: bidSize });
    asks.push({ price: askPrice, size: askSize });
  }

  // Asks shown top-to-bottom (highest first)
  return { bids, asks: [...asks].reverse() };
}

function pct52w(price: number, low: number, high: number) {
  if (high <= low) return 0;
  return Math.round(((price - low) / (high - low)) * 100);
}

function estimateVWAP(open: number, high: number, low: number, close: number) {
  return (open + high + low + close * 2) / 5;
}

export default function RightPanel() {
  const { activeSymbol } = useTerminalStore();
  const { data: quote } = useQuote(activeSymbol);

  // Live bid/ask from Polygon WS (equity only)
  const liveSymbols = activeSymbol && isEquityTicker(activeSymbol) ? [activeSymbol] : [];
  const { quotes: liveQuotes, wsStatus } = usePolygonLive(liveSymbols);
  const liveQuote = activeSymbol ? liveQuotes.get(activeSymbol) : undefined;
  const isLive = wsStatus === 'authenticated' && !!liveQuote;

  const price = quote?.regularMarketPrice ?? 0;
  const { bids, asks } = simulateOrderBook(
    price,
    liveQuote?.bidPrice,
    liveQuote?.askPrice
  );

  const maxSize = Math.max(
    ...bids.map((b) => b.size),
    ...asks.map((a) => a.size),
    1
  );

  const spread = asks.length && bids.length
    ? asks[asks.length - 1].price - bids[0].price
    : 0;

  const vwap = quote
    ? estimateVWAP(
        quote.regularMarketOpen ?? price,
        quote.regularMarketDayHigh ?? price,
        quote.regularMarketDayLow ?? price,
        price
      )
    : 0;

  const w52High = quote?.fiftyTwoWeekHigh ?? 0;
  const w52Low  = quote?.fiftyTwoWeekLow ?? 0;
  const pctPos  = w52High > w52Low ? pct52w(price, w52Low, w52High) : 0;

  return (
    <div
      className="shrink-0 flex flex-col border-l border-bloomberg-border bg-bloomberg-bg-header text-[10px] font-mono overflow-hidden"
      style={{ width: 210 }}
    >
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-bloomberg-orange font-bold tracking-widest text-[9px]">ORDER BOOK</span>
          {isLive && (
            <span className="text-bloomberg-green font-bold text-[8px] animate-pulse">● LIVE</span>
          )}
        </div>
        {activeSymbol && (
          <span className="text-bloomberg-yellow font-bold text-[9px]">{activeSymbol}</span>
        )}
      </div>

      {!activeSymbol || !quote ? (
        <NoSymbol />
      ) : (
        <>
          {/* Last price row */}
          <div className="px-2 py-1 border-b border-bloomberg-border flex items-center justify-between shrink-0">
            <span className="text-bloomberg-text-muted text-[9px]">LAST</span>
            <span
              className={`font-bold text-[11px] ${
                (quote.regularMarketChange ?? 0) >= 0
                  ? 'text-bloomberg-green'
                  : 'text-bloomberg-red'
              }`}
            >
              {formatPrice(price, quote.currency)}
            </span>
          </div>

          {/* ASK side */}
          <div className="px-0 shrink-0">
            <div className="px-2 py-0.5 flex items-center gap-1">
              <span className="text-bloomberg-red font-bold text-[8px] tracking-widest">ASKS</span>
            </div>
            {asks.map((a, i) => {
              const barPct = Math.round((a.size / maxSize) * 100);
              const isTopOfBook = i === asks.length - 1 && isLive;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-between px-2 h-[18px] overflow-hidden"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 ob-bar-ask"
                    style={{ width: `${barPct}%` }}
                  />
                  <span
                    className={`relative font-mono text-[9px] tabular-nums ${
                      isTopOfBook ? 'text-bloomberg-orange font-bold' : 'text-bloomberg-red'
                    }`}
                  >
                    {formatPrice(a.price, quote.currency)}
                  </span>
                  <span className="relative text-bloomberg-text-muted font-mono text-[9px] tabular-nums">
                    {a.size.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Spread */}
          <div className="px-2 py-0.5 border-y border-bloomberg-border/60 flex items-center justify-between shrink-0">
            <span className="text-bloomberg-text-muted text-[8px]">SPR</span>
            <span className="text-bloomberg-amber font-bold text-[9px] tabular-nums">
              {spread > 0 ? `$${spread.toFixed(2)}` : '—'}
            </span>
          </div>

          {/* BID side */}
          <div className="px-0 shrink-0">
            {bids.map((b, i) => {
              const barPct = Math.round((b.size / maxSize) * 100);
              const isTopOfBook = i === 0 && isLive;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-between px-2 h-[18px] overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 ob-bar-bid"
                    style={{ width: `${barPct}%` }}
                  />
                  <span
                    className={`relative font-mono text-[9px] tabular-nums ${
                      isTopOfBook ? 'text-bloomberg-orange font-bold' : 'text-bloomberg-green'
                    }`}
                  >
                    {formatPrice(b.price, quote.currency)}
                  </span>
                  <span className="relative text-bloomberg-text-muted font-mono text-[9px] tabular-nums">
                    {b.size.toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div className="px-2 py-0.5">
              <span className="text-bloomberg-green font-bold text-[8px] tracking-widest">BIDS</span>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-2 border-t border-bloomberg-border" />

          {/* Key stats */}
          <div className="px-2 py-1.5 flex flex-col gap-1.5 shrink-0">
            {/* VWAP */}
            <div className="flex items-center justify-between">
              <span className="text-bloomberg-text-muted text-[9px]">VWAP</span>
              <span className="text-bloomberg-cyan font-bold text-[9px] tabular-nums">
                {vwap > 0 ? formatPrice(vwap, quote.currency) : '—'}
              </span>
            </div>

            {/* 52W Range */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-bloomberg-text-muted text-[9px]">52W H</span>
                <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                  {w52High > 0 ? formatPrice(w52High, quote.currency) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bloomberg-text-muted text-[9px]">52W L</span>
                <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                  {w52Low > 0 ? formatPrice(w52Low, quote.currency) : '—'}
                </span>
              </div>
              {w52High > w52Low && (
                <div className="mt-0.5">
                  <div className="h-1 bg-bloomberg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bloomberg-orange rounded-full transition-all duration-500"
                      style={{ width: `${pctPos}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-bloomberg-text-muted text-[7px]">L</span>
                    <span className="text-bloomberg-orange text-[7px] font-bold">{pctPos}%</span>
                    <span className="text-bloomberg-text-muted text-[7px]">H</span>
                  </div>
                </div>
              )}
            </div>

            {/* Open / Prev Close */}
            <div className="flex items-center justify-between">
              <span className="text-bloomberg-text-muted text-[9px]">OPEN</span>
              <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                {formatPrice(quote.regularMarketOpen, quote.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-bloomberg-text-muted text-[9px]">PREV</span>
              <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                {formatPrice(quote.regularMarketPreviousClose, quote.currency)}
              </span>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-between border-t border-bloomberg-border pt-1">
              <span className="text-bloomberg-text-muted text-[9px]">VOL</span>
              <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                {quote.regularMarketVolume
                  ? (quote.regularMarketVolume / 1e6).toFixed(2) + 'M'
                  : '—'}
              </span>
            </div>

            {/* P/E */}
            {quote.trailingPE ? (
              <div className="flex items-center justify-between">
                <span className="text-bloomberg-text-muted text-[9px]">P/E</span>
                <span className="text-bloomberg-amber text-[9px] tabular-nums">
                  {quote.trailingPE.toFixed(1)}x
                </span>
              </div>
            ) : null}

            {/* Market cap */}
            {quote.marketCap ? (
              <div className="flex items-center justify-between">
                <span className="text-bloomberg-text-muted text-[9px]">MCAP</span>
                <span className="text-bloomberg-text-secondary text-[9px] tabular-nums">
                  ${(quote.marketCap / 1e9).toFixed(1)}B
                </span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function NoSymbol() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2">
      <div className="text-bloomberg-text-muted text-[8px] text-center leading-relaxed tracking-wide">
        ENTER TICKER TO VIEW ORDER BOOK
      </div>
      <div className="text-bloomberg-text-muted text-[8px] text-center">
        e.g. AAPL
      </div>
      <div className="mt-4 w-full flex flex-col gap-1.5 px-1">
        {['S&P 500', 'NASDAQ', 'DOW', 'VIX'].map((label) => (
          <div
            key={label}
            className="flex justify-between text-[8px] border-b border-bloomberg-border pb-0.5"
          >
            <span className="text-bloomberg-text-muted">{label}</span>
            <span className="text-bloomberg-text-muted">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
