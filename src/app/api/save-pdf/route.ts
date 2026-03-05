export const dynamic = 'force-static';
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { enforceRateLimit, secureJson } from '@/lib/server/security';

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/=\r\n]+$/;

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { key: 'save-pdf', max: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return secureJson({ error: 'Payload too large' }, { status: 413 });
    }

    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return secureJson({ error: 'Payload too large' }, { status: 413 });
    }

    const parsed = JSON.parse(raw) as { pdfBase64?: unknown; filename?: unknown };
    if (typeof parsed.pdfBase64 !== 'string' || typeof parsed.filename !== 'string') {
      return secureJson({ error: 'Missing pdfBase64 or filename' }, { status: 400 });
    }

    const safeStem = path
      .basename(parsed.filename)
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const safeName = `${safeStem || 'report'}.pdf`;

    const normalizedBase64 = parsed.pdfBase64
      .replace(/^data:application\/pdf;base64,/i, '')
      .replace(/\s+/g, '');
    if (!normalizedBase64 || !BASE64_RE.test(normalizedBase64)) {
      return secureJson({ error: 'Invalid PDF payload' }, { status: 400 });
    }

    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
      return secureJson({ error: 'Invalid PDF size' }, { status: 400 });
    }
    if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
      return secureJson({ error: 'Invalid PDF content' }, { status: 400 });
    }

    const pdfDir = path.join(process.cwd(), 'pdf');
    const normalizedPdfDir = path.normalize(pdfDir + path.sep);

    await mkdir(pdfDir, { recursive: true });

    const filePath = path.join(pdfDir, safeName);
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(normalizedPdfDir)) {
      return secureJson({ error: 'Invalid file path' }, { status: 400 });
    }

    await writeFile(filePath, buffer);

    return secureJson(
      { success: true, path: `pdf/${safeName}` },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('Save PDF error:', err);
    return secureJson({ error: 'Failed to save PDF' }, { status: 500 });
  }
}
