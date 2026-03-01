'use client';

import { useState, useMemo } from 'react';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { Calendar, RefreshCw } from 'lucide-react';

type Impact = 'all' | 'high' | 'medium' | 'low';

const IMPACT_CONFIG = {
  high:   { color: '#FF3333', label: 'HIGH' },
  medium: { color: '#CCA800', label: 'MED' },
  low:    { color: '#006262', label: 'LOW' },
};

function parseEventDate(timeStr: string): Date {
  // "2026-03-01 13:30:00"
  return new Date(timeStr.replace(' ', 'T') + 'Z');
}

function fmtDate(d: Date): string {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,'0')}`;
}

function fmtTime(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2,'0');
  const m = String(d.getUTCMinutes()).padStart(2,'0');
  return `${h}:${m} ET`;
}

function fmtVal(v: number | null, unit: string): string {
  if (v == null) return '—';
  const s = unit === '%' || unit === '' ? v.toFixed(1) : v.toLocaleString();
  return `${s}${unit === '%' ? '%' : unit ? ' ' + unit : ''}`;
}

export default function EconomicCalendarView() {
  const [impactFilter, setImpactFilter] = useState<Impact>('all');
  const [countryFilter, setCountryFilter] = useState<string>('US');
  const { data, isLoading, refetch, dataUpdatedAt } = useEconomicCalendar();

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((e) => impactFilter === 'all' || e.impact === impactFilter)
      .filter((e) => !countryFilter || e.country === countryFilter)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data, impactFilter, countryFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const key = e.time.split(' ')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="h-full flex flex-col bg-bloomberg-bg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={12} /> Economic Calendar
        </span>
        <div className="flex items-center gap-3">
          {/* Country filter */}
          <div className="flex gap-px">
            {['US', 'EU', 'UK', 'JP'].map((c) => (
              <button
                key={c}
                onClick={() => setCountryFilter(countryFilter === c ? '' : c)}
                className="px-2 py-0.5 text-[9px] font-bold rounded transition-colors"
                style={{
                  background: countryFilter === c ? '#CCA800' : 'transparent',
                  color: countryFilter === c ? '#001616' : '#006262',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-bloomberg-border" />
          {/* Impact filter */}
          <div className="flex gap-px">
            {(['all', 'high', 'medium', 'low'] as Impact[]).map((f) => (
              <button
                key={f}
                onClick={() => setImpactFilter(f)}
                className="px-2 py-0.5 text-[9px] font-bold rounded capitalize transition-colors"
                style={{
                  background: impactFilter === f ? (f === 'all' ? '#CCA800' : IMPACT_CONFIG[f as keyof typeof IMPACT_CONFIG]?.color ?? '#CCA800') : 'transparent',
                  color: impactFilter === f ? '#001616' : '#006262',
                }}
              >
                {f === 'all' ? 'ALL' : IMPACT_CONFIG[f as keyof typeof IMPACT_CONFIG]?.label}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} className="text-bloomberg-text-muted hover:text-bloomberg-orange">
            <RefreshCw size={10} />
          </button>
          {updatedLabel && <span className="text-bloomberg-text-muted text-[9px]">{updatedLabel}</span>}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 bg-bloomberg-border/20 rounded animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="h-full flex items-center justify-center text-bloomberg-text-muted text-xs">
            No events match current filter
          </div>
        ) : (
          grouped.map(([dateKey, events]) => {
            const d = new Date(dateKey + 'T12:00:00Z');
            return (
              <div key={dateKey}>
                {/* Date header */}
                <div
                  className="px-3 py-1.5 text-[10px] font-bold tracking-widest border-b border-bloomberg-border sticky top-0 z-10"
                  style={{ background: '#001f1f', color: '#CCA800' }}
                >
                  {fmtDate(d)}
                </div>

                {/* Events for this date */}
                {events.map((e, i) => {
                  const impCfg = IMPACT_CONFIG[e.impact];
                  const evDate = parseEventDate(e.time);
                  const hasActual = e.actual != null;
                  const beat = hasActual && e.estimate != null && e.actual! > e.estimate;
                  const miss = hasActual && e.estimate != null && e.actual! < e.estimate;

                  return (
                    <div
                      key={i}
                      className="grid gap-x-3 px-3 py-2 border-b border-bloomberg-border/30 hover:bg-bloomberg-bg-hover"
                      style={{
                        gridTemplateColumns: '48px 40px 1fr 80px 80px 80px',
                        borderLeft: `2px solid ${impCfg.color}44`,
                      }}
                    >
                      {/* Time */}
                      <span className="text-[9px] text-bloomberg-text-muted tabular-nums self-center">
                        {fmtTime(evDate)}
                      </span>

                      {/* Impact */}
                      <span
                        className="text-[8px] font-bold self-center"
                        style={{ color: impCfg.color }}
                      >
                        ● {impCfg.label}
                      </span>

                      {/* Event name */}
                      <div className="self-center min-w-0">
                        <div className="text-[10px] text-bloomberg-text-secondary font-medium truncate">
                          {e.event}
                        </div>
                        <div className="text-[8px] text-bloomberg-text-muted">{e.country}</div>
                      </div>

                      {/* Actual */}
                      <div className="text-right self-center">
                        <div className="text-[8px] text-bloomberg-text-muted">ACTUAL</div>
                        <div
                          className="text-[10px] font-bold tabular-nums"
                          style={{
                            color: hasActual
                              ? beat ? '#00FF66' : miss ? '#FF3333' : '#CCCCCC'
                              : '#003d3d',
                          }}
                        >
                          {fmtVal(e.actual, e.unit)}
                          {beat && ' ▲'}
                          {miss && ' ▼'}
                        </div>
                      </div>

                      {/* Estimate */}
                      <div className="text-right self-center">
                        <div className="text-[8px] text-bloomberg-text-muted">FORECAST</div>
                        <div className="text-[10px] text-bloomberg-text-secondary tabular-nums">
                          {fmtVal(e.estimate, e.unit)}
                        </div>
                      </div>

                      {/* Previous */}
                      <div className="text-right self-center">
                        <div className="text-[8px] text-bloomberg-text-muted">PREV</div>
                        <div className="text-[10px] text-bloomberg-text-muted tabular-nums">
                          {fmtVal(e.prev, e.unit)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-bloomberg-border px-3 py-1 shrink-0 flex items-center justify-between text-[9px] text-bloomberg-text-muted">
        <span>{filtered.length} events</span>
        <div className="flex items-center gap-3">
          {(['high','medium','low'] as const).map((imp) => (
            <span key={imp} className="flex items-center gap-1">
              <span style={{ color: IMPACT_CONFIG[imp].color }}>●</span>
              {IMPACT_CONFIG[imp].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
