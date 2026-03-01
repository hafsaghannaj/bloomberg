'use client';

import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ReferenceLine,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useSectorRotation, type SectorRow } from '@/hooks/useSectorRotation';
import { useTerminalStore } from '@/store/terminal';
import { RefreshCw, TrendingUp } from 'lucide-react';

type TF = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';

const TIMEFRAMES: TF[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

function getReturn(row: SectorRow, tf: TF): number {
  switch (tf) {
    case '1D': return row.r1d;
    case '1W': return row.r1w;
    case '1M': return row.r1m;
    case '3M': return row.r3m;
    case 'YTD': return row.rYTD;
    case '1Y': return row.r1y;
  }
}

function getRS(row: SectorRow, tf: TF): number {
  switch (tf) {
    case '1D': return row.rs1d;
    case '1W': return row.rs1w;
    case '1M': return row.rs1m;
    case '3M': return row.rs3m;
    case 'YTD': return row.rs1m;
    case '1Y': return row.rs3m;
  }
}

function pct(v: number) {
  const s = (v * 100).toFixed(2);
  return v >= 0 ? `+${s}%` : `${s}%`;
}

function quadrantOf(rsScore: number, momentum: number) {
  if (rsScore >= 0 && momentum >= 0) return 'leading';
  if (rsScore >= 0 && momentum < 0)  return 'weakening';
  if (rsScore < 0  && momentum >= 0) return 'improving';
  return 'lagging';
}

function quadrantColor(q: string) {
  switch (q) {
    case 'leading':   return '#00FF66';
    case 'weakening': return '#AA8800';
    case 'improving': return '#00BFFF';
    case 'lagging':   return '#FF3333';
    default:          return '#CCCCCC';
  }
}

// Custom scatter dot with label
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorDot(props: any) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: SectorRow };
  const q = quadrantOf(payload.rsScore, payload.momentum);
  const color = quadrantColor(q);
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={8} fill="#CCCCCC" fontFamily="IBM Plex Mono">
        {payload.short}
      </text>
    </g>
  );
}

function QuadrantLabel({ x, y, label, color }: { x: string; y: string; label: string; color: string }) {
  return (
    <text
      x={x} y={y}
      fill={color} fillOpacity={0.35}
      fontSize={9}
      fontFamily="IBM Plex Mono"
      fontWeight="bold"
      textAnchor="middle"
    >
      {label}
    </text>
  );
}

