'use client';
import { useQuery } from '@tanstack/react-query';
import type { InsiderTransaction } from '@/lib/finnhub';

export function useInsider(symbol: string | null) {
  return useQuery<InsiderTransaction[]>({
    queryKey: ['insider', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/insider?symbol=${symbol}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
  });
}
