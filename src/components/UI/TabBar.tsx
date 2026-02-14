'use client';

import { useTerminalStore } from '@/store/terminal';
import { X } from 'lucide-react';

export default function TabBar() {
  const { tabs, activeTab, activeView, recorderActive, setActiveTab, removeTab, setActiveView } = useTerminalStore();

  return (
    <div className="h-7 bg-bloomberg-bg-header border-b border-bloomberg-border flex items-center overflow-x-auto">
      <button
        onClick={() => {
          setActiveView('market-overview');
        }}
        className={`px-3 h-full text-[10px] font-bold border-r border-bloomberg-border shrink-0 ${
          activeView === 'market-overview'
            ? 'bg-bloomberg-bg text-bloomberg-orange border-b-2 border-b-bloomberg-orange'
            : 'text-bloomberg-text-muted hover:text-bloomberg-orange'
        }`}
      >
        LAUNCHPAD
      </button>
      <button
        onClick={() => {
          setActiveView('price-recorder');
        }}
        className={`px-3 h-full text-[10px] font-bold border-r border-bloomberg-border shrink-0 flex items-center gap-1.5 ${
          activeView === 'price-recorder'
            ? 'bg-bloomberg-bg text-bloomberg-orange border-b-2 border-b-bloomberg-orange'
            : 'text-bloomberg-text-muted hover:text-bloomberg-orange'
        }`}
      >
        REC
        {recorderActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-bloomberg-green animate-pulse" />
        )}
      </button>
      <button
        onClick={() => {
          setActiveView('notes');
        }}
        className={`px-3 h-full text-[10px] font-bold border-r border-bloomberg-border shrink-0 ${
          activeView === 'notes'
            ? 'bg-bloomberg-bg text-bloomberg-orange border-b-2 border-b-bloomberg-orange'
            : 'text-bloomberg-text-muted hover:text-bloomberg-orange'
        }`}
      >
        NOTES
      </button>
      {tabs.map((tab, i) => (
        <div
          key={`${tab.symbol}-${i}`}
          className={`flex items-center gap-1 px-2 h-full border-r border-bloomberg-border shrink-0 cursor-pointer ${
            i === activeTab && activeView === 'stock-detail'
              ? 'bg-bloomberg-bg text-bloomberg-orange border-b-2 border-b-bloomberg-orange'
              : 'text-bloomberg-text-muted hover:text-bloomberg-text-secondary hover:bg-bloomberg-bg-hover'
          }`}
        >
          <button
            onClick={() => {
              setActiveTab(i);
              setActiveView('stock-detail');
            }}
            className="text-[10px] font-bold"
          >
            {tab.label}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTab(i);
            }}
            className="text-bloomberg-text-muted hover:text-bloomberg-red ml-1"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
