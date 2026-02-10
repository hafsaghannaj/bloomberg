'use client';

import { useQuery } from '@tanstack/react-query';

export function useQuoteSummary(symbol: string | null) {
  return useQuery({
    queryKey: ['quote-summary', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/quote-summary?symbol=${symbol}`);
      if (!res.ok) throw new Error('QuoteSummary fetch failed');
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!symbol,
  });
}
