import { CommandAction, PanelType } from '@/types';

export function parseCommand(input: string): CommandAction {
  const trimmed = input.trim().toUpperCase();

  const navCommands: Record<string, PanelType> = {
    NEWS: 'news',
    PORT: 'portfolio',
    PORTFOLIO: 'portfolio',
    WL: 'watchlist',
    WATCHLIST: 'watchlist',
    TOP: 'market-overview',
    HOME: 'market-overview',
    LAUNCHPAD: 'market-overview',
    NOTES: 'notes',
    NOTE: 'notes',
  };

  if (trimmed in navCommands) {
    return { type: 'NAVIGATE', panel: navCommands[trimmed] };
  }

  const tickerMatch = trimmed.match(/^([A-Z0-9.^=\-]+)\s*(GO)?$/);
  if (tickerMatch) return { type: 'TICKER', symbol: tickerMatch[1] };

  return { type: 'SEARCH', query: input.trim() };
}
