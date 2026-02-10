'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { formatPrice } from '@/lib/format';
import { Bell, X, Plus, TrendingUp, TrendingDown } from 'lucide-react';

export default function AlertsPanel() {
  const { alerts, addAlert, removeAlert, activeSymbol } = useTerminalStore();
  const [showAdd, setShowAdd] = useState(false);
  const [price, setPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const handleAdd = () => {
    if (!activeSymbol || !price) return;
    addAlert(activeSymbol, Number(price), direction);
    setPrice('');
    setShowAdd(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={12} /> Price Alerts
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-bloomberg-orange hover:text-bloomberg-amber flex items-center gap-1 text-xs"
        >
          <Plus size={12} /> ADD
        </button>
      </div>

      {showAdd && activeSymbol && (
        <div className="p-3 border-b border-bloomberg-border bg-bloomberg-bg-header animate-fade-in">
          <div className="text-bloomberg-text-muted text-[10px] mb-2">
            Alert for {activeSymbol}
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
              className="bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-xs text-bloomberg-orange outline-none"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              className="flex-1 bg-bloomberg-bg border border-bloomberg-border rounded px-2 py-1 text-xs text-bloomberg-orange outline-none focus:border-bloomberg-orange"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="bg-bloomberg-orange text-black font-bold text-xs px-3 py-1 rounded hover:bg-bloomberg-amber"
            >
              SET
            </button>
          </div>
        </div>
      )}

      {!activeSymbol && showAdd && (
        <div className="p-3 text-bloomberg-text-muted text-xs">
          Select a ticker first to add an alert
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-text-muted text-xs">No active alerts</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-2 px-3 py-2 border-b border-bloomberg-border/50 ${
                alert.triggered ? 'bg-bloomberg-bg-hover opacity-60' : ''
              }`}
            >
              {alert.direction === 'above' ? (
                <TrendingUp size={12} className="text-bloomberg-green shrink-0" />
              ) : (
                <TrendingDown size={12} className="text-bloomberg-red shrink-0" />
              )}
              <span className="text-bloomberg-orange text-xs font-bold w-14">
                {alert.symbol}
              </span>
              <span className="text-bloomberg-text-muted text-xs">
                {alert.direction === 'above' ? '>' : '<'}
              </span>
              <span className="text-bloomberg-text-secondary text-xs flex-1">
                {formatPrice(alert.targetPrice)}
              </span>
              {alert.triggered && (
                <span className="text-bloomberg-amber text-[10px]">TRIGGERED</span>
              )}
              <button
                onClick={() => removeAlert(alert.id)}
                className="text-bloomberg-text-muted hover:text-bloomberg-red"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
