'use client';

import { useQuery } from '@tanstack/react-query';
import { NewsItem } from '@/types';
import { isNativePlatform } from '@/lib/platform';
import { getNewsClient } from '@/lib/yahoo-client';

export function useNews(symbol?: string | null) {
  return useQuery<NewsItem[]>({
    queryKey: ['news', symbol || 'general'],
    queryFn: async () => {
      if (isNativePlatform()) {
        return await getNewsClient(symbol);
      }
      const params = symbol ? `?symbol=${symbol}` : '';
      const res = await fetch(`/api/news${params}`);
      if (!res.ok) throw new Error('News fetch failed');
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
