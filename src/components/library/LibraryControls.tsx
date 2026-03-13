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
import type { Status, SortDirection, SortField, ViewMode } from "@/types";

import { statusLabels } from "@/components/status-icons";

const STATUS_OPTIONS: Status[] = [
  "in_library",
  "backlog",
  "in_progress",
  "paused",
  "completed",
  "dropped",
];

const DEFAULT_SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "rating", label: "My Rating" },
  { value: "progress", label: "Progress" },
  { value: "started_at", label: "Date Started" },
  { value: "completed_at", label: "Date Completed" },
];

interface LibraryControlsProps {
  mediaType?: "game" | "book";
  hideSearch?: boolean;
  title?: ReactNode;
  statusFilterMode?: "single" | "multi";
  selectedStatuses?: Status[];
  onSelectedStatusesChange?: (statuses: Status[]) => void;
  hideStatusFilter?: boolean;
  sortOptions?: Array<{ value: string; label: string }>;
  sortValue?: string;
  onSortValueChange?: (value: string) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
  viewModeValue?: ViewMode;
  onViewModeValueChange?: (mode: ViewMode) => void;
}

interface LibraryMobileFilterSheetProps {
  statusFilterMode?: "single" | "multi";
  selectedStatuses?: Status[];
  onSelectedStatusesChange?: (statuses: Status[]) => void;
  hideStatusFilter?: boolean;
  sortOptions?: Array<{ value: string; label: string }>;
  sortValue?: string;
  onSortValueChange?: (value: string) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
}

