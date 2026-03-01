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
    RECORD: 'price-recorder',
    REC: 'price-recorder',
    RECORDER: 'price-recorder',
    PREC: 'price-recorder',
    MACRO: 'macro',
    MCRO: 'macro',
    YIELD: 'macro',
    FRED: 'macro',
    GDP: 'macro',
    EARN: 'earnings',
    EARNINGS: 'earnings',
    ECO: 'earnings',
    ECAL: 'earnings',
    ERN: 'earnings',
    MOV: 'movers',
    MOVERS: 'movers',
    GAIN: 'movers',
    GAINERS: 'movers',
    LOSERS: 'movers',
    ACTIVES: 'movers',
    SCREEN: 'movers',
    SECT: 'sector-rotation',
    SECTOR: 'sector-rotation',
    SECTORS: 'sector-rotation',
    ROT: 'sector-rotation',
    ROTATION: 'sector-rotation',
    RRG: 'sector-rotation',
    ECON: 'economic-calendar',
    ECALENDAR: 'economic-calendar',
    FEDCAL: 'economic-calendar',
    FEDMEETING: 'economic-calendar',
    CALENDAR: 'economic-calendar',
    OVERLAY: 'chart-overlay',
    MULTI: 'chart-overlay',
    COMPARE: 'chart-overlay',
    COMP: 'chart-overlay',
  };

  if (trimmed in navCommands) {
    return { type: 'NAVIGATE', panel: navCommands[trimmed] };
  }

  const tickerMatch = trimmed.match(/^([A-Z0-9.^=\-]+)\s*(GO)?$/);
  if (tickerMatch) return { type: 'TICKER', symbol: tickerMatch[1] };

  return { type: 'SEARCH', query: input.trim() };
}
