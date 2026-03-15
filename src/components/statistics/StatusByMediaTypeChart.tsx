import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { Status } from "@/types"
import { statusLabels, mediaTypeColors } from "@/components/status-icons"

interface StatusByMediaTypeChartProps {
  data: { status: Status; games: number; books: number }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg shadow-md px-3 py-2 text-sm space-y-1">
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex justify-center gap-5 pt-1">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function StatusByMediaTypeChart({ data }: StatusByMediaTypeChartProps) {
  const filtered = data.filter((d) => d.games + d.books > 0)

  if (filtered.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  const chartData = filtered.map((d) => ({
    ...d,
    name: statusLabels[d.status] ?? d.status,
  }))

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="30%"
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "currentColor", opacity: 0.04 }}
          />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="games"
            name="Games"
            fill={mediaTypeColors.game}
            radius={[3, 3, 0, 0]}
            animationBegin={0}
            animationDuration={600}
            maxBarSize={28}
          />
          <Bar
            dataKey="books"
            name="Books"
            fill={mediaTypeColors.book}
            radius={[3, 3, 0, 0]}
            animationBegin={0}
            animationDuration={600}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
