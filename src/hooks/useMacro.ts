import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';
import type { MacroIndicator } from '@/types';

export function useMacro() {
  return useQuery<MacroIndicator[]>({
    queryKey: ['macro-indicators'],
    queryFn: async () => {
      const res = await apiFetch('/api/fred/macro');
      if (!res.ok) throw new Error('Failed to fetch macro indicators');
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}
