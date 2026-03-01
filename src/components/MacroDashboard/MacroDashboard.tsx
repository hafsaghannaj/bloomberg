'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useYieldCurve } from '@/hooks/useYieldCurve';
import { useMacro } from '@/hooks/useMacro';
import type { YieldPoint, MacroIndicator } from '@/types';

// ─── Yield Curve ─────────────────────────────────────────────────────────────

function YieldCurveChart({ data }: { data: YieldPoint[] }) {
  const valid = data.filter((d) => d.current !== null);
  const isInverted =
    (data.find((d) => d.maturity === '10Y')?.current ?? 0) <
    (data.find((d) => d.maturity === '2Y')?.current ?? 0);

  const spread2y10y = (() => {
    const y10 = data.find((d) => d.maturity === '10Y')?.current ?? null;
    const y2  = data.find((d) => d.maturity === '2Y')?.current ?? null;
    if (y10 === null || y2 === null) return null;
    return y10 - y2;
  })();

  const minY = Math.min(...valid.map((d) => Math.min(d.current ?? Infinity, d.yearAgo ?? Infinity))) - 0.25;
  const maxY = Math.max(...valid.map((d) => Math.max(d.current ?? -Infinity, d.yearAgo ?? -Infinity))) + 0.25;

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">YIELD CURVE</span>
          <span className="text-bloomberg-text-muted text-[8px] tracking-wider">US TREASURIES · FRED</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          {spread2y10y !== null && (
            <span className={`font-bold ${spread2y10y < 0 ? 'text-bloomberg-red' : 'text-bloomberg-green'}`}>
              2Y–10Y: {spread2y10y > 0 ? '+' : ''}{spread2y10y.toFixed(2)}%
            </span>
          )}
          <span
            className={`font-bold tracking-wider text-[9px] px-1.5 py-0.5 border ${
              isInverted
                ? 'border-bloomberg-red text-bloomberg-red'
                : 'border-bloomberg-green text-bloomberg-green'
            }`}
          >
            {isInverted ? 'INVERTED' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#003333" />
            <XAxis
              dataKey="maturity"
              tick={{ fill: '#007a7a', fontSize: 8, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#003333' }}
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fill: '#007a7a', fontSize: 8, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{
                background: '#001c1c',
                border: '1px solid #003333',
                borderRadius: 0,
                fontFamily: 'IBM Plex Mono',
                fontSize: 10,
                color: '#ccc',
              }}
              labelStyle={{ color: '#CCA800', fontWeight: 'bold' }}
              formatter={(v: unknown, name: string | undefined) => [
                `${(v as number).toFixed(3)}%`,
                name === 'current' ? 'Current' : '1Y Ago',
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 8, fontFamily: 'IBM Plex Mono', paddingTop: 4 }}
              formatter={(v) => (v === 'current' ? 'Current' : '1Y Ago')}
            />
            <ReferenceLine y={0} stroke="#004e4e" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#CCA800"
              strokeWidth={2}
              dot={{ fill: '#CCA800', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#CCA800' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="yearAgo"
              stroke="#006262"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ fill: '#006262', r: 2, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#007a7a' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Indicator Tile ───────────────────────────────────────────────────────────

function IndicatorTile({ ind }: { ind: MacroIndicator }) {
  const statusColor =
    ind.status === 'danger'  ? '#FF3333' :
    ind.status === 'warning' ? '#AA8800' :
    '#00FF66';

  const formattedValue = (() => {
    if (ind.value === null) return '—';
    if (ind.unit === 'K') {
      return (ind.value >= 0 ? '+' : '') + ind.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'K';
    }
    return ind.value.toFixed(ind.unit === '%' ? 2 : 1) + ind.unit;
  })();

  const changeStr = (() => {
    if (ind.change === null) return ind.changeLabel;
    const prefix = ind.change > 0 ? '▲' : ind.change < 0 ? '▼' : '=';
    const val = Math.abs(ind.change).toFixed(2);
    return `${prefix}${val}`;
  })();

  const changeColor =
    ind.change === null ? '#006262' :
    ind.change > 0  ? (ind.id === 'UNRATE' || ind.id === 'CPI' || ind.id === 'CORE_CPI' || ind.id === 'PCE' ? '#FF3333' : '#00FF66') :
    ind.change < 0  ? (ind.id === 'UNRATE' || ind.id === 'CPI' || ind.id === 'CORE_CPI' || ind.id === 'PCE' ? '#00FF66' : '#FF3333') :
    '#006262';

  const isSpread = ind.id === 'T10Y2Y' || ind.id === 'T10Y3M';
  const spreadColor = ind.value !== null && ind.value < 0 ? '#FF3333' : '#00FF66';

  return (
    <div
      className="flex flex-col justify-between p-2 border border-bloomberg-border"
      style={{ background: '#001a1a', minWidth: 110 }}
    >
      {/* Name */}
      <div className="text-[8px] text-bloomberg-text-muted font-bold tracking-wider leading-tight">
        {ind.shortName}
      </div>

      {/* Value */}
      <div
        className="text-[16px] font-bold tabular-nums leading-none mt-1"
        style={{ color: isSpread ? spreadColor : statusColor }}
      >
        {isSpread && ind.value !== null && ind.value > 0 ? '+' : ''}{formattedValue}
      </div>

      {/* Change / label */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[8px] font-bold" style={{ color: changeColor }}>
          {changeStr}
        </span>
        <span className="text-[7px] text-bloomberg-text-muted">{ind.frequency}</span>
      </div>

      {/* Date */}
      <div className="text-[7px] text-bloomberg-text-muted mt-0.5 tabular-nums">
        {ind.date ? ind.date.slice(0, 7) : ''}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-bloomberg-border/30 rounded-none ${className ?? ''}`} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MacroDashboard() {
  const { data: yieldData, isLoading: yieldLoading } = useYieldCurve();
  const { data: macroData, isLoading: macroLoading } = useMacro();

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-bloomberg-bg">
      {/* Panel header */}
      <div className="px-3 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0" style={{ background: '#001c1c' }}>
        <div className="flex items-center gap-2">
          <span className="text-bloomberg-orange font-bold text-[10px] tracking-widest">MACRO</span>
          <span className="text-bloomberg-text-muted text-[8px]">ECONOMICS</span>
        </div>
        <div className="flex items-center gap-2 text-[8px] text-bloomberg-text-muted">
          <span>SOURCE: FRED · ST. LOUIS FED</span>
          <span className="text-bloomberg-green">●</span>
        </div>
      </div>

      {/* Yield Curve section */}
      <div className="border-b border-bloomberg-border shrink-0">
        {yieldLoading || !yieldData ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <YieldCurveChart data={yieldData} />
        )}
      </div>

      {/* Macro indicators grid */}
      <div className="flex-1 p-3">
        <div className="text-[9px] text-bloomberg-text-muted font-bold tracking-widest mb-2">
          KEY INDICATORS
        </div>
        {macroLoading || !macroData ? (
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
            {macroData.map((ind) => (
              <IndicatorTile key={ind.id} ind={ind} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-bloomberg-border shrink-0 text-[7px] text-bloomberg-text-muted" style={{ background: '#001c1c' }}>
        Data sourced from Federal Reserve Economic Data (FRED) · St. Louis Fed · Updated hourly
      </div>
    </div>
  );
}
