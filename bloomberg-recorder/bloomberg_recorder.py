#!/usr/bin/env python3
"""
Bloomberg Price Recorder - Python BLPAPI Backup Script
======================================================

Standalone Python script that records intraday price snapshots from Bloomberg
using the BLPAPI (Bloomberg API) SDK. Designed to run as a background process
alongside (or instead of) the Excel VBA version.

REQUIRES:
    - Bloomberg Terminal running on the same machine (or SAPI connection)
    - blpapi Python package: pip install blpapi
    - Bloomberg B-PIPE or Desktop API license

USAGE:
    python bloomberg_recorder.py                    # Run with defaults
    python bloomberg_recorder.py --interval 1       # 1-minute snapshots
    python bloomberg_recorder.py --tickers "AAPL US Equity" "TSLA US Equity"
    python bloomberg_recorder.py --config config.json

OUTPUT:
    CSV files organized by date in ./bloomberg_data/:
        bloomberg_data/
        ├── 2026-02-14/
        │   ├── snapshots_2026-02-14.csv
        │   └── opening_prices_2026-02-14.csv
        ├── 2026-02-13/
        │   └── ...
        └── backfill/
            └── historical_30d.csv
"""

import os
import sys
import csv
import json
import time
import signal
import logging
import argparse
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# BLPAPI IMPORT
# blpapi is Bloomberg's official Python SDK. It communicates with the
# Bloomberg Terminal (or B-PIPE server) running on port 8194 (default).
# Install: pip install blpapi
# Docs: https://www.bloomberg.com/professional/support/api-library/
# ---------------------------------------------------------------------------
try:
    import blpapi
    from blpapi import SessionOptions, Session, Event, Name
    BLPAPI_AVAILABLE = True
except ImportError:
    BLPAPI_AVAILABLE = False
    print("WARNING: blpapi not installed. Install with: pip install blpapi")
    print("Running in demo/dry-run mode (no Bloomberg connection).")


# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "tickers": ["SPX Index", "SPY US Equity"],
    "interval_minutes": 5,
    "market_open": "09:30",
    "market_close": "16:00",
    "highlight_threshold_pct": 0.5,
    "alert_threshold_pct": 1.0,
    "output_dir": "bloomberg_data",
    "bloomberg_host": "localhost",
    "bloomberg_port": 8194,
}

# Bloomberg field names used in this script:
# PX_LAST              - Last traded price (real-time)
# PX_OPEN              - Today's opening price
# OPEN                 - Historical open price (BDH field)
# PX_HIGH / PX_LOW     - Today's high/low
# PX_VOLUME            - Cumulative volume
# EQY_WEIGHTED_AVG_PX  - Volume-weighted average price (VWAP)
# PX_BID / PX_ASK      - Current bid/ask
# LAST_PRICE           - Alias for PX_LAST in some contexts
SNAPSHOT_FIELDS = [
    "PX_LAST",
    "PX_OPEN",
    "PX_VOLUME",
    "EQY_WEIGHTED_AVG_PX",
    "PX_BID",
    "PX_ASK",
]

HISTORICAL_FIELDS = ["PX_LAST", "PX_VOLUME"]


# ---------------------------------------------------------------------------
# LOGGING SETUP
# ---------------------------------------------------------------------------
def setup_logging(output_dir: str) -> logging.Logger:
    """Configure logging to both console and a daily log file."""
    logger = logging.getLogger("bloomberg_recorder")
    logger.setLevel(logging.DEBUG)

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    ))
    logger.addHandler(console)

    # File handler (daily rotation)
    log_dir = Path(output_dir) / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"recorder_{date.today().isoformat()}.log"

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    ))
    logger.addHandler(file_handler)

    return logger


