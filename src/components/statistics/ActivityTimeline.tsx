import { useMemo } from "react"
import { Link } from "react-router-dom"
import { format, isToday, isYesterday, differenceInDays } from "date-fns"
import { IconDeviceGamepad2, IconBook } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { statusLabels, statusColors } from "@/components/status-icons"
import type { ActivityLogEntry, FullItem, Status } from "@/types"

interface ActivityTimelineProps {
  activity: ActivityLogEntry[]
  items: FullItem[]
}

interface TimelineEvent {
  id: string
  item: FullItem | null
  to_status: Status
  occurred_at: string
}

interface MonthGroup {
  month: string
  events: TimelineEvent[]
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return `Today · ${format(date, "h:mm a")}`
  if (isYesterday(date)) return `Yesterday · ${format(date, "h:mm a")}`
  if (differenceInDays(new Date(), date) < 7) return format(date, "EEE · h:mm a")
  return format(date, "MMM d, yyyy · h:mm a")
}

function TimelineCard({ event }: { event: TimelineEvent }) {
  const item = event.item
  if (!item) return null

  return (
    <Link
      to={`/item/${item.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors min-w-0"
    >
      <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-muted">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            {item.media_type === "game" ? (
              <IconDeviceGamepad2 className="h-5 w-5" />
            ) : (
              <IconBook className="h-5 w-5" />
            )}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1",
            statusColors[event.to_status],
          )}
        >
          {statusLabels[event.to_status]}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(event.occurred_at)}</p>
      </div>
    </Link>
  )
}

export function ActivityTimeline({ activity, items }: ActivityTimelineProps) {
  const itemMap = useMemo(() => {
    const map = new Map<string, FullItem>()
    for (const item of items) map.set(item.id, item)
    return map
  }, [items])

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (activity.length === 0) return []

    const events: TimelineEvent[] = activity.map((entry) => ({
      id: entry.id,
      item: itemMap.get(entry.item_id) ?? null,
      to_status: entry.to_status,
      occurred_at: entry.occurred_at,
    }))

    // Group by month (newest first)
    const grouped = new Map<string, TimelineEvent[]>()
    for (const event of events) {
      const monthKey = format(new Date(event.occurred_at), "MMMM yyyy")
      if (!grouped.has(monthKey)) grouped.set(monthKey, [])
      grouped.get(monthKey)!.push(event)
    }

    return Array.from(grouped.entries()).map(([month, evts]) => ({ month, events: evts }))
  }, [activity, itemMap])

  if (monthGroups.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">No activity yet</div>
    )
  }

  return (
    <div>
      {/* Mobile layout (vertical, left-border timeline) */}
      <div className="md:hidden space-y-6">
        {monthGroups.map((group) => (
          <div key={group.month}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.month}
            </h3>
            <div className="border-l-2 border-border pl-4 space-y-3">
              {group.events.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                  <TimelineCard event={event} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop layout (alternating left/right) */}
      <div className="hidden md:block">
        {monthGroups.map((group) => (
          <div key={group.month} className="mb-8">
            {/* Month header spanning center */}
            <div className="relative flex justify-center mb-4">
              <div className="relative z-10 bg-background px-4 py-1 rounded-full border text-sm font-semibold text-muted-foreground">
                {group.month}
              </div>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
            </div>

            {/* Events grid */}
            <div className="relative">
              {/* Center vertical line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

              {group.events.map((event, idx) => {
                const isLeft = idx % 2 === 0
                return (
                  <div
                    key={event.id}
                    className="grid grid-cols-[1fr_32px_1fr] items-start mb-4"
                  >
                    {/* Left column */}
                    <div className={cn("pr-6", !isLeft && "invisible pointer-events-none")}>
                      {isLeft && (
                        <div className="flex justify-end">
                          <div className="w-full max-w-xs">
                            <TimelineCard event={event} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Center dot */}
                    <div className="flex justify-center pt-4">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-background z-10 relative" />
                    </div>

                    {/* Right column */}
                    <div className={cn("pl-6", isLeft && "invisible pointer-events-none")}>
                      {!isLeft && (
                        <div className="w-full max-w-xs">
                          <TimelineCard event={event} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
