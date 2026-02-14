'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { RecorderInterval } from '@/types';
import { X, Plus } from 'lucide-react';

const INTERVALS: RecorderInterval[] = [1, 5, 15, 30, 60];

interface RecorderSettingsPanelProps {
  onClose: () => void;
}

export default function RecorderSettingsPanel({ onClose }: RecorderSettingsPanelProps) {
  const {
    recorderSettings,
    setRecorderInterval,
    addRecorderTicker,
    removeRecorderTicker,
    updateRecorderSettings,
  } = useTerminalStore();

  const [newTicker, setNewTicker] = useState('');

  const handleAddTicker = () => {
    const ticker = newTicker.trim().toUpperCase();
    if (ticker) {
      addRecorderTicker(ticker);
      setNewTicker('');
    }
  };

  return (
    <div className="border-b border-bloomberg-border bg-bloomberg-bg-hover/30 px-4 py-3 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-bloomberg-amber text-[10px] font-bold uppercase tracking-wider">
          Recorder Settings
        </span>
        <button
          onClick={onClose}
          className="text-bloomberg-text-muted hover:text-bloomberg-text-primary"
        >
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticker Management */}
        <div>
          <label className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider block mb-1">
            Tickers
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {recorderSettings.tickers.map((ticker) => (
              <span
                key={ticker}
                className="flex items-center gap-1 px-2 py-0.5 bg-bloomberg-bg text-bloomberg-orange text-[10px] font-bold border border-bloomberg-border rounded"
              >
                {ticker}
                <button
                  onClick={() => removeRecorderTicker(ticker)}
                  className="text-bloomberg-text-muted hover:text-bloomberg-red"
                >
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
              placeholder="Add ticker (e.g., AAPL)"
              className="flex-1 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-[10px] text-bloomberg-text-primary placeholder:text-bloomberg-text-muted/50 focus:outline-none focus:border-bloomberg-orange"
            />
            <button
              onClick={handleAddTicker}
              className="px-2 py-1 text-[10px] text-bloomberg-green bg-bloomberg-green/10 hover:bg-bloomberg-green/20 border border-bloomberg-green/30 rounded"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>

        {/* Interval & Thresholds */}
        <div>
          <label className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider block mb-1">
            Recording Interval
          </label>
          <div className="flex gap-1 mb-3">
            {INTERVALS.map((int) => (
              <button
                key={int}
                onClick={() => setRecorderInterval(int)}
                className={`px-2 py-1 text-[10px] font-bold rounded border ${
                  recorderSettings.interval === int
                    ? 'text-bloomberg-orange bg-bloomberg-orange/10 border-bloomberg-orange/50'
                    : 'text-bloomberg-text-muted bg-bloomberg-bg border-bloomberg-border hover:text-bloomberg-text-secondary'
                }`}
              >
                {int}m
              </button>
            ))}
          </div>

          <label className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider block mb-1">
            Highlight Threshold (%)
          </label>
          <input
            type="number"
            value={recorderSettings.highlightThreshold}
            onChange={(e) =>
              updateRecorderSettings({ highlightThreshold: parseFloat(e.target.value) || 0.5 })
            }
            step="0.1"
            min="0.1"
            className="w-20 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-[10px] text-bloomberg-text-primary focus:outline-none focus:border-bloomberg-orange"
          />
        </div>

        {/* Market Hours & Alert Threshold */}
        <div>
          <label className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider block mb-1">
            Market Hours (ET)
          </label>
          <div className="flex items-center gap-1 mb-3">
            <input
              type="text"
              value={recorderSettings.marketOpen}
              onChange={(e) => updateRecorderSettings({ marketOpen: e.target.value })}
              className="w-16 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-[10px] text-bloomberg-text-primary focus:outline-none focus:border-bloomberg-orange text-center"
            />
            <span className="text-bloomberg-text-muted text-[10px]">to</span>
            <input
              type="text"
              value={recorderSettings.marketClose}
              onChange={(e) => updateRecorderSettings({ marketClose: e.target.value })}
              className="w-16 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-[10px] text-bloomberg-text-primary focus:outline-none focus:border-bloomberg-orange text-center"
            />
          </div>

          <label className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider block mb-1">
            Alert Threshold (%)
          </label>
          <input
            type="number"
            value={recorderSettings.alertThreshold}
            onChange={(e) =>
              updateRecorderSettings({ alertThreshold: parseFloat(e.target.value) || 1.0 })
            }
            step="0.1"
            min="0.1"
            className="w-20 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-[10px] text-bloomberg-text-primary focus:outline-none focus:border-bloomberg-orange"
          />
        </div>
      </div>
    </div>
  );
}
