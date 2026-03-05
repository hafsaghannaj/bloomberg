import { NextRequest, NextResponse } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const SYMBOL_RE = /^[A-Z0-9^][A-Z0-9.\-^=]{0,14}$/;
const SEARCH_RE = /^[\w.\- /&]{1,64}$/;

export const ALLOWED_CHART_RANGES = ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const;
export type ChartRange = (typeof ALLOWED_CHART_RANGES)[number];

type RateBucket = {
  count: number;
  resetAt: number;
};

type RateStore = Map<string, RateBucket>;
type GlobalWithRateStore = typeof globalThis & {
  __bloombergRateStore?: RateStore;
};

function getRateStore(): RateStore {
  const g = globalThis as GlobalWithRateStore;
  if (!g.__bloombergRateStore) g.__bloombergRateStore = new Map<string, RateBucket>();
  return g.__bloombergRateStore;
}

function withSecurityHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged;
}

export function secureJson(
  body: unknown,
  init?: {
    status?: number;
    headers?: HeadersInit;
  }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status,
    headers: withSecurityHeaders(init?.headers),
  });
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export function enforceRateLimit(
  req: NextRequest,
  config: { key: string; max: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucketKey = `${config.key}:${ip}`;
  const store = getRateStore();
  if (store.size > 2000) {
    store.forEach((value, key) => {
      if (now >= value.resetAt) store.delete(key);
    });
  }
  const bucket = store.get(bucketKey);

  if (!bucket || now >= bucket.resetAt) {
    store.set(bucketKey, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (bucket.count >= config.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return secureJson(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'Cache-Control': 'private, no-store',
        },
      }
    );
  }

  bucket.count += 1;
  return null;
}

export function parseSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  return SYMBOL_RE.test(normalized) ? normalized : null;
}

export function parseSymbolList(
  raw: string | null | undefined,
  maxSymbols = 25
): string[] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > maxSymbols) return null;

  const symbols = parts.map((part) => parseSymbol(part));
  if (symbols.some((symbol) => symbol === null)) return null;
  return Array.from(new Set(symbols as string[]));
}

export function parseChartRange(raw: string | null | undefined): ChartRange {
  const normalized = (raw ?? '1M').toUpperCase() as ChartRange;
  return (ALLOWED_CHART_RANGES as readonly string[]).includes(normalized) ? normalized : '1M';
}

export function parseSearchQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  if (!SEARCH_RE.test(normalized)) return null;
  return normalized;
}

export function parseUnixTimestamp(raw: string | null | undefined): number | null {
  if (!raw) return null;
  if (!/^\d{9,11}$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
}
