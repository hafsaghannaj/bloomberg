'use client';

/**
 * Detect if running inside Capacitor native app (iOS/Android)
 * vs a regular web browser.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap && cap.isNativePlatform && cap.isNativePlatform() === true;
}
