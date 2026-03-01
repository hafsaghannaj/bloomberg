'use client';
import { apiFetch } from '@/lib/api';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { SearchResult } from '@/types';
import { isNativePlatform } from '@/lib/platform';
import { searchSymbolsClient } from '@/lib/yahoo-client';

export function useSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery<SearchResult[]>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (isNativePlatform()) {
        return await searchSymbolsClient(debouncedQuery);
      }
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30_000,
  });
}
