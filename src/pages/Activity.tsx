import { useEffect } from "react";
import { IconTrophy } from "@tabler/icons-react";

import { useStatistics } from "@/hooks/useStatistics";
import { useShelfStore } from "@/store/useShelfStore";
import { useItems } from "@/hooks/useItems";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetadataCards } from "@/components/statistics/MetadataCards";
import { TasteMap } from "@/components/statistics/TasteMap";
import { StatusDistributionChart } from "@/components/statistics/StatusDistributionChart";
import { MediaTypeDistributionChart } from "@/components/statistics/MediaTypeDistributionChart";
import { StatusByMediaTypeChart } from "@/components/statistics/StatusByMediaTypeChart";
import { ScoreDistributionChart } from "@/components/statistics/ScoreDistributionChart";
import { ActivityTimeline } from "@/components/statistics/ActivityTimeline";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ActivityDashboardProps {
  embedded?: boolean;
}

export function ActivityDashboard({
  embedded = false,
}: ActivityDashboardProps) {
  const { computeStatistics, stats } = useStatistics();
  const { items } = useShelfStore();
  const { fetchItems } = useItems();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, []);

  useEffect(() => {
    computeStatistics();
  }, [computeStatistics, items]);

  // Loading skeleton
  if (!stats) {
    return <LoadingState className="h-full" />;
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {!embedded && (
          <div className="border-b px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          </div>
        )}
        <EmptyState
          title="No activity yet"
          description="Add items to your library to see your activity."
          icon={<IconTrophy className="h-10 w-10" />}
          className={embedded ? "h-64" : "flex-1 px-4"}
        />
      </div>
    );
  }

  return (
    <div
      className={
        embedded ? "space-y-6" : "flex flex-col h-full overflow-hidden"
      }
    >
      {!embedded && (
        <div className="bg-background px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex-shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        </div>
      )}

      <div
        className={
          embedded
            ? "space-y-6 pb-2"
            : "flex-1 overflow-y-auto px-4 sm:px-6 space-y-6 py-6 pb-8"
        }
      >
        <MetadataCards stats={stats} />

        <TasteMap stats={stats} />

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

        <Card>
          <CardHeader>
            <CardTitle>Status by Media Type</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusByMediaTypeChart data={stats.statusByMediaType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={stats.scoreDistributionByMediaType} />
          </CardContent>
        </Card>

        <div>
          <CardHeader className="p-4 bg-background">
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Your status changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-4 bg-background border-b">
              <ActivityTimeline items={items} />
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}

export default function Activity() {
  return <ActivityDashboard />;
}
