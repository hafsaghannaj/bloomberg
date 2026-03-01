import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { YieldPoint } from '@/types';

export function useYieldCurve() {
  return useQuery<YieldPoint[]>({
    queryKey: ['yield-curve'],
    queryFn: async () => {
      const res = await apiFetch('/api/fred/yield-curve');
      if (!res.ok) throw new Error('Failed to fetch yield curve');
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000,
  });
}
