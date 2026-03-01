import { NextResponse } from 'next/server';
import { getMacroIndicators } from '@/lib/fred';

export async function GET() {
  try {
    const data = await getMacroIndicators();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('Macro indicators error:', err);
    return NextResponse.json({ error: 'Failed to fetch macro indicators' }, { status: 500 });
  }
}
