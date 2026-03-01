'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { useSearch } from '@/hooks/useSearch';
import { parseCommand } from './CommandParser';
import { SearchResult } from '@/types';

// Format a symbol in Bloomberg terminal syntax: AAPL US <EQUITY>
function formatBloombergSyntax(input: string): string {
  const upper = input.toUpperCase().trim();
  if (!upper) return '';
  const secTypeMap: Record<string, string> = {
    '^GSPC': 'SPX INDEX',
    '^DJI': 'INDU INDEX',
    '^IXIC': 'CCMP INDEX',
    '^VIX': 'VIX INDEX',
    'GC=F': 'GC1 COMDTY',
    'CL=F': 'CL1 COMDTY',
    'SI=F': 'SI1 COMDTY',
    'BTC-USD': 'XBTUSD CURNCY',
    'ETH-USD': 'ETHUSD CURNCY',
    'EURUSD=X': 'EURUSD CURNCY',
    'USDJPY=X': 'USDJPY CURNCY',
  };
  if (secTypeMap[upper]) return secTypeMap[upper];
  return `${upper} US <EQUITY>`;
}

const FUNCTION_KEYS = [
  { key: 'F1',  label: 'HELP' },
  { key: 'F2',  label: 'CMD' },
  { key: 'F8',  label: 'SEARCH' },
  { key: 'F9',  label: 'ALERTS' },
  { key: 'ESC', label: 'HOME' },
];

export default function CommandBar() {
  const [input, setInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: searchResults } = useSearch(input);
  const store = useTerminalStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' || e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setShowResults(false);
        setInput('');
        store.setActiveView('market-overview');
        store.setActiveSymbol(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  const executeCommand = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      store.pushCommand(value.trim());
      const action = parseCommand(value);

      switch (action.type) {
        case 'NAVIGATE':
          store.setActiveView(action.panel);
          if (action.panel === 'market-overview') store.setActiveSymbol(null);
          break;
        case 'TICKER':
          store.addTab(action.symbol, action.symbol);
          break;
        case 'SEARCH':
          break;
      }

      setInput('');
      setShowResults(false);
      setHistoryIndex(-1);
    },
    [store]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = store.commandHistory;
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(store.commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleResultClick = (result: SearchResult) => {
    store.addTab(result.symbol, result.shortname || result.symbol);
    store.pushCommand(result.symbol);
    setInput('');
    setShowResults(false);
  };

  const displayValue = isFocused || input ? input : '';
  const placeholder  = isFocused ? '' : 'ENTER COMMAND OR TICKER  (e.g. AAPL  |  NEWS  |  PORT  |  WL)';

  return (
    <div className="relative z-50 shrink-0">
      {/* Search results dropdown — floats above command bar */}
      {showResults && searchResults && searchResults.length > 0 && (
        <div
          className="absolute bottom-full left-0 right-0 border border-bloomberg-border shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: '#001c1c' }}
        >
          {/* Header row */}
          <div className="px-3 py-1 border-b border-bloomberg-border flex items-center gap-3">
            <span className="text-bloomberg-orange text-[9px] font-bold tracking-widest">SECURITY SEARCH</span>
            <span className="text-bloomberg-text-muted text-[9px]">{searchResults.length} RESULTS</span>
          </div>
          {searchResults.map((result: SearchResult, i: number) => (
            <button
              key={`${result.symbol}-${i}`}
              onClick={() => handleResultClick(result)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-bloomberg-bg-hover text-left border-b border-bloomberg-border/40"
            >
              <span className="text-bloomberg-orange font-bold text-[10px] w-16 shrink-0 tabular-nums">
                {result.symbol}
              </span>
              <span className="text-bloomberg-yellow text-[9px] w-12 shrink-0">
                {result.exchDisp || 'US'}
              </span>
              <span className="text-bloomberg-text-secondary text-[10px] flex-1 truncate">
                {result.shortname || result.longname}
              </span>
              <span className="text-bloomberg-text-muted text-[9px] shrink-0">
                EQUITY
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main command bar */}
      <div
        className="flex items-center h-8 border-t border-bloomberg-border px-3 gap-2 transition-colors duration-150"
        style={{
          background: isFocused ? '#001c1c' : '#001616',
          borderTopColor: isFocused ? '#CCA800' : '#003333',
        }}
      >
        {/* Command prompt indicator */}
        <span
          className="text-bloomberg-orange font-bold text-[11px] shrink-0 select-none"
          style={{ fontFamily: 'inherit' }}
        >
          ▶
        </span>

        {/* Bloomberg syntax display + raw input */}
        <div className="flex-1 relative overflow-hidden">
          {/* Invisible real input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowResults(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (input.length > 0) setShowResults(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowResults(false), 200);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            className="absolute inset-0 opacity-0 w-full h-full cursor-text"
            style={{ caretColor: 'transparent' }}
          />

          {/* Visual display layer */}
          <div
            className="flex items-center h-full text-[11px] tracking-wide cursor-text select-none"
            onClick={() => inputRef.current?.focus()}
          >
            {input ? (
              <>
                <span className="text-bloomberg-orange font-bold">
                  {formatBloombergSyntax(input)}
                </span>
                {/* Blinking block cursor */}
                <span className="cursor-block ml-px" />
              </>
            ) : (
              <span className="text-bloomberg-text-muted text-[10px] tracking-wider">
                {placeholder}
                {isFocused && <span className="cursor-block ml-px" />}
              </span>
            )}
          </div>
        </div>

        {/* Function key hints */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {FUNCTION_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-0.5">
              <span className="text-[8px] text-bloomberg-text-muted bg-bloomberg-bg-header border border-bloomberg-border px-1 py-0.5 rounded-sm font-bold">
                {key}
              </span>
              <span className="text-[8px] text-bloomberg-text-muted">{label}</span>
            </div>
          ))}
        </div>

        {/* Last command breadcrumb */}
        {store.commandHistory.length > 0 && !input && (
          <div className="hidden lg:flex items-center gap-1 border-l border-bloomberg-border pl-2 ml-1 shrink-0">
            <span className="text-bloomberg-text-muted text-[8px]">LAST:</span>
            <span className="text-bloomberg-text-muted text-[8px] font-bold">
              {store.commandHistory[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
