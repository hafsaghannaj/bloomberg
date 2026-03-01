'use client';

import { useQuery } from '@tanstack/react-query';

export interface SectorRow {
  symbol: string;
  name: string;
  short: string;
  price: number;
  r1d: number; r1w: number; r1m: number; r3m: number; r1y: number; rYTD: number;
  rs1d: number; rs1w: number; rs1m: number; rs3m: number;
  rsScore: number;
  momentum: number;
}

export interface SectorRotationData {
  sectors: SectorRow[];
  spy: { r1d: number; r1w: number; r1m: number; r3m: number; r1y: number; rYTD: number };
  updatedAt: number;
}

export function useSectorRotation() {
  return useQuery<SectorRotationData>({
    queryKey: ['sector-rotation'],
    queryFn: async () => {
      const res = await fetch('/api/sector-rotation');
      if (!res.ok) throw new Error('sector rotation fetch failed');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
