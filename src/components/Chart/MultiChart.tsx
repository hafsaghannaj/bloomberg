'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useMultiChart } from '@/hooks/useMultiChart';
import { useTerminalStore } from '@/store/terminal';
import type { ChartTimeframe } from '@/types';
import { X, Plus, Layers } from 'lucide-react';

const TIMEFRAMES: ChartTimeframe[] = ['1W', '1M', '3M', '1Y', '5Y'];

const PALETTE = [
  '#CCA800', '#00BFFF', '#00FF66', '#FF3333',
  '#CC99FF', '#00FFFF', '#FFFF00', '#FF8C00',
];

export default function MultiChart() {
  const activeSymbol = useTerminalStore((s) => s.activeSymbol);
  const [symbols, setSymbols] = useState<string[]>(() =>
    activeSymbol ? [activeSymbol] : ['SPY']
  );
  const [input, setInput] = useState('');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMap = useRef<Map<string, any>>(new Map());

  const { data, isLoading } = useMultiChart(symbols, timeframe);

  const addSymbol = useCallback(() => {
    const s = input.trim().toUpperCase();
    if (s && !symbols.includes(s) && symbols.length < 8) {
      setSymbols((prev) => [...prev, s]);
      setInput('');
    }
  }, [input, symbols]);

  const removeSymbol = (sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  };

  // Build / rebuild chart when symbols or timeframe change
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;

    import('lightweight-charts').then(({ createChart, LineSeries }) => {
      if (disposed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: '#001616' },
          textColor: '#009090',
          fontSize: 10,
          fontFamily: '"IBM Plex Mono", monospace',
        },
        grid: {
          vertLines: { color: '#002222' },
          horzLines: { color: '#002222' },
        },
        crosshair: {
          vertLine: { color: '#CCA800', width: 1, style: 2 },
          horzLine: { color: '#CCA800', width: 1, style: 2 },
          mode: 1,
        },
        timeScale: {
          borderColor: '#003333',
          timeVisible: timeframe === '1D' || timeframe === '1W',
        },
        rightPriceScale: { borderColor: '#003333' },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      seriesMap.current.clear();
      symbols.forEach((sym, i) => {
        const color = PALETTE[i % PALETTE.length];
        const series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          title: sym,
        });
        seriesMap.current.set(sym, series);
      });

      chartRef.current = chart;

      ro = new ResizeObserver((entries) => {
        if (disposed) return;
        const { width, height } = entries[0].contentRect;
        chart.applyOptions({ width, height });
      });
      ro.observe(containerRef.current);
    });

    return () => {
      disposed = true;
      if (ro) ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesMap.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), timeframe]);

  // Feed normalized data whenever query result changes
  useEffect(() => {
    if (!data || !chartRef.current) return;

    data.forEach(({ symbol, data: pts }) => {
      const series = seriesMap.current.get(symbol);
      if (!series || pts.length === 0) return;

      const valid = pts.filter((p) => p.close != null && p.time != null);
      if (valid.length === 0) return;

      const base = valid[0].close;
      const normalized = valid.map((p) => ({
        time: p.time as number,
        value: (p.close / base) * 100,
      }));
      series.setData(normalized);
    });

    chartRef.current.timeScale().fitContent();
  }, [data]);

  // Current returns for legend
  const returns: { symbol: string; ret: number; color: string }[] = symbols.map((sym, i) => {
    const series = data?.find((d) => d.symbol === sym);
    if (!series || series.data.length < 2) return { symbol: sym, ret: 0, color: PALETTE[i % PALETTE.length] };
    const first = series.data[0].close;
    const last  = series.data[series.data.length - 1].close;
    return { symbol: sym, ret: first === 0 ? 0 : (last - first) / first, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <div className="h-full flex flex-col bg-bloomberg-bg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0 flex-wrap gap-2">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={12} /> Chart Overlay
        </span>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Timeframe */}
          <div className="flex gap-px">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2 py-0.5 text-[10px] font-bold rounded"
                style={{
                  background: timeframe === tf ? '#CCA800' : 'transparent',
                  color: timeframe === tf ? '#001616' : '#006262',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Add symbol input */}
          <form
            onSubmit={(e) => { e.preventDefault(); addSymbol(); }}
            className="flex items-center gap-1"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="ADD SYMBOL"
              maxLength={10}
              className="w-24 bg-bloomberg-bg-panel border border-bloomberg-border text-bloomberg-orange text-[10px] px-2 py-0.5 outline-none focus:border-bloomberg-orange font-mono uppercase placeholder-bloomberg-text-muted/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || symbols.length >= 8}
              className="p-0.5 text-bloomberg-text-muted hover:text-bloomberg-orange disabled:opacity-30"
            >
              <Plus size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 border-b border-bloomberg-border flex items-center gap-4 flex-wrap shrink-0">
        <span className="text-[9px] text-bloomberg-text-muted">NORMALIZED TO 100 ·</span>
        {returns.map(({ symbol, ret, color }) => (
          <div key={symbol} className="flex items-center gap-1.5 group">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
            <span className="text-[10px] font-bold" style={{ color }}>{symbol}</span>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: ret >= 0 ? '#00FF66' : '#FF3333' }}
            >
              {ret >= 0 ? '+' : ''}{(ret * 100).toFixed(2)}%
            </span>
            {symbols.length > 1 && (
              <button
                onClick={() => removeSymbol(symbol)}
                className="opacity-0 group-hover:opacity-100 text-bloomberg-text-muted hover:text-bloomberg-red transition-opacity"
              >
                <X size={9} />
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <span className="text-bloomberg-text-muted text-[9px] animate-pulse">Loading...</span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="w-full h-full" />
        {symbols.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-bloomberg-text-muted text-xs">
            Add symbols above to compare
          </div>
        )}
      </div>
    </div>
  );
}
