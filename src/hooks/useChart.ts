'use client';
import { apiFetch } from '@/lib/api';

import { useQuery } from '@tanstack/react-query';
import { ChartDataPoint, ChartTimeframe } from '@/types';
import { isNativePlatform } from '@/lib/platform';
import { getChartClient } from '@/lib/yahoo-client';

export function useChart(symbol: string | null, timeframe: ChartTimeframe) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['chart', symbol, timeframe],
    queryFn: async () => {
      if (isNativePlatform()) {
        return await getChartClient(symbol!, timeframe);
      }
      const res = await apiFetch(`/api/chart?symbol=${symbol}&range=${timeframe}`);
      if (!res.ok) throw new Error('Chart fetch failed');
      return res.json();
    },
    staleTime: 30_000,
    enabled: !!symbol,
  });
}
