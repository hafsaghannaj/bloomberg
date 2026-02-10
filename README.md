# Bloomberg Terminal

A Bloomberg Terminal-inspired web application for real-time financial market monitoring, portfolio management, and stock analysis. Built with a professional dark-themed interface designed for traders, investors, and market analysts.

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
- Finnhub API integration with mock data fallback

### Additional Tools
- Command bar with keyboard shortcuts (`/`, `F2`, `ESC`)
- Command history with arrow key navigation
- Multi-tab interface for viewing multiple stocks
- Price alerts with configurable triggers
- Daily notes for trading ideas and analysis
- Toast notifications

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4
- **State Management:** Zustand (persisted to localStorage)
- **Data Fetching:** TanStack React Query
- **Market Data:** Yahoo Finance (yahoo-finance2)
- **News:** Finnhub API
- **Charts:** Lightweight Charts, Recharts
- **Utilities:** date-fns, numeral, jspdf, clsx

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
git clone <repository-url>
cd bloomberg-terminal
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
FINNHUB_API_KEY=your_finnhub_api_key
```

> The Finnhub API key is optional. The app falls back to mock news data if not provided.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

| Command | Action |
|---------|--------|
| `/` or `F2` | Focus command bar |
| `ESC` | Exit command bar |
| Type a ticker (e.g. `AAPL`) | Search and view stock details |
| `NEWS` | Open news feed |
| `PORT` | Open portfolio view |
| `WL` | Open watchlist |
| `TOP` | Market overview |
| `NOTES` | Open daily notes |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/quote?symbols=AAPL,MSFT` | Fetch stock quotes |
| `GET /api/chart?symbol=AAPL&range=1M` | Fetch historical price data |
| `GET /api/search?q=apple` | Search for stock symbols |
| `GET /api/quote-summary?symbol=AAPL` | Get comprehensive stock info |
| `GET /api/news?symbol=AAPL` | Fetch market/company news |
| `POST /api/save-pdf` | Generate PDF report |

## Project Structure

```
src/
├── app/            # Next.js pages and API routes
├── components/     # UI components (Terminal, Chart, Portfolio, etc.)
├── hooks/          # Custom React hooks for data fetching
├── lib/            # API wrappers and utilities
├── store/          # Zustand state management
└── types/          # TypeScript interfaces
```

## Deployment

Deploy on [Vercel](https://vercel.com) for the best experience with Next.js:

```bash
npm run build
```

See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for more options.
