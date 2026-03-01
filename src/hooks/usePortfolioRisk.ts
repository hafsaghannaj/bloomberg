import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { PortfolioPosition } from '@/types';

export interface RiskMetrics {
  totalReturn:   number;
  spyReturn:     number;
  annualReturn:  number;
  spyAnnual:     number;
  alpha:         number;
  beta:          number;
  sharpe:        number;
  volatility:    number;
  maxDrawdown:   number;
  winRate:       number;
  lookbackDays:  number;
}

export interface SymbolStat {
  symbol:      string;
  weight:      number;
  totalReturn: number;
  annualReturn:number;
  beta:        number;
  sharpe:      number;
  maxDrawdown: number;
  contribution:number;
}

export interface TimelinePoint {
  date:      string;
  portfolio: number;
  spy:       number;
}

export interface PortfolioRiskResult {
  metrics:     RiskMetrics;
  symbolStats: SymbolStat[];
  timeline:    TimelinePoint[];
}

export function usePortfolioRisk(positions: PortfolioPosition[]) {
  // Stable query key derived from positions (symbol + shares, sorted)
  const key = positions
    .map((p) => `${p.symbol}:${p.shares}`)
    .sort()
    .join(',');

  return useQuery<PortfolioRiskResult>({
    queryKey: ['portfolio-risk', key],
    queryFn: async () => {
      const res = await apiFetch('/api/portfolio-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: positions.map((p) => ({
            symbol:  p.symbol,
            shares:  p.shares,
            avgCost: p.avgCost,
          })),
        }),
      });
      if (!res.ok) throw new Error('Analytics failed');
      return res.json();
    },
    enabled: positions.length > 0,
    staleTime:      1000 * 60 * 5,  // 5 min — data doesn't change that fast
    retry: 1,
  });
}
