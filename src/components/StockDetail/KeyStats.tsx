'use client';

import { formatPrice, formatVolume, formatMarketCap, formatNumber } from '@/lib/format';
import { Quote } from '@/types';

interface Props {
  quote: Quote;
  summary?: Record<string, unknown>;
}

export default function KeyStats({ quote, summary }: Props) {
  const financialData = summary?.financialData as Record<string, unknown> | undefined;
  const keyStats = summary?.defaultKeyStatistics as Record<string, unknown> | undefined;
  const summaryDetail = summary?.summaryDetail as Record<string, unknown> | undefined;

  const stats = [
    { label: 'Open', value: formatPrice(quote.regularMarketOpen) },
    { label: 'High', value: formatPrice(quote.regularMarketDayHigh) },
    { label: 'Low', value: formatPrice(quote.regularMarketDayLow) },
    { label: 'Prev Close', value: formatPrice(quote.regularMarketPreviousClose) },
    { label: 'Volume', value: formatVolume(quote.regularMarketVolume) },
    { label: 'Avg Volume', value: quote.averageDailyVolume3Month ? formatVolume(quote.averageDailyVolume3Month) : 'N/A' },
    { label: 'Market Cap', value: quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A' },
    { label: '52W High', value: formatPrice(quote.fiftyTwoWeekHigh) },
    { label: '52W Low', value: formatPrice(quote.fiftyTwoWeekLow) },
    { label: 'P/E (TTM)', value: quote.trailingPE ? formatNumber(quote.trailingPE) : 'N/A' },
    { label: 'Fwd P/E', value: quote.forwardPE ? formatNumber(quote.forwardPE) : 'N/A' },
    { label: 'Div Yield', value: summaryDetail?.dividendYield ? `${formatNumber(Number(summaryDetail.dividendYield) * 100)}%` : 'N/A' },
    { label: 'EPS (TTM)', value: keyStats?.trailingEps ? formatNumber(Number(keyStats.trailingEps)) : 'N/A' },
    { label: 'Beta', value: keyStats?.beta ? formatNumber(Number(keyStats.beta)) : 'N/A' },
    { label: 'Target Price', value: financialData?.targetMeanPrice ? formatPrice(Number(financialData.targetMeanPrice)) : 'N/A' },
    { label: 'Recommendation', value: financialData?.recommendationKey ? String(financialData.recommendationKey).toUpperCase() : 'N/A' },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex justify-between items-center py-0.5 border-b"
          style={{ borderColor: '#002828' }}
        >
          <span className="text-[9px]" style={{ color: '#006262' }}>{stat.label}</span>
          <span className="text-[9px] font-bold tabular-nums" style={{ color: '#CCCCCC' }}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
