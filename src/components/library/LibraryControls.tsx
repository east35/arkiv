import { Search, Filter, ArrowUpDown, LayoutGrid, Table as TableIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useShelfStore } from "@/store/useShelfStore"
import type { Status, Source, SortField } from "@/types"

interface LibraryControlsProps {
  mediaType?: "game" | "book"
  hideSearch?: boolean
}

export function LibraryControls({ mediaType, hideSearch }: LibraryControlsProps) {
  const { 
    filters, 
    sort, 
    viewMode, 
    setFilters, 
    setSort, 
    setViewMode 
  } = useShelfStore()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
      {/* Search */}
      {!hideSearch && (
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${mediaType ? mediaType + "s" : "library"}...`}
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ status: value as Status | "all" })}
        >
          <SelectTrigger className="w-[130px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select
          value={filters.source}
          onValueChange={(value) => setFilters({ source: value as Source | "all" })}
        >
          <SelectTrigger className="w-[130px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="igdb">IGDB</SelectItem>
            <SelectItem value="google_books">Google Books</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sort.field}
          onValueChange={(value) => setSort({ field: value as SortField })}
        >
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="rating">My Rating</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="started_at">Date Started</SelectItem>
            <SelectItem value="completed_at">Date Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Direction Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSort({ direction: sort.direction === "asc" ? "desc" : "asc" })}
          title={sort.direction === "asc" ? "Ascending" : "Descending"}
        >
          <ArrowUpDown className={`h-4 w-4 transition-transform ${sort.direction === "desc" ? "rotate-180" : ""}`} />
        </Button>

        <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "poster" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-r-none h-9 w-9"
            onClick={() => setViewMode("poster")}
            aria-label="Poster View"
            title="Poster View"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-l-none h-9 w-9"
            onClick={() => setViewMode("table")}
            aria-label="Table View"
            title="Table View"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
