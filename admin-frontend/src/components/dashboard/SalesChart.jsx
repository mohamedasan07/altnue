import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import styles from './SalesChart.module.css'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Resolve a design token to a concrete value (SVG attributes cannot use var()). */
function resolveToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className={styles.tooltip} role="presentation">
      <span className={styles.tooltipLabel}>{label}</span>
      <span className={styles.tooltipValue}>
        {inr.format(payload[0].value)}
      </span>
    </div>
  )
}

function SalesChart({ data = [] }) {
  const theme = useMemo(
    () => ({
      primary: resolveToken('--color-primary'),
      primaryHover: resolveToken('--color-primary-hover'),
      border: resolveToken('--color-border'),
      muted: resolveToken('--color-text-muted'),
      surface: resolveToken('--color-surface'),
    }),
    [],
  )

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
            </linearGradient>
          </defs>

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
            width={48}
            tick={{ fill: theme.muted, fontSize: 12 }}
            tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              stroke: theme.primary,
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke={theme.primary}
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            activeDot={{
              r: 5,
              fill: theme.surface,
              stroke: theme.primary,
              strokeWidth: 2,
            }}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SalesChart
