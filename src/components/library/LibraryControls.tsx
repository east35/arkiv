import type { ReactNode } from "react"
import { IconSearch, IconFilter, IconArrowsUpDown, IconLayoutGrid, IconTable, IconAdjustmentsHorizontal, IconPlus } from "@tabler/icons-react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
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
    <Select
      value={filters.status}
      onValueChange={(value) => setFilters({ status: value as Status | "all" })}
    >
      <SelectTrigger className="w-full">
        <IconFilter className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className="flex flex-1 items-center gap-2 text-left text-sm">
          {filters.status !== "all" && statusIcons[filters.status]}
          {statusLabels[filters.status] ?? "All Status"}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        {Object.entries(statusIcons).map(([status, icon]) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center gap-2">
              {icon}
              <span>{statusLabels[status]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const SortControl = (
    <Select
      value={sort.field}
      onValueChange={(value) => setSort({ field: value as SortField })}
    >
      <SelectTrigger className="w-full">
        <IconArrowsUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className="flex flex-1 text-left text-sm">{sortLabels[sort.field] ?? "Title"}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="title">Title</SelectItem>
        <SelectItem value="rating">My Rating</SelectItem>
        <SelectItem value="progress">Progress</SelectItem>
        <SelectItem value="started_at">Date Started</SelectItem>
        <SelectItem value="completed_at">Date Completed</SelectItem>
        <SelectItem value="created_at">Date Added</SelectItem>
      </SelectContent>
    </Select>
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
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value as Status | "all" })}
          >
            <SelectTrigger className="w-[160px]">
              <IconFilter className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex flex-1 items-center gap-2 text-left text-sm">
                {filters.status !== "all" && statusIcons[filters.status]}
                {statusLabels[filters.status] ?? "All Status"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusIcons).map(([status, icon]) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    {icon}
                    <span>{statusLabels[status]}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort.field}
            onValueChange={(value) => setSort({ field: value as SortField })}
          >
            <SelectTrigger className="w-[150px] h-9">
              <IconArrowsUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex flex-1 text-left text-sm">{sortLabels[sort.field] ?? "Title"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="rating">My Rating</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="started_at">Date Started</SelectItem>
              <SelectItem value="completed_at">Date Completed</SelectItem>
            </SelectContent>
          </Select>

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

        {/* View Toggle — always visible, rounded-[7px] active/hover states */}
        <div className="flex items-center border rounded-[10px] p-0.5 gap-0.5 h-11 bg-background shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-[7px] h-9 w-9",
              viewMode === "poster"
                ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                : "hover:bg-muted hover:rounded-[7px]"
            )}
            onClick={() => setViewMode("poster")}
            aria-label="Poster View"
            title="Poster View"
          >
            <IconLayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-[7px] h-9 w-9",
              viewMode === "table"
                ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                : "hover:bg-muted hover:rounded-[7px]"
            )}
            onClick={() => setViewMode("table")}
            aria-label="Table View"
            title="Table View"
          >
            <IconTable className="h-4 w-4" />
          </Button>
        </div>
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
