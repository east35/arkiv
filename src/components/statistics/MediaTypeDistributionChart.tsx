import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts"
import type { DistributionBucket } from "@/hooks/useStatistics"
import { mediaTypeColors } from "@/components/status-icons"

interface MediaTypeDistributionChartProps {
  data: DistributionBucket[]
}

const COLORS = [mediaTypeColors.game, mediaTypeColors.book]

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-background border border-border rounded-lg shadow-md px-3 py-2 text-sm">
      <span className="font-medium">{name}:</span>{" "}
      <span>{value}</span>
    </div>
  )
}

export function MediaTypeDistributionChart({ data }: MediaTypeDistributionChartProps) {
  const filtered = data.filter((d) => d.count > 0)
  const total = filtered.reduce((s, d) => s + d.count, 0)

  if (filtered.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              dataKey="count"
              nameKey="label"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={700}
            >
              {filtered.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null
                  const { cx, cy } = viewBox as { cx: number; cy: number }
                  return (
                    <text x={cx} y={cy} textAnchor="middle">
                      <tspan
                        x={cx}
                        dy="-0.3em"
                        fontSize="26"
                        fontWeight="700"
                        fill="currentColor"
                      >
                        {total}
                      </tspan>
                      <tspan
                        x={cx}
                        dy="1.5em"
                        fontSize="11"
                        fill="currentColor"
                        opacity="0.5"
                      >
                        total
                      </tspan>
                    </text>
                  )
                }}
                position="center"
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend */}
      <div className="flex justify-center gap-5">
        {filtered.map((entry, i) => (
          <div key={entry.label} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-muted-foreground">{entry.label}</span>
            <span className="font-semibold">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
