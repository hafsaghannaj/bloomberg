'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { useSearch } from '@/hooks/useSearch';
import { parseCommand } from './CommandParser';
import { SearchResult } from '@/types';

export default function CommandBar() {
  const [input, setInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: searchResults } = useSearch(input);
  const store = useTerminalStore();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utc = now.toUTCString().slice(17, 25);
      const local = now.toLocaleTimeString('en-US', { hour12: false });
      setClock(`UTC ${utc} | ${local}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <div className="relative z-50">
      <div className="flex items-center h-10 bg-bloomberg-bg-header border-b border-bloomberg-border px-3 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-bloomberg-amber font-bold text-sm">BLOOMBERG</span>
          {store.activeSymbol && (
            <span className="text-bloomberg-green text-xs">
              {store.activeSymbol}
            </span>
          )}
        </div>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowResults(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => input.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Enter command or ticker (e.g. AAPL, NEWS, WL, PORT)..."
            className="w-full bg-transparent text-bloomberg-orange placeholder-bloomberg-text-muted text-sm outline-none caret-bloomberg-orange"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="text-bloomberg-text-muted text-xs shrink-0 font-mono">
          {clock}
        </div>
      </div>

      {showResults && searchResults && searchResults.length > 0 && (
        <div className="absolute top-10 left-0 right-0 bg-bloomberg-bg-panel border border-bloomberg-border shadow-2xl max-h-60 overflow-y-auto">
          {searchResults.map((result: SearchResult, i: number) => (
            <button
              key={`${result.symbol}-${i}`}
              onClick={() => handleResultClick(result)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bloomberg-bg-hover text-left"
            >
              <span className="text-bloomberg-orange font-bold text-sm w-20">
                {result.symbol}
              </span>
              <span className="text-bloomberg-text-secondary text-xs flex-1 truncate">
                {result.shortname || result.longname}
              </span>
              <span className="text-bloomberg-text-muted text-xs">
                {result.exchDisp}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
