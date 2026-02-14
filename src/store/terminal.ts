import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PanelType, WatchlistItem, PortfolioPosition, PriceSnapshot, RecorderSettings, RecorderInterval } from '@/types';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

export interface TabItem {
  symbol: string;
  label: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  timestamp: number;
}

interface TerminalState {
  activeSymbol: string | null;
  activeView: PanelType;

  // Tabs
  tabs: TabItem[];
  activeTab: number;
  addTab: (symbol: string, label: string) => void;
  removeTab: (index: number) => void;
  setActiveTab: (index: number) => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Portfolio
  positions: PortfolioPosition[];
  addPosition: (symbol: string, shares: number, avgCost: number) => void;
  removePosition: (id: string) => void;

  // Alerts
  alerts: PriceAlert[];
  addAlert: (symbol: string, targetPrice: number, direction: 'above' | 'below') => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type: 'alert' | 'info' | 'success') => void;
  removeNotification: (id: string) => void;

  // Command history
  commandHistory: string[];
  pushCommand: (cmd: string) => void;

  // Price Recorder
  recorderActive: boolean;
  recorderSnapshots: PriceSnapshot[];
  recorderSettings: RecorderSettings;
  recorderOpeningPrices: Record<string, number>;
  startRecorder: () => void;
  stopRecorder: () => void;
  addSnapshot: (snapshot: PriceSnapshot) => void;
  clearSnapshots: () => void;
  setRecorderInterval: (interval: RecorderInterval) => void;
  addRecorderTicker: (ticker: string) => void;
  removeRecorderTicker: (ticker: string) => void;
  updateRecorderSettings: (settings: Partial<RecorderSettings>) => void;
  setOpeningPrice: (ticker: string, price: number) => void;

  setActiveSymbol: (symbol: string | null) => void;
  setActiveView: (view: PanelType) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      activeSymbol: null,
      activeView: 'market-overview',

      // Tabs
      tabs: [],
      activeTab: 0,
      addTab: (symbol, label) =>
        set((state) => {
          const existing = state.tabs.findIndex((t) => t.symbol === symbol);
          if (existing >= 0) return { activeTab: existing, activeSymbol: symbol, activeView: 'stock-detail' as PanelType };
          return {
            tabs: [...state.tabs, { symbol, label }],
            activeTab: state.tabs.length,
            activeSymbol: symbol,
            activeView: 'stock-detail' as PanelType,
          };
        }),
      removeTab: (index) =>
        set((state) => {
          const newTabs = state.tabs.filter((_, i) => i !== index);
          const newActive = Math.min(state.activeTab, newTabs.length - 1);
          return {
            tabs: newTabs,
            activeTab: Math.max(newActive, 0),
            activeSymbol: newTabs[Math.max(newActive, 0)]?.symbol || null,
            activeView: newTabs.length === 0 ? ('market-overview' as PanelType) : state.activeView,
          };
        }),
      setActiveTab: (index) =>
        set((state) => ({
          activeTab: index,
          activeSymbol: state.tabs[index]?.symbol || null,
        })),

      // Watchlist
      watchlist: [],
      addToWatchlist: (symbol) =>
        set((state) => {
          if (state.watchlist.some((w) => w.symbol === symbol)) return state;
          return {
            watchlist: [...state.watchlist, { symbol, addedAt: Date.now() }],
          };
        }),
      removeFromWatchlist: (symbol) =>
        set((state) => ({
          watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
        })),

      // Portfolio
      positions: [],
      addPosition: (symbol, shares, avgCost) =>
        set((state) => ({
          positions: [
            ...state.positions,
            {
              id: `${symbol}-${Date.now()}`,
              symbol,
              shares,
              avgCost,
              addedAt: Date.now(),
            },
          ],
        })),
      removePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
        })),

      // Alerts
      alerts: [],
      addAlert: (symbol, targetPrice, direction) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              id: `alert-${Date.now()}`,
              symbol,
              targetPrice,
              direction,
              triggered: false,
              createdAt: Date.now(),
            },
          ],
        })),
      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      triggerAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, triggered: true } : a)),
        })),

      // Notifications
      notifications: [],
      addNotification: (message, type) =>
        set((state) => ({
          notifications: [
            { id: `notif-${Date.now()}`, message, type, timestamp: Date.now() },
            ...state.notifications,
          ].slice(0, 20),
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // Command history
      commandHistory: [],
      pushCommand: (cmd) =>
        set((state) => ({
          commandHistory: [cmd, ...state.commandHistory].slice(0, 50),
        })),

      // Price Recorder
      recorderActive: false,
      recorderSnapshots: [],
      recorderOpeningPrices: {},
      recorderSettings: {
        tickers: ['^GSPC', 'SPY'],
        interval: 5 as RecorderInterval,
        highlightThreshold: 0.5,
        alertThreshold: 1.0,
        marketOpen: '09:30',
        marketClose: '16:00',
      },
      startRecorder: () => set({ recorderActive: true }),
      stopRecorder: () => set({ recorderActive: false }),
      addSnapshot: (snapshot) =>
        set((state) => ({
          recorderSnapshots: [...state.recorderSnapshots, snapshot].slice(-5000),
        })),
      clearSnapshots: () => set({ recorderSnapshots: [], recorderOpeningPrices: {} }),
      setRecorderInterval: (interval) =>
        set((state) => ({
          recorderSettings: { ...state.recorderSettings, interval },
        })),
      addRecorderTicker: (ticker) =>
        set((state) => {
          if (state.recorderSettings.tickers.includes(ticker)) return state;
          return {
            recorderSettings: {
              ...state.recorderSettings,
              tickers: [...state.recorderSettings.tickers, ticker],
            },
          };
        }),
      removeRecorderTicker: (ticker) =>
        set((state) => ({
          recorderSettings: {
            ...state.recorderSettings,
            tickers: state.recorderSettings.tickers.filter((t) => t !== ticker),
          },
        })),
      updateRecorderSettings: (settings) =>
        set((state) => ({
          recorderSettings: { ...state.recorderSettings, ...settings },
        })),
      setOpeningPrice: (ticker, price) =>
        set((state) => ({
          recorderOpeningPrices: { ...state.recorderOpeningPrices, [ticker]: price },
        })),

      setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'bloomberg-terminal',
      partialize: (state) => ({
        watchlist: state.watchlist,
        positions: state.positions,
        commandHistory: state.commandHistory,
        alerts: state.alerts,
        tabs: state.tabs,
        recorderSettings: state.recorderSettings,
        recorderSnapshots: state.recorderSnapshots,
        recorderOpeningPrices: state.recorderOpeningPrices,
      }),
    }
  )
);
