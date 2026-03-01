'use client';

import { useState, useMemo } from 'react';
import { useOptions } from '@/hooks/useOptions';

interface Props { symbol: string }

function fmtExp(ts: number) {
  const d = new Date(ts * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function OptionsChain({ symbol }: Props) {
  const [selectedExpiry, setSelectedExpiry] = useState<number | undefined>(undefined);
  const [side, setSide] = useState<'calls' | 'puts'>('calls');
  const { data, isLoading } = useOptions(symbol, selectedExpiry);

  const expirationDates = data?.expirationDates ?? [];
  const activeExpiry = selectedExpiry ?? expirationDates[0];
  const contracts = side === 'calls' ? (data?.calls ?? []) : (data?.puts ?? []);

  // Sort by strike
  const sorted = useMemo(
    () => [...contracts].sort((a, b) => a.strike - b.strike),
    [contracts]
  );

  // Find ATM strike (closest to last price implied by mid)
  const midPrices = sorted.map((c) => (c.bid + c.ask) / 2);
  const maxMid = Math.max(...midPrices, 0);

  if (isLoading) {
    return (
      <div className="p-4 space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 bg-bloomberg-border/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="px-3 py-2 border-b border-bloomberg-border shrink-0 flex items-center gap-3 flex-wrap">
        {/* Calls/Puts toggle */}
        <div className="flex gap-px">
          {(['calls', 'puts'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="px-3 py-0.5 text-[10px] font-bold rounded transition-colors"
              style={{
                background: side === s ? '#CCA800' : 'transparent',
                color: side === s ? '#001616' : '#006262',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-bloomberg-border" />
        {/* Expiry selector */}
        <div className="flex gap-1 flex-wrap">
          {expirationDates.slice(0, 8).map((ts) => (
            <button
              key={ts}
              onClick={() => setSelectedExpiry(ts)}
              className="px-2 py-0.5 text-[9px] rounded border transition-colors"
              style={{
                borderColor: activeExpiry === ts ? '#CCA800' : '#003333',
                color: activeExpiry === ts ? '#CCA800' : '#006262',
                background: activeExpiry === ts ? '#CCA80020' : 'transparent',
              }}
            >
              {fmtExp(ts)}
            </button>
          ))}
          {expirationDates.length === 0 && (
            <span className="text-bloomberg-text-muted text-[9px]">No expiry dates available</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[64px_56px_56px_56px_64px_72px_52px_44px] gap-x-1 px-3 py-1 text-[9px] text-bloomberg-text-muted uppercase tracking-wider border-b border-bloomberg-border shrink-0">
        <span>Strike</span>
        <span className="text-right">Last</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Open Int.</span>
        <span className="text-right">IV</span>
        <span className="text-center">ITM</span>
      </div>

      {/* Option rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-bloomberg-text-muted text-xs">
            {expirationDates.length === 0
              ? 'Options data unavailable for this symbol'
              : 'No contracts for selected expiry'}
          </div>
        ) : (
          sorted.map((opt, i) => {
            const mid = (opt.bid + opt.ask) / 2;
            const barW = maxMid > 0 ? (mid / maxMid) * 100 : 0;
            return (
              <div
                key={i}
                className="relative grid grid-cols-[64px_56px_56px_56px_64px_72px_52px_44px] gap-x-1 px-3 py-0.5 text-[10px] border-b border-bloomberg-border/25 hover:bg-bloomberg-bg-hover"
                style={{
                  background: opt.inTheMoney
                    ? (side === 'calls' ? 'rgba(0,255,102,0.04)' : 'rgba(255,51,51,0.04)')
                    : undefined,
                }}
              >
                {/* Volume bar */}
                <div
                  className="absolute left-0 top-0 h-full opacity-[0.06]"
                  style={{
                    width: `${barW}%`,
                    background: side === 'calls' ? '#00FF66' : '#FF3333',
                  }}
                />

                <span className="font-bold tabular-nums relative z-10" style={{ color: '#FFFF00' }}>
                  ${opt.strike.toFixed(2)}
                </span>
                <span className="text-right tabular-nums text-bloomberg-text-secondary relative z-10">
                  {opt.lastPrice > 0 ? opt.lastPrice.toFixed(2) : '—'}
                </span>
                <span className="text-right tabular-nums text-bloomberg-text-secondary relative z-10">
                  {opt.bid > 0 ? opt.bid.toFixed(2) : '—'}
                </span>
                <span className="text-right tabular-nums text-bloomberg-text-secondary relative z-10">
                  {opt.ask > 0 ? opt.ask.toFixed(2) : '—'}
                </span>
                <span className="text-right tabular-nums text-bloomberg-text-muted relative z-10">
                  {opt.volume?.toLocaleString() ?? '—'}
                </span>
                <span className="text-right tabular-nums text-bloomberg-text-muted relative z-10">
                  {opt.openInterest?.toLocaleString() ?? '—'}
                </span>
                <span
                  className="text-right tabular-nums relative z-10"
                  style={{ color: opt.impliedVolatility > 0.5 ? '#FF3333' : '#CCA800' }}
                >
                  {opt.impliedVolatility > 0 ? fmtPct(opt.impliedVolatility) : '—'}
                </span>
                <span className="text-center relative z-10">
                  {opt.inTheMoney ? (
                    <span style={{ color: side === 'calls' ? '#00FF66' : '#FF3333' }}>●</span>
                  ) : (
                    <span className="text-bloomberg-text-muted">○</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
