import { useEffect, useState, useMemo } from "react"
import { IconPlus, IconLayoutGrid, IconTable, IconArrowsUpDown, IconAdjustmentsHorizontal } from "@tabler/icons-react"
import { useShelfStore } from "@/store/useShelfStore"
import { useLists } from "@/hooks/useLists"
import { CreateListDialog } from "@/components/lists/CreateListDialog"
import { ListCard } from "@/components/lists/ListCard"
import { ListTableRow } from "@/components/lists/ListTableRow"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { List } from "@/types"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MobileFab } from "@/components/ui/mobile-fab"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"

type SortField = "name" | "item_count" | "created_at"
type SortDir = "asc" | "desc"
type ViewMode = "poster" | "table"

function sortLists(lists: List[], field: SortField, dir: SortDir): List[] {
  return [...lists].sort((a, b) => {
    let cmp = 0
    if (field === "name") cmp = a.name.localeCompare(b.name)
    else if (field === "item_count") cmp = (a.item_count ?? 0) - (b.item_count ?? 0)
    else if (field === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return dir === "asc" ? cmp : -cmp
  })
}

export default function Lists() {
  const { lists } = useShelfStore()
  const { fetchLists } = useLists()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(!useShelfStore.getState().lists.length)
  const [viewMode, setViewMode] = useState<ViewMode>("poster")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  useEffect(() => {
    fetchLists().finally(() => setLoading(false))
  }, [fetchLists])

  const sorted = useMemo(() => sortLists(lists, sortField, sortDir), [lists, sortField, sortDir])

  const SortControl = (
    <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
      <SelectTrigger className="w-full">
        <IconArrowsUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className="flex flex-1 text-left text-sm">
          {{ name: "Name", item_count: "Item Count", created_at: "Date Created" }[sortField]}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="item_count">Item Count</SelectItem>
        <SelectItem value="created_at">Date Created</SelectItem>
      </SelectContent>
    </Select>
  )

  const SortDirControl = (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
    >
      <IconArrowsUpDown className={cn("h-4 w-4 transition-transform", sortDir === "desc" && "rotate-180")} />
      {sortDir === "asc" ? "Ascending" : "Descending"}
    </Button>
  )

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
        <div className="flex items-center justify-between gap-2 py-3">
          <h1 className="text-3xl font-bold tracking-tight shrink-0">Lists</h1>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Mobile filter sheet */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger className={cn(buttonVariants({ variant: "outline" }))}>
                  <IconAdjustmentsHorizontal className="h-4 w-4 mr-2" />
                  Sort
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8">
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
            <div className="hidden md:flex items-center gap-2">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-[160px]">
                  <IconArrowsUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex flex-1 text-left text-sm">
                    {{ name: "Name", item_count: "Item Count", created_at: "Date Created" }[sortField]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="item_count">Item Count</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                <IconArrowsUpDown className={cn("h-4 w-4 transition-transform", sortDir === "desc" && "rotate-180")} />
              </Button>

              <div className="w-px h-8 bg-border mx-1" />

              <Button onClick={() => setDialogOpen(true)}>
                <IconPlus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </div>

            <SegmentedControl
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              items={[
                { value: "poster", icon: IconLayoutGrid, ariaLabel: "Grid View" },
                { value: "table", icon: IconTable, ariaLabel: "Table View" },
              ]}
              triggerClassName="w-9 px-0"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 pb-8">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
            {sorted.map((list) => <ListCard key={list.id} list={list} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-8">
            {sorted.map((list) => <ListTableRow key={list.id} list={list} />)}
          </div>
        )}
      </div>

      <MobileFab
        hiddenClassName="sm:hidden"
        onClick={() => setDialogOpen(true)}
        label="Create list"
        icon={<IconPlus className="h-6 w-6" />}
      />

      <CreateListDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
