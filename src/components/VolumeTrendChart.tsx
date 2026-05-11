import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExpenseItem } from '../types';
import { aggregateExpenseTrend } from '../utils/calculations';

interface VolumeTrendChartProps {
  expenses: ExpenseItem[];
  locale?: string;
  title: string;
  subtitle: string;
  noDataLabel: string;
  formatter: Intl.NumberFormat;
}

export function VolumeTrendChart({
  expenses,
  locale = 'en-IN',
  title,
  subtitle,
  noDataLabel,
  formatter,
}: VolumeTrendChartProps) {
  const trendData = useMemo(() => aggregateExpenseTrend(expenses, 7, locale), [expenses, locale]);
  const maxValue = Math.max(...trendData.map((point) => point.amount), 0);

  return (
    <div className="dark-card rounded-2xl px-5 py-4">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-[0.24em] text-white/90">{title}</p>
        <p className="mt-1 text-sm text-white/85">{subtitle}</p>
      </div>

      {maxValue <= 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/85">{noDataLabel}</div>
      ) : (
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(226,232,240,0.9)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(226,232,240,0.9)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(value) => formatter.format(Number(value || 0))}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(34,211,238,0.4)', strokeWidth: 1 }}
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value) => formatter.format(Number(value ?? 0))}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#22d3ee"
                strokeWidth={2.5}
                fill="url(#volumeArea)"
                activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
