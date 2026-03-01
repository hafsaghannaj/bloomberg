'use client';

import { useState, useEffect, useRef } from 'react';
import { useMovers, type MoverType, type MoverQuote } from '@/hooks/useMovers';
import { useTerminalStore } from '@/store/terminal';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPrice(v: number, currency = 'USD'): string {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function fmtMktCap(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
}

function fmtPE(v: number | null): string {
  if (v == null || v <= 0) return '—';
  return v.toFixed(1) + 'x';
}

// ─── Tab config ───────────────────────────────────────────────────────────────

interface TabConfig {
  key: MoverType;
  label: string;
  description: string;
  changeColor: (pct: number) => string;
}

const TABS: TabConfig[] = [
  { key: 'gainers',     label: 'GAINERS',    description: 'Top % gainers today',          changeColor: () => '#00FF66' },
  { key: 'losers',      label: 'LOSERS',     description: 'Top % losers today',            changeColor: () => '#FF3333' },
  { key: 'active',      label: 'MOST ACTIVE', description: 'Highest volume today',         changeColor: (p) => p >= 0 ? '#00FF66' : '#FF3333' },
  { key: 'shorted',     label: 'SHORTED',    description: 'Most shorted stocks',           changeColor: (p) => p >= 0 ? '#00FF66' : '#FF3333' },
  { key: 'undervalued', label: 'UNDERVALUED', description: 'Undervalued large-caps',       changeColor: (p) => p >= 0 ? '#00FF66' : '#FF3333' },
  { key: 'growth',      label: 'GROWTH TECH', description: 'Growth technology stocks',    changeColor: (p) => p >= 0 ? '#00FF66' : '#FF3333' },
];

// ─── 52-week position bar ─────────────────────────────────────────────────────

function WeekBar({ price, low, high }: { price: number; low: number; high: number }) {
  const range = high - low;
  const pct = range > 0 ? Math.max(0, Math.min(100, ((price - low) / range) * 100)) : 50;
  return (
    <div className="relative w-14 h-1 rounded-none" style={{ background: '#003333' }}>
      <div className="absolute top-0 h-full w-0.5" style={{ left: `${pct}%`, background: '#CCA800' }} />
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

function MoverRow({
  rank,
  quote,
  changeColor,
  onSymbolClick,
  prevPrice,
}: {
  rank: number;
  quote: MoverQuote;
  changeColor: (pct: number) => string;
  onSymbolClick: (s: string) => void;
  prevPrice?: number;
}) {
  const isPositive = quote.regularMarketChangePercent >= 0;
  const color = changeColor(quote.regularMarketChangePercent);
  const flashed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevPrice !== undefined && prevPrice !== quote.regularMarketPrice && rowRef.current) {
      if (flashed.current) return;
      flashed.current = true;
      const el = rowRef.current;
      el.style.background = isPositive ? 'rgba(0,255,102,0.08)' : 'rgba(255,51,51,0.08)';
      setTimeout(() => { if (el) el.style.background = ''; flashed.current = false; }, 600);
    }
  }, [quote.regularMarketPrice, prevPrice, isPositive]);

  return (
    <div
      ref={rowRef}
      className="grid items-center py-[5px] border-b cursor-pointer transition-colors"
      style={{
        borderColor: '#002222',
        gridTemplateColumns: '28px 72px 1fr 88px 80px 60px 70px 64px 56px',
        transition: 'background 0.3s',
      }}
      onClick={() => onSymbolClick(quote.symbol)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(204,168,0,0.04)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
    >
      {/* Rank */}
      <span className="text-[8px] tabular-nums" style={{ color: '#004545' }}>{rank}</span>

      {/* Symbol */}
      <span className="text-[10px] font-bold tracking-wider" style={{ color: '#FFFF00' }}>
        {quote.symbol}
      </span>

      {/* Company */}
      <span className="text-[8px] truncate pr-2" style={{ color: '#006262' }}>
        {quote.shortName}
      </span>

      {/* Price */}
      <span className="text-[10px] font-bold tabular-nums text-right" style={{ color: '#CCCCCC' }}>
        {fmtPrice(quote.regularMarketPrice, quote.currency)}
      </span>

      {/* Change */}
      <span className="text-[9px] font-bold tabular-nums text-right" style={{ color }}>
        {isPositive ? '▲' : '▼'} {Math.abs(quote.regularMarketChange).toFixed(2)}
      </span>

      {/* Change % with mini bar */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
          {isPositive ? '+' : ''}{quote.regularMarketChangePercent.toFixed(2)}%
        </span>
        <div className="w-10 h-1 rounded-none overflow-hidden" style={{ background: '#002a2a' }}>
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, Math.abs(quote.regularMarketChangePercent) * 5)}%`,
              background: color,
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* Volume */}
      <span className="text-[8px] tabular-nums text-right" style={{ color: '#007070' }}>
        {fmtVol(quote.regularMarketVolume)}
      </span>

      {/* Market cap */}
      <span className="text-[8px] tabular-nums text-right" style={{ color: '#007070' }}>
        {fmtMktCap(quote.marketCap)}
      </span>

      {/* 52W bar */}
      <div className="flex justify-center">
        <WeekBar price={quote.regularMarketPrice} low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} />
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ rank }: { rank: number }) {
  return (
    <div
      className="grid items-center py-[5px] border-b animate-pulse"
      style={{ borderColor: '#002222', gridTemplateColumns: '28px 72px 1fr 88px 80px 60px 70px 64px 56px' }}
    >
      <span className="text-[8px]" style={{ color: '#004545' }}>{rank}</span>
      <div className="h-2.5 rounded-none" style={{ background: '#003333', width: 40 }} />
      <div className="h-2 rounded-none" style={{ background: '#002a2a', width: '60%' }} />
      <div className="h-2.5 rounded-none ml-auto" style={{ background: '#003333', width: 55 }} />
      <div className="h-2 rounded-none ml-auto" style={{ background: '#002a2a', width: 45 }} />
      <div className="h-2 rounded-none ml-auto" style={{ background: '#002a2a', width: 35 }} />
      <div className="h-2 rounded-none ml-auto" style={{ background: '#002a2a', width: 40 }} />
      <div className="h-2 rounded-none ml-auto" style={{ background: '#002a2a', width: 40 }} />
      <div className="h-1 rounded-none" style={{ background: '#002a2a', width: 48 }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoversPanel() {
  const [activeTab, setActiveTab] = useState<MoverType>('gainers');
  const [countdown, setCountdown] = useState(60);
  const { data: quotes, isLoading, dataUpdatedAt } = useMovers(activeTab);
  const { setActiveSymbol, setActiveView } = useTerminalStore();

  const tabConfig = TABS.find((t) => t.key === activeTab)!;

  // Track previous prices for flash animation
  const prevPrices = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (quotes) {
      const next = new Map<string, number>();
      quotes.forEach((q) => next.set(q.symbol, q.regularMarketPrice));
      prevPrices.current = next;
    }
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 60-second countdown timer
  useEffect(() => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 60 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  function handleSymbolClick(symbol: string) {
    setActiveSymbol(symbol);
    setActiveView('stock-detail');
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bloomberg-bg">
      {/* Header */}
      <div
        className="px-3 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0"
        style={{ background: '#001c1c' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">MOVERS</span>
          <span className="text-bloomberg-text-muted text-[8px] tracking-wider">SCREENER · YAHOO FINANCE</span>
          <span className="text-[8px]" style={{ color: '#004e4e' }}>{tabConfig.description}</span>
        </div>
        <div className="flex items-center gap-2 text-[8px]" style={{ color: '#004e4e' }}>
          <span>↻ {countdown}s</span>
          {dataUpdatedAt > 0 && (
            <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-bloomberg-border" style={{ background: '#001a1a' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-3 py-1.5 text-[8px] font-bold tracking-wider transition-colors shrink-0"
            style={{
              color: activeTab === t.key ? '#CCA800' : '#004e4e',
              borderBottom: activeTab === t.key ? '2px solid #CCA800' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="px-3 py-1 shrink-0 border-b border-bloomberg-border"
        style={{
          background: '#030303',
          display: 'grid',
          gridTemplateColumns: '28px 72px 1fr 88px 80px 60px 70px 64px 56px',
        }}
      >
        {[
          { label: '#',      align: 'left'  },
          { label: 'SYMBOL', align: 'left'  },
          { label: 'COMPANY',align: 'left'  },
          { label: 'PRICE',  align: 'right' },
          { label: 'CHANGE', align: 'right' },
          { label: 'CHG %',  align: 'right' },
          { label: 'VOLUME', align: 'right' },
          { label: 'MKTCAP', align: 'right' },
          { label: '52W',    align: 'center'},
        ].map(({ label, align }) => (
          <span
            key={label}
            className="text-[7px] font-bold tracking-widest"
            style={{ color: '#004545', textAlign: align as React.CSSProperties['textAlign'] }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} rank={i + 1} />)
        ) : !quotes || quotes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-[9px]" style={{ color: '#004e4e' }}>No data available</span>
          </div>
        ) : (
          quotes.map((q, i) => (
            <MoverRow
              key={q.symbol}
              rank={i + 1}
              quote={q}
              changeColor={tabConfig.changeColor}
              onSymbolClick={handleSymbolClick}
              prevPrice={prevPrices.current.get(q.symbol)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-1 border-t border-bloomberg-border shrink-0 flex items-center gap-4 text-[7px]"
        style={{ background: '#001c1c', color: '#004545' }}
      >
        <span>Orange marker = 52-week position</span>
        <span>·</span>
        <span>Click row → stock detail</span>
        <span className="ml-auto">Refreshes every 60s · Source: Yahoo Finance Screener</span>
      </div>
    </div>
  );
}
