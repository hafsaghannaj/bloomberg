export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getEarningsCalendar } from '@/lib/finnhub';
import { enforceRateLimit, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'finnhub-earnings-calendar', max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const now = new Date();
  const from = now.toISOString().split('T')[0];
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await getEarningsCalendar(from, to);
  return secureJson(data, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
