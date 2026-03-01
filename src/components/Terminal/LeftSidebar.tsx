'use client';

import { useTerminalStore } from '@/store/terminal';
import { PanelType } from '@/types';

interface Module {
  id: PanelType;
  key: string;
  label: string;
  color?: string;
}

interface InfoModule {
  key: string;
  label: string;
  color: string;
  tooltip: string;
}

const ACTIVE_MODULES: Module[] = [
  { id: 'market-overview', key: 'MKTS', label: 'Markets' },
  { id: 'portfolio',       key: 'PORT', label: 'Portfolio' },
  { id: 'news',            key: 'NEWS', label: 'News' },
  { id: 'watchlist',       key: 'WL',   label: 'Watchlist' },
  { id: 'price-recorder',  key: 'REC',  label: 'Recorder' },
  { id: 'notes',           key: 'NTS',  label: 'Notes' },
  { id: 'macro',           key: 'MCRO', label: 'Macro' },
];

const INFO_MODULES: InfoModule[] = [
  { key: 'FI',   label: 'Fixed Inc', color: '#00FFFF',  tooltip: 'Fixed Income' },
  { key: 'DERIV',label: 'Derivs',   color: '#CC99FF',  tooltip: 'Derivatives' },
  { key: 'VOL',  label: 'Vol Surf',  color: '#FFFF00',  tooltip: 'Volatility Surface' },
  { key: 'CRDT', label: 'Credit',   color: '#FF9999',  tooltip: 'Credit Markets' },
];

export default function LeftSidebar() {
  const { activeView, setActiveView, recorderActive } = useTerminalStore();

  return (
    <div
      className="shrink-0 flex flex-col border-r border-bloomberg-border bg-bloomberg-bg-header"
      style={{ width: 52 }}
    >
      {/* Active modules */}
      <div className="flex flex-col pt-1">
        {ACTIVE_MODULES.map((mod) => {
          const isActive = activeView === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveView(mod.id)}
              title={mod.label}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                h-10 w-full text-center transition-colors
                ${isActive
                  ? 'bg-bloomberg-orange/10 border-l-2 border-l-bloomberg-orange text-bloomberg-orange'
                  : 'border-l-2 border-l-transparent text-bloomberg-text-muted hover:text-bloomberg-orange hover:bg-bloomberg-bg-hover'
                }
              `}
            >
              <span className={`text-[9px] font-bold tracking-wider leading-none ${isActive ? 'text-bloomberg-orange' : ''}`}>
                {mod.key}
              </span>
              {mod.id === 'price-recorder' && recorderActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-bloomberg-red animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-2 my-2 border-t border-bloomberg-border" />

      {/* Info-only modules (visual, no navigation) */}
      <div className="flex flex-col">
        {INFO_MODULES.map((mod) => (
          <button
            key={mod.key}
            title={mod.tooltip}
            onClick={() => setActiveView('market-overview')}
            className="flex flex-col items-center justify-center gap-0.5 h-9 w-full text-center
              border-l-2 border-l-transparent hover:bg-bloomberg-bg-hover transition-colors group"
          >
            <span
              className="text-[9px] font-bold tracking-wider leading-none opacity-40 group-hover:opacity-70 transition-opacity"
              style={{ color: mod.color }}
            >
              {mod.key}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom spacer with version */}
      <div className="flex-1" />
      <div className="pb-2 flex flex-col items-center gap-1">
        <div className="w-6 border-t border-bloomberg-border" />
        <span className="text-[8px] text-bloomberg-text-muted rotate-90 origin-center" style={{ writingMode: 'vertical-lr' }}>
          BBG
        </span>
      </div>
    </div>
  );
}
