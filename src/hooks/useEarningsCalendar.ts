import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { EarningsCalendarItem } from '@/lib/finnhub';

export function useEarningsCalendar() {
  return useQuery<EarningsCalendarItem[]>({
    queryKey: ['earnings-calendar'],
    queryFn: async () => {
      const res = await apiFetch('/api/finnhub/earnings-calendar');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 30,
  });
}
