import { useEffect, useState, useMemo } from "react";
import {
  IconPlus,
  IconLayoutGrid,
  IconTable,
  IconArrowsUpDown,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { useShelfStore } from "@/store/useShelfStore";
import { useLists } from "@/hooks/useLists";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { ListCard } from "@/components/lists/ListCard";
import { ListTableRow } from "@/components/lists/ListTableRow";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { List } from "@/types";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

type SortField = "name" | "item_count" | "created_at";
type SortDir = "asc" | "desc";
type ViewMode = "poster" | "table";

function sortLists(lists: List[], field: SortField, dir: SortDir): List[] {
  return [...lists].sort((a, b) => {
    let cmp = 0;
    if (field === "name") cmp = a.name.localeCompare(b.name);
    else if (field === "item_count")
      cmp = (a.item_count ?? 0) - (b.item_count ?? 0);
    else if (field === "created_at")
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function Lists() {
  const { lists } = useShelfStore();
  const { fetchLists } = useLists();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(
    !useShelfStore.getState().lists.length,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("poster");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetchLists().finally(() => setLoading(false));
  }, [fetchLists]);

  const sorted = useMemo(
    () => sortLists(lists, sortField, sortDir),
    [lists, sortField, sortDir],
  );

  const SortControl = (
    <NativeSelect
      value={sortField}
      onValueChange={(v) => setSortField(v as SortField)}
      icon={<IconArrowsUpDown />}
      wrapperClassName="w-full"
    >
      <option value="name">Name</option>
      <option value="item_count">Item Count</option>
      <option value="created_at">Date Created</option>
    </NativeSelect>
  );

  const SortDirControl = (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
    >
      <IconArrowsUpDown
        className={cn(
          "h-4 w-4 transition-transform",
          sortDir === "desc" && "rotate-180",
        )}
      />
      {sortDir === "asc" ? "Ascending" : "Descending"}
    </Button>
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pt-6 sm:pb-6 pb-2 border-b">
        <div className="flex items-center justify-between gap-2 py-3">
          <h1 className="text-3xl font-bold tracking-tight shrink-0">Lists</h1>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Mobile filter sheet */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <IconAdjustmentsHorizontal className="h-4 w-4 mr-2" />
                  Sort
                </SheetTrigger>
                <SheetContent side="bottom" className="px-4 pb-8">
                  <SheetHeader className="text-left mb-4">
                    <SheetTitle>Sort</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-3">
                    {SortControl}
                    {SortDirControl}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop controls */}
            <div className="hidden md:flex items-center">
              <NativeSelect
                value={sortField}
                onValueChange={(v) => setSortField(v as SortField)}
                icon={<IconArrowsUpDown />}
                wrapperClassName="w-[160px]"
                className="!border-r-0"
              >
                <option value="name">Name</option>
                <option value="item_count">Item Count</option>
                <option value="created_at">Date Created</option>
              </NativeSelect>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                <IconArrowsUpDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    sortDir === "desc" && "rotate-180",
                  )}
                />
              </Button>
            </div>

            <SegmentedControl
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              items={[
                {
                  value: "poster",
                  icon: IconLayoutGrid,
                  ariaLabel: "Grid View",
                },
                { value: "table", icon: IconTable, ariaLabel: "Table View" },
              ]}
              className="bg-background"
              listClassName="!p-0 !gap-0 !h-11"
              triggerClassName="!w-11 !h-11 px-0"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 bg-[#f5f5f5] dark:bg-[#171717]">
        {loading ? (
          <LoadingState />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No lists yet"
            description="Create lists to organize your collection by theme, genre, or reading challenge."
            className="h-64 border-2 border-dashed rounded-lg bg-muted/10"
            titleClassName="mb-2"
            descriptionClassName="mb-4 max-w-sm"
            action={<CreateListDialog />}
          />
        ) : viewMode === "poster" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sorted.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="border-2 border-dashed bg-muted/10 text-left transition-colors hover:bg-muted/20"
              aria-label="Add new list"
              title="Add new list"
            >
              <div className="aspect-square w-full flex items-center justify-center">
                <EmptyState
                  icon={<IconPlus className="h-10 w-10" />}
                  title="Add New List"
                  className="h-full px-3"
                  titleClassName="text-base"
                />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((list) => (
              <ListTableRow key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>

      <CreateListDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
