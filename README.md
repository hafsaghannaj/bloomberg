# HAFSA Terminal

A Bloomberg Terminal-inspired financial platform built with Next.js 16, TypeScript, and Capacitor. Runs as a **web app** in the browser and as a **native iOS app** on iPhone and iPad. Powered by Polygon.io (real-time WebSocket + REST), FRED (macroeconomic data), and Finnhub, with Yahoo Finance as a fallback layer.

---

## Feature Overview

### Live Market Data
- Scrolling ticker tape with flash animations on every price change
- Major indices: S&P 500, Dow Jones, Nasdaq, Russell 2000
- Commodities (Gold, Oil), forex (EUR/USD, USD/JPY), crypto (BTC, ETH)
- Polygon.io WebSocket connection streams real-time trades and quotes for US equities
- WS status badge in the header: `● WS LIVE` (green, authenticated) / `● WS` (amber, connecting) / `○ WS` (muted, disconnected)

### Stock Analysis
- Company profile: sector, industry, description, CEO, employees, country
- Key financial stats: P/E, forward P/E, PEG, dividend yield, EPS, beta, market cap, 52-week range
- Analyst recommendation trend (Strong Buy → Strong Sell breakdown)
- Earnings history: EPS actual vs. estimate with beat/miss indicator
- Insider transactions: purchase/sale table with buy/sell ratio bar
- Options chain: calls/puts toggle, expiry date selector, ITM highlighting, IV column

### Charting
- Candlestick and line chart modes via Lightweight Charts
- Timeframes: 1D / 1W / 1M / 3M / 1Y / 5Y
- Technical overlays: SMA 20, SMA 50, Bollinger Bands, RSI (separate subplot)
- MACD subplot: histogram (green/red bars) + MACD line + signal line
- Stochastic subplot: %K and %D lines with overbought/oversold reference bands
- Multi-symbol chart overlay: up to 8 tickers normalized to base 100 with legend and live % return

### Portfolio Management
- Track positions: symbol, shares, average cost, current price
- Real-time P&L in dollars and percentage
- Allocation breakdown by position weight
- Portfolio risk analytics: alpha, beta, Sharpe ratio, volatility, max drawdown, win rate
- Performance timeline chart vs. SPY benchmark
- PDF report export

### Sector Rotation
- 11 GICS sector ETFs ranked by 1D / 1W / 1M / 3M / YTD / 1Y performance
- Relative strength vs. SPY for each sector
- Relative Rotation Graph (RRG): scatter chart plotting RS score vs. RS momentum
- Four quadrants: Leading (top-right), Weakening (bottom-right), Improving (top-left), Lagging (bottom-left)

### Market Screeners
- Tabs: Top Gainers, Losers, Most Active, Most Shorted, Undervalued, High Growth
- Columns: price, change %, volume, market cap, P/E, 52-week range

### Macroeconomic Dashboard
- FRED data series: GDP growth, CPI, unemployment, Federal Funds Rate, M2, 10Y–2Y yield spread
- Yield curve visualization across 1M / 3M / 6M / 1Y / 2Y / 5Y / 10Y / 30Y tenors

### Earnings Calendar
- Upcoming and historical earnings with EPS estimates and actuals
- Beat/miss/inline badges, surprise % column
- 5-period EPS history bar chart per symbol

### Economic Calendar
- Macro events filtered by country (US / EU / UK / JP) and impact (High / Medium / Low)
- Actual vs. forecast with beat ▲ / miss ▼ indicators
- Grouped by date with sticky date headers

### News Feed
- Market and company-specific news via Polygon.io with Finnhub fallback
- Breaking news banner cycles through items under 30 minutes old
- NEW badge on recent items; articles open in the browser

### Watchlist
- Custom watchlist with price, change, and volume tracking
- Click to jump straight to stock detail view

### Price Recorder
- Auto-starts at 9:30 AM ET and stops at 4:00 PM ET, Monday–Friday
- Configurable intervals: 1, 5, 15, 30, or 60 minutes
- Permanent SPX and SPY tracking plus custom tickers
- Highlights significant moves above a configurable threshold
- CSV export of all snapshots
- Pulsing `REC` indicator in the header when active

### Daily Notes
- Auto-saving with 800 ms debounce
- Keyboard shortcut: `Cmd+S` / `Ctrl+S`
- Multi-page PDF export with proper pagination

