'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTerminalStore } from '@/store/terminal';
import { useQuotes } from '@/hooks/useQuote';
import { formatPrice } from '@/lib/format';

const COLORS = ['#ff8c00', '#ffbf00', '#00c853', '#2196f3', '#ff1744', '#9c27b0', '#00bcd4', '#ff5722'];

export default function PortfolioBreakdown() {
  const { positions } = useTerminalStore();
  const symbols = [...new Set(positions.map((p) => p.symbol))];
  const { data: quotes } = useQuotes(symbols);

  if (positions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-bloomberg-text-muted text-xs">
          Add positions to see breakdown
        </span>
      </div>
    );
  }

  const getPrice = (symbol: string) => {
    const q = quotes?.find((q) => q.symbol === symbol);
    return q?.regularMarketPrice || 0;
  };

  // Allocation data
  const allocationData = positions.map((p) => ({
    name: p.symbol,
    value: getPrice(p.symbol) * p.shares,
  }));

  const total = allocationData.reduce((a, b) => a + b.value, 0);

  // P&L per position for bar chart
  const pnlData = positions.map((p) => {
    const current = getPrice(p.symbol);
    const pnl = (current - p.avgCost) * p.shares;
    return { name: p.symbol, pnl, fill: pnl >= 0 ? '#00c853' : '#ff1744' };
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
          Portfolio Breakdown
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Allocation Pie */}
        <div className="mb-4">
          <div className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider mb-1 px-1">
            Allocation
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  dataKey="value"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
            {allocationData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1 text-[10px]">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-bloomberg-text-secondary">
                  {item.name} {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* P&L Bar Chart */}
        <div>
          <div className="text-bloomberg-text-muted text-[10px] uppercase tracking-wider mb-1 px-1">
            P&L by Position
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} axisLine={{ stroke: '#2a2a2a' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#ff8c00', fontSize: 10, fontWeight: 'bold' }}
                  axisLine={{ stroke: '#2a2a2a' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 4 }}
                  labelStyle={{ color: '#ff8c00', fontSize: 11 }}
                  itemStyle={{ color: '#b0b0b0', fontSize: 11 }}
                  formatter={(value) => [formatPrice(Number(value)), 'P&L']}
                />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {pnlData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
