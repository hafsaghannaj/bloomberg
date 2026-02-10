'use client';

import { useQuery } from '@tanstack/react-query';
import { Quote } from '@/types';

export function useQuote(symbol: string | null) {
  return useQuery<Quote>({
    queryKey: ['quote', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/quote?symbols=${symbol}`);
      if (!res.ok) throw new Error('Quote fetch failed');
      const data = await res.json();
      return data[0];
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    enabled: !!symbol,
  });
}

export function useQuotes(symbols: string[]) {
  return useQuery<Quote[]>({
    queryKey: ['quotes', symbols.join(',')],
    queryFn: async () => {
      const res = await fetch(`/api/quote?symbols=${symbols.join(',')}`);
      if (!res.ok) throw new Error('Quotes fetch failed');
      return res.json();
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    enabled: symbols.length > 0,
  });
}
