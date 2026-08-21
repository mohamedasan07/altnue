import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import styles from './OrdersTrendChart.module.css'

/**
 * Orders-per-month bar chart (Sprint 22.6) — the `orders` count from the
 * dashboard salesOverview buckets. Counts include every order placed in the
 * month (revenue exclusion rules do not apply to order counts — the revenue
 * chart carries those semantics).
 */

function resolveToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const count = payload[0].value
  return (
    <div className={styles.tooltip} role="presentation">
      <span className={styles.tooltipLabel}>{label}</span>
      <span className={styles.tooltipValue}>
        {count} {count === 1 ? 'order' : 'orders'}
      </span>
    </div>
  )
}

function OrdersTrendChart({ data = [] }) {
  const theme = useMemo(
    () => ({
      primary: resolveToken('--color-primary'),
      border: resolveToken('--color-border'),
      muted: resolveToken('--color-text-muted'),
    }),
    [],
  )

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.border}
            vertical={false}
          />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.muted, fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
            tick={{ fill: theme.muted, fontSize: 12 }}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              fill: theme.primary,
              fillOpacity: 0.06,
            }}
          />

          <Bar
            dataKey="orders"
            fill={theme.primary}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default OrdersTrendChart
