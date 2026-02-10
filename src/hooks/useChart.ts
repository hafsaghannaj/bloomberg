'use client';

import { useQuery } from '@tanstack/react-query';
import { ChartDataPoint, ChartTimeframe } from '@/types';

export function useChart(symbol: string | null, timeframe: ChartTimeframe) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['chart', symbol, timeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/chart?symbol=${symbol}&range=${timeframe}`
      );
      if (!res.ok) throw new Error('Chart fetch failed');
      return res.json();
    },
    staleTime: 30_000,
    enabled: !!symbol,
  });
}
