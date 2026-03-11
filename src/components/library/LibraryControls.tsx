import type { ReactNode } from "react"
import { IconSearch, IconFilter, IconArrowsUpDown, IconLayoutGrid, IconTable, IconAdjustmentsHorizontal, IconPlus } from "@tabler/icons-react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { NativeSelect } from "@/components/ui/native-select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useShelfStore } from "@/store/useShelfStore"
import { cn } from "@/lib/utils"
import type { Status, SortField } from "@/types"

import { statusIcons, statusLabels } from "@/components/status-icons"

const sortLabels: Record<string, string> = {
  title: "Title",
  rating: "My Rating",
  progress: "Progress",
  started_at: "Date Started",
  completed_at: "Date Completed",
  created_at: "Date Added",
}

interface LibraryControlsProps {
  mediaType?: "game" | "book"
  hideSearch?: boolean
  title?: ReactNode
  addHref?: string
}

export function LibraryControls({ mediaType, hideSearch, title, addHref }: LibraryControlsProps) {
  const {
    filters,
    sort,
    viewMode,
    setFilters,
    setSort,
    setViewMode
  } = useShelfStore()

  const StatusFilter = (
    <NativeSelect
      value={filters.status}
      onValueChange={(value) => setFilters({ status: value as Status | "all" })}
      icon={<IconFilter />}
      wrapperClassName="w-full"
    >
      <option value="all">All Status</option>
      {Object.keys(statusLabels).filter(s => s !== "all").map((status) => (
        <option key={status} value={status}>{statusLabels[status]}</option>
      ))}
    </NativeSelect>
  )

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
  )

  const SortDirection = (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={() => setSort({ direction: sort.direction === "asc" ? "desc" : "asc" })}
    >
      <IconArrowsUpDown className={`h-4 w-4 transition-transform ${sort.direction === "desc" ? "rotate-180" : ""}`} />
      {sort.direction === "asc" ? "Ascending" : "Descending"}
    </Button>
  )

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-2">
        {title && (
          <h1 className="text-3xl font-bold tracking-tight capitalize shrink-0">{title}</h1>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
        {/* Mobile: single "Filter & Sort" sheet */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "outline" }))}>
              <IconAdjustmentsHorizontal className="h-4 w-4 mr-2" />
              Filter & Sort
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8">
              <SheetHeader className="text-left mb-4">
                <SheetTitle>Filter & Sort</SheetTitle>
              </SheetHeader>
              <div className="space-y-3">
                {StatusFilter}
                {SortControl}
                {SortDirection}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: inline controls */}
        <div className="hidden md:flex items-center gap-2">
          <NativeSelect
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value as Status | "all" })}
            icon={<IconFilter />}
            wrapperClassName="w-[160px]"
          >
            <option value="all">All Status</option>
            {Object.keys(statusLabels).filter(s => s !== "all").map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={sort.field}
            onValueChange={(value) => setSort({ field: value as SortField })}
            icon={<IconArrowsUpDown />}
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
            onClick={() => setSort({ direction: sort.direction === "asc" ? "desc" : "asc" })}
            title={sort.direction === "asc" ? "Ascending" : "Descending"}
          >
            <IconArrowsUpDown className={`h-4 w-4 transition-transform ${sort.direction === "desc" ? "rotate-180" : ""}`} />
          </Button>

          <div className="w-px h-9 bg-border mx-1" />

          {addHref && (
            <Link to={addHref}>
              <Button size="sm">
                <IconPlus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </Link>
          )}
        </div>

        <SegmentedControl
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "poster" | "table")}
          items={[
            { value: "poster", icon: IconLayoutGrid, ariaLabel: "Poster View" },
            { value: "table", icon: IconTable, ariaLabel: "Table View" },
          ]}
          className="bg-background shadow-sm"
          triggerClassName="w-9 px-0"
        />
        </div>{/* end controls */}
      </div>{/* end title+controls row */}

      {/* Search in header is desktop-only; mobile search lives in scrolling content */}
      {!hideSearch && (
        <div className="relative hidden md:block w-full sm:w-72">
          <IconSearch className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${mediaType ? mediaType + "s" : "shelf"}...`}
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
