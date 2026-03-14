import { useEffect, useState } from "react"
import {
  subDays,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns"
import { IconCalendar, IconTrophy, IconStar, IconBolt } from "@tabler/icons-react"

import { useStatistics } from "@/hooks/useStatistics"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { NativeSelect } from "@/components/ui/native-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { StatCard } from "@/components/statistics/StatCard"
import { ActivityHeatmap } from "@/components/statistics/ActivityHeatmap"
import { StatusDistributionChart } from "@/components/statistics/StatusDistributionChart"
import { MediaTypeDistributionChart } from "@/components/statistics/MediaTypeDistributionChart"
import { StatusByMediaTypeChart } from "@/components/statistics/StatusByMediaTypeChart"
import { ScoreDistributionChart } from "@/components/statistics/ScoreDistributionChart"
import { ActivityTimeline } from "@/components/statistics/ActivityTimeline"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

type PresetRange =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "7days"
  | "30days"
  | "90days"
  | "year"


function presetToDateRange(preset: PresetRange): { start: string; end: string } | undefined {
  const today = new Date()
  const fmt = (d: Date) => format(d, "yyyy-MM-dd")

  switch (preset) {
    case "all":
      return undefined
    case "today":
      return { start: fmt(today), end: fmt(today) }
    case "yesterday": {
      const y = subDays(today, 1)
      return { start: fmt(y), end: fmt(y) }
    }
    case "this_week":
      return { start: fmt(startOfWeek(today, { weekStartsOn: 1 })), end: fmt(today) }
    case "last_week": {
      const lastMon = startOfWeek(subDays(today, 7), { weekStartsOn: 1 })
      return { start: fmt(lastMon), end: fmt(endOfWeek(lastMon, { weekStartsOn: 1 })) }
    }
    case "this_month":
      return { start: fmt(startOfMonth(today)), end: fmt(today) }
    case "last_month": {
      const lm = subMonths(today, 1)
      return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)) }
    }
    case "7days":
      return { start: fmt(subDays(today, 7)), end: fmt(today) }
    case "30days":
      return { start: fmt(subDays(today, 30)), end: fmt(today) }
    case "90days":
      return { start: fmt(subDays(today, 90)), end: fmt(today) }
    case "year":
      return { start: fmt(subYears(today, 1)), end: fmt(today) }
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface StatisticsDashboardProps {
  embedded?: boolean
}

export function StatisticsDashboard({ embedded = false }: StatisticsDashboardProps) {
  const { computeStatistics, stats } = useStatistics()
  const { items } = useShelfStore()
  const { fetchItems } = useItems()

  // Date range state
  const [rangeTab, setRangeTab] = useState<"preset" | "custom">("preset")
  const [preset, setPreset] = useState<PresetRange>("all")
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)
  // The active range actually applied to stats
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | undefined>(
    undefined,
  )

  // Ensure items are loaded
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Recompute when items or preset changes
  useEffect(() => {
    if (rangeTab === "preset") {
      computeStatistics(presetToDateRange(preset))
    }
  }, [computeStatistics, items, preset, rangeTab])

  // Recompute when custom range is applied
  useEffect(() => {
    if (rangeTab === "custom" && appliedRange) {
      computeStatistics(appliedRange)
    }
  }, [computeStatistics, appliedRange, rangeTab])

  function handleApplyCustom() {
    if (!customStart || !customEnd) return
    setAppliedRange({
      start: format(customStart, "yyyy-MM-dd"),
      end: format(customEnd, "yyyy-MM-dd"),
    })
  }

  // Loading skeleton
  if (!stats) {
    return <LoadingState className="h-full" />
  }

  // Empty state
  if (stats.statusCounts.total === 0) {
    return (
      <div className="flex flex-col gap-4">
        {!embedded && (
          <div className="border-b px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          </div>
        )}
        <EmptyState
          title="No stats available"
          description="Add items to your library to see your statistics."
          icon={<IconTrophy className="h-10 w-10" />}
          className={embedded ? "h-64" : "flex-1 px-4"}
        />
      </div>
    )
  }

  const rangeControls = (
    <Tabs
      value={rangeTab}
      onValueChange={(v) => setRangeTab(v as "preset" | "custom")}
      className={embedded ? "w-full" : "w-full sm:w-auto"}
    >
      <TabsList>
        <TabsTrigger value="preset">Preset</TabsTrigger>
        <TabsTrigger value="custom">Custom</TabsTrigger>
      </TabsList>

      <TabsContent value="preset" className="mt-2">
        <NativeSelect
          value={preset}
          onValueChange={(v) => setPreset(v as PresetRange)}
          icon={<IconCalendar />}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">Last Year</option>
        </NativeSelect>
      </TabsContent>

      <TabsContent value="custom" className="mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker date={customStart} setDate={setCustomStart} className="w-36 h-11" />
          <span className="text-muted-foreground text-sm">to</span>
          <DatePicker date={customEnd} setDate={setCustomEnd} className="w-36 h-11" />
          <Button
            size="default"
            className="h-11"
            onClick={handleApplyCustom}
            disabled={!customStart || !customEnd}
          >
            Apply
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )

  return (
    <div className={embedded ? "space-y-6" : "flex flex-col h-full overflow-hidden"}>
      {!embedded ? (
        <div className="bg-background px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
            {rangeControls}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Choose a date range for your metrics.</CardDescription>
          </CardHeader>
          <CardContent>{rangeControls}</CardContent>
        </Card>
      )}

      <div className={embedded ? "space-y-6 pb-2" : "flex-1 overflow-y-auto px-4 sm:px-6 space-y-6 py-6 pb-8"}>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Completed"
            value={stats.completedCount}
            icon={IconTrophy}
            description={`of ${stats.statusCounts.total} total`}
          />
          <StatCard
            title="Avg Score"
            value={stats.averageScore != null ? `${stats.averageScore} / 10` : "–"}
            icon={IconStar}
            description="Across all rated items"
          />
          <StatCard
            title="Most Active"
            value={stats.mostActiveDayOfWeek?.day ?? "–"}
            icon={IconCalendar}
            description={
              stats.mostActiveDayOfWeek
                ? `${stats.mostActiveDayOfWeek.percent}% of activity`
                : "No activity yet"
            }
          />
          <StatCard
            title="Current Streak"
            value={`${stats.currentStreak} days`}
            icon={IconBolt}
            description={`Longest: ${stats.longestStreak} days`}
          />
        </div>

        {/* Activity Heatmap */}
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

        {/* Media Type + Status Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Media Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaTypeDistributionChart data={stats.mediaTypeCounts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDistributionChart counts={stats.statusCounts} />
            </CardContent>
          </Card>
        </div>

        {/* Status by Media Type */}
        <Card>
          <CardHeader>
            <CardTitle>Status by Media Type</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusByMediaTypeChart data={stats.statusByMediaType} />
          </CardContent>
        </Card>

        {/* Score Distribution by Media Type */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={stats.scoreDistributionByMediaType} />
          </CardContent>
        </Card>


        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Your status changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activity={stats.rawActivity} items={items} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default function Statistics() {
  return <StatisticsDashboard />
}