# ---------------------------------------------------------------------------
# BLOOMBERG SESSION MANAGER
# ---------------------------------------------------------------------------
class BloombergSession:
    """
    Manages the BLPAPI session lifecycle: connect, request data, disconnect.

    BLPAPI Architecture:
    - SessionOptions: configures host/port for the Bloomberg service
    - Session: the main connection object
    - Service: represents a Bloomberg data service (e.g., //blp/refdata)
    - Request: a structured query sent to a service
    - Event/Message: response data from Bloomberg
    """

    # Service URIs used:
    # //blp/refdata  - Reference Data Service: for BDP (single-point) and
    #                  BDH (historical) equivalent requests
    REFDATA_SERVICE = "//blp/refdata"

    def __init__(self, host: str = "localhost", port: int = 8194,
                 logger: Optional[logging.Logger] = None):
        self.host = host
        self.port = port
        self.session: Optional[Session] = None
        self.logger = logger or logging.getLogger(__name__)
        self._connected = False

    def connect(self) -> bool:
        """
        Establish connection to the Bloomberg Terminal.

        SessionOptions sets the server address. The Bloomberg Terminal
        listens on localhost:8194 by default for Desktop API connections.
        For B-PIPE (server) deployments, this would be the B-PIPE host.
        """
        if not BLPAPI_AVAILABLE:
            self.logger.warning("blpapi not available - running in dry-run mode")
            return False

        try:
            # Configure connection parameters
            options = SessionOptions()
            options.setServerHost(self.host)
            options.setServerPort(self.port)
            # Timeout for connection attempt (milliseconds)
            options.setConnectTimeout(30000)

            self.logger.info(f"Connecting to Bloomberg at {self.host}:{self.port}...")

            # Create and start the session
            self.session = Session(options)
            if not self.session.start():
                self.logger.error("Failed to start Bloomberg session")
                return False

            # Open the Reference Data Service
            # This service handles BDP (ReferenceDataRequest) and
            # BDH (HistoricalDataRequest) queries.
            if not self.session.openService(self.REFDATA_SERVICE):
                self.logger.error("Failed to open refdata service")
                return False

            self._connected = True
            self.logger.info("Bloomberg session connected successfully")
            return True

        except Exception as e:
            self.logger.error(f"Bloomberg connection error: {e}")
            return False

    def disconnect(self):
        """Gracefully close the Bloomberg session."""
        if self.session:
            try:
                self.session.stop()
                self.logger.info("Bloomberg session disconnected")
            except Exception as e:
                self.logger.warning(f"Error disconnecting: {e}")
            finally:
                self.session = None
                self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected and self.session is not None

    def reconnect(self, max_retries: int = 3, delay: int = 10) -> bool:
        """
        Attempt to reconnect to Bloomberg with exponential backoff.
        Called automatically when a request fails due to disconnection.
        """
        self.disconnect()

        for attempt in range(1, max_retries + 1):
            wait_time = delay * attempt
            self.logger.info(
                f"Reconnection attempt {attempt}/{max_retries} "
                f"(waiting {wait_time}s)..."
            )
            time.sleep(wait_time)

            if self.connect():
                self.logger.info(f"Reconnected on attempt {attempt}")
                return True

        self.logger.error("All reconnection attempts failed")
        return False

    def fetch_reference_data(self, tickers: list[str],
                             fields: list[str]) -> dict:
        """
        Equivalent to BDP() in Excel - fetches current real-time values.

        BLPAPI equivalent of: =BDP("SPX Index", "PX_LAST")

        This sends a ReferenceDataRequest to //blp/refdata. The response
        contains one securityData element per ticker, each with fieldData
        containing the requested fields.

        Args:
            tickers: List of Bloomberg ticker strings (e.g., ["SPX Index"])
            fields: List of Bloomberg field mnemonics (e.g., ["PX_LAST"])

        Returns:
            Dict mapping ticker -> {field: value}
        """
        if not self.is_connected:
            self.logger.warning("Not connected to Bloomberg")
            return {}

        results = {}

        try:
            service = self.session.getService(self.REFDATA_SERVICE)

            # Create a ReferenceDataRequest (BDP equivalent)
            request = service.createRequest("ReferenceDataRequest")

            # Add securities (tickers) to the request
            for ticker in tickers:
                request.getElement("securities").appendValue(ticker)

            # Add fields to the request
            for field in fields:
                request.getElement("fields").appendValue(field)

            # Send the request and process the response
            self.session.sendRequest(request)

            # Process response events
            # Bloomberg sends data as a stream of Events, each containing
            # one or more Messages.
            while True:
                event = self.session.nextEvent(timeout=30000)

                for msg in event:
                    if msg.hasElement("securityData"):
                        security_data = msg.getElement("securityData")

                        for i in range(security_data.numValues()):
                            sec = security_data.getValueAsElement(i)
                            ticker_name = sec.getElementAsString("security")
                            field_data = sec.getElement("fieldData")

                            ticker_result = {}
                            for field in fields:
                                try:
                                    val = field_data.getElementAsFloat(field)
                                    ticker_result[field] = val
                                except Exception:
                                    ticker_result[field] = None

                            results[ticker_name] = ticker_result

                # RESPONSE event signals the end of the request
                if event.eventType() == Event.RESPONSE:
                    break

        except Exception as e:
            self.logger.error(f"Reference data request failed: {e}")
            # Try to reconnect
            if self.reconnect():
                return self.fetch_reference_data(tickers, fields)

        return results

    def fetch_historical_data(self, ticker: str, fields: list[str],
                              start_date: date, end_date: date) -> list[dict]:
        """
        Equivalent to BDH() in Excel - fetches historical time series.

        BLPAPI equivalent of:
            =BDH("SPX Index","PX_LAST","20260101","20260214")

        This sends a HistoricalDataRequest to //blp/refdata. The response
        contains a time series with one row per trading day.

        Args:
            ticker: Single Bloomberg ticker string
            fields: List of field mnemonics
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of dicts, each with 'date' key plus requested field values
        """
        if not self.is_connected:
            return []

        rows = []

        try:
            service = self.session.getService(self.REFDATA_SERVICE)

            # Create a HistoricalDataRequest (BDH equivalent)
            request = service.createRequest("HistoricalDataRequest")
            request.getElement("securities").appendValue(ticker)

            for field in fields:
                request.getElement("fields").appendValue(field)

            # Date format: YYYYMMDD (Bloomberg convention)
            request.set("startDate", start_date.strftime("%Y%m%d"))
            request.set("endDate", end_date.strftime("%Y%m%d"))

            # Optional BDH parameters:
            # periodicitySelection: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
            request.set("periodicitySelection", "DAILY")
            # nonTradingDayFillOption: controls how non-trading days appear
            # NON_TRADING_WEEKDAYS = include weekdays even if no trading
            # ALL_CALENDAR_DAYS = include all days
            # ACTIVE_DAYS_ONLY = only days with trading (default)
            request.set("nonTradingDayFillOption", "ACTIVE_DAYS_ONLY")

            self.session.sendRequest(request)

            while True:
                event = self.session.nextEvent(timeout=30000)

                for msg in event:
                    if msg.hasElement("securityData"):
                        sec_data = msg.getElement("securityData")
                        field_data_array = sec_data.getElement("fieldData")

                        for i in range(field_data_array.numValues()):
                            row_elem = field_data_array.getValueAsElement(i)
                            row = {"date": row_elem.getElementAsDatetime("date")}

                            for field in fields:
                                try:
                                    row[field] = row_elem.getElementAsFloat(field)
                                except Exception:
                                    row[field] = None

                            rows.append(row)

                if event.eventType() == Event.RESPONSE:
                    break

        except Exception as e:
            self.logger.error(f"Historical data request failed for {ticker}: {e}")

        return rows


