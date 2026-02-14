'use client';

import { useNews } from '@/hooks/useNews';
import { useTerminalStore } from '@/store/terminal';
import { formatTime, formatDateTime } from '@/lib/format';

export default function NewsFeed() {
  const { activeSymbol } = useTerminalStore();
  const { data: news, isLoading } = useNews(activeSymbol);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider">
          {activeSymbol ? `${activeSymbol} News` : 'Market News'}
        </span>
        <span className="text-bloomberg-text-muted text-[10px]">LIVE</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <span className="text-bloomberg-text-muted text-sm">
              Loading news...
            </span>
          </div>
        )}

        {news &&
          news.map((item) => {
            const isRecent = Date.now() / 1000 - item.datetime < 86400;
            const timeStr = isRecent
              ? formatTime(item.datetime)
              : formatDateTime(item.datetime);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.url && item.url !== '#') {
                    window.open(item.url, '_blank');
                  }
                }}
                className="flex gap-3 px-3 py-2 border-b border-bloomberg-border/50 hover:bg-bloomberg-bg-hover cursor-pointer"
              >
                <span className="text-bloomberg-orange text-[10px] font-mono shrink-0 w-12">
                  {timeStr}
                </span>
                <span className="text-bloomberg-blue text-[10px] font-bold shrink-0 w-16 uppercase">
                  {item.source}
                </span>
                <span className="text-bloomberg-text-secondary text-xs flex-1 leading-tight">
                  {item.headline}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