### Real-Time Order Book
- Right panel shows simulated 8-level depth anchored to live Polygon WebSocket bid/ask
- Top-of-book levels highlighted in gold
- VWAP and 52-week range bar
- `LIVE` badge when WebSocket is authenticated

### Command Bar
- Bloomberg-style syntax: `AAPL US <EQUITY>`
- Block blink cursor
- Command history navigated with arrow keys
- Focus: `/` or `F2`  |  Exit: `Esc`

---

## Command Reference

| Command | Panel |
|---------|-------|
| `AAPL`, `MSFT`, any ticker | Stock detail |
| `TOP` / `MARKETS` / `HOME` | Market overview |
| `PORT` / `PORTFOLIO` | Portfolio & risk analytics |
| `NEWS` | News feed |
| `WL` / `WATCHLIST` | Watchlist |
| `REC` / `RECORD` | Price recorder |
| `NOTES` | Daily notes |
| `MACRO` / `FRED` / `ECON` | Macro dashboard |
| `SECT` / `RRG` / `ROTATION` | Sector rotation |
| `SCREEN` / `MOVERS` | Market screener |
| `EARN` / `EARNINGS` | Earnings calendar |
| `ECALENDAR` / `FEDCAL` | Economic calendar |
| `OVERLAY` / `MULTI` / `COMPARE` | Multi-symbol chart overlay |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (App Router) |
| Language | TypeScript 5, strict mode |
| UI | React 19, Tailwind CSS 4 |
| State | Zustand (persisted to localStorage) |
| Data fetching | TanStack React Query 5 |
| Real-time data | Polygon.io WebSocket (`wss://socket.polygon.io/stocks`) |
| Market data (REST) | Polygon.io REST API |
| Macro data | FRED API (St. Louis Fed) |
| Fundamentals / news | Finnhub |
| Fallback data | yahoo-finance2 (server-side) |
| Charting | Lightweight Charts 5, Recharts 3 |
| iOS | Capacitor 8 + CapacitorHttp plugin |
| PDF export | jsPDF |
| Utilities | date-fns, numeral, clsx, lucide-react |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- (iOS only) macOS with Xcode 15+ and an Apple Developer account or simulator

### Installation

```bash
git clone https://github.com/hafsaghannaj/bloomberg-terminal.git
cd bloomberg-terminal
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
# Polygon.io — institutional real-time data (REST + WebSocket)
POLYGON_API_KEY=your_polygon_api_key
NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key

# FRED — macroeconomic series (GDP, CPI, unemployment, yield curve, etc.)
FRED_API_KEY=your_fred_api_key

# Finnhub — fundamentals, insider transactions, earnings, news
FINNHUB_API_KEY=your_finnhub_api_key
```

All three keys are optional individually — the app degrades gracefully with mock or cached data when a key is missing. Polygon and Finnhub both offer free tiers. FRED is fully free with registration.

| Service | Free tier | Sign-up |
|---------|-----------|---------|
| Polygon.io | 5 API calls/min, delayed WS | https://polygon.io |
| FRED | Unlimited | https://fred.stlouisfed.org/docs/api/api_key.html |
| Finnhub | 60 calls/min | https://finnhub.io |

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build (Web)

```bash
npm run build
npm start
```

---

## iOS App

The iOS app is a native WKWebView shell powered by Capacitor 8. The compiled UI loads from the local bundle (`file://`) — no server is needed on-device. All API calls are routed to a deployed Next.js server (Vercel) via the `NEXT_PUBLIC_API_URL` environment variable. The `CapacitorHttp` plugin intercepts every `fetch()` call and handles CORS natively.

### Architecture

```
iPhone / iPad
└── WKWebView (Capacitor)
    ├── Loads static HTML/JS/CSS from local bundle (out/)
    └── apiFetch() → NEXT_PUBLIC_API_URL → Vercel (Next.js API routes)
                   └── Polygon.io / FRED / Finnhub / Yahoo
```

### Step 1 — Deploy the API Server

The iOS app needs a live server to handle `/api/*` routes. The easiest option is Vercel (free):

1. Push your repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. In Vercel project settings → **Environment Variables**, add:
   ```
   POLYGON_API_KEY=...
   NEXT_PUBLIC_POLYGON_API_KEY=...
   FRED_API_KEY=...
   FINNHUB_API_KEY=...
   ```
4. Deploy. Note your production URL, e.g. `https://hafsa-terminal.vercel.app`.

### Step 2 — Configure the iOS API URL

Create `.env.production.local` in the project root (this file is gitignored):

