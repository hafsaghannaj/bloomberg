'use client';
import { apiFetch } from '@/lib/api';

import { useQuery } from '@tanstack/react-query';
import { isNativePlatform } from '@/lib/platform';
import { getQuoteSummaryClient } from '@/lib/yahoo-client';

export function useQuoteSummary(symbol: string | null) {
  return useQuery({
    queryKey: ['quote-summary', symbol],
    queryFn: async () => {
      if (isNativePlatform()) {
        return await getQuoteSummaryClient(symbol!);
      }
      const res = await apiFetch(`/api/quote-summary?symbol=${symbol}`);
      if (!res.ok) throw new Error('QuoteSummary fetch failed');
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!symbol,
  });
}
