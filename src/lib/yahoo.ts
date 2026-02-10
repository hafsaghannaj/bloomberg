import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getQuote(symbol: string): Promise<any> {
  return yahooFinance.quote(symbol);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getQuotes(symbols: string[]): Promise<any[]> {
  return Promise.all(symbols.map((s) => yahooFinance.quote(s)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChart(symbol: string, range: string, interval: string): Promise<any> {
  const period1 = rangeToDate(range);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return yahooFinance.chart(symbol, { period1, interval } as any);
}

export async function searchSymbols(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return yahooFinance.search(query) as any;
}

export async function getQuoteSummary(symbol: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return yahooFinance.quoteSummary(symbol, {
    modules: [
      'summaryDetail',
      'financialData',
      'assetProfile',
      'defaultKeyStatistics',
      'earnings',
    ],
  }) as any;
}

function rangeToDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1D':
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    case '1W':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1M':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3M':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1Y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case '5Y':
      return new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export function rangeToInterval(range: string): string {
  switch (range) {
    case '1D':
      return '5m';
    case '1W':
      return '15m';
    case '1M':
      return '1d';
    case '3M':
      return '1d';
    case '1Y':
      return '1wk';
    case '5Y':
      return '1mo';
    default:
      return '1d';
  }
}
