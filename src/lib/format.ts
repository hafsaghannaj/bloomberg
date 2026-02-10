import numeral from 'numeral';
import { format } from 'date-fns';

export function formatPrice(value: number, currency = 'USD'): string {
  if (currency === 'JPY') return numeral(value).format('0,0');
  return numeral(value).format('0,0.00');
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${numeral(value).format('0,0.00')}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${numeral(value / 100).format('0.00%')}`;
}

export function formatVolume(value: number): string {
  return numeral(value).format('0.00a').toUpperCase();
}

export function formatMarketCap(value: number): string {
  return numeral(value).format('$0.00a').toUpperCase();
}

export function formatNumber(value: number): string {
  return numeral(value).format('0,0.00');
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'MMM dd, yyyy');
}

export function formatTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'HH:mm');
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'MMM dd HH:mm');
}

export function formatClockTime(date: Date): string {
  return format(date, 'HH:mm:ss');
}
