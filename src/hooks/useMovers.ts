import { apiFetch } from "@/lib/api";
import { useQuery } from '@tanstack/react-query';

export type MoverType = 'gainers' | 'losers' | 'active' | 'shorted' | 'undervalued' | 'growth';

export interface MoverQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number | null;
  trailingPE: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
}

export function useMovers(type: MoverType) {
  return useQuery<MoverQuote[]>({
    queryKey: ['movers', type],
    queryFn: async () => {
      const res = await apiFetch(`/api/movers?type=${type}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}
