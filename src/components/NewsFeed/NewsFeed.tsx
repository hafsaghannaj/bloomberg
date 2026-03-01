'use client';

import { useState, useEffect, useRef } from 'react';
import { useNews } from '@/hooks/useNews';
import { useTerminalStore } from '@/store/terminal';

function formatNYTime(unixTimestamp: number): string {
  const d = new Date(unixTimestamp * 1000);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNYDateTime(unixTimestamp: number): string {
  const d = new Date(unixTimestamp * 1000);
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isBreaking(unixTimestamp: number): boolean {
  return Date.now() / 1000 - unixTimestamp < 1800; // < 30 min
}

function isRecent(unixTimestamp: number): boolean {
  return Date.now() / 1000 - unixTimestamp < 86400;
}

// Cycle through breaking headlines
function BreakingBanner({ headlines }: { headlines: { text: string; time: string }[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (headlines.length === 0) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % headlines.length);
        setVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(id);
  }, [headlines.length]);

  if (headlines.length === 0) return null;
  const item = headlines[idx];

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 border-b border-bloomberg-border shrink-0 overflow-hidden"
      style={{ background: '#1a0000', minHeight: 22 }}
    >
      <span
        className="text-[8px] font-bold tracking-widest shrink-0 px-1 py-0.5"
        style={{ background: '#FF3333', color: '#001616' }}
      >
        BREAKING
      </span>
      <span className="text-bloomberg-text-muted text-[8px] shrink-0">{item.time}</span>
      <span
        className={`text-[9px] flex-1 truncate font-medium transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ color: '#FFCCCC' }}
      >
        {item.text}
      </span>
      <span className="text-bloomberg-text-muted text-[8px] shrink-0 tabular-nums">
        {idx + 1}/{headlines.length}
      </span>
    </div>
  );
}

interface NewsItem {
  id: string | number;
  headline: string;
  source: string;
  datetime: number;
  url?: string;
  summary?: string;
  category?: string;
}

export default function NewsFeed() {
  const { activeSymbol } = useTerminalStore();
  const { data: news, isLoading, dataUpdatedAt } = useNews(activeSymbol) as {
    data: NewsItem[] | undefined;
    isLoading: boolean;
    dataUpdatedAt: number;
  };
  const [lastUpdate, setLastUpdate] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataUpdatedAt) {
      const d = new Date(dataUpdatedAt);
      setLastUpdate(d.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    }
  }, [dataUpdatedAt]);

  const breakingItems = news
    ? news
        .filter((item) => isBreaking(item.datetime))
        .slice(0, 5)
        .map((item) => ({
          text: item.headline,
          time: formatNYTime(item.datetime),
        }))
    : [];

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
      {/* Header */}
      <div
        className="px-2 py-1 border-b border-bloomberg-border flex items-center justify-between shrink-0"
        style={{ background: '#001c1c' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-bloomberg-orange text-[9px] font-bold tracking-widest uppercase">
            {activeSymbol ? `${activeSymbol} NEWS` : 'MARKET HEADLINES'}
          </span>
          {isLoading && (
            <span className="refresh-dot text-[6px]" style={{ color: '#CCA800' }}>●</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-bloomberg-text-muted text-[8px] tabular-nums">
              UPD {lastUpdate} ET
            </span>
          )}
          <span
            className="text-[8px] font-bold px-1"
            style={{ background: '#00FF66', color: '#001616' }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Breaking banner */}
      {breakingItems.length > 0 && <BreakingBanner headlines={breakingItems} />}

      {/* News list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-20 gap-2">
            <span className="text-bloomberg-text-muted text-[9px] animate-pulse tracking-widest">
              LOADING FEED...
            </span>
          </div>
        )}

        {news && news.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <span className="text-bloomberg-text-muted text-[9px]">NO STORIES AVAILABLE</span>
          </div>
        )}

        {news &&
          news.map((item, idx) => {
            const breaking = isBreaking(item.datetime);
            const recent   = isRecent(item.datetime);
            const timeStr  = recent
              ? formatNYTime(item.datetime)
              : formatNYDateTime(item.datetime);

            return (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => {
                  if (item.url && item.url !== '#') window.open(item.url, '_blank');
                }}
                className={`
                  flex gap-1.5 px-2 py-1.5 border-b cursor-pointer transition-colors
                  hover:bg-bloomberg-bg-hover
                  ${breaking ? 'border-bloomberg-red/30' : 'border-bloomberg-border/40'}
                `}
                style={{ background: breaking ? 'rgba(255,51,51,0.03)' : 'transparent' }}
              >
                {/* Time */}
                <span
                  className="text-[9px] font-mono shrink-0 tabular-nums leading-tight pt-px"
                  style={{ color: breaking ? '#FF6666' : '#006262', width: 34 }}
                >
                  {timeStr}
                </span>

                {/* Source badge */}
                <span
                  className="text-[8px] font-bold shrink-0 uppercase leading-tight pt-px"
                  style={{ color: '#00BFFF', width: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {item.source}
                </span>

                {/* Headline */}
                <span
                  className="text-[9px] flex-1 leading-tight"
                  style={{
                    color: breaking ? '#FFCCCC' : '#CCCCCC',
                    fontWeight: breaking ? 600 : 400,
                  }}
                >
                  {breaking && (
                    <span
                      className="text-[7px] font-bold mr-1 px-0.5"
                      style={{ background: '#FF3333', color: '#000' }}
                    >
                      NEW
                    </span>
                  )}
                  {item.headline}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
