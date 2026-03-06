export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  enforceRateLimit,
  parseSymbol,
  parseUnixTimestamp,
  secureJson,
} from '@/lib/server/security';

const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'options', max: 80, windowMs: 60_000 });
  if (limited) return limited;

  const symbol = parseSymbol(req.nextUrl.searchParams.get('symbol'));
  const expiryRaw = req.nextUrl.searchParams.get('expiry');
  if (!symbol) return secureJson({ error: 'valid symbol required' }, { status: 400 });

  const expiry = parseUnixTimestamp(expiryRaw);
  if (expiryRaw && expiry === null) {
    return secureJson({ error: 'invalid expiry value' }, { status: 400 });
  }

  try {
    const opts: Record<string, unknown> = {};
    if (expiry) opts.date = expiry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (yf as any).options(symbol, opts);
    return secureJson(
      {
        expirationDates: data.expirationDates ?? [],
        calls: data.options?.[0]?.calls ?? [],
        puts: data.options?.[0]?.puts ?? [],
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('Options error:', err);
    return secureJson({ expirationDates: [], calls: [], puts: [] }, { status: 200 });
  }
}
