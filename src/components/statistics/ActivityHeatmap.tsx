import { useMemo } from "react"
import { subDays, startOfWeek, addDays, format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { HeatmapData } from "@/hooks/useStatistics"
import { cn } from "@/lib/utils"

interface ActivityHeatmapProps {
  data: HeatmapData
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Generate calendar grid data
  const calendarData = useMemo(() => {
    const today = new Date()
    // Start 52 weeks ago
    const startDate = startOfWeek(subDays(today, 364))
    
    const weeks = []
    let currentWeek = []
    
    // Generate 53 weeks to cover full year
    for (let i = 0; i < 371; i++) {
      const date = addDays(startDate, i)
      const dateStr = format(date, "yyyy-MM-dd")
      const count = data[dateStr] || 0
      
      currentWeek.push({ date, dateStr, count })
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    
    return weeks
  }, [data])

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted"
    if (count === 1) return "bg-primary/20"
    if (count <= 3) return "bg-primary/40"
    if (count <= 5) return "bg-primary/60"
    return "bg-primary"
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-1 min-w-max">
        {calendarData.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1">
            {week.map((day) => (
              <TooltipProvider key={day.dateStr}>
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        "w-3 h-3 rounded-[2px]",
                        getIntensityClass(day.count)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <span className="font-semibold">{day.count} items</span> on {format(day.date, "MMM d, yyyy")}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-end items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-[2px] bg-muted" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/20" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
          <div className="w-3 h-3 rounded-[2px] bg-primary/60" />
          <div className="w-3 h-3 rounded-[2px] bg-primary" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
