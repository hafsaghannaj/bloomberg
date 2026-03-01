'use client';

import { useState } from 'react';
import { useEarningsCalendar } from '@/hooks/useEarningsCalendar';
import { useTerminalStore } from '@/store/terminal';
import type { EarningsCalendarItem } from '@/lib/finnhub';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function fmtRev(v: number | null): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

function hourLabel(hour: string): { label: string; color: string } {
  if (hour === 'bmo') return { label: 'BMO', color: '#AA8800' };
  if (hour === 'amc') return { label: 'AMC', color: '#4488FF' };
  return { label: 'DMH', color: '#006262' };
}

// Group items by date, return sorted dates
function groupByDate(items: EarningsCalendarItem[]): [string, EarningsCalendarItem[]][] {
  const map = new Map<string, EarningsCalendarItem[]>();
  for (const item of items) {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date)!.push(item);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

// Get Mon of a given week offset (0 = this week, 1 = next week)
function weekRange(offset: 0 | 1): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { from: fmt(monday), to: fmt(friday) };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-bloomberg-border/20 ${className ?? ''}`} />;
}

// ─── Single earnings row ──────────────────────────────────────────────────────

function EarningsRow({ item, onSymbolClick }: { item: EarningsCalendarItem; onSymbolClick: (s: string) => void }) {
  const { label, color } = hourLabel(item.hour);
  return (
    <div
      className="grid items-center py-[4px] border-b cursor-pointer hover:bg-white/[0.02] transition-colors"
      style={{ borderColor: '#002525', gridTemplateColumns: '72px 1fr 44px 80px 80px' }}
      onClick={() => onSymbolClick(item.symbol)}
    >
      {/* Symbol */}
      <span className="text-[9px] font-bold tracking-wider" style={{ color: '#FFFF00' }}>
        {item.symbol}
      </span>

      {/* Quarter label */}
      <span className="text-[8px] tabular-nums" style={{ color: '#007070' }}>
        Q{item.quarter} {item.year}
      </span>

      {/* BMO / AMC */}
      <span className="text-[8px] font-bold tracking-wider" style={{ color }}>
        {label}
      </span>

      {/* EPS estimate */}
      <span className="text-[9px] font-bold tabular-nums text-right" style={{ color: '#CCCCCC' }}>
        {item.epsEstimate != null ? `$${item.epsEstimate.toFixed(2)}` : '—'}
      </span>

      {/* Rev estimate */}
      <span className="text-[8px] tabular-nums text-right" style={{ color: '#007070' }}>
        {fmtRev(item.revenueEstimate)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EarningsCalendar() {
  const [week, setWeek] = useState<0 | 1>(0);
  const { data: allItems, isLoading } = useEarningsCalendar();
  const { setActiveSymbol, setActiveView } = useTerminalStore();

  const { from, to } = weekRange(week);

  const filtered = (allItems ?? []).filter((item) => item.date >= from && item.date <= to);
  const grouped = groupByDate(filtered);

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
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">EARNINGS</span>
          <span className="text-bloomberg-text-muted text-[8px] tracking-wider">CALENDAR · FINNHUB</span>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-1">
          {([0, 1] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className="px-2 py-0.5 text-[8px] font-bold tracking-wider border transition-colors"
              style={{
                borderColor: week === w ? '#CCA800' : '#003333',
                color: week === w ? '#CCA800' : '#006262',
                background: week === w ? '#001c1c' : 'transparent',
              }}
            >
              {w === 0 ? 'THIS WEEK' : 'NEXT WEEK'}
            </button>
          ))}
        </div>

        <div className="text-[8px] tabular-nums" style={{ color: '#006262' }}>
          {from} → {to}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="px-3 py-1 shrink-0 border-b border-bloomberg-border"
        style={{ background: '#001a1a', gridTemplateColumns: '72px 1fr 44px 80px 80px', display: 'grid' }}
      >
        {['SYMBOL', 'PERIOD', 'TIME', 'EPS EST', 'REV EST'].map((h) => (
          <span key={h} className="text-[8px] font-bold tracking-widest text-right first:text-left" style={{ color: '#004e4e' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="space-y-2 py-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#004e4e' }}>
              NO EARNINGS SCHEDULED
            </span>
            <span className="text-[8px]" style={{ color: '#004545' }}>
              {from} – {to}
            </span>
          </div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date} className="mb-2">
              {/* Date group header */}
              <div
                className="text-[8px] font-bold tracking-widest py-1.5 border-b sticky top-0 z-10"
                style={{ color: '#CCA800', borderColor: '#003333', background: '#000' }}
              >
                {fmtDate(date)}
                <span className="ml-2 text-[7px] font-normal" style={{ color: '#004e4e' }}>
                  {items.length} REPORT{items.length !== 1 ? 'S' : ''}
                </span>
              </div>

              {/* Rows */}
              {items.map((item, i) => (
                <EarningsRow key={`${item.symbol}-${i}`} item={item} onSymbolClick={handleSymbolClick} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer legend */}
      <div
        className="px-3 py-1 shrink-0 border-t border-bloomberg-border flex items-center gap-4 text-[8px]"
        style={{ background: '#001c1c', color: '#004e4e' }}
      >
        <span style={{ color: '#AA8800' }}>● BMO</span>
        <span style={{ color: '#4488FF' }}>● AMC</span>
        <span>Before Market Open / After Market Close</span>
        <span className="ml-auto">Click symbol → stock detail</span>
      </div>
    </div>
  );
}
