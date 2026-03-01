'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { Quote } from '@/types';
import { useRecommendationTrend } from '@/hooks/useRecommendationTrend';
import { useEarningsHistory } from '@/hooks/useEarningsHistory';
import InsiderTransactions from './InsiderTransactions';
import OptionsChain from './OptionsChain';

type Tab = 'VALUATION' | 'FINANCIALS' | 'BALANCE' | 'ESTIMATES' | 'PROFILE' | 'INSIDER' | 'OPTIONS';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtMoney(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

function fmtCount(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

function fmtNum(v: unknown, decimals = 2): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtPct(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtX(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n) || n <= 0) return '—';
  return `${n.toFixed(2)}x`;
}

function pctColor(v: unknown, inverse = false): string {
  if (v === null || v === undefined) return '#009090';
  const n = Number(v);
  if (isNaN(n)) return '#009090';
  if (inverse) return n > 0 ? '#FF3333' : '#00FF66';
  return n >= 0 ? '#00FF66' : '#FF3333';
}

const REC_MAP: Record<string, { label: string; color: string }> = {
  strongBuy:    { label: 'STRONG BUY',    color: '#00FF66' },
  buy:          { label: 'BUY',           color: '#00CC52' },
  hold:         { label: 'HOLD',          color: '#AA8800' },
  underperform: { label: 'UNDERPERFORM',  color: '#FF6633' },
  sell:         { label: 'SELL',          color: '#FF3333' },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-[3px] border-b" style={{ borderColor: '#002525' }}>
      <span className="text-[9px] tracking-wide" style={{ color: '#007070' }}>{label}</span>
      <span className="text-[9px] font-bold tabular-nums" style={{ color: valueColor ?? '#CCCCCC' }}>{value}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[8px] font-bold tracking-widest pt-3 pb-1 first:pt-0" style={{ color: '#CCA800' }}>
      {title}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  summary: Record<string, unknown>;
  quote: Quote;
}

// Helper: "2024-01-01" → "Jan 24"
function periodLabel(period: string): string {
  const parts = period.split('-');
  if (parts.length < 2) return period;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = parseInt(parts[1], 10) - 1;
  return `${months[m] ?? ''} ${parts[0].slice(2)}`;
}

export default function FundamentalsPanel({ summary, quote }: Props) {
  const [tab, setTab] = useState<Tab>('VALUATION');

  const fd  = summary?.financialData        as Record<string, unknown> | undefined;
  const ks  = summary?.defaultKeyStatistics as Record<string, unknown> | undefined;
  const sd  = summary?.summaryDetail        as Record<string, unknown> | undefined;
  const ap  = summary?.assetProfile         as Record<string, unknown> | undefined;
  const earn = summary?.earnings as {
    earningsChart?: {
      quarterly?: Array<{ date: string; actual?: number | null; estimate?: number | null }>;
    };
  } | undefined;

  // Finnhub data for ESTIMATES tab
  const { data: recTrend } = useRecommendationTrend(quote.symbol);
  const { data: epsHistory } = useEarningsHistory(quote.symbol);

  const TABS: Tab[] = ['VALUATION', 'FINANCIALS', 'BALANCE', 'ESTIMATES', 'PROFILE', 'INSIDER', 'OPTIONS'];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Tab bar ── */}
      <div className="flex shrink-0 border-b border-bloomberg-border" style={{ background: '#001c1c' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-[8px] font-bold tracking-widest transition-colors"
            style={{
              color: tab === t ? '#CCA800' : '#006262',
              borderBottom: tab === t ? '2px solid #CCA800' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* ════ VALUATION ════ */}
        {tab === 'VALUATION' && (
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <SectionHeader title="MARKET DATA" />
              <StatRow label="Market Cap"          value={fmtMoney(quote.marketCap)} />
              <StatRow label="Enterprise Value"    value={fmtMoney(ks?.enterpriseValue)} />
              <StatRow label="Shares Outstanding"  value={fmtCount(ks?.sharesOutstanding)} />
              <StatRow label="Float"               value={fmtCount(ks?.floatShares)} />

              <SectionHeader title="MULTIPLES" />
              <StatRow label="P/E (TTM)"   value={fmtX(quote.trailingPE)} />
              <StatRow label="Fwd P/E"     value={fmtX(quote.forwardPE)} />
              <StatRow label="PEG Ratio"   value={fmtX(ks?.pegRatio)} />
              <StatRow label="P/S (TTM)"   value={fmtX(ks?.priceToSalesTrailing12Months)} />
              <StatRow label="P/B"         value={fmtX(ks?.priceToBook)} />
            </div>

            <div>
              <SectionHeader title="EV RATIOS" />
              <StatRow label="EV / Revenue" value={fmtX(ks?.enterpriseToRevenue)} />
              <StatRow label="EV / EBITDA"  value={fmtX(ks?.enterpriseToEbitda)} />

              <SectionHeader title="PER SHARE" />
              <StatRow label="EPS (TTM)"     value={ks?.trailingEps ? `$${fmtNum(ks.trailingEps)}` : '—'} />
              <StatRow label="Fwd EPS"       value={ks?.forwardEps  ? `$${fmtNum(ks.forwardEps)}`  : '—'} />
              <StatRow label="Book Value/Sh" value={ks?.bookValue   ? `$${fmtNum(ks.bookValue)}`   : '—'} />

              <SectionHeader title="RELATIVE PERFORMANCE" />
              <StatRow label="Beta"      value={fmtNum(ks?.beta)} />
              <StatRow
                label="52W Change"
                value={ks?.['52WeekChange'] ? fmtPct(ks['52WeekChange']) : '—'}
                valueColor={pctColor(ks?.['52WeekChange'])}
              />
              <StatRow
                label="vs S&P 500 52W"
                value={ks?.SandP52WeekChange ? fmtPct(ks.SandP52WeekChange) : '—'}
                valueColor={pctColor(ks?.SandP52WeekChange)}
              />
            </div>
          </div>
        )}

        {/* ════ FINANCIALS ════ */}
        {tab === 'FINANCIALS' && (
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <SectionHeader title="INCOME (TTM)" />
              <StatRow label="Revenue"            value={fmtMoney(fd?.totalRevenue)} />
              <StatRow label="Gross Profit"       value={fmtMoney(fd?.grossProfits)} />
              <StatRow label="EBITDA"             value={fmtMoney(fd?.ebitda)} />
              <StatRow label="Free Cash Flow"     value={fmtMoney(fd?.freeCashflow)} />
              <StatRow label="Operating Cash Flow" value={fmtMoney(fd?.operatingCashflow)} />

              <SectionHeader title="GROWTH (YoY)" />
              <StatRow
                label="Revenue Growth"
                value={fmtPct(fd?.revenueGrowth)}
                valueColor={pctColor(fd?.revenueGrowth)}
              />
              <StatRow
                label="Earnings Growth"
                value={fmtPct(fd?.earningsGrowth)}
                valueColor={pctColor(fd?.earningsGrowth)}
              />
            </div>

            <div>
              <SectionHeader title="MARGINS" />
              <StatRow
                label="Gross Margin"
                value={fmtPct(fd?.grossMargins)}
                valueColor={Number(fd?.grossMargins) > 0 ? '#00FF66' : '#FF3333'}
              />
              <StatRow
                label="Operating Margin"
                value={fmtPct(fd?.operatingMargins)}
                valueColor={pctColor(fd?.operatingMargins)}
              />
              <StatRow
                label="Net Margin"
                value={fmtPct(fd?.profitMargins)}
                valueColor={pctColor(fd?.profitMargins)}
              />
              <StatRow
                label="EBITDA Margin"
                value={fmtPct(fd?.ebitdaMargins)}
                valueColor={pctColor(fd?.ebitdaMargins)}
              />

              <SectionHeader title="DIVIDENDS" />
              <StatRow label="Div Yield"    value={sd?.dividendYield ? fmtPct(sd.dividendYield) : '—'} />
              <StatRow label="Payout Ratio" value={fmtPct(sd?.payoutRatio)} />
              <StatRow label="Last Div"     value={ks?.lastDividendValue ? `$${fmtNum(ks.lastDividendValue)}` : '—'} />
            </div>
          </div>
        )}

        {/* ════ BALANCE SHEET ════ */}
        {tab === 'BALANCE' && (
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <SectionHeader title="LIQUIDITY" />
              <StatRow label="Total Cash"  value={fmtMoney(fd?.totalCash)} />
              <StatRow label="Total Debt"  value={fmtMoney(fd?.totalDebt)} />
              <StatRow
                label="Net Cash / Debt"
                value={(() => {
                  const cash = Number(fd?.totalCash ?? 0);
                  const debt = Number(fd?.totalDebt ?? 0);
                  if (!cash && !debt) return '—';
                  const net = cash - debt;
                  return (net >= 0 ? '+' : '') + fmtMoney(net);
                })()}
                valueColor={Number(fd?.totalCash ?? 0) >= Number(fd?.totalDebt ?? 0) ? '#00FF66' : '#FF3333'}
              />
              <StatRow label="Debt / Equity"  value={fd?.debtToEquity ? `${fmtNum(fd.debtToEquity)}%` : '—'} />
              <StatRow label="Current Ratio"  value={fmtNum(fd?.currentRatio)} />
              <StatRow label="Quick Ratio"    value={fmtNum(fd?.quickRatio)} />
            </div>

            <div>
              <SectionHeader title="RETURNS" />
              <StatRow
                label="Return on Equity"
                value={fmtPct(fd?.returnOnEquity)}
                valueColor={pctColor(fd?.returnOnEquity)}
              />
              <StatRow
                label="Return on Assets"
                value={fmtPct(fd?.returnOnAssets)}
                valueColor={pctColor(fd?.returnOnAssets)}
              />

              <SectionHeader title="SHARES & SHORT" />
              <StatRow label="Shares Out"     value={fmtCount(ks?.sharesOutstanding)} />
              <StatRow label="Float"          value={fmtCount(ks?.floatShares)} />
              <StatRow
                label="Short % Float"
                value={ks?.shortPercentOfFloat ? fmtPct(ks.shortPercentOfFloat) : '—'}
                valueColor="#AA8800"
              />
              <StatRow label="Short Ratio"    value={fmtNum(ks?.shortRatio)} />
            </div>
          </div>
        )}

        {/* ════ ESTIMATES ════ */}
        {tab === 'ESTIMATES' && (
          <div>
            {/* Analyst consensus bar */}
            <div
              className="flex items-start gap-6 mb-4 p-3 border border-bloomberg-border"
              style={{ background: '#001a1a' }}
            >
              {/* Recommendation */}
              <div className="shrink-0">
                <div className="text-[8px] text-bloomberg-text-muted tracking-widest mb-1">CONSENSUS</div>
                {(() => {
                  const recKey = fd?.recommendationKey as string | undefined;
                  const rec = recKey ? REC_MAP[recKey] : null;
                  return rec ? (
                    <div className="text-[14px] font-bold tracking-wider" style={{ color: rec.color }}>
                      {rec.label}
                    </div>
                  ) : (
                    <div className="text-[14px] font-bold" style={{ color: '#006262' }}>N/A</div>
                  );
                })()}
                <div className="text-[8px] mt-0.5" style={{ color: '#006262' }}>
                  {fd?.numberOfAnalystOpinions ? `${fd.numberOfAnalystOpinions} analysts` : ''}
                </div>
              </div>

              {/* Price target */}
              <div className="flex-1 min-w-0">
                <div className="text-[8px] text-bloomberg-text-muted tracking-widest mb-2">PRICE TARGET</div>
                {fd?.targetLowPrice && fd?.targetHighPrice && fd?.targetMeanPrice ? (() => {
                  const lo   = Number(fd.targetLowPrice);
                  const hi   = Number(fd.targetHighPrice);
                  const mean = Number(fd.targetMeanPrice);
                  const cur  = quote.regularMarketPrice;
                  const range = hi - lo || 1;
                  const meanPct = ((mean - lo) / range) * 100;
                  const curPct  = Math.max(0, Math.min(100, ((cur - lo) / range) * 100));
                  const upside  = (mean / cur - 1) * 100;
                  return (
                    <div>
                      <div className="relative h-2 mb-2" style={{ background: '#002a2a' }}>
                        <div
                          className="absolute top-0 h-full"
                          style={{ background: '#CCA800', opacity: 0.15, left: 0, right: 0 }}
                        />
                        {/* Mean target */}
                        <div
                          className="absolute top-0 h-full w-0.5"
                          style={{ left: `${meanPct}%`, background: '#CCA800' }}
                        />
                        {/* Current price */}
                        <div
                          className="absolute top-0 h-full w-0.5"
                          style={{ left: `${curPct}%`, background: '#ffffff', opacity: 0.5 }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] tabular-nums">
                        <span style={{ color: '#FF3333' }}>L ${fmtNum(lo)}</span>
                        <span style={{ color: '#CCA800' }}>
                          Target ${fmtNum(mean)}{' '}
                          <span style={{ color: upside >= 0 ? '#00FF66' : '#FF3333' }}>
                            ({upside >= 0 ? '+' : ''}{upside.toFixed(1)}%)
                          </span>
                        </span>
                        <span style={{ color: '#00FF66' }}>H ${fmtNum(hi)}</span>
                      </div>
                      <div className="text-[7px] mt-1" style={{ color: '#006262' }}>
                        White line = current price · Orange line = mean target
                      </div>
                    </div>
                  );
                })() : (
                  <span className="text-[9px]" style={{ color: '#006262' }}>No target data available</span>
                )}
              </div>
            </div>

            {/* EPS chart */}
            <div className="text-[8px] font-bold tracking-widest mb-2" style={{ color: '#CCA800' }}>
              QUARTERLY EPS — ACTUAL vs ESTIMATE
            </div>
            {(() => {
              const quarterly = earn?.earningsChart?.quarterly;
              if (!quarterly || quarterly.length === 0) {
                return (
                  <div className="text-[9px] py-4 text-center" style={{ color: '#006262' }}>
                    No earnings data available
                  </div>
                );
              }
              const chartData = quarterly.map((q) => ({
                date: q.date,
                actual: q.actual ?? null,
                estimate: q.estimate ?? null,
                beat: q.actual != null && q.estimate != null ? q.actual >= q.estimate : null,
              }));
              return (
                <>
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="2 4" stroke="#002828" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#007070', fontSize: 8, fontFamily: 'IBM Plex Mono' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#007070', fontSize: 8, fontFamily: 'IBM Plex Mono' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                        />
                        <ReferenceLine y={0} stroke="#004e4e" />
                        <Tooltip
                          contentStyle={{
                            background: '#001c1c',
                            border: '1px solid #003333',
                            fontFamily: 'IBM Plex Mono',
                            fontSize: 9,
                            color: '#ccc',
                          }}
                          formatter={(v: unknown, name: string | undefined) => [
                            `$${Number(v).toFixed(2)}`,
                            name === 'actual' ? 'Actual EPS' : 'Est. EPS',
                          ]}
                        />
                        <Bar dataKey="estimate" name="estimate" fill="#003333" radius={0} />
                        <Bar dataKey="actual" name="actual" radius={0}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.beat === null ? '#009090' : entry.beat ? '#00FF66' : '#FF3333'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-1 text-[8px]" style={{ color: '#006262' }}>
                    <span>■ <span style={{ color: '#003333' }}>Estimate</span></span>
                    <span style={{ color: '#00FF66' }}>■ Beat</span>
                    <span style={{ color: '#FF3333' }}>■ Miss</span>
                  </div>
                </>
              );
            })()}

            {/* ── Recommendation trend (Finnhub) ── */}
            {recTrend && recTrend.length > 0 && (() => {
              const chartData = [...recTrend].reverse().map((r) => ({
                period: periodLabel(r.period),
                strongBuy: r.strongBuy,
                buy: r.buy,
                hold: r.hold,
                sell: r.sell,
                strongSell: r.strongSell,
              }));
              return (
                <div className="mt-4">
                  <div className="text-[8px] font-bold tracking-widest mb-2" style={{ color: '#CCA800' }}>
                    ANALYST RECOMMENDATION TREND
                  </div>
                  <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="2 4" stroke="#002828" vertical={false} />
                        <XAxis dataKey="period" tick={{ fill: '#007070', fontSize: 8, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#007070', fontSize: 8, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#001c1c', border: '1px solid #003333', fontFamily: 'IBM Plex Mono', fontSize: 9 }}
                        />
                        <Bar dataKey="strongBuy"  stackId="a" fill="#00FF66" name="Strong Buy" />
                        <Bar dataKey="buy"        stackId="a" fill="#00AA44" name="Buy" />
                        <Bar dataKey="hold"       stackId="a" fill="#AA8800" name="Hold" />
                        <Bar dataKey="sell"       stackId="a" fill="#FF6633" name="Sell" />
                        <Bar dataKey="strongSell" stackId="a" fill="#FF3333" name="Strong Sell" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-3 mt-1 text-[8px]">
                    <span style={{ color: '#00FF66' }}>■ Strong Buy</span>
                    <span style={{ color: '#00AA44' }}>■ Buy</span>
                    <span style={{ color: '#AA8800' }}>■ Hold</span>
                    <span style={{ color: '#FF6633' }}>■ Sell</span>
                    <span style={{ color: '#FF3333' }}>■ Strong Sell</span>
                  </div>
                </div>
              );
            })()}

            {/* ── Finnhub EPS surprise history ── */}
            {epsHistory && epsHistory.length > 0 && (() => {
              const rows = [...epsHistory].reverse().slice(-8);
              return (
                <div className="mt-4">
                  <div className="text-[8px] font-bold tracking-widest mb-2" style={{ color: '#CCA800' }}>
                    EPS SURPRISE HISTORY
                  </div>
                  <div className="grid grid-cols-4 gap-px text-[8px] font-bold tracking-wider mb-1" style={{ color: '#006262' }}>
                    <span>PERIOD</span>
                    <span className="text-right">ACTUAL</span>
                    <span className="text-right">EST</span>
                    <span className="text-right">SURPRISE</span>
                  </div>
                  {rows.map((r) => {
                    const beat = r.actual != null && r.estimate != null ? r.actual >= r.estimate : null;
                    const supPct = r.surprisePercent;
                    return (
                      <div key={r.period} className="grid grid-cols-4 gap-px py-[2px] border-b" style={{ borderColor: '#002525' }}>
                        <span className="text-[8px] tabular-nums" style={{ color: '#007070' }}>{r.period}</span>
                        <span className="text-[8px] font-bold tabular-nums text-right" style={{ color: beat === null ? '#009090' : beat ? '#00FF66' : '#FF3333' }}>
                          {r.actual != null ? `$${r.actual.toFixed(2)}` : '—'}
                        </span>
                        <span className="text-[8px] tabular-nums text-right" style={{ color: '#009090' }}>
                          {r.estimate != null ? `$${r.estimate.toFixed(2)}` : '—'}
                        </span>
                        <span className="text-[8px] font-bold tabular-nums text-right" style={{ color: beat === null ? '#009090' : beat ? '#00FF66' : '#FF3333' }}>
                          {supPct != null ? `${supPct >= 0 ? '+' : ''}${supPct.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════ PROFILE ════ */}
        {tab === 'PROFILE' && (
          <div>
            <div className="grid grid-cols-2 gap-x-6 mb-3">
              <div>
                <SectionHeader title="COMPANY INFO" />
                <StatRow label="Sector"    value={ap?.sector    ? String(ap.sector)    : '—'} />
                <StatRow label="Industry"  value={ap?.industry  ? String(ap.industry)  : '—'} />
                <StatRow label="Country"   value={ap?.country   ? String(ap.country)   : '—'} />
                <StatRow label="Employees" value={ap?.fullTimeEmployees ? Number(ap.fullTimeEmployees).toLocaleString() : '—'} />
              </div>
              <div>
                <SectionHeader title="CONTACT" />
                <StatRow label="City"  value={ap?.city  ? String(ap.city)  : '—'} />
                <StatRow label="State" value={ap?.state ? String(ap.state) : '—'} />
                {ap?.website ? (
                  <div className="flex justify-between items-center py-[3px] border-b" style={{ borderColor: '#002525' }}>
                    <span className="text-[9px] tracking-wide" style={{ color: '#007070' }}>Website</span>
                    <span className="text-[9px] font-bold" style={{ color: '#CCA800' }}>
                      {String(ap.website).replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {ap?.longBusinessSummary ? (
              <div>
                <SectionHeader title="DESCRIPTION" />
                <p className="text-[9px] leading-relaxed mt-1" style={{ color: '#009090' }}>
                  {String(ap.longBusinessSummary)}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {tab === 'INSIDER' && (
          <InsiderTransactions symbol={quote.symbol} />
        )}

        {tab === 'OPTIONS' && (
          <OptionsChain symbol={quote.symbol} />
        )}
      </div>
    </div>
  );
}