```env
NEXT_PUBLIC_API_URL=https://hafsa-terminal.vercel.app
```

Leave this file absent (or `NEXT_PUBLIC_API_URL` unset) for local web development — `apiFetch()` uses relative paths automatically.

### Step 3 — Build and Sync

```bash
npm run ios:build
```

This script (`scripts/ios-build.sh`):
1. Swaps in `next.config.ios.ts` (sets `output: "export"`)
2. Stashes `src/app/api/` outside the build directory (API routes are served by Vercel, not bundled)
3. Runs `next build` → outputs static assets to `out/`
4. Restores `src/app/api/` regardless of build outcome (via `trap`)
5. Runs `npx cap sync ios` to copy the bundle into the Xcode project

### Step 4 — Open and Run in Xcode

```bash
npm run ios:open
```

In Xcode:
1. Select a **Simulator** (e.g. iPhone 16 Pro) or a connected device.
2. Press **Cmd+R** (or the Run ▶ button).
3. The app launches with the teal dark theme and live market data.

### iOS Scripts

| Script | Description |
|--------|-------------|
| `npm run ios:build` | Static export + Capacitor sync |
| `npm run ios:sync` | Sync assets to Xcode without rebuilding |
| `npm run ios:open` | Open Xcode project |
| `npm run ios:dev` | Live-reload dev mode (requires device on same Wi-Fi) |

### iOS Notes

- **Capacitor version**: 8.x
- **App ID**: `com.hafsaghannaj.hapsaterminal`
- **App name**: HAFSA Terminal
- **Background color**: `#001616` (teal dark, matches the app theme)
- **Scroll**: disabled at the WKWebView level (the app manages its own scroll)
- **CORS**: handled natively by `CapacitorHttp` — no proxy or workaround needed
- **WebSocket**: Polygon.io WS connects over the network from the device (not routed through Vercel)
- **Offline**: the UI shell loads offline; data panels show stale/cached React Query data

---

## Project Structure

