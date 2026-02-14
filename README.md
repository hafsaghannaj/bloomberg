# Bloomberg Terminal

A Bloomberg Terminal-inspired financial platform for real-time market monitoring, portfolio management, and stock analysis. Available as a **web app** and a **standalone iOS app**.

## Features

### Market Overview
- Live tracking of major indices (S&P 500, Dow Jones, Nasdaq, Russell 2000)
- Commodities (Gold, Oil), currency pairs (EUR/USD, USD/JPY), and crypto (BTC, ETH)
- Scrolling ticker tape with auto-refresh every 10 seconds
- Sector heatmap visualization

### Stock Analysis
- Detailed stock view with company profile, sector, and industry info
- Key financial stats: P/E ratios, dividend yield, 52-week range, market cap
- Advanced charting with candlestick and line chart modes
- Multiple timeframes: 1D, 1W, 1M, 3M, 1Y, 5Y
- Technical indicators: SMA (20/50-day), RSI (14-period), Bollinger Bands

### Price Recorder
- Auto-starts at 9:30 AM ET and stops at 4:00 PM ET, Monday through Friday
- Configurable recording intervals: 1, 5, 15, 30, or 60 minutes
- Permanent SPX and SPY tracking with custom ticker support
- Highlights significant price moves based on configurable thresholds
- CSV export of recorded snapshots
- Pulsing green REC indicator in the status bar when active

### Portfolio Management
- Track positions with shares, average cost, and current price
- Real-time P&L calculation (dollars and percentage)
- Portfolio allocation breakdown
- PDF report export

### Watchlist
- Custom watchlist with price, change, volume tracking
- Quick navigation to detailed stock analysis

### News Feed
- Real-time market and company-specific news
- Clickable articles that open in the browser
- Yahoo Finance RSS feed with Finnhub API fallback

### Daily Notes
- Auto-saving notes with 800ms debounce
- Keyboard shortcut: Ctrl+S / Cmd+S
- Multi-page PDF export with proper pagination

### Navigation
- Permanent **LAUNCHPAD**, **REC**, and **NOTES** tabs in the tab bar
- Command bar with keyboard shortcuts (`/`, `F2`, `ESC`)
- Command history with arrow key navigation
- Multi-tab interface for viewing multiple stocks

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4
- **State Management:** Zustand (persisted to localStorage)
- **Data Fetching:** TanStack React Query
- **Market Data:** Yahoo Finance (server-side via yahoo-finance2, client-side via direct API)
- **News:** Yahoo Finance RSS, Finnhub API
- **Charts:** Lightweight Charts, Recharts
- **iOS:** Capacitor 8
- **Utilities:** date-fns, numeral, jspdf, clsx

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/hafsaghannaj/bloomberg.git
cd bloomberg-terminal
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
FINNHUB_API_KEY=your_finnhub_api_key
```

> The Finnhub API key is optional. The app falls back to Yahoo Finance RSS and mock news data if not provided.

### Running the Web App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## iOS App

The iOS app is a fully standalone native app — it does **not** require a server. All market data is fetched directly from Yahoo Finance on the device.

### Building the iOS App

1. Build the static export and sync to iOS:

```bash
npm run ios:build
```

2. Open the Xcode project:

```bash
npm run ios:open
```

3. In Xcode, select your iPhone or a simulator and press **Cmd+R** to build and run.

### How It Works

- The web app is compiled to static HTML/JS/CSS and bundled inside the iOS app
- Data fetching uses Capacitor's native HTTP layer (bypasses CORS)
- Each hook auto-detects the platform: uses `/api` routes on the web, direct Yahoo Finance API on iOS
- Notes and settings are saved to localStorage on each device independently

### iOS Scripts

| Script | Description |
|--------|-------------|
| `npm run ios:build` | Build static export + sync to iOS |
| `npm run ios:sync` | Sync web assets to iOS without rebuilding |
| `npm run ios:open` | Open the Xcode project |

## Usage

| Command | Action |
|---------|--------|
| `/` or `F2` | Focus command bar |
| `ESC` | Exit command bar |
| Type a ticker (e.g. `AAPL`) | Search and view stock details |
| `REC` or `RECORD` | Open price recorder |
| `NEWS` | Open news feed |
| `NOTES` | Open daily notes |
| `PORT` | Open portfolio view |
| `WL` | Open watchlist |
| `TOP` | Market overview |

## API Routes (Web Only)

| Endpoint | Description |
|----------|-------------|
| `GET /api/quote?symbols=AAPL,MSFT` | Fetch stock quotes |
| `GET /api/chart?symbol=AAPL&range=1M` | Fetch historical price data |
| `GET /api/search?q=apple` | Search for stock symbols |
| `GET /api/quote-summary?symbol=AAPL` | Get comprehensive stock info |
| `GET /api/news?symbol=AAPL` | Fetch market/company news |
| `POST /api/save-pdf` | Save PDF report to server |

> These API routes are only used by the web version. The iOS app fetches data directly from Yahoo Finance.

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
├── components/
│   ├── PriceRecorder/      # Price recording with auto-start/stop
│   ├── Notes/              # Daily notes with auto-save and PDF export
│   ├── Terminal/           # Shell, panel layout, status bar
│   ├── UI/                 # Tab bar, command bar
│   ├── NewsFeed/           # Live news with clickable articles
│   └── ...                 # Chart, Portfolio, Watchlist, etc.
├── hooks/                  # Data fetching hooks (dual-mode: web/iOS)
├── lib/
│   ├── yahoo-client.ts     # Client-side Yahoo Finance API (for iOS)
│   ├── yahoo.ts            # Server-side Yahoo Finance (for web)
│   ├── platform.ts         # Platform detection (web vs native)
│   └── ...
├── store/                  # Zustand state management
└── types/                  # TypeScript interfaces
ios/                        # Capacitor iOS project (Xcode)
bloomberg-recorder/         # Standalone VBA macro and Python BLPAPI scripts
```

## Bloomberg Recorder (Standalone)

The `bloomberg-recorder/` directory contains standalone implementations for use with Bloomberg Terminal:

- **VBA Macro** (`BloombergPriceRecorder.vba`) — For Bloomberg Excel Add-in
- **Python Script** (`bloomberg_recorder.py`) — Uses Bloomberg BLPAPI
- **Config** (`recorder_config.json`) — Shared configuration

See `bloomberg-recorder/SETUP.md` for setup instructions.
