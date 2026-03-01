'use client';
import { useQuery } from '@tanstack/react-query';
import type { ChartDataPoint, ChartTimeframe } from '@/types';

export interface MultiChartSeries {
  symbol: string;
  data: ChartDataPoint[];
}

export function useMultiChart(symbols: string[], timeframe: ChartTimeframe) {
  return useQuery<MultiChartSeries[]>({
    queryKey: ['multi-chart', symbols.join(','), timeframe],
    queryFn: async () => {
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`/api/chart?symbol=${sym}&range=${timeframe}`)
            .then((r) => r.json())
            .then((data: ChartDataPoint[]) => ({ symbol: sym, data: Array.isArray(data) ? data : [] }))
            .catch(() => ({ symbol: sym, data: [] as ChartDataPoint[] }))
        )
      );
      return results;
    },
    enabled: symbols.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
