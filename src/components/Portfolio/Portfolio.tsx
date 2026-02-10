'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { useQuotes } from '@/hooks/useQuote';
import { formatPrice, formatChange, formatPercent } from '@/lib/format';
import { X, Plus } from 'lucide-react';
import AddPositionModal from './AddPositionModal';

export default function Portfolio() {
  const [showModal, setShowModal] = useState(false);
  const {
    positions,
    removePosition,
    addTab,
  } = useTerminalStore();

  const symbols = [...new Set(positions.map((p) => p.symbol))];
  const { data: quotes } = useQuotes(symbols);

  const getPrice = (symbol: string) => {
    const q = quotes?.find((q) => q.symbol === symbol);
    return q?.regularMarketPrice || 0;
  };

  let totalValue = 0;
  let totalCost = 0;
  positions.forEach((p) => {
    totalValue += getPrice(p.symbol) * p.shares;
    totalCost += p.avgCost * p.shares;
  });
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
          Portfolio
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="text-bloomberg-orange hover:text-bloomberg-amber flex items-center gap-1 text-xs"
        >
          <Plus size={12} /> ADD
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-bloomberg-text-muted text-xs">
              No positions yet. Click + ADD to start.
            </span>
          </div>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-bloomberg-text-muted border-b border-bloomberg-border">
                  <th className="text-left py-1.5 px-2">Symbol</th>
                  <th className="text-right py-1.5 px-2">Shares</th>
                  <th className="text-right py-1.5 px-2">Avg Cost</th>
                  <th className="text-right py-1.5 px-2">Current</th>
                  <th className="text-right py-1.5 px-2">P&L</th>
                  <th className="text-right py-1.5 px-2">P&L%</th>
                  <th className="py-1.5 px-1 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const currentPrice = getPrice(pos.symbol);
                  const pnl = (currentPrice - pos.avgCost) * pos.shares;
                  const pnlPercent =
                    pos.avgCost > 0
                      ? ((currentPrice - pos.avgCost) / pos.avgCost) * 100
                      : 0;
                  const isPositive = pnl >= 0;

                  return (
                    <tr
                      key={pos.id}
                      className="border-b border-bloomberg-border/50 hover:bg-bloomberg-bg-hover cursor-pointer"
                      onClick={() => addTab(pos.symbol, pos.symbol)}
                    >
                      <td className="py-1.5 px-2 text-bloomberg-orange font-bold">
                        {pos.symbol}
                      </td>
                      <td className="py-1.5 px-2 text-right text-bloomberg-text-secondary">
                        {pos.shares}
                      </td>
                      <td className="py-1.5 px-2 text-right text-bloomberg-text-secondary">
                        {formatPrice(pos.avgCost)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-bloomberg-text-secondary">
                        {currentPrice > 0 ? formatPrice(currentPrice) : '...'}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right font-bold ${
                          isPositive
                            ? 'text-bloomberg-green'
                            : 'text-bloomberg-red'
                        }`}
                      >
                        {currentPrice > 0 ? formatChange(pnl) : '...'}
                      </td>
                      <td
                        className={`py-1.5 px-2 text-right ${
                          isPositive
                            ? 'text-bloomberg-green'
                            : 'text-bloomberg-red'
                        }`}
                      >
                        {currentPrice > 0
                          ? formatPercent(pnlPercent)
                          : '...'}
                      </td>
                      <td className="py-1.5 px-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePosition(pos.id);
                          }}
                          className="text-bloomberg-text-muted hover:text-bloomberg-red"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total */}
            <div className="px-3 py-2 border-t border-bloomberg-border bg-bloomberg-bg-header">
              <div className="flex justify-between text-xs">
                <span className="text-bloomberg-text-muted">Total Value</span>
                <span className="text-bloomberg-text-secondary font-bold">
                  {formatPrice(totalValue)}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-bloomberg-text-muted">Total P&L</span>
                <span
                  className={`font-bold ${
                    totalPnL >= 0
                      ? 'text-bloomberg-green'
                      : 'text-bloomberg-red'
                  }`}
                >
                  {formatChange(totalPnL)} ({formatPercent(totalPnLPercent)})
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && <AddPositionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
