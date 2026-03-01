'use client';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { EconomicEvent } from '@/lib/finnhub';

export function useEconomicCalendar() {
  return useQuery<EconomicEvent[]>({
    queryKey: ['economic-calendar'],
    queryFn: async () => {
      const res = await apiFetch('/api/economic-calendar');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}
