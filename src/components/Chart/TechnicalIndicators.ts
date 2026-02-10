import { ChartDataPoint } from '@/types';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateSMA(data: ChartDataPoint[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export function calculateEMA(data: ChartDataPoint[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

export function calculateRSI(data: ChartDataPoint[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  if (gains.length < period) return result;

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: 100 - 100 / (1 + rs) });

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: data[i + 1].time, value: 100 - 100 / (1 + currentRs) });
  }

  return result;
}

export function calculateMACD(
  data: ChartDataPoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // Align by time
  const slowStartTime = slowEMA[0]?.time;
  const alignedFast = fastEMA.filter((p) => p.time >= slowStartTime);

  const macdLine: IndicatorPoint[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    const fastVal = alignedFast[i];
    if (!fastVal) continue;
    macdLine.push({
      time: slowEMA[i].time,
      value: fastVal.value - slowEMA[i].value,
    });
  }

  if (macdLine.length < signalPeriod) return [];

  // Signal line is EMA of MACD
  const multiplier = 2 / (signalPeriod + 1);
  let signalEma = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b.value, 0) / signalPeriod;

  const result: MACDPoint[] = [];
  result.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal: signalEma,
    histogram: macdLine[signalPeriod - 1].value - signalEma,
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signalEma = (macdLine[i].value - signalEma) * multiplier + signalEma;
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: signalEma,
      histogram: macdLine[i].value - signalEma,
    });
  }

  return result;
}

export function calculateBollingerBands(
  data: ChartDataPoint[],
  period = 20,
  stdDevMultiplier = 2
): { time: number; upper: number; middle: number; lower: number }[] {
  const result: { time: number; upper: number; middle: number; lower: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const middle = sum / period;

    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      sumSquares += Math.pow(data[i - j].close - middle, 2);
    }
    const stdDev = Math.sqrt(sumSquares / period);

    result.push({
      time: data[i].time,
      upper: middle + stdDev * stdDevMultiplier,
      middle,
      lower: middle - stdDev * stdDevMultiplier,
    });
  }

  return result;
}
