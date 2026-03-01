'use client';

import { useTerminalStore } from '@/store/terminal';
import { X } from 'lucide-react';

export default function TabBar() {
  const { tabs, activeTab, activeView, recorderActive, setActiveTab, removeTab, setActiveView } = useTerminalStore();

  return (
    <div
      className="h-6 border-b border-bloomberg-border flex items-center overflow-x-auto shrink-0"
      style={{ background: '#001c1c' }}
    >
      {/* Fixed nav tabs */}
      <NavTab
        label="LAUNCHPAD"
        active={activeView === 'market-overview'}
        onClick={() => setActiveView('market-overview')}
      />
      <NavTab
        label="PORTFOLIO"
        active={activeView === 'portfolio'}
        onClick={() => setActiveView('portfolio')}
      />
      <NavTab
        label={
          <span className="flex items-center gap-1">
            REC
            {recorderActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-bloomberg-red animate-pulse" />
            )}
          </span>
        }
        active={activeView === 'price-recorder'}
        onClick={() => setActiveView('price-recorder')}
      />
      <NavTab
        label="NOTES"
        active={activeView === 'notes'}
        onClick={() => setActiveView('notes')}
      />
      <NavTab
        label="MACRO"
        active={activeView === 'macro'}
        onClick={() => setActiveView('macro')}
      />
      <NavTab
        label="EARN"
        active={activeView === 'earnings'}
        onClick={() => setActiveView('earnings')}
      />
      <NavTab
        label="MOVERS"
        active={activeView === 'movers'}
        onClick={() => setActiveView('movers')}
      />
      <NavTab
        label="SECT"
        active={activeView === 'sector-rotation'}
        onClick={() => setActiveView('sector-rotation')}
      />
      <NavTab
        label="ECON"
        active={activeView === 'economic-calendar'}
        onClick={() => setActiveView('economic-calendar')}
      />
      <NavTab
        label="OVERLAY"
        active={activeView === 'chart-overlay'}
        onClick={() => setActiveView('chart-overlay')}
      />

      {/* Vertical separator */}
      {tabs.length > 0 && (
        <div className="w-px h-4 bg-bloomberg-border mx-1 shrink-0" />
      )}

      {/* Open security tabs */}
      {tabs.map((tab, i) => (
        <div
          key={`${tab.symbol}-${i}`}
          className={`flex items-center h-full border-r border-bloomberg-border shrink-0 cursor-pointer transition-colors ${
            i === activeTab && activeView === 'stock-detail'
              ? 'border-b border-b-bloomberg-orange'
              : ''
          }`}
          style={{
            background: i === activeTab && activeView === 'stock-detail' ? '#001c1c' : 'transparent',
          }}
        >
          <button
            onClick={() => {
              setActiveTab(i);
              setActiveView('stock-detail');
            }}
            className="px-2 h-full text-[9px] font-bold tracking-wider"
            style={{
              color: i === activeTab && activeView === 'stock-detail' ? '#FFFF00' : '#006262',
            }}
          >
            {tab.label}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTab(i);
            }}
            className="pr-1.5 hover:text-bloomberg-red transition-colors"
            style={{ color: '#004e4e' }}
          >
            <X size={9} />
          </button>
        </div>
      ))}
    </div>
  );
}

interface NavTabProps {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function NavTab({ label, active, onClick }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 h-full text-[9px] font-bold tracking-wider border-r border-bloomberg-border shrink-0 transition-colors"
      style={{
        color: active ? '#CCA800' : '#006262',
        background: active ? '#001c1c' : 'transparent',
        borderBottom: active ? '1px solid #CCA800' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  );
}
