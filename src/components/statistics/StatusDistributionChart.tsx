import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  Tooltip,
} from "recharts"
import type { StatusCounts } from "@/hooks/useStatistics"
import type { Status } from "@/types"
import { statusLabels } from "@/components/status-icons"

interface StatusDistributionChartProps {
  counts: StatusCounts
}

// Hex values matching the app's status badge colors
const STATUS_CHART_COLORS: Record<Status, string> = {
  in_library:  "#64748b", // slate-500
  backlog:     "#9333ea", // purple-600
  in_progress: "#3b82f6", // blue-500
  completed:   "#16a34a", // green-600
  paused:      "#ca8a04", // yellow-600
  dropped:     "#dc2626", // red-600
  revisiting:  "#22d3ee", // cyan-400 (matches the teal badge)
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-background border border-border rounded-lg shadow-md px-3 py-2 text-sm">
      <span className="font-medium">{name}:</span> <span>{value}</span>
    </div>
  )
}

export function StatusDistributionChart({ counts }: StatusDistributionChartProps) {
  const data = (
    [
      { status: "completed" as Status,   name: statusLabels["completed"],   value: counts.completed },
      { status: "in_progress" as Status, name: statusLabels["in_progress"], value: counts.in_progress },
      { status: "backlog" as Status,     name: statusLabels["backlog"],      value: counts.backlog },
      { status: "in_library" as Status,  name: statusLabels["in_library"],   value: counts.in_library },
      { status: "paused" as Status,      name: statusLabels["paused"],       value: counts.paused },
      { status: "revisiting" as Status,  name: statusLabels["revisiting"],   value: counts.revisiting },
      { status: "dropped" as Status,     name: statusLabels["dropped"],      value: counts.dropped },
    ] as { status: Status; name: string; value: number }[]
  )
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  const barHeight = 32
  const chartHeight = data.length * barHeight + 16

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
          barCategoryGap="25%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "currentColor" }}
            width={88}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "currentColor", opacity: 0.04 }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            animationBegin={0}
            animationDuration={600}
            maxBarSize={20}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 12, fill: "currentColor", opacity: 0.7 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
