import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { StatusCounts } from "@/hooks/useStatistics"
import type { Status } from "@/types"

interface StatusDistributionChartProps {
  counts: StatusCounts
}

const COLORS: Record<Status, string> = {
  in_library: "#94a3b8", // slate-400
  backlog: "#64748b", // slate-500
  in_progress: "#3b82f6", // blue-500
  completed: "#22c55e", // green-500
  paused: "#eab308", // yellow-500
  dropped: "#ef4444", // red-500
}

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // Hide label for small slices

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function StatusDistributionChart({ counts }: StatusDistributionChartProps) {
  const data = [
    { name: "Backlog", value: counts.backlog, status: "backlog" as Status },
    { name: "In Progress", value: counts.in_progress, status: "in_progress" as Status },
    { name: "Completed", value: counts.completed, status: "completed" as Status },
    { name: "Paused", value: counts.paused, status: "paused" as Status },
    { name: "Dropped", value: counts.dropped, status: "dropped" as Status },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data</div>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