# ---------------------------------------------------------------------------
# PRICE RECORDER
# ---------------------------------------------------------------------------
class PriceRecorder:
    """
    Main recording engine. Manages the snapshot loop, CSV output,
    and change-from-open calculations.
    """

    def __init__(self, config: dict, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.bloomberg = BloombergSession(
            host=config["bloomberg_host"],
            port=config["bloomberg_port"],
            logger=logger,
        )
        self.running = False
        self.opening_prices: dict[str, float] = {}
        self.snapshot_count = 0
        self.output_dir = Path(config["output_dir"])

        # Parse market hours
        self.market_open = datetime.strptime(config["market_open"], "%H:%M").time()
        self.market_close = datetime.strptime(config["market_close"], "%H:%M").time()

    def _today_dir(self) -> Path:
        """Returns today's data directory, creating it if needed."""
        d = self.output_dir / date.today().isoformat()
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _is_market_hours(self) -> bool:
        """Check if current time is within configured market hours."""
        now = datetime.now().time()
        return self.market_open <= now <= self.market_close

    def _is_weekday(self) -> bool:
        """Check if today is a weekday (Mon-Fri)."""
        return date.today().weekday() < 5

    def start(self):
        """
        Main entry point. Connects to Bloomberg and enters the recording loop.
        Handles graceful shutdown via SIGINT/SIGTERM.
        """
        self.logger.info("=" * 60)
        self.logger.info("Bloomberg Price Recorder starting")
        self.logger.info(f"Tickers: {self.config['tickers']}")
        self.logger.info(f"Interval: {self.config['interval_minutes']} min")
        self.logger.info(f"Market hours: {self.config['market_open']} - {self.config['market_close']} ET")
        self.logger.info(f"Output: {self.output_dir.absolute()}")
        self.logger.info("=" * 60)

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Check for weekend/holiday
        if not self._is_weekday():
            self.logger.info("Today is a weekend. Recorder will wait for Monday.")

        # Connect to Bloomberg
        connected = self.bloomberg.connect()
        if not connected:
            self.logger.warning(
                "Bloomberg not connected. Running in offline/dry-run mode. "
                "CSV files will be created with placeholder data."
            )

        self.running = True

        # Wait for market open if needed
        self._wait_for_market_open()

        # Record opening prices
        if self.running and self._is_weekday():
            self._record_opening_prices()

        # Main snapshot loop
        self._recording_loop()

        # Cleanup
        self.bloomberg.disconnect()
        self.logger.info("Recorder stopped.")

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.logger.info(f"Received signal {signum}. Shutting down...")
        self.running = False

    def _wait_for_market_open(self):
        """Sleep until market open time, checking every 30 seconds."""
        while self.running:
            now = datetime.now().time()
            if now >= self.market_open:
                break
            if not self._is_weekday():
                # On weekends, check every 5 minutes
                self.logger.debug("Weekend - sleeping 5 min before recheck")
                time.sleep(300)
                continue

            # Calculate time until open
            now_dt = datetime.combine(date.today(), now)
            open_dt = datetime.combine(date.today(), self.market_open)
            wait_secs = (open_dt - now_dt).total_seconds()

            if wait_secs > 60:
                self.logger.info(
                    f"Waiting for market open ({self.config['market_open']}). "
                    f"{wait_secs / 60:.0f} min remaining..."
                )
                time.sleep(min(wait_secs - 30, 60))
            else:
                self.logger.info("Market opens in less than 1 minute...")
                time.sleep(max(wait_secs, 1))

    def _record_opening_prices(self):
        """
        Capture opening prices for all tickers at market open.
        Saved to a separate CSV and stored in memory for change calculations.
        """
        self.logger.info("Recording opening prices...")
        tickers = self.config["tickers"]

        if self.bloomberg.is_connected:
            data = self.bloomberg.fetch_reference_data(tickers, ["PX_OPEN", "PX_LAST"])
            for ticker in tickers:
                if ticker in data:
                    # Prefer PX_OPEN, fall back to PX_LAST if open not available
                    open_px = data[ticker].get("PX_OPEN")
                    if open_px is None:
                        open_px = data[ticker].get("PX_LAST")
                    if open_px is not None:
                        self.opening_prices[ticker] = open_px
                        self.logger.info(f"  {ticker}: open = {open_px}")
        else:
            # Dry-run mode - use placeholder values
            for ticker in tickers:
                self.opening_prices[ticker] = 0.0
                self.logger.info(f"  {ticker}: open = N/A (dry-run)")

        # Save opening prices to CSV
        open_file = self._today_dir() / f"opening_prices_{date.today().isoformat()}.csv"
        with open(open_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Timestamp", "Ticker", "Open_Price"])
            ts = datetime.now().isoformat()
            for ticker, px in self.opening_prices.items():
                writer.writerow([ts, ticker, px])

        self.logger.info(f"Opening prices saved to {open_file}")

    def _recording_loop(self):
        """
        Main loop: take snapshots at the configured interval until
        market close or shutdown signal.
        """
        interval_secs = self.config["interval_minutes"] * 60

        while self.running:
            # Check if market is open
            if not self._is_market_hours():
                if datetime.now().time() > self.market_close:
                    self.logger.info("Market closed. Stopping recorder.")
                    break
                # Before market open - wait
                time.sleep(10)
                continue

            if not self._is_weekday():
                time.sleep(60)
                continue

            # Take snapshot
            self._take_snapshot()

            # Sleep until next interval
            self.logger.debug(f"Next snapshot in {self.config['interval_minutes']} min")
            # Sleep in small increments so we can respond to shutdown signals
            sleep_end = time.time() + interval_secs
            while time.time() < sleep_end and self.running:
                time.sleep(1)

    def _take_snapshot(self):
        """
        Fetch current prices for all tickers and write to CSV.
        Calculates change from open and flags significant moves.
        """
        tickers = self.config["tickers"]
        timestamp = datetime.now().isoformat()

        self.logger.info(f"Taking snapshot #{self.snapshot_count + 1} at {timestamp}")

        # Fetch data from Bloomberg
        if self.bloomberg.is_connected:
            data = self.bloomberg.fetch_reference_data(tickers, SNAPSHOT_FIELDS)
        else:
            # Dry-run mode
            data = {
                t: {f: None for f in SNAPSHOT_FIELDS}
                for t in tickers
            }

        # Prepare CSV rows
        csv_file = self._today_dir() / f"snapshots_{date.today().isoformat()}.csv"
        file_exists = csv_file.exists()

        with open(csv_file, "a", newline="") as f:
            writer = csv.writer(f)

            # Write header if new file
            if not file_exists:
                writer.writerow([
                    "Timestamp", "Ticker", "Last_Price", "Open_Price",
                    "Change", "Pct_Change", "Volume", "VWAP", "Bid", "Ask",
                    "Significant_Move",
                ])

            for ticker in tickers:
                ticker_data = data.get(ticker, {})
                last_px = ticker_data.get("PX_LAST")
                open_px = ticker_data.get("PX_OPEN") or self.opening_prices.get(ticker)
                volume = ticker_data.get("PX_VOLUME")
                vwap = ticker_data.get("EQY_WEIGHTED_AVG_PX")
                bid = ticker_data.get("PX_BID")
                ask = ticker_data.get("PX_ASK")

                # Calculate change from open
                change = None
                pct_change = None
                significant = ""

                if last_px is not None and open_px is not None and open_px != 0:
                    change = round(last_px - open_px, 4)
                    pct_change = round((change / open_px) * 100, 4)

                    threshold = self.config["highlight_threshold_pct"]
                    alert_threshold = self.config["alert_threshold_pct"]

                    if abs(pct_change) > alert_threshold:
                        significant = "ALERT"
                        self.logger.warning(
                            f"ALERT: {ticker} moved {pct_change:+.2f}% from open!"
                        )
                    elif abs(pct_change) > threshold:
                        significant = "SIGNIFICANT"
                        self.logger.info(
                            f"Significant move: {ticker} {pct_change:+.2f}%"
                        )

                writer.writerow([
                    timestamp, ticker,
                    last_px, open_px, change, pct_change,
                    volume, vwap, bid, ask,
                    significant,
                ])

                # Console summary
                px_str = f"{last_px:.2f}" if last_px else "N/A"
                chg_str = f"{pct_change:+.2f}%" if pct_change is not None else "N/A"
                self.logger.info(f"  {ticker}: {px_str} ({chg_str})")

        self.snapshot_count += 1

    def backfill_history(self, days: int = 30):
        """
        Pull historical daily data for all tickers using BDH equivalent.

        This uses HistoricalDataRequest which is the BLPAPI equivalent
        of the BDH() Excel function.

        Args:
            days: Number of trading days to backfill
        """
        if not self.bloomberg.is_connected:
            self.logger.error("Cannot backfill: Bloomberg not connected")
            return

        self.logger.info(f"Backfilling {days} days of history...")

        backfill_dir = self.output_dir / "backfill"
        backfill_dir.mkdir(parents=True, exist_ok=True)

        end_dt = date.today()
        # Use 1.5x days to account for weekends/holidays
        start_dt = end_dt - timedelta(days=int(days * 1.5))

        csv_file = backfill_dir / f"historical_{days}d.csv"

        with open(csv_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Ticker", "Close", "Volume"])

            for ticker in self.config["tickers"]:
                self.logger.info(f"  Fetching history for {ticker}...")
                rows = self.bloomberg.fetch_historical_data(
                    ticker, HISTORICAL_FIELDS, start_dt, end_dt
                )

                for row in rows:
                    writer.writerow([
                        row["date"],
                        ticker,
                        row.get("PX_LAST"),
                        row.get("PX_VOLUME"),
                    ])

                self.logger.info(f"  {ticker}: {len(rows)} data points")

        self.logger.info(f"Backfill saved to {csv_file}")


# ---------------------------------------------------------------------------
# CONFIGURATION LOADER
# ---------------------------------------------------------------------------
def load_config(config_path: Optional[str] = None) -> dict:
    """Load configuration from JSON file or return defaults."""
    config = DEFAULT_CONFIG.copy()

    if config_path and Path(config_path).exists():
        with open(config_path) as f:
            user_config = json.load(f)
        config.update(user_config)
        print(f"Loaded config from {config_path}")

    return config


def save_default_config(path: str = "recorder_config.json"):
    """Save the default configuration as a JSON file for editing."""
    with open(path, "w") as f:
        json.dump(DEFAULT_CONFIG, f, indent=2)
    print(f"Default config saved to {path}")


# ---------------------------------------------------------------------------
# CLI ENTRY POINT
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Bloomberg Price Recorder - BLPAPI backup script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                              # Run with default settings
  %(prog)s --interval 1                 # 1-minute snapshots
  %(prog)s --tickers "AAPL US Equity"   # Add custom tickers
  %(prog)s --backfill 60                # Backfill 60 days of history
  %(prog)s --save-config                # Save default config to file
        """,
    )

    parser.add_argument(
        "--config", "-c",
        help="Path to JSON config file",
    )
    parser.add_argument(
        "--tickers", "-t",
        nargs="+",
        help="Additional tickers to track (added to defaults)",
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        choices=[1, 5, 15, 30, 60],
        help="Snapshot interval in minutes (1, 5, 15, 30, or 60)",
    )
    parser.add_argument(
        "--output", "-o",
        help="Output directory for CSV files",
    )
    parser.add_argument(
        "--backfill",
        type=int,
        metavar="DAYS",
        help="Backfill N days of historical data, then exit",
    )
    parser.add_argument(
        "--save-config",
        action="store_true",
        help="Save default config to recorder_config.json and exit",
    )

    args = parser.parse_args()

    # Save default config and exit
    if args.save_config:
        save_default_config()
        return

    # Load config
    config = load_config(args.config)

    # Override with CLI args
    if args.tickers:
        config["tickers"] = list(set(config["tickers"] + args.tickers))
    if args.interval:
        config["interval_minutes"] = args.interval
    if args.output:
        config["output_dir"] = args.output

    # Setup logging
    logger = setup_logging(config["output_dir"])

    # Create recorder
    recorder = PriceRecorder(config, logger)

    # Backfill mode
    if args.backfill:
        if not recorder.bloomberg.connect():
            logger.error("Cannot connect to Bloomberg for backfill")
            sys.exit(1)
        recorder.backfill_history(args.backfill)
        recorder.bloomberg.disconnect()
        return

    # Normal recording mode
    recorder.start()


if __name__ == "__main__":
    main()
