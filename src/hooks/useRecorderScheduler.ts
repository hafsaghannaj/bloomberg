'use client';

import { useEffect, useRef } from 'react';
import { useTerminalStore } from '@/store/terminal';

/**
 * Converts an "HH:MM" string to today's Date in ET (America/New_York).
 * Returns null if parsing fails.
 */
function parseETTime(timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Build a date string for today in ET
  const nowET = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  nowET.setHours(hours, minutes, 0, 0);
  return nowET;
}

function getNowET(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
}

function isWeekday(): boolean {
  const day = getNowET().getDay();
  return day >= 1 && day <= 5; // Mon=1 ... Fri=5
}

/**
 * Global hook that auto-starts the recorder at market open
 * and auto-stops it at market close, Mon-Fri.
 *
 * Mount this ONCE at the app shell level so it runs regardless
 * of which tab/view the user is on.
 */
export function useRecorderScheduler() {
  const {
    recorderActive,
    recorderSettings,
    startRecorder,
    stopRecorder,
    addNotification,
  } = useTerminalStore();

  const hasAutoStartedToday = useRef(false);
  const hasAutoStoppedToday = useRef(false);
  const lastCheckedDay = useRef<number>(-1);

  useEffect(() => {
    // Check every 15 seconds
    const checkInterval = setInterval(() => {
      const nowET = getNowET();
      const currentDay = nowET.getDate();

      // Reset flags at midnight (new day)
      if (currentDay !== lastCheckedDay.current) {
        hasAutoStartedToday.current = false;
        hasAutoStoppedToday.current = false;
        lastCheckedDay.current = currentDay;
      }

      // Only run on weekdays
      if (!isWeekday()) return;

      const openTime = parseETTime(recorderSettings.marketOpen);
      const closeTime = parseETTime(recorderSettings.marketClose);
      if (!openTime || !closeTime) return;

      const nowMs = nowET.getTime();
      const openMs = openTime.getTime();
      const closeMs = closeTime.getTime();

      // Auto-start: it's past market open, before close, recorder isn't active, and we haven't auto-started today
      if (
        nowMs >= openMs &&
        nowMs < closeMs &&
        !recorderActive &&
        !hasAutoStartedToday.current
      ) {
        hasAutoStartedToday.current = true;
        startRecorder();
        addNotification(
          `Recorder auto-started at market open (${recorderSettings.marketOpen} ET)`,
          'info'
        );
      }

      // Auto-stop: it's past market close, recorder is active, and we haven't auto-stopped today
      if (
        nowMs >= closeMs &&
        recorderActive &&
        !hasAutoStoppedToday.current
      ) {
        hasAutoStoppedToday.current = true;
        stopRecorder();
        addNotification(
          `Recorder auto-stopped at market close (${recorderSettings.marketClose} ET)`,
          'info'
        );
      }
    }, 15_000);

    return () => clearInterval(checkInterval);
  }, [recorderActive, recorderSettings, startRecorder, stopRecorder, addNotification]);
}
