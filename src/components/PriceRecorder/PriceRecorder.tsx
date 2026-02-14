'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { useQuotes } from '@/hooks/useQuote';
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/format';
import { PriceSnapshot, RecorderInterval } from '@/types';
import { Play, Square, Trash2, Download, Settings, X, Plus } from 'lucide-react';
import RecorderSettingsPanel from './RecorderSettings';

export default function PriceRecorder() {
  const {
    recorderActive,
    recorderSnapshots,
    recorderSettings,
    recorderOpeningPrices,
    startRecorder,
    stopRecorder,
    addSnapshot,
    clearSnapshots,
    setOpeningPrice,
    addNotification,
  } = useTerminalStore();

  const {
    addRecorderTicker,
    removeRecorderTicker,
  } = useTerminalStore();

  const [showSettings, setShowSettings] = useState(false);
  const [filterTicker, setFilterTicker] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tableEndRef = useRef<HTMLDivElement>(null);
  const openingCaptured = useRef(false);

  const { tickers, interval, highlightThreshold, alertThreshold } = recorderSettings;
  const { data: quotes, refetch } = useQuotes(tickers);

  // Capture opening prices on first data fetch when recorder starts
  useEffect(() => {
    if (recorderActive && quotes && !openingCaptured.current) {
      quotes.forEach((q) => {
        if (q.regularMarketOpen && !recorderOpeningPrices[q.symbol]) {
          setOpeningPrice(q.symbol, q.regularMarketOpen);
        }
      });
      openingCaptured.current = true;
    }
    if (!recorderActive) {
      openingCaptured.current = false;
    }
  }, [recorderActive, quotes, recorderOpeningPrices, setOpeningPrice]);

  // Take a snapshot from current quotes
  const takeSnapshot = useCallback(async () => {
    const { data } = await refetch();
    if (!data) return;

    data.forEach((q) => {
      const openPrice = recorderOpeningPrices[q.symbol] || q.regularMarketOpen || q.regularMarketPreviousClose;
      const change = q.regularMarketPrice - openPrice;
      const pctChange = openPrice ? (change / openPrice) * 100 : 0;

      const snapshot: PriceSnapshot = {
        id: `${q.symbol}-${Date.now()}`,
        timestamp: Date.now(),
        ticker: q.symbol,
        lastPrice: q.regularMarketPrice,
        openPrice,
        change,
        pctChange,
        volume: q.regularMarketVolume,
        bid: q.regularMarketDayLow,
        ask: q.regularMarketDayHigh,
      };

      addSnapshot(snapshot);

      // Alert on significant moves
      if (Math.abs(pctChange) > alertThreshold) {
        addNotification(
          `${q.symbol} moved ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% from open`,
          'alert'
        );
      }
    });
  }, [refetch, recorderOpeningPrices, alertThreshold, addSnapshot, addNotification]);

  // Recording loop
  useEffect(() => {
    if (recorderActive) {
      // Take immediate snapshot
      takeSnapshot();

      // Schedule interval
      intervalRef.current = setInterval(takeSnapshot, interval * 60 * 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [recorderActive, interval, takeSnapshot]);

  // Auto-scroll to latest only while actively recording (not on tab switch)
  const prevSnapshotCount = useRef(recorderSnapshots.length);
  useEffect(() => {
    if (recorderActive && recorderSnapshots.length > prevSnapshotCount.current) {
      tableEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevSnapshotCount.current = recorderSnapshots.length;
  }, [recorderSnapshots.length, recorderActive]);

  // Filter snapshots for display
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySnapshots = recorderSnapshots
    .filter((s) => s.timestamp >= todayStart.getTime())
    .filter((s) => !filterTicker || s.ticker === filterTicker);

  // Group by timestamp for display
  const latestByTicker: Record<string, PriceSnapshot> = {};
  recorderSnapshots.forEach((s) => {
    if (!latestByTicker[s.ticker] || s.timestamp > latestByTicker[s.ticker].timestamp) {
      latestByTicker[s.ticker] = s;
    }
  });

  const handleExport = () => {
    const headers = 'Timestamp,Ticker,Last Price,Open Price,Change,% Change,Volume\n';
    const rows = todaySnapshots
      .map((s) =>
        [
          new Date(s.timestamp).toISOString(),
          s.ticker,
          s.lastPrice.toFixed(2),
          s.openPrice.toFixed(2),
          s.change.toFixed(2),
          s.pctChange.toFixed(4),
          s.volume,
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-recorder-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
            Price Recorder
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            recorderActive
              ? 'bg-bloomberg-green/20 text-bloomberg-green'
              : 'bg-bloomberg-red/20 text-bloomberg-red'
          }`}>
            {recorderActive ? 'RECORDING' : 'STOPPED'}
          </span>
          <span className="text-bloomberg-text-muted text-[10px]">
            {todaySnapshots.length} SNAPSHOTS
            {recorderActive && ` | EVERY ${interval}MIN`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!recorderActive ? (
            <button
              onClick={startRecorder}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-bloomberg-green bg-bloomberg-green/10 hover:bg-bloomberg-green/20 border border-bloomberg-green/30 rounded"
            >
              <Play size={10} /> START
            </button>
          ) : (
            <button
              onClick={stopRecorder}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-bloomberg-red bg-bloomberg-red/10 hover:bg-bloomberg-red/20 border border-bloomberg-red/30 rounded"
            >
              <Square size={10} /> STOP
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-bloomberg-text-secondary hover:text-bloomberg-text-primary bg-bloomberg-bg-hover rounded"
            title="Export CSV"
          >
            <Download size={10} />
          </button>

          <button
            onClick={clearSnapshots}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-bloomberg-text-secondary hover:text-bloomberg-red bg-bloomberg-bg-hover rounded"
            title="Clear snapshots"
          >
            <Trash2 size={10} />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded ${
              showSettings
                ? 'text-bloomberg-orange bg-bloomberg-orange/10'
                : 'text-bloomberg-text-secondary hover:text-bloomberg-text-primary bg-bloomberg-bg-hover'
            }`}
            title="Settings"
          >
            <Settings size={10} />
          </button>
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && <RecorderSettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Ticker Bar — permanent tickers locked, custom tickers removable, inline add */}
      <div className="px-4 py-1.5 border-b border-bloomberg-border bg-bloomberg-bg-hover/50 flex items-center gap-2 overflow-x-auto shrink-0">
        <button
          onClick={() => setFilterTicker(null)}
          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
            !filterTicker ? 'text-bloomberg-orange bg-bloomberg-orange/10' : 'text-bloomberg-text-muted hover:text-bloomberg-text-secondary'
          }`}
        >
          ALL
        </button>

        <div className="h-4 w-px bg-bloomberg-border shrink-0" />

        {tickers.map((ticker) => {
          const isPermanent = ticker === '^GSPC' || ticker === 'SPY';
          const latest = latestByTicker[ticker];
          const isPositive = latest ? latest.pctChange >= 0 : true;
          return (
            <div
              key={ticker}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded shrink-0 cursor-pointer border ${
                filterTicker === ticker
                  ? 'text-bloomberg-orange bg-bloomberg-orange/10 border-bloomberg-orange/40'
                  : 'text-bloomberg-text-secondary hover:text-bloomberg-text-primary border-bloomberg-border/50'
              }`}
              onClick={() => setFilterTicker(filterTicker === ticker ? null : ticker)}
            >
              <span className="font-bold">{ticker}</span>
              {latest && (
                <>
                  <span className="text-bloomberg-text-muted">{formatPrice(latest.lastPrice)}</span>
                  <span className={isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'}>
                    {latest.pctChange > 0 ? '+' : ''}{latest.pctChange.toFixed(2)}%
                  </span>
                </>
              )}
              {!isPermanent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecorderTicker(ticker);
                    if (filterTicker === ticker) setFilterTicker(null);
                  }}
                  className="text-bloomberg-text-muted hover:text-bloomberg-red ml-0.5"
                  title="Remove ticker"
                >
                  <X size={8} />
                </button>
              )}
              {isPermanent && (
                <span className="text-bloomberg-text-muted/40 text-[8px]" title="Permanent ticker">
                  PIN
                </span>
              )}
            </div>
          );
        })}

        <div className="h-4 w-px bg-bloomberg-border shrink-0" />

        {/* Add ticker inline */}
        <form
          className="flex items-center gap-1 shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            const ticker = newTicker.trim().toUpperCase();
            if (ticker) {
              addRecorderTicker(ticker);
              setNewTicker('');
            }
          }}
        >
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            placeholder="Add ticker..."
            className="w-28 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-0.5 text-[10px] text-bloomberg-text-primary placeholder:text-bloomberg-text-muted/40 focus:outline-none focus:border-bloomberg-orange"
          />
          <button
            type="submit"
            className="px-1.5 py-0.5 text-[10px] text-bloomberg-green bg-bloomberg-green/10 hover:bg-bloomberg-green/20 border border-bloomberg-green/30 rounded"
            title="Add ticker to recorder"
          >
            <Plus size={10} />
          </button>
        </form>
      </div>

      {/* Snapshot Table */}
      <div className="flex-1 overflow-y-auto">
        {todaySnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-bloomberg-text-muted text-xs">
              No snapshots recorded today
            </span>
            <span className="text-bloomberg-text-muted text-[10px]">
              {recorderActive
                ? `Next snapshot in ${interval} min...`
                : `Auto-starts at ${recorderSettings.marketOpen} ET Mon-Fri, or click START`}
            </span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bloomberg-bg z-10">
              <tr className="text-bloomberg-text-muted border-b border-bloomberg-border">
                <th className="text-left py-1.5 px-3">Timestamp</th>
                <th className="text-left py-1.5 px-2">Ticker</th>
                <th className="text-right py-1.5 px-2">Last Price</th>
                <th className="text-right py-1.5 px-2">Change</th>
                <th className="text-right py-1.5 px-2">% Change</th>
                <th className="text-right py-1.5 px-2">Volume</th>
                <th className="text-right py-1.5 px-2">Open</th>
                <th className="text-right py-1.5 px-2">Day Low</th>
                <th className="text-right py-1.5 px-2">Day High</th>
              </tr>
            </thead>
            <tbody>
              {todaySnapshots.map((snap) => {
                const isPositive = snap.pctChange >= 0;
                const isSignificant = Math.abs(snap.pctChange) > highlightThreshold;
                const isAlert = Math.abs(snap.pctChange) > alertThreshold;

                return (
                  <tr
                    key={snap.id}
                    className={`border-b border-bloomberg-border/30 ${
                      isAlert
                        ? isPositive
                          ? 'bg-green-950/40'
                          : 'bg-red-950/40'
                        : isSignificant
                        ? isPositive
                          ? 'bg-green-950/20'
                          : 'bg-red-950/20'
                        : 'hover:bg-bloomberg-bg-hover'
                    }`}
                  >
                    <td className="py-1.5 px-3 text-bloomberg-text-muted font-mono">
                      {new Date(snap.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>
                    <td className="py-1.5 px-2 text-bloomberg-orange font-bold">
                      {snap.ticker}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-secondary font-mono">
                      {formatPrice(snap.lastPrice)}
                    </td>
                    <td className={`py-1.5 px-2 text-right font-bold font-mono ${
                      isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
                    }`}>
                      {formatChange(snap.change)}
                    </td>
                    <td className={`py-1.5 px-2 text-right font-bold font-mono ${
                      isPositive ? 'text-bloomberg-green' : 'text-bloomberg-red'
                    }`}>
                      {snap.pctChange > 0 ? '+' : ''}{snap.pctChange.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-muted font-mono">
                      {formatVolume(snap.volume)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-muted font-mono">
                      {formatPrice(snap.openPrice)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-muted font-mono">
                      {snap.bid ? formatPrice(snap.bid) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-bloomberg-text-muted font-mono">
                      {snap.ask ? formatPrice(snap.ask) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div ref={tableEndRef} />
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-1 border-t border-bloomberg-border bg-bloomberg-bg-hover/30 flex items-center justify-between text-[10px] text-bloomberg-text-muted shrink-0">
        <span>
          Tracking: {tickers.join(', ')} | Interval: {interval}min |
          Threshold: {highlightThreshold}% / Alert: {alertThreshold}%
        </span>
        <span>
          {recorderActive && todaySnapshots.length > 0
            ? `Last: ${new Date(todaySnapshots[todaySnapshots.length - 1].timestamp).toLocaleTimeString()}`
            : 'Market Hours: ' + recorderSettings.marketOpen + ' - ' + recorderSettings.marketClose + ' ET'}
        </span>
      </div>
    </div>
  );
}
