'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function AddPositionModal({ onClose }: Props) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const { addPosition } = useTerminalStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !avgCost) return;
    addPosition(symbol.toUpperCase(), Number(shares), Number(avgCost));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bloomberg-bg-panel border border-bloomberg-border rounded-lg p-4 w-80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-bloomberg-amber text-sm font-bold">
            ADD POSITION
          </h3>
          <button
            onClick={onClose}
            className="text-bloomberg-text-muted hover:text-bloomberg-orange"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-bloomberg-text-muted text-xs block mb-1">
              Symbol
            </label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AAPL"
              className="w-full bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1.5 text-bloomberg-orange text-sm outline-none focus:border-bloomberg-orange"
              autoFocus
            />
          </div>
          <div>
            <label className="text-bloomberg-text-muted text-xs block mb-1">
              Shares
            </label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="100"
              className="w-full bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1.5 text-bloomberg-orange text-sm outline-none focus:border-bloomberg-orange"
            />
          </div>
          <div>
            <label className="text-bloomberg-text-muted text-xs block mb-1">
              Avg Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="150.00"
              className="w-full bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1.5 text-bloomberg-orange text-sm outline-none focus:border-bloomberg-orange"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-bloomberg-orange text-black font-bold text-sm py-2 rounded hover:bg-bloomberg-amber"
          >
            ADD
          </button>
        </form>
      </div>
    </div>
  );
}
