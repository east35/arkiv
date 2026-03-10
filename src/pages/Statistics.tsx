import { useEffect, useState } from "react"
import { subDays, subYears, format } from "date-fns"
import { IconCalendar, IconTrophy, IconStar, IconBolt, IconLoader2 } from "@tabler/icons-react"

import { useStatistics } from "@/hooks/useStatistics"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/statistics/StatCard"
import { ActivityHeatmap } from "@/components/statistics/ActivityHeatmap"
import { StatusDistributionChart } from "@/components/statistics/StatusDistributionChart"
import { ScoreDistributionChart } from "@/components/statistics/ScoreDistributionChart"
import { TopRatedList } from "@/components/statistics/TopRatedList"

type DateRangeOption = "all" | "year" | "90days" | "30days"

export default function Statistics() {
  const { computeStatistics, stats } = useStatistics()
  const { items } = useShelfStore()
  const { fetchItems } = useItems()
  const [range, setRange] = useState<DateRangeOption>("all")

  // Ensure items are loaded
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Recompute stats when items or range changes
  useEffect(() => {
    let dateRange = undefined
    const today = new Date()
    const todayStr = format(today, "yyyy-MM-dd")

    if (range === "year") {
      dateRange = { 
        start: format(subYears(today, 1), "yyyy-MM-dd"), 
        end: todayStr 
      }
    } else if (range === "90days") {
      dateRange = { 
        start: format(subDays(today, 90), "yyyy-MM-dd"), 
        end: todayStr 
      }
    } else if (range === "30days") {
      dateRange = { 
        start: format(subDays(today, 30), "yyyy-MM-dd"), 
        end: todayStr 
      }
    }

    computeStatistics(dateRange)
  }, [computeStatistics, items, range])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (stats.statusCounts.total === 0) {
    return (
      <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Statistics</h1>
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
          <IconTrophy className="h-10 w-10 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">No stats available</p>
          <p className="text-sm">Add items to your shelf to see your statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Insights into your reading and gaming habits.
          </p>
        </div>
        
        <Select value={range} onValueChange={(v) => setRange(v as DateRangeOption)}>
          <SelectTrigger className="w-[180px]">
            <IconCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:mx-0 sm:px-0 space-y-6 pb-8">
        
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Completed"
            value={stats.completedCount}
            icon={IconTrophy}
            description="Total items finished"
          />
          <StatCard
            title="Avg Score"
            value={stats.averageScore ?? "-"}
            icon={IconStar}
            description="Across all rated items"
          />
          <StatCard
            title="Current Streak"
            value={stats.currentStreak}
            icon={IconBolt}
            description="Consecutive days active"
          />
          <StatCard
            title="Most Active"
            value={stats.mostActiveDate?.count ?? "-"}
            icon={IconCalendar}
            description={stats.mostActiveDate 
              ? format(new Date(stats.mostActiveDate.date), "MMM d, yyyy")
              : "No activity yet"
            }
          />
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>
              {stats.totalActivity} total log entries in the last year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={stats.heatmapData} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* Status Distribution */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDistributionChart counts={stats.statusCounts} />
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreDistributionChart data={stats.scoreDistribution} />
            </CardContent>
          </Card>
        </div>

        {/* Top Rated */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Top Rated</CardTitle>
              <CardDescription>Your highest scored favorites</CardDescription>
            </CardHeader>
            <CardContent>
              <TopRatedList items={stats.topRated} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