```
bloomberg-terminal/
├── scripts/
│   └── ios-build.sh            # iOS static export build script
├── src/
│   ├── app/
│   │   ├── page.tsx            # Root page (mounts TerminalShell)
│   │   ├── layout.tsx          # Root layout (fonts, QueryClientProvider)
│   │   └── api/                # Server-side API routes (web + Vercel)
│   │       ├── chart/          # Historical OHLCV (Polygon → Yahoo fallback)
│   │       ├── quote/          # Multi-symbol quotes (Polygon → Yahoo fallback)
│   │       ├── search/         # Ticker search (Polygon → Yahoo fallback)
│   │       ├── news/           # Market news (Polygon → Finnhub fallback)
│   │       ├── quote-summary/  # Full fundamentals (Yahoo)
│   │       ├── movers/         # Screener lists (Yahoo)
│   │       ├── options/        # Options chain (Yahoo)
│   │       ├── insider/        # Insider transactions (Finnhub)
│   │       ├── economic-calendar/  # Macro events (Finnhub)
│   │       ├── portfolio-analytics/# Risk metrics, timeline vs. SPY
│   │       ├── sector-rotation/    # Sector ETF returns + RRG data
│   │       ├── save-pdf/           # PDF blob save endpoint
│   │       ├── polygon/
│   │       │   ├── snapshot/   # Single-symbol quote
│   │       │   ├── aggs/       # Aggregated OHLCV bars
│   │       │   ├── search/     # Ticker search
│   │       │   └── news/       # Symbol news
│   │       ├── finnhub/
│   │       │   ├── earnings/         # EPS history
│   │       │   ├── earnings-calendar/# Upcoming earnings
│   │       │   └── recommendations/  # Analyst ratings trend
│   │       └── fred/
│   │           ├── macro/      # GDP, CPI, unemployment, etc.
│   │           └── yield-curve/# Treasury yield tenors
│   ├── components/
│   │   ├── Terminal/
│   │   │   ├── TerminalShell.tsx   # Root layout + WS status badge
│   │   │   ├── PanelLayout.tsx     # Routes panel type → component
│   │   │   └── RightPanel.tsx      # Order book + VWAP (WS-anchored)
│   │   ├── TickerTape/
│   │   │   └── TickerTape.tsx      # Flash animations + WS live prices
│   │   ├── Chart/
│   │   │   ├── PriceChart.tsx      # Candlestick/line + indicators
│   │   │   ├── MultiChart.tsx      # Multi-symbol normalized overlay
│   │   │   ├── TechnicalIndicators.ts  # SMA, RSI, BB, MACD, Stochastic
│   │   │   └── Sparkline.tsx       # Mini sparklines
│   │   ├── StockDetail/
│   │   │   ├── StockDetail.tsx     # Tabbed detail view
│   │   │   ├── CompanyProfile.tsx  # Description + key stats
│   │   │   ├── FundamentalsPanel.tsx   # OVERVIEW/EARN/INSIDER/OPTIONS tabs
│   │   │   ├── InsiderTransactions.tsx # Buy/sell table + ratio bar
│   │   │   ├── OptionsChain.tsx    # Calls/puts + expiry selector
│   │   │   └── KeyStats.tsx        # Financial ratios grid
│   │   ├── SectorRotation/
│   │   │   └── SectorRotation.tsx  # Ranked table + RRG scatter chart
│   │   ├── EconomicCalendar/
│   │   │   └── EconomicCalendarView.tsx
│   │   ├── MacroDashboard/         # FRED series charts
│   │   ├── MarketOverview/         # Index + asset class grid
│   │   ├── HeatMap/                # Sector heatmap
│   │   ├── Movers/                 # Screener tabs
│   │   ├── EarningsCalendar/       # Upcoming + historical earnings
│   │   ├── Portfolio/              # Positions + analytics
│   │   ├── Watchlist/              # Custom watchlist
│   │   ├── NewsFeed/               # Breaking banner + article list
│   │   ├── PriceRecorder/          # Auto-scheduled price logger
│   │   ├── Notes/                  # Auto-saving daily notes
│   │   ├── CommandBar/
│   │   │   ├── CommandBar.tsx      # Input + history
│   │   │   └── CommandParser.ts    # Command → PanelType mapping
│   │   └── UI/
│   │       └── TabBar.tsx          # Module navigation tabs
│   ├── hooks/                      # React Query data hooks
│   │   ├── useChart.ts
│   │   ├── useQuote.ts
│   │   ├── useQuoteSummary.ts
│   │   ├── useSearch.ts
│   │   ├── useNews.ts
│   │   ├── useMovers.ts
│   │   ├── useMacro.ts
│   │   ├── useYieldCurve.ts
│   │   ├── useEarningsCalendar.ts
│   │   ├── useEarningsHistory.ts
│   │   ├── useRecommendationTrend.ts
│   │   ├── useInsider.ts
│   │   ├── useOptions.ts
│   │   ├── useEconomicCalendar.ts
│   │   ├── useSectorRotation.ts
│   │   ├── usePortfolioRisk.ts
│   │   ├── useMultiChart.ts
│   │   ├── usePolygonLive.ts       # WebSocket trades + quotes
│   │   └── useRecorderScheduler.ts
│   ├── lib/
│   │   ├── api.ts              # apiFetch() — relative on web, Vercel URL on iOS
│   │   ├── polygon.ts          # Polygon REST client (server-side)
│   │   ├── polygon-ws.ts       # Polygon WebSocket singleton (client-side)
│   │   ├── finnhub.ts          # Finnhub client + types
│   │   ├── fred.ts             # FRED client
│   │   ├── yahoo.ts            # Yahoo Finance server-side
│   │   ├── yahoo-client.ts     # Yahoo Finance client-side
│   │   ├── platform.ts         # isNative() platform detection
│   │   └── format.ts           # Number formatting helpers
│   ├── store/                  # Zustand slices (portfolio, watchlist, notes, recorder)
│   ├── types/
│   │   └── index.ts            # Shared TypeScript interfaces
│   └── app/globals.css         # Tailwind v4 theme (teal + dark gold palette)
├── ios/                        # Capacitor-generated Xcode project
├── out/                        # Static export output (generated, gitignored)
├── capacitor.config.json       # Capacitor app config
├── next.config.ts              # Standard Next.js config (web)
├── next.config.ios.ts          # iOS config (output: "export", unoptimized images)
└── .env.ios.example            # Template for iOS environment variables
```

---

## Data Flow

### Web
```
Browser → Next.js API route → Polygon.io / FRED / Finnhub / Yahoo
```

### iOS
```
WKWebView → apiFetch(NEXT_PUBLIC_API_URL + /api/...) → Vercel → Polygon.io / FRED / Finnhub / Yahoo
```

### WebSocket (both platforms)
```
Browser / WKWebView → polygon-ws.ts singleton → wss://socket.polygon.io/stocks
```

