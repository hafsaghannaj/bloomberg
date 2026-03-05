export const dynamic = 'force-static';
import { NextRequest } from 'next/server';
import { getMacroIndicators } from '@/lib/fred';
import { enforceRateLimit, secureJson } from '@/lib/server/security';

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'fred-macro', max: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const data = await getMacroIndicators();
    return secureJson(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('Macro indicators error:', err);
    return secureJson({ error: 'Failed to fetch macro indicators' }, { status: 500 });
  }
}
