'use client';

import { useInsider } from '@/hooks/useInsider';

const CODE_LABELS: Record<string, { label: string; color: string }> = {
  P: { label: 'BUY',     color: '#00FF66' },
  S: { label: 'SELL',    color: '#FF3333' },
  A: { label: 'AWARD',   color: '#CCA800' },
  D: { label: 'EXERCISE',color: '#00BFFF' },
  G: { label: 'GIFT',    color: '#CC99FF' },
  F: { label: 'TAX SALE',color: '#FF3333' },
  M: { label: 'CONV',    color: '#AA8800' },
};

function fmtDate(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${d}, ${y}`;
}

function fmtValue(shares: number, price: number) {
  const v = shares * price;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props { symbol: string }

export default function InsiderTransactions({ symbol }: Props) {
  const { data, isLoading } = useInsider(symbol);

  if (isLoading) {
    return (
      <div className="p-4 space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 bg-bloomberg-border/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-bloomberg-text-muted text-xs">
        No insider transactions available
      </div>
    );
  }

  // Summary stats
  const buys  = data.filter((t) => t.transactionCode === 'P');
  const sells = data.filter((t) => t.transactionCode === 'S');
  const buyShares  = buys.reduce((s, t) => s + t.share, 0);
  const sellShares = sells.reduce((s, t) => s + t.share, 0);
  const total = buyShares + sellShares;
  const buyPct = total === 0 ? 50 : (buyShares / total) * 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-3 py-2 border-b border-bloomberg-border shrink-0 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex h-1.5 rounded overflow-hidden">
            <div style={{ width: `${buyPct}%`, background: '#00FF66' }} />
            <div style={{ width: `${100 - buyPct}%`, background: '#FF3333' }} />
          </div>
        </div>
        <span className="text-[10px]" style={{ color: '#00FF66' }}>{buys.length} buys</span>
        <span className="text-[10px]" style={{ color: '#FF3333' }}>{sells.length} sells</span>
        <span className="text-bloomberg-text-muted text-[9px]">Last {data.length} transactions</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[60px_1fr_70px_72px_80px_90px] gap-x-2 px-3 py-1 text-[9px] text-bloomberg-text-muted uppercase tracking-wider border-b border-bloomberg-border shrink-0">
        <span>Type</span>
        <span>Insider</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Price</span>
        <span className="text-right">Value</span>
        <span className="text-right">Date</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {data.map((t, i) => {
          const meta = CODE_LABELS[t.transactionCode] ?? { label: t.transactionCode, color: '#CCCCCC' };
          return (
            <div
              key={i}
              className="grid grid-cols-[60px_1fr_70px_72px_80px_90px] gap-x-2 px-3 py-1 text-[10px] border-b border-bloomberg-border/30 hover:bg-bloomberg-bg-hover"
            >
              <span
                className="font-bold text-[9px] px-1 rounded-sm border text-center"
                style={{ color: meta.color, borderColor: meta.color + '55', background: meta.color + '11' }}
              >
                {meta.label}
              </span>
              <span className="text-bloomberg-text-secondary truncate">{t.name}</span>
              <span className="text-right tabular-nums text-bloomberg-text-secondary">
                {t.share.toLocaleString()}
              </span>
              <span className="text-right tabular-nums text-bloomberg-text-secondary">
                {t.transactionPrice > 0 ? `$${t.transactionPrice.toFixed(2)}` : '—'}
              </span>
              <span
                className="text-right tabular-nums font-bold"
                style={{ color: t.transactionCode === 'P' ? '#00FF66' : '#FF3333' }}
              >
                {t.transactionPrice > 0 ? fmtValue(t.share, t.transactionPrice) : '—'}
              </span>
              <span className="text-right text-bloomberg-text-muted">{fmtDate(t.transactionDate)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
