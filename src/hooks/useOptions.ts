'use client';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  expiration: number;
}

export interface OptionsData {
  expirationDates: number[];
  calls: OptionContract[];
  puts: OptionContract[];
}

export function useOptions(symbol: string | null, expiry?: number) {
  const params = new URLSearchParams({ symbol: symbol ?? '' });
  if (expiry) params.set('expiry', String(expiry));

  return useQuery<OptionsData>({
    queryKey: ['options', symbol, expiry],
    queryFn: async () => {
      const res = await apiFetch(`/api/options?${params}`);
      if (!res.ok) return { expirationDates: [], calls: [], puts: [] };
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
