'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { useChart } from '@/hooks/useChart';
import { ChartTimeframe } from '@/types';
import { calculateSMA, calculateRSI, calculateBollingerBands } from './TechnicalIndicators';

const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

type Indicator = 'SMA20' | 'SMA50' | 'RSI' | 'BB';

interface Props {
  symbol: string;
}

function PriceChartInner({ symbol }: Props) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const { data, isLoading } = useChart(symbol, timeframe);

  const toggleIndicator = (ind: Indicator) => {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let ro: ResizeObserver | null = null;

    import('lightweight-charts').then(({ createChart, CandlestickSeries, LineSeries }) => {
      if (disposed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: '#001616' },
          textColor: '#009090',
          fontSize: 10,
          fontFamily: '"IBM Plex Mono", "Source Code Pro", monospace',
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
        rightPriceScale: {
          borderColor: '#003333',
        },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      if (timeframe === '1D') {
        seriesRef.current = chart.addSeries(LineSeries, {
          color: '#CCA800',
          lineWidth: 1,
        });
      } else {
        seriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: '#00FF66',
          downColor: '#FF3333',
          wickUpColor: '#00FF66',
          wickDownColor: '#FF3333',
          borderUpColor: '#00FF66',
          borderDownColor: '#FF3333',
        });
      }

      // Add indicator overlays
      indicatorSeriesRef.current.clear();

      if (indicators.has('SMA20')) {
        const sma = chart.addSeries(LineSeries, { color: '#00BFFF', lineWidth: 1 });
        indicatorSeriesRef.current.set('SMA20', sma);
      }
      if (indicators.has('SMA50')) {
        const sma = chart.addSeries(LineSeries, { color: '#AA8800', lineWidth: 1 });
        indicatorSeriesRef.current.set('SMA50', sma);
      }
      if (indicators.has('BB')) {
        const upper = chart.addSeries(LineSeries, { color: '#CC99FF', lineWidth: 1, lineStyle: 2 });
        const lower = chart.addSeries(LineSeries, { color: '#CC99FF', lineWidth: 1, lineStyle: 2 });
        indicatorSeriesRef.current.set('BB_upper', upper);
        indicatorSeriesRef.current.set('BB_lower', lower);
      }

      chartRef.current = chart as unknown as typeof chartRef.current;

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
      seriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, [symbol, timeframe, indicators]);

  useEffect(() => {
    if (!data || !seriesRef.current) return;

    const validData = data.filter((d) => d.close != null && d.time != null);

    if (timeframe === '1D') {
      seriesRef.current.setData(validData.map((d) => ({ time: d.time as number, value: d.close })));
    } else {
      seriesRef.current.setData(validData.map((d) => ({
        time: d.time as number, open: d.open, high: d.high, low: d.low, close: d.close,
      })));
    }

    // Update indicator data
    const sma20Series = indicatorSeriesRef.current.get('SMA20');
    if (sma20Series) {
      const sma = calculateSMA(validData, 20);
      sma20Series.setData(sma.map((p) => ({ time: p.time as number, value: p.value })));
    }

    const sma50Series = indicatorSeriesRef.current.get('SMA50');
    if (sma50Series) {
      const sma = calculateSMA(validData, 50);
      sma50Series.setData(sma.map((p) => ({ time: p.time as number, value: p.value })));
    }

    const bbUpper = indicatorSeriesRef.current.get('BB_upper');
    const bbLower = indicatorSeriesRef.current.get('BB_lower');
    if (bbUpper && bbLower) {
      const bb = calculateBollingerBands(validData);
      bbUpper.setData(bb.map((p) => ({ time: p.time as number, value: p.upper })));
      bbLower.setData(bb.map((p) => ({ time: p.time as number, value: p.lower })));
    }

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, timeframe]);

  // RSI display (separate from chart)
  const rsiData = data && indicators.has('RSI')
    ? calculateRSI(data.filter((d) => d.close != null && d.time != null))
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-bloomberg-border flex-wrap">
        <div className="flex gap-0.5 mr-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-xs rounded ${
                timeframe === tf
                  ? 'bg-bloomberg-orange text-black font-bold'
                  : 'text-bloomberg-text-muted hover:text-bloomberg-orange'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-bloomberg-border" />
        <div className="flex gap-0.5 ml-2">
          {(['SMA20', 'SMA50', 'RSI', 'BB'] as Indicator[]).map((ind) => (
            <button
              key={ind}
              onClick={() => toggleIndicator(ind)}
              className={`px-1.5 py-0.5 text-[10px] rounded ${
                indicators.has(ind)
                  ? 'bg-bloomberg-blue/20 text-bloomberg-blue border border-bloomberg-blue/50'
                  : 'text-bloomberg-text-muted hover:text-bloomberg-text-secondary'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-bloomberg-text-muted text-sm animate-pulse">Loading...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* RSI subplot */}
      {rsiData && rsiData.length > 0 && (
        <div className="h-16 border-t border-bloomberg-border px-2 py-1 shrink-0">
          <div className="text-bloomberg-text-muted text-[9px] mb-0.5">RSI(14)</div>
          <div className="flex items-end h-10 gap-px">
            {rsiData.slice(-60).map((p, i) => {
              const height = (p.value / 100) * 100;
              const color = p.value > 70 ? '#FF3333' : p.value < 30 ? '#00FF66' : '#004e4e';
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${height}%`, backgroundColor: color, minWidth: 1 }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-bloomberg-text-muted mt-0.5">
            <span>30</span>
            <span className="text-bloomberg-text-secondary">
              {rsiData[rsiData.length - 1]?.value.toFixed(1)}
            </span>
            <span>70</span>
          </div>
        </div>
      )}
    </div>
  );
}

const PriceChart = memo(PriceChartInner);
export default PriceChart;
