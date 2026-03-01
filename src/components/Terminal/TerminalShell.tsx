'use client';

import { useState, useEffect } from 'react';
import CommandBar from '@/components/CommandBar/CommandBar';
import TickerTape from '@/components/TickerTape/TickerTape';
import TabBar from '@/components/UI/TabBar';
import NotificationToast from '@/components/UI/NotificationToast';
import LeftSidebar from '@/components/Terminal/LeftSidebar';
import RightPanel from '@/components/Terminal/RightPanel';
import { useRecorderScheduler } from '@/hooks/useRecorderScheduler';
import { useTerminalStore } from '@/store/terminal';
import { getPolygonWS } from '@/lib/polygon-ws';
import type { PolygonWsStatus } from '@/types';

interface Props {
  children: React.ReactNode;
}

export default function TerminalShell({ children }: Props) {
  useRecorderScheduler();

  return (
    <div className="h-screen flex flex-col bg-bloomberg-bg font-mono overflow-hidden" style={{ fontFamily: '"IBM Plex Mono", "Source Code Pro", monospace' }}>
      {/* Row 1: Scrolling ticker tape */}
      <TickerTape />

      {/* Row 2: Branding + status header */}
      <TerminalHeader />

      {/* Row 3: Main body — sidebar | content | right panel */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar />

        {/* Center: tabs + active panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TabBar />
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>

        <RightPanel />
      </div>

      {/* Row 4: Bloomberg command bar (bottom) */}
      <CommandBar />

      <NotificationToast />
    </div>
  );
}

function TerminalHeader() {
  const [nyTime, setNyTime] = useState('');
  const [nyDate, setNyDate] = useState('');
  const [latency, setLatency] = useState(11);
  const [wsStatus, setWsStatus] = useState<PolygonWsStatus>('disconnected');
  const recorderActive = useTerminalStore((s) => s.recorderActive);
  const activeSymbol   = useTerminalStore((s) => s.activeSymbol);

  // Connect to Polygon WS and track status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ws = getPolygonWS();
    const handleStatus = (data: unknown) => setWsStatus(data as PolygonWsStatus);
    ws.on('status', handleStatus);
    ws.connect();
    setWsStatus(ws.getStatus());
    return () => ws.off('status', handleStatus);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      });
      setNyTime(timeStr);
      setNyDate(dateStr);
      // Simulate realistic feed latency (8–22ms)
      setLatency(Math.floor(8 + Math.random() * 14));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Determine market session
  const marketStatus = (() => {
    const now = new Date();
    const h = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit' }));
    const m = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, minute: '2-digit' }));
    const total = h * 60 + m;
    const day = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
    if (day === 'Sat' || day === 'Sun') return { label: 'CLOSED', color: '#FF3333' };
    if (total >= 570 && total < 960) return { label: 'OPEN', color: '#00FF66' };   // 9:30–16:00
    if (total >= 480 && total < 570) return { label: 'PRE-MKT', color: '#AA8800' };
    if (total >= 960 && total < 1200) return { label: 'AH', color: '#AA8800' };
    return { label: 'CLOSED', color: '#FF3333' };
  })();

  return (
    <div
      className="h-7 flex items-center px-3 gap-3 shrink-0 border-b border-bloomberg-border"
      style={{ background: '#001c1c' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-bloomberg-orange font-bold text-[11px] tracking-widest">HAFSA</span>
        <span className="text-bloomberg-text-muted text-[8px] tracking-wider">TERMINAL</span>
      </div>

      <div className="w-px h-4 bg-bloomberg-border shrink-0" />

      {/* Active security */}
      {activeSymbol && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-bloomberg-yellow font-bold text-[10px]">{activeSymbol}</span>
            <span className="text-bloomberg-text-muted text-[8px]">US EQUITY</span>
          </div>
          <div className="w-px h-4 bg-bloomberg-border shrink-0" />
        </>
      )}

      <div className="flex-1" />

      {/* Status indicators — right aligned */}
      <div className="flex items-center gap-4 text-[9px] shrink-0">
        {recorderActive && (
          <span className="text-bloomberg-red animate-pulse font-bold">● REC</span>
        )}

        {/* Market status */}
        <span className="font-bold" style={{ color: marketStatus.color }}>
          ● {marketStatus.label}
        </span>

        {/* Feed latency */}
        <span className="text-bloomberg-text-muted">
          Feed:{' '}
          <span
            className={latency <= 15 ? 'text-bloomberg-green' : 'text-bloomberg-red'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {latency}ms
          </span>
        </span>

        {/* Polygon WebSocket status */}
        {wsStatus === 'authenticated' ? (
          <span className="text-bloomberg-green font-bold animate-pulse">● WS LIVE</span>
        ) : wsStatus === 'connecting' || wsStatus === 'connected' ? (
          <span className="text-bloomberg-amber font-bold">● WS</span>
        ) : (
          <span className="text-bloomberg-text-muted">○ WS</span>
        )}

        {/* Refresh indicator */}
        <span className="refresh-dot" style={{ color: '#00FF66' }}>●</span>

        {/* NY Time */}
        <span className="text-bloomberg-text-secondary font-bold tabular-nums" style={{ letterSpacing: '0.03em' }}>
          {nyDate && `${nyDate} `}{nyTime} <span className="text-bloomberg-text-muted font-normal">ET</span>
        </span>
      </div>
    </div>
  );
}
