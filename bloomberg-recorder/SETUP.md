# Bloomberg Price Recorder - Setup Guide

## Overview

Two implementations that record intraday price snapshots from Bloomberg Terminal:

1. **VBA Macro Workbook** (`BloombergPriceRecorder.vba`) — Primary, runs inside Excel
2. **Python BLPAPI Script** (`bloomberg_recorder.py`) — Backup, runs as background process

Both track SPX Index and SPY US Equity by default, with configurable tickers and intervals.

---

## 1. VBA Macro Workbook Setup

### Prerequisites
- Bloomberg Terminal with active login
- Bloomberg Excel Add-in enabled (Bloomberg menu → Start Bloomberg)
- Excel with macros enabled

### Installation

1. Open a **new Excel workbook** on a Bloomberg Terminal PC
2. **Save as** `.xlsm` (macro-enabled workbook)
3. Press `Alt+F11` to open VBA Editor
4. **Insert → Module**, paste the entire contents of `BloombergPriceRecorder.vba`
5. In the VBA Project Explorer, **double-click `ThisWorkbook`** and paste the `Workbook_Open` and `Workbook_BeforeClose` event code (found in Section 8 of the VBA file — uncomment the code)
6. Close VBA Editor, return to Excel
7. Run the macro **`InitializeWorkbook`** (Alt+F8 → select → Run)
8. Run **`AddDashboardButtons`** to create the control buttons

### Usage

| Action | How |
|--------|-----|
| **Configure tickers** | Settings tab → Enter Bloomberg tickers in column B, set Active = TRUE |
| **Set interval** | Settings tab → Dropdown in cell G5 (1, 5, 15, 30, or 60 min) |
| **Set market hours** | Settings tab → G8 (open) and G9 (close) |
| **Set alert thresholds** | Settings tab → G12 (highlight %) and G13 (popup alert %) |
| **Start recording** | Dashboard → "Start Recording" button, or auto-starts at market open |
| **Stop recording** | Dashboard → "Stop Recording" button, or auto-stops at close |
| **Backfill history** | Dashboard → "Backfill History" button |
| **Clear dashboard** | Run macro `ClearDashboard` |

### Sheet Structure

- **Settings** — All configuration (tickers, interval, thresholds, market hours)
- **Dashboard** — Live running log with color-coded significant moves
- **YYYY-MM-DD** — Daily data sheets (one per trading day, auto-created)
- **Backfill** — Historical data from BDH() backfill

### Bloomberg Functions Used

| Function | Purpose | Example |
|----------|---------|---------|
| `BDP(ticker, field)` | Real-time single data point | `BDP("SPX Index", "PX_LAST")` |
| `BDH(ticker, fields, start, end)` | Historical time series | `BDH("SPX Index", "PX_LAST", "20260101", "20260214")` |

### Color Coding

- **Green row** — Price up > threshold % from open
- **Red row** — Price down > threshold % from open
- **Popup alert** — Triggers when move exceeds alert threshold %

---

## 2. Python BLPAPI Script Setup

### Prerequisites

```bash
pip install blpapi
```

> **Note:** `blpapi` requires the Bloomberg C++ SDK. On Bloomberg Terminal PCs, this is typically pre-installed. For B-PIPE connections, install from Bloomberg's API Library page.

### Quick Start

```bash
# Run with defaults (SPX + SPY, 5-min intervals)
python bloomberg_recorder.py

# Custom interval
python bloomberg_recorder.py --interval 1

# Add extra tickers
python bloomberg_recorder.py --tickers "AAPL US Equity" "TSLA US Equity"

# Backfill 30 days of history
python bloomberg_recorder.py --backfill 30

# Use custom config file
python bloomberg_recorder.py --config recorder_config.json

# Save default config for editing
python bloomberg_recorder.py --save-config
```

### Running as Background Process

```bash
# Linux/macOS — run in background with nohup
nohup python bloomberg_recorder.py > /dev/null 2>&1 &

# Windows — use pythonw or Task Scheduler
pythonw bloomberg_recorder.py

# With screen/tmux
screen -dmS bloomberg python bloomberg_recorder.py
```

### Output Structure

```
bloomberg_data/
├── 2026-02-14/
│   ├── snapshots_2026-02-14.csv        # Intraday snapshots
│   └── opening_prices_2026-02-14.csv   # Opening price capture
├── 2026-02-13/
│   └── ...
├── backfill/
│   └── historical_30d.csv              # Historical backfill data
└── logs/
    └── recorder_2026-02-14.log         # Debug log
```

### CSV Columns

**snapshots_*.csv:**
```
Timestamp, Ticker, Last_Price, Open_Price, Change, Pct_Change, Volume, VWAP, Bid, Ask, Significant_Move
```

### Configuration (`recorder_config.json`)

```json
{
  "tickers": ["SPX Index", "SPY US Equity"],
  "interval_minutes": 5,
  "market_open": "09:30",
  "market_close": "16:00",
  "highlight_threshold_pct": 0.5,
  "alert_threshold_pct": 1.0,
  "output_dir": "bloomberg_data",
  "bloomberg_host": "localhost",
  "bloomberg_port": 8194
}
```

---

## Error Handling

Both implementations handle:

| Scenario | Behavior |
|----------|----------|
| **Bloomberg disconnection** | Auto-retry with exponential backoff (3 attempts) |
| **Weekend/holiday** | Detects weekends; checks Bloomberg trading calendar for holidays |
| **Pre/post market** | Waits for market open; stops at market close |
| **BDP/BDH errors** | Retries with delay; logs errors; continues recording other tickers |
| **Missing data (#N/A)** | Marks as "ERR" (VBA) or `None` (Python); does not halt recording |

---

## Adding Custom Tickers

### In Excel
Go to Settings tab → Enter the Bloomberg ticker in an empty row in column B (e.g., `AAPL US Equity`, `EURUSD Curncy`, `CL1 Comdty`) → Set column D to `TRUE`.

### In Python
Edit `recorder_config.json` or pass via CLI:
```bash
python bloomberg_recorder.py --tickers "CL1 Comdty" "GC1 Comdty"
```

### Common Bloomberg Ticker Formats
| Type | Format | Example |
|------|--------|---------|
| US Equity | `TICKER US Equity` | `AAPL US Equity` |
| Index | `TICKER Index` | `SPX Index` |
| Currency | `CCY1CCY2 Curncy` | `EURUSD Curncy` |
| Commodity Future | `TICKER Comdty` | `CL1 Comdty` |
| Government Bond | `TICKER Govt` | `T 2.5 05/15/24 Govt` |
