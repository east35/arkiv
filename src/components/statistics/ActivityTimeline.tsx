import { useMemo } from "react";
import { format } from "date-fns";
import { IconHistory } from "@tabler/icons-react";
import { PosterItem } from "@/components/library/PosterItem";
import type { FullItem } from "@/types";

interface ActivityTimelineProps {
  items: FullItem[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  const monthGroups = useMemo(() => {
    const events: { item: FullItem; timestamp: string }[] = [];

    for (const item of items) {
      const timestamp =
        item.completed_at ?? item.revisit_started_at ?? item.started_at;
      if (!timestamp) continue;
      events.push({ item, timestamp });
    }

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (events.length === 0) return [];

    const grouped = new Map<string, FullItem[]>();
    for (const { item, timestamp } of events) {
      const key = format(new Date(timestamp), "MMMM yyyy");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    return Array.from(grouped.entries()).map(([month, monthItems]) => ({
      month,
      items: monthItems,
    }));
  }, [items]);

  if (monthGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <IconHistory className="h-8 w-8 opacity-30" />
        <p className="text-sm">No activity in this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {monthGroups.map((group) => (
        <div key={group.month}>
          {/* Month header */}
          <h3 className="pl-4 text-base font-semibold tracking-tight pb-2 mb-3 border-b">
            {group.month}
          </h3>

          {/* Poster grid */}
          <div className="px-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {group.items.map((item) => (
              <PosterItem key={item.id} item={item} onEdit={noop} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
