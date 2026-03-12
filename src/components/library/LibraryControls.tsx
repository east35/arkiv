import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  IconFilter,
  IconArrowsUpDown,
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconTable,
  IconTableFilled,
  IconAdjustmentsHorizontal,
  IconChevronDown,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useShelfStore } from "@/store/useShelfStore";
import { cn } from "@/lib/utils";
import type { Status, SortField } from "@/types";

import { statusLabels } from "@/components/status-icons";

interface LibraryControlsProps {
  mediaType?: "game" | "book";
  hideSearch?: boolean;
  title?: ReactNode;
  statusFilterMode?: "single" | "multi";
  selectedStatuses?: Status[];
  onSelectedStatusesChange?: (statuses: Status[]) => void;
}

const STATUS_OPTIONS: Status[] = [
  "in_collection",
  "backlog",
  "in_progress",
  "paused",
  "completed",
  "dropped",
];

export function LibraryControls({
  mediaType: _mediaType,
  hideSearch: _hideSearch,
  title,
  statusFilterMode = "single",
  selectedStatuses,
  onSelectedStatusesChange,
}: LibraryControlsProps) {
  const { filters, sort, viewMode, setFilters, setSort, setViewMode } =
    useShelfStore();

  const StatusFilter = (
    <NativeSelect
      value={filters.status}
      onValueChange={(value) => setFilters({ status: value as Status | "all" })}
      icon={<IconFilter />}
      wrapperClassName="w-full"
    >
      <option value="all">All Status</option>
      {Object.keys(statusLabels)
        .filter((s) => s !== "all")
        .map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
    </NativeSelect>
  );

  const isMultiStatus =
    statusFilterMode === "multi" &&
    Array.isArray(selectedStatuses) &&
    !!onSelectedStatusesChange;

  const multiStatusLabel = useMemo(() => {
    if (!isMultiStatus || !selectedStatuses) return "All Status";
    if (selectedStatuses.length === 0) return "No Status";
    if (selectedStatuses.length === STATUS_OPTIONS.length) return "All Status";
    if (selectedStatuses.length === 1) return statusLabels[selectedStatuses[0]];
    return `${selectedStatuses.length} statuses`;
  }, [isMultiStatus, selectedStatuses]);

  const toggleStatus = (status: Status) => {
    if (!isMultiStatus || !selectedStatuses || !onSelectedStatusesChange)
      return;
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length === 1) {
        toast.info("At least one status must stay selected on Home.");
        return;
      }
      onSelectedStatusesChange(selectedStatuses.filter((s) => s !== status));
      return;
    }
    onSelectedStatusesChange([...selectedStatuses, status]);
  };

  const SortControl = (
    <NativeSelect
      value={sort.field}
      onValueChange={(value) => setSort({ field: value as SortField })}
      icon={<IconArrowsUpDown />}
      wrapperClassName="w-full"
    >
      <option value="title">Title</option>
      <option value="rating">My Rating</option>
      <option value="progress">Progress</option>
      <option value="started_at">Date Started</option>
      <option value="completed_at">Date Completed</option>
      <option value="created_at">Date Added</option>
    </NativeSelect>
  );

  const SortDirection = (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={() =>
        setSort({ direction: sort.direction === "asc" ? "desc" : "asc" })
      }
    >
      <IconArrowsUpDown
        className={`h-4 w-4 transition-transform ${sort.direction === "desc" ? "rotate-180" : ""}`}
      />
      {sort.direction === "asc" ? "Ascending" : "Descending"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-2">
        {title && (
          <h1 className="text-3xl font-bold tracking-tight capitalize shrink-0">
            {title}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Mobile: single "Filter & Sort" sheet */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <IconAdjustmentsHorizontal className="h-4 w-4 mr-2" />
                Filter & Sort
              </SheetTrigger>
              <SheetContent side="bottom" className="px-4 pb-8">
                <SheetHeader className="text-left mb-4">
                  <SheetTitle>
                    {isMultiStatus ? "Customize Homepage" : "Filter & Sort"}
                  </SheetTitle>
                  {isMultiStatus && (
                    <p className="text-sm text-muted-foreground">
                      Choose which status types you want to see
                    </p>
                  )}
                </SheetHeader>
                <div className="space-y-3">
                  {isMultiStatus ? (
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((status) => {
                        const checked = selectedStatuses?.includes(status);
                        return (
                          <div
                            key={status}
                            className="flex items-center justify-between border border-border px-3 py-2"
                          >
                            <span className="text-sm font-medium">
                              {statusLabels[status]}
                            </span>
                            <Switch
                              checked={checked}
                              onCheckedChange={() => toggleStatus(status)}
                              aria-label={statusLabels[status]}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    StatusFilter
                  )}
                  {SortControl}
                  {SortDirection}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop: inline controls */}
          <div className="hidden md:flex items-center">
            {isMultiStatus ? (
              <Dialog>
                <DialogTrigger
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "justify-between min-w-[220px] h-11 min-h-[44px] bg-white dark:bg-black border-input border-r-0 hover:bg-white dark:hover:bg-black",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <IconAdjustmentsHorizontal className="h-4 w-4" />
                    {multiStatusLabel}
                  </span>
                  <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Customize Homepage</DialogTitle>
                    <DialogDescription>
                      Choose which status types you want to see
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map((status) => {
                      const checked = selectedStatuses?.includes(status);
                      return (
                        <div
                          key={status}
                          className="flex items-center justify-between border border-border px-3 py-2"
                        >
                          <span className="text-sm font-medium">
                            {statusLabels[status]}
                          </span>
                          <Switch
                            checked={checked}
                            onCheckedChange={() => toggleStatus(status)}
                            aria-label={statusLabels[status]}
                          />
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <NativeSelect
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ status: value as Status | "all" })
                }
                icon={<IconFilter />}
                wrapperClassName="w-[160px]"
                className="!border-r-0"
              >
                <option value="all">All Status</option>
                {Object.keys(statusLabels)
                  .filter((s) => s !== "all")
                  .map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
              </NativeSelect>
            )}

            <NativeSelect
              value={sort.field}
              onValueChange={(value) => setSort({ field: value as SortField })}
              icon={<IconArrowsUpDown />}
              className="!border-r-0"
            >
              <option value="title">Title</option>
              <option value="rating">My Rating</option>
              <option value="progress">Progress</option>
              <option value="started_at">Date Started</option>
              <option value="completed_at">Date Completed</option>
            </NativeSelect>

            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setSort({
                  direction: sort.direction === "asc" ? "desc" : "asc",
                })
              }
              title={sort.direction === "asc" ? "Ascending" : "Descending"}
            >
              <IconArrowsUpDown
                className={`h-4 w-4 transition-transform ${sort.direction === "desc" ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          <SegmentedControl
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "poster" | "table")}
            items={[
              {
                value: "poster",
                icon: IconLayoutGrid,
                activeIcon: IconLayoutGridFilled,
                ariaLabel: "Poster View",
              },
              {
                value: "table",
                icon: IconTable,
                activeIcon: IconTableFilled,
                ariaLabel: "Table View",
              },
            ]}
            className="bg-background"
            listClassName="!p-0 !gap-0 !h-11"
            triggerClassName="!w-11 !h-11 px-0"
          />
        </div>
        {/* end controls */}
      </div>
      {/* end title+controls row */}

    </div>
  );
}
