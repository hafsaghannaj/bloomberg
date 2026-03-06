export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getEconomicCalendar } from '@/lib/finnhub';
import { enforceRateLimit, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'economic-calendar', max: 60, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const data = await getEconomicCalendar();
    return secureJson(data, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch {
    return secureJson([], { status: 200 });
  }
}
