export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, filename } = await req.json();

    if (!pdfBase64 || !filename) {
      return NextResponse.json({ error: 'Missing pdfBase64 or filename' }, { status: 400 });
    }

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const pdfDir = path.join(process.cwd(), 'pdf');

    await mkdir(pdfDir, { recursive: true });

    const filePath = path.join(pdfDir, safeName);
    const buffer = Buffer.from(pdfBase64, 'base64');
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, path: `pdf/${safeName}` });
  } catch (err) {
    console.error('Save PDF error:', err);
    return NextResponse.json({ error: 'Failed to save PDF' }, { status: 500 });
  }
}