export function LibraryMobileFilterSheet({
  statusFilterMode = "single",
  selectedStatuses,
  onSelectedStatusesChange,
  hideStatusFilter = false,
  sortOptions,
  sortValue,
  onSortValueChange,
  sortDirection,
  onSortDirectionChange,
}: LibraryMobileFilterSheetProps) {
  const { filters, sort, setFilters, setSort } = useShelfStore();

  const activeSortValue = sortValue ?? sort.field;
  const activeSortDirection = sortDirection ?? sort.direction;
  const activeSortOptions = sortOptions ?? DEFAULT_SORT_OPTIONS;

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

  const handleSortValueChange = (value: string) => {
    if (onSortValueChange) {
      onSortValueChange(value);
      return;
    }
    setSort({ field: value as SortField });
  };

  const handleSortDirectionToggle = () => {
    const nextDirection: SortDirection =
      activeSortDirection === "asc" ? "desc" : "asc";
    if (onSortDirectionChange) {
      onSortDirectionChange(nextDirection);
      return;
    }
    setSort({ direction: nextDirection });
  };

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

  const SortControl = (
    <NativeSelect
      value={activeSortValue}
      onValueChange={handleSortValueChange}
      icon={<IconArrowsUpDown />}
      wrapperClassName="w-full"
    >
      {activeSortOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );

  const SortDirectionButton = (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={handleSortDirectionToggle}
    >
      <IconArrowsUpDown
        className={`h-4 w-4 transition-transform ${activeSortDirection === "desc" ? "rotate-180" : ""}`}
      />
      {activeSortDirection === "asc" ? "Ascending" : "Descending"}
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger className="h-11 w-11 inline-flex items-center justify-center bg-[#F1F1F1] hover:bg-[#D5D5D5] dark:bg-[#171717] dark:hover:bg-[#252525] transition-colors">
        <IconAdjustmentsHorizontal className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="bottom" className="px-4 pb-8">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>
            {isMultiStatus
              ? "Customize Homepage"
              : hideStatusFilter
                ? "Sort & View"
                : "Filter & Sort"}
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
          ) : !hideStatusFilter ? (
            StatusFilter
          ) : null}
          {SortControl}
          {SortDirectionButton}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LibraryControls({
  mediaType: _mediaType,
  hideSearch: _hideSearch,
  title,
  statusFilterMode = "single",
  selectedStatuses,
  onSelectedStatusesChange,
  hideStatusFilter = false,
  sortOptions,
  sortValue,
  onSortValueChange,
  sortDirection,
  onSortDirectionChange,
  viewModeValue,
  onViewModeValueChange,
}: LibraryControlsProps) {
  const { filters, sort, viewMode, setFilters, setSort, setViewMode } =
    useShelfStore();

  const activeSortValue = sortValue ?? sort.field;
  const activeSortDirection = sortDirection ?? sort.direction;
  const activeViewMode = viewModeValue ?? viewMode;
  const activeSortOptions = sortOptions ?? DEFAULT_SORT_OPTIONS;

  const handleSortValueChange = (value: string) => {
    if (onSortValueChange) {
      onSortValueChange(value);
      return;
    }
    setSort({ field: value as SortField });
  };

  const handleSortDirectionToggle = () => {
    const nextDirection: SortDirection =
      activeSortDirection === "asc" ? "desc" : "asc";
    if (onSortDirectionChange) {
      onSortDirectionChange(nextDirection);
      return;
    }
    setSort({ direction: nextDirection });
  };

  const handleViewModeChange = (value: string) => {
    const nextMode = value as ViewMode;
    if (onViewModeValueChange) {
      onViewModeValueChange(nextMode);
      return;
    }
    setViewMode(nextMode);
  };

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

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-2">
        {title && (
          <h1 className="text-3xl font-bold tracking-tight capitalize shrink-0">
            {title}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Mobile: Filter & Sort sheet — always in title row */}
          <div className="md:hidden">
            <LibraryMobileFilterSheet
              statusFilterMode={statusFilterMode}
              selectedStatuses={selectedStatuses}
              onSelectedStatusesChange={onSelectedStatusesChange}
              hideStatusFilter={hideStatusFilter}
              sortOptions={sortOptions}
              sortValue={sortValue}
              onSortValueChange={onSortValueChange}
              sortDirection={sortDirection}
              onSortDirectionChange={onSortDirectionChange}
            />
          </div>

          {/* Desktop: inline controls */}
          <div className="hidden md:flex items-center">
            {isMultiStatus ? (
              <Dialog>
                <DialogTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "justify-between min-w-[220px] h-11 min-h-[44px] bg-[#F1F1F1] hover:bg-[#D5D5D5] dark:bg-[#171717] dark:hover:bg-[#252525] border-0",
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
                            onCheckedChange={() => {
                              if (
                                !isMultiStatus ||
                                !selectedStatuses ||
                                !onSelectedStatusesChange
                              )
                                return;
                              if (selectedStatuses.includes(status)) {
                                if (selectedStatuses.length === 1) {
                                  toast.info(
                                    "At least one status must stay selected on Home.",
                                  );
                                  return;
                                }
                                onSelectedStatusesChange(
                                  selectedStatuses.filter((s) => s !== status),
                                );
                                return;
                              }
                              onSelectedStatusesChange([
                                ...selectedStatuses,
                                status,
                              ]);
                            }}
                            aria-label={statusLabels[status]}
                          />
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            ) : !hideStatusFilter ? (
              <NativeSelect
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ status: value as Status | "all" })
                }
                icon={<IconFilter />}
                wrapperClassName="w-[160px]"
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
            ) : null}

            <NativeSelect
              value={activeSortValue}
              onValueChange={handleSortValueChange}
              icon={<IconArrowsUpDown />}
            >
              {activeSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSortDirectionToggle}
              title={activeSortDirection === "asc" ? "Ascending" : "Descending"}
              className="h-11 w-11 !border-0 bg-[#F1F1F1] hover:bg-[#D5D5D5] dark:bg-[#171717] dark:hover:bg-[#252525]"
            >
              <IconArrowsUpDown
                className={`h-4 w-4 transition-transform ${activeSortDirection === "desc" ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          <SegmentedControl
            value={activeViewMode}
            onValueChange={handleViewModeChange}
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
            listClassName="!p-0 !gap-0 !h-11 bg-[#F1F1F1] dark:bg-[#171717] !border-0"
            triggerClassName="!w-11 !h-11 px-0"
          />
        </div>
        {/* end controls */}
      </div>
      {/* end title+controls row */}
    </div>
  );
}
