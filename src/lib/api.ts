/**
 * API fetch helper — routes all /api/... calls through the correct base URL.
 *
 * Web (dev + production server):
 *   NEXT_PUBLIC_API_URL unset → relative paths work as normal.
 *
 * iOS Capacitor (static export, file:// origin):
 *   Set NEXT_PUBLIC_API_URL=https://your-app.vercel.app at build time.
 *   All API calls then hit your deployed server instead of file://.
 *   CapacitorHttp intercepts the outbound fetch and handles CORS natively.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  return fetch(`${base}${path}`, init);
}
