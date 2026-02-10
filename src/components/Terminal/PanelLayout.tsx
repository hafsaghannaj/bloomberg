'use client';

import { useTerminalStore } from '@/store/terminal';
import MarketOverview from '@/components/MarketOverview/MarketOverview';
import StockDetail from '@/components/StockDetail/StockDetail';
import Watchlist from '@/components/Watchlist/Watchlist';
import NewsFeed from '@/components/NewsFeed/NewsFeed';
import Portfolio from '@/components/Portfolio/Portfolio';
import HeatMap from '@/components/HeatMap/HeatMap';
import AlertsPanel from '@/components/UI/AlertsPanel';
import PortfolioBreakdown from '@/components/Portfolio/PortfolioBreakdown';
import DailyNotes from '@/components/Notes/DailyNotes';

export default function PanelLayout() {
  const { activeView } = useTerminalStore();

  if (activeView === 'stock-detail') {
    return (
      <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-px bg-bloomberg-border animate-fade-in">
        <div className="lg:col-span-3 bg-bloomberg-bg overflow-hidden">
          <StockDetail />
        </div>
        <div className="bg-bloomberg-bg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden border-b border-bloomberg-border">
            <NewsFeed />
          </div>
          <div className="h-[200px] shrink-0 overflow-hidden border-b border-bloomberg-border">
            <Watchlist />
          </div>
          <div className="h-[160px] shrink-0 overflow-hidden">
            <AlertsPanel />
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'watchlist') {
    return (
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-px bg-bloomberg-border animate-fade-in">
        <div className="bg-bloomberg-bg overflow-hidden">
          <Watchlist />
        </div>
        <div className="bg-bloomberg-bg overflow-hidden">
          <NewsFeed />
        </div>
      </div>
    );
  }

  if (activeView === 'news') {
    return (
      <div className="h-full bg-bloomberg-bg overflow-hidden animate-fade-in">
        <NewsFeed />
      </div>
    );
  }

  if (activeView === 'notes') {
    return (
      <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-px bg-bloomberg-border animate-fade-in">
        <div className="lg:col-span-2 bg-bloomberg-bg overflow-hidden">
          <DailyNotes />
        </div>
        <div className="bg-bloomberg-bg overflow-hidden">
          <NewsFeed />
        </div>
      </div>
    );
  }

  if (activeView === 'portfolio') {
    return (
      <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-px bg-bloomberg-border animate-fade-in">
        <div className="bg-bloomberg-bg overflow-hidden">
          <Portfolio />
        </div>
        <div className="bg-bloomberg-bg overflow-hidden">
          <PortfolioBreakdown />
        </div>
        <div className="bg-bloomberg-bg overflow-hidden">
          <NewsFeed />
        </div>
      </div>
    );
  }

  // Default: market-overview with heat map
  return (
    <div className="h-full grid grid-rows-[1fr_300px] lg:grid-rows-1 lg:grid-cols-4 gap-px bg-bloomberg-border animate-fade-in">
      <div className="lg:col-span-2 bg-bloomberg-bg overflow-hidden">
        <MarketOverview />
      </div>
      <div className="bg-bloomberg-bg overflow-hidden">
        <HeatMap />
      </div>
      <div className="bg-bloomberg-bg overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden border-b border-bloomberg-border">
          <NewsFeed />
        </div>
        <div className="h-[220px] shrink-0 overflow-hidden">
          <Watchlist />
        </div>
      </div>
    </div>
  );
}