### Polygon-first, fallback chain
| Data type | Primary | Fallback |
|-----------|---------|---------|
| Quote | Polygon snapshot | Yahoo Finance |
| OHLCV chart | Polygon aggregates | Yahoo Finance |
| News | Polygon news | Finnhub |
| Ticker search | Polygon search | Yahoo Finance |
| Fundamentals | Yahoo quote summary | — |
| Macro series | FRED | — |
| Insider data | Finnhub | — |
| Options chain | Yahoo Finance | — |
| Economic calendar | Finnhub | mock data |

---

## Design System

The terminal uses a strict two-color palette:

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bloomberg-orange` | `#CCA800` | Primary text, accents, highlights |
| `--color-bloomberg-bg` | `#001616` | Page background |
| `--color-bloomberg-green` | `#00FF66` | Positive price change, gains |
| `--color-bloomberg-red` | `#FF3333` | Negative price change, losses |
| `--color-bloomberg-panel` | `#002222` | Panel backgrounds |
| `--color-bloomberg-border` | `#003333` | Borders, dividers |

Font: **IBM Plex Mono** (loaded via `next/font/google`) — monospace throughout.

---

## API Routes Reference

All routes live under `/api/` and are served by the Next.js server (Vercel in production).

| Method | Route | Query params | Description |
|--------|-------|--------------|-------------|
| GET | `/api/quote` | `symbols=AAPL,MSFT` | Multi-symbol quotes |
| GET | `/api/chart` | `symbol`, `range` | Historical OHLCV |
| GET | `/api/search` | `q` | Ticker search |
| GET | `/api/news` | `symbol` (optional) | Market / company news |
| GET | `/api/quote-summary` | `symbol` | Full fundamentals |
| GET | `/api/movers` | `type` (gainers/losers/active/…) | Screener list |
| GET | `/api/options` | `symbol`, `expiry` | Options chain |
| GET | `/api/insider` | `symbol` | Insider transactions |
| GET | `/api/economic-calendar` | — | Macro events |
| GET | `/api/sector-rotation` | — | Sector ETF returns + RRG |
| POST | `/api/portfolio-analytics` | body: `{positions}` | Risk metrics + timeline |
| POST | `/api/save-pdf` | body: PDF blob | Save PDF to server |
| GET | `/api/polygon/snapshot` | `symbol` | Polygon quote |
| GET | `/api/polygon/aggs` | `symbol`, `range` | Polygon OHLCV |
| GET | `/api/polygon/search` | `q` | Polygon ticker search |
| GET | `/api/polygon/news` | `symbol` | Polygon news |
| GET | `/api/finnhub/earnings` | `symbol` | EPS history |
| GET | `/api/finnhub/earnings-calendar` | `from`, `to` | Upcoming earnings |
| GET | `/api/finnhub/recommendations` | `symbol` | Analyst ratings |
| GET | `/api/fred/macro` | `series` | FRED data series |
| GET | `/api/fred/yield-curve` | — | Treasury yield tenors |

---

## Development Notes

### Adding a new panel

1. Add the panel type to `src/types/index.ts` → `PanelType` union
2. Add a command keyword in `src/components/CommandBar/CommandParser.ts`
3. Add a tab entry in `src/components/UI/TabBar.tsx`
4. Add a render case in `src/components/Terminal/PanelLayout.tsx`

### Polygon WebSocket

The WS singleton lives in `src/lib/polygon-ws.ts`. It is browser-only (guarded by `typeof window !== 'undefined'`). The hook `usePolygonLive(symbols)` subscribes to trades (`T.*`) and quotes (`Q.*`) for equity tickers only — symbols containing `^`, `=`, or `-USD` are filtered out and remain on REST polling.

### iOS `apiFetch()`

All data-fetching hooks call `apiFetch()` from `src/lib/api.ts` instead of `fetch()` directly. On web it behaves identically to `fetch()` (empty base URL). On iOS, `NEXT_PUBLIC_API_URL` is set at build time to the Vercel deployment URL, so every `/api/*` call is routed to the server. `CapacitorHttp` intercepts the request natively, bypassing CORS.

### Tailwind v4

Config lives entirely in `src/app/globals.css` using `@import "tailwindcss"` and `@theme inline {}` blocks — there is no `tailwind.config.ts`. Custom color tokens are referenced in className strings as `text-bloomberg-orange`, `bg-bloomberg-bg`, etc.
