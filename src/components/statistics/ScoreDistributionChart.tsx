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
import type { ScoreByMediaTypeBucket } from "@/hooks/useStatistics"
import { mediaTypeColors } from "@/components/status-icons"

interface ScoreDistributionChartProps {
  data: ScoreByMediaTypeBucket[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg shadow-md px-3 py-2 text-sm space-y-1">
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
        Score {label}
      </p>
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

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  if (data.every((d) => d.games === 0 && d.books === 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No scores yet
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            dataKey="label"
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
