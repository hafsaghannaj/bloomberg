'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  data: { value: number }[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color, height = 30 }: Props) {
  if (!data || data.length === 0) return null;

  const isPositive = data[data.length - 1].value >= data[0].value;
  const lineColor = color || (isPositive ? '#00FF66' : '#FF3333');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
