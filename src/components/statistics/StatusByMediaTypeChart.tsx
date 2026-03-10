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

export function StatusByMediaTypeChart({ data }: StatusByMediaTypeChartProps) {
  const filtered = data.filter((d) => d.games + d.books > 0)

  if (filtered.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend />
          <Bar dataKey="games" name="Games" fill={mediaTypeColors.game} radius={[4, 4, 0, 0]} />
          <Bar dataKey="books" name="Books" fill={mediaTypeColors.book} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