export default function SectorRotation() {
  const [tf, setTf] = useState<TF>('1M');
  const { data, isLoading, refetch, dataUpdatedAt } = useSectorRotation();
  const { addTab, setActiveView } = useTerminalStore();

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.sectors].sort((a, b) => getReturn(b, tf) - getReturn(a, tf));
  }, [data, tf]);

  const spyRet = data ? (() => {
    switch (tf) {
      case '1D': return data.spy.r1d;
      case '1W': return data.spy.r1w;
      case '1M': return data.spy.r1m;
      case '3M': return data.spy.r3m;
      case 'YTD': return data.spy.rYTD;
      case '1Y': return data.spy.r1y;
    }
  })() : 0;

  const maxAbs = useMemo(() => {
    if (!sorted.length) return 0.05;
    return Math.max(...sorted.map(r => Math.abs(getReturn(r, tf))), 0.001);
  }, [sorted, tf]);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="h-full flex flex-col bg-bloomberg-bg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp size={12} /> Sector Rotation
        </span>
        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex items-center gap-px">
            {TIMEFRAMES.map(t => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className="px-2 py-0.5 text-[10px] font-bold rounded transition-colors"
                style={{
                  background: tf === t ? '#CCA800' : 'transparent',
                  color: tf === t ? '#001616' : '#006262',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-bloomberg-text-muted">
            SPY <span style={{ color: spyRet >= 0 ? '#00FF66' : '#FF3333' }}>{pct(spyRet)}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-bloomberg-text-muted hover:text-bloomberg-orange transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} />
          </button>
          {updatedLabel && (
            <span className="text-bloomberg-text-muted text-[9px]">{updatedLabel}</span>
          )}
        </div>
      </div>

      {/* Body: table + quadrant */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: performance table */}
        <div className="flex flex-col overflow-hidden" style={{ width: '55%', borderRight: '1px solid #003333' }}>
          {/* Column headers */}
          <div className="grid grid-cols-[20px_1fr_52px_60px_60px_80px] gap-x-2 px-3 py-1 text-[9px] text-bloomberg-text-muted border-b border-bloomberg-border shrink-0 uppercase tracking-wider">
            <span>#</span>
            <span>Sector</span>
            <span className="text-right">ETF</span>
            <span className="text-right">Price</span>
            <span className="text-right">{tf}</span>
            <span className="text-right">vs SPY</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[20px_1fr_52px_60px_60px_80px] gap-x-2 px-3 py-1.5 border-b border-bloomberg-border/40 animate-pulse">
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                  <div className="h-2.5 bg-bloomberg-border rounded" />
                </div>
              ))
            ) : (
              sorted.map((row, rank) => {
                const ret = getReturn(row, tf);
                const rs  = getRS(row, tf);
                const barW = Math.abs(ret) / maxAbs * 100;
                const q = quadrantOf(row.rsScore, row.momentum);
                const qColor = quadrantColor(q);

                return (
                  <div
                    key={row.symbol}
                    className="relative grid grid-cols-[20px_1fr_52px_60px_60px_80px] gap-x-2 px-3 py-1 border-b border-bloomberg-border/30 hover:bg-bloomberg-bg-hover cursor-pointer transition-colors group"
                    onClick={() => { addTab(row.symbol, row.symbol); setActiveView('stock-detail'); }}
                  >
                    {/* Bar fill behind row */}
                    <div
                      className="absolute left-0 top-0 h-full opacity-[0.06]"
                      style={{
                        width: `${barW}%`,
                        background: ret >= 0 ? '#00FF66' : '#FF3333',
                        marginLeft: ret < 0 ? 0 : undefined,
                      }}
                    />

                    <span className="text-[9px] text-bloomberg-text-muted relative z-10">{rank + 1}</span>
                    <div className="flex items-center gap-1.5 relative z-10 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: qColor }}
                      />
                      <span className="text-[10px] text-bloomberg-text-secondary truncate">{row.name}</span>
                    </div>
                    <span className="text-[10px] text-bloomberg-yellow text-right relative z-10 font-bold">{row.symbol}</span>
                    <span className="text-[10px] text-bloomberg-text-secondary text-right relative z-10 tabular-nums">
                      ${row.price.toFixed(2)}
                    </span>
                    <span
                      className="text-[10px] text-right relative z-10 tabular-nums font-bold"
                      style={{ color: ret >= 0 ? '#00FF66' : '#FF3333' }}
                    >
                      {pct(ret)}
                    </span>
                    <span
                      className="text-[10px] text-right relative z-10 tabular-nums"
                      style={{ color: rs >= 0 ? '#00FF66' : '#FF3333' }}
                    >
                      {rs >= 0 ? '+' : ''}{(rs * 100).toFixed(2)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Rotation Quadrant */}
        <div className="flex flex-col" style={{ width: '45%' }}>
          <div className="px-3 py-1.5 border-b border-bloomberg-border shrink-0 flex items-center justify-between">
            <span className="text-[9px] text-bloomberg-text-muted uppercase tracking-wider">Rotation Quadrant</span>
            <div className="flex items-center gap-3 text-[8px]">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] inline-block" />Leading</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#AA8800] inline-block" />Weakening</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] inline-block" />Improving</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF3333] inline-block" />Lagging</span>
            </div>
          </div>

          <div className="flex-1 p-2 relative">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-bloomberg-text-muted text-[10px] animate-pulse">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
                  <XAxis
                    dataKey="rsScore"
                    type="number"
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 8, fill: '#006262', fontFamily: 'IBM Plex Mono' }}
                    axisLine={{ stroke: '#003333' }}
                    tickLine={false}
                    label={{ value: '← RS vs SPY →', position: 'insideBottom', offset: -4, fontSize: 8, fill: '#006262', fontFamily: 'IBM Plex Mono' }}
                  />
                  <YAxis
                    dataKey="momentum"
                    type="number"
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    tick={{ fontSize: 8, fill: '#006262', fontFamily: 'IBM Plex Mono' }}
                    axisLine={{ stroke: '#003333' }}
                    tickLine={false}
                    width={40}
                    label={{ value: 'Momentum', angle: -90, position: 'insideLeft', offset: 8, fontSize: 8, fill: '#006262', fontFamily: 'IBM Plex Mono' }}
                  />
                  {/* Quadrant dividers */}
                  <ReferenceLine x={0} stroke="#003d3d" strokeDasharray="3 3" />
                  <ReferenceLine y={0} stroke="#003d3d" strokeDasharray="3 3" />
                  <Tooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as SectorRow;
                      const q = quadrantOf(d.rsScore, d.momentum);
                      return (
                        <div className="bg-bloomberg-bg-panel border border-bloomberg-border px-2 py-1.5 text-[9px]">
                          <div className="text-bloomberg-yellow font-bold">{d.symbol} — {d.name}</div>
                          <div className="text-bloomberg-text-secondary mt-0.5">
                            RS vs SPY: <span style={{ color: d.rsScore >= 0 ? '#00FF66' : '#FF3333' }}>{pct(d.rsScore)}</span>
                          </div>
                          <div className="text-bloomberg-text-secondary">
                            Momentum: <span style={{ color: d.momentum >= 0 ? '#00FF66' : '#FF3333' }}>{pct(d.momentum)}</span>
                          </div>
                          <div className="mt-0.5 font-bold" style={{ color: quadrantColor(q) }}>
                            {q.toUpperCase()}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Scatter data={data?.sectors ?? []} shape={(p: any) => <SectorDot {...p} />}>
                    {(data?.sectors ?? []).map((s) => (
                      <Cell key={s.symbol} fill={quadrantColor(quadrantOf(s.rsScore, s.momentum))} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}

            {/* Quadrant corner labels */}
            {!isLoading && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
              >
                <QuadrantLabel x="75%" y="14" label="LEADING" color="#00FF66" />
                <QuadrantLabel x="25%" y="14" label="IMPROVING" color="#00BFFF" />
                <QuadrantLabel x="75%" y="95%" label="WEAKENING" color="#AA8800" />
                <QuadrantLabel x="25%" y="95%" label="LAGGING" color="#FF3333" />
              </svg>
            )}
          </div>

          {/* Bottom: quadrant summary counts */}
          {!isLoading && data && (
            <div className="border-t border-bloomberg-border px-3 py-1.5 shrink-0 grid grid-cols-4 gap-1 text-center">
              {(['leading', 'weakening', 'improving', 'lagging'] as const).map(q => {
                const count = data.sectors.filter(s => quadrantOf(s.rsScore, s.momentum) === q).length;
                return (
                  <div key={q}>
                    <div className="text-[11px] font-bold tabular-nums" style={{ color: quadrantColor(q) }}>{count}</div>
                    <div className="text-[8px] text-bloomberg-text-muted uppercase">{q}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
