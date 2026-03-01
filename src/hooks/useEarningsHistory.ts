import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { EarningsRecord } from '@/lib/finnhub';

export function useEarningsHistory(symbol: string | null) {
  return useQuery<EarningsRecord[]>({
    queryKey: ['earnings-history', symbol],
    queryFn: async () => {
      const res = await apiFetch(`/api/finnhub/earnings?symbol=${symbol}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 1000 * 60 * 60,
  });
}
