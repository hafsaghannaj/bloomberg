'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTerminalStore } from '@/store/terminal';
import { usePortfolioRisk } from '@/hooks/usePortfolioRisk';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPct(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

function fmtPctColored(v: number): { text: string; color: string } {
  return {
    text: `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`,
    color: v >= 0 ? '#00FF66' : '#FF3333',
  };
}

function fmtNum(v: number, decimals = 2): string {
  return v.toFixed(decimals);
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function MetricBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-2 border border-bloomberg-border" style={{ background: '#001a1a' }}>
      <span className="text-[8px] tracking-widest font-bold" style={{ color: '#006262' }}>{label}</span>
      <span className="text-[15px] font-bold tabular-nums leading-none" style={{ color: color ?? '#CCCCCC' }}>
        {value}
      </span>
      {sub && <span className="text-[8px] tabular-nums" style={{ color: '#006262' }}>{sub}</span>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[8px] font-bold tracking-widest mt-3 mb-1.5" style={{ color: '#CCA800' }}>
      {title}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-bloomberg-border/20 ${className ?? ''}`} />;
}

// ─── Sharpe rating helper ─────────────────────────────────────────────────────

function sharpeLabel(s: number): { label: string; color: string } {
  if (s >= 2)   return { label: 'EXCELLENT', color: '#00FF66' };
  if (s >= 1)   return { label: 'GOOD',      color: '#00CC52' };
  if (s >= 0.5) return { label: 'ADEQUATE',  color: '#AA8800' };
  if (s >= 0)   return { label: 'POOR',      color: '#FF6633' };
  return          { label: 'NEGATIVE',  color: '#FF3333' };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortfolioRisk() {
  const { positions } = useTerminalStore();
  const { data, isLoading, error, refetch } = usePortfolioRisk(positions);

  if (positions.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-1.5 border-b border-bloomberg-border shrink-0" style={{ background: '#001c1c' }}>
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">RISK ANALYTICS</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px]" style={{ color: '#004e4e' }}>Add positions to compute risk metrics</span>
        </div>
      </div>
    );
  }

  const m = data?.metrics;
  const { label: sharpeLbl, color: sharpeColor } = m ? sharpeLabel(m.sharpe) : { label: '—', color: '#009090' };
  const outperform = m ? m.totalReturn - m.spyReturn : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bloomberg-bg">
      {/* Header */}
      <div
        className="px-3 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0"
        style={{ background: '#001c1c' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">RISK ANALYTICS</span>
          <span className="text-bloomberg-text-muted text-[8px] tracking-wider">
            SPY BENCHMARK · {m ? `${m.lookbackDays}D` : '1Y'} LOOKBACK
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#AA8800' }} />
          )}
          <button
            onClick={() => refetch()}
            className="text-[8px] font-bold tracking-wider transition-colors"
            style={{ color: '#004e4e' }}
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* ── Metrics grid ── */}
        <SectionHeader title="PORTFOLIO METRICS" />
        {isLoading || !m ? (
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : error ? (
          <div className="text-[9px] py-4 text-center" style={{ color: '#FF3333' }}>
            Failed to compute metrics — ensure positions have 1Y of trading history
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            <MetricBlock
              label="TOTAL RETURN"
              value={fmtPctColored(m.totalReturn).text}
              sub={`vs SPY ${fmtPct(m.spyReturn)}`}
              color={fmtPctColored(m.totalReturn).color}
            />
            <MetricBlock
              label="OUTPERFORMANCE"
              value={outperform != null ? fmtPctColored(outperform).text : '—'}
              sub="vs S&P 500"
              color={outperform != null ? fmtPctColored(outperform).color : '#009090'}
            />
            <MetricBlock
              label="ALPHA (Ann.)"
              value={fmtPctColored(m.alpha).text}
              sub="risk-adj. excess"
              color={fmtPctColored(m.alpha).color}
            />
            <MetricBlock
              label="ANNUAL RETURN"
              value={fmtPctColored(m.annualReturn).text}
              sub={`SPY ${fmtPct(m.spyAnnual)}`}
              color={fmtPctColored(m.annualReturn).color}
            />
            <MetricBlock
              label="SHARPE RATIO"
              value={fmtNum(m.sharpe)}
              sub={sharpeLbl}
              color={sharpeColor}
            />
            <MetricBlock
              label="BETA vs SPY"
              value={fmtNum(m.beta)}
              sub={m.beta < 1 ? 'lower risk' : m.beta > 1 ? 'higher risk' : 'market risk'}
              color={m.beta > 1.2 ? '#AA8800' : '#CCCCCC'}
            />
            <MetricBlock
              label="MAX DRAWDOWN"
              value={fmtPctColored(m.maxDrawdown).text}
              sub="peak-to-trough"
              color={fmtPctColored(m.maxDrawdown).color}
            />
            <MetricBlock
              label="VOLATILITY"
              value={fmtPct(m.volatility)}
              sub={`win rate ${fmtPct(m.winRate, 1)}`}
              color={m.volatility > 0.25 ? '#AA8800' : '#CCCCCC'}
            />
          </div>
        )}

        {/* ── Cumulative return chart ── */}
        {data?.timeline && data.timeline.length > 0 && (
          <>
            <SectionHeader title="CUMULATIVE RETURN — PORTFOLIO vs SPY (1Y)" />
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#002828" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#006262', fontSize: 7, fontFamily: 'IBM Plex Mono' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(data.timeline.length / 6)}
                  />
                  <YAxis
                    tick={{ fill: '#006262', fontSize: 7, fontFamily: 'IBM Plex Mono' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                  />
                  <ReferenceLine y={0} stroke="#004e4e" strokeDasharray="2 2" />
                  <Tooltip
                    contentStyle={{
                      background: '#001c1c',
                      border: '1px solid #003333',
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 9,
                      color: '#ccc',
                    }}
                    formatter={(v: unknown, name: string | undefined) => [
                      `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`,
                      name === 'portfolio' ? 'Portfolio' : 'SPY',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    stroke="#CCA800"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#CCA800' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spy"
                    stroke="#006262"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    activeDot={{ r: 3, fill: '#007a7a' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-1 text-[8px]">
              <span style={{ color: '#CCA800' }}>— Portfolio</span>
              <span style={{ color: '#006262' }}>- - SPY Benchmark</span>
            </div>
          </>
        )}

        {/* ── Per-position risk table ── */}
        {data?.symbolStats && data.symbolStats.length > 0 && (
          <>
            <SectionHeader title="PER-POSITION RISK" />
            {/* Column headers */}
            <div
              className="grid text-[7px] font-bold tracking-widest mb-1 pb-1 border-b"
              style={{
                color: '#004e4e',
                borderColor: '#002a2a',
                gridTemplateColumns: '64px 56px 68px 48px 52px 68px 72px',
              }}
            >
              {['SYMBOL', 'WEIGHT', 'RETURN', 'BETA', 'SHARPE', 'MAX DD', 'CONTRIB'].map((h) => (
                <span key={h} className={h === 'SYMBOL' ? '' : 'text-right'}>{h}</span>
              ))}
            </div>
            {data.symbolStats.map((s) => {
              const retC = fmtPctColored(s.totalReturn);
              const conC = fmtPctColored(s.contribution);
              const ddC  = fmtPctColored(s.maxDrawdown);
              const { color: shC } = sharpeLabel(s.sharpe);
              return (
                <div
                  key={s.symbol}
                  className="grid items-center py-[4px] border-b"
                  style={{
                    borderColor: '#002222',
                    gridTemplateColumns: '64px 56px 68px 48px 52px 68px 72px',
                  }}
                >
                  <span className="text-[9px] font-bold tracking-wider" style={{ color: '#FFFF00' }}>
                    {s.symbol}
                  </span>
                  <span className="text-[9px] tabular-nums text-right" style={{ color: '#009090' }}>
                    {fmtPct(s.weight, 1)}
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-right" style={{ color: retC.color }}>
                    {retC.text}
                  </span>
                  <span className="text-[9px] tabular-nums text-right" style={{ color: s.beta > 1.3 ? '#AA8800' : '#009090' }}>
                    {fmtNum(s.beta)}
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-right" style={{ color: shC }}>
                    {fmtNum(s.sharpe)}
                  </span>
                  <span className="text-[9px] tabular-nums text-right" style={{ color: ddC.color }}>
                    {ddC.text}
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-right" style={{ color: conC.color }}>
                    {conC.text}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-1 border-t border-bloomberg-border shrink-0 text-[7px]"
        style={{ background: '#001c1c', color: '#004545' }}
      >
        Sharpe ≥ 1 = good · Beta &lt; 1 = defensive · Max DD = largest peak-to-trough loss · Risk-free rate: 5%
      </div>
    </div>
  );
}
