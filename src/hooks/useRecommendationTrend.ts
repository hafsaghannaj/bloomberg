import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { RecommendationTrend } from '@/lib/finnhub';

export function useRecommendationTrend(symbol: string | null) {
  return useQuery<RecommendationTrend[]>({
    queryKey: ['recommendations', symbol],
    queryFn: async () => {
      const res = await apiFetch(`/api/finnhub/recommendations?symbol=${symbol}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 1000 * 60 * 60,
  });
}
