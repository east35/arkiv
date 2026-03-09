import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { PosterItem } from "@/components/library/PosterItem"
import { TableItem } from "@/components/library/TableItem"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LayoutGrid, Table as TableIcon, ArrowUpDown, Search, Loader2 } from "lucide-react"
import type { FullItem } from "@/types"

type SortOption = "recent" | "title" | "progress"

export default function Home() {
  const { items, viewMode, setViewMode } = useShelfStore()
  const { fetchItems } = useItems()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(!items.length)

  // Fetch on mount
  useEffect(() => {
    fetchItems().finally(() => setLoading(false))
  }, [fetchItems])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to external search with the query? 
      // Actually /search page doesn't take query params yet, but I can make it store state or just navigate
      // For now, let's just navigate. The search UI state is local to SearchUI.
      // I should probably make SearchUI read from URL query param if I want this to work seamlessly.
      // But for MVP, let's just navigate to /search and let user type. 
      // Wait, that's annoying. Let's assume the user wants to filter OR search new.
      // "Global search" usually means "Find stuff".
      // If I navigate to /search, they have to type again? No.
      // I'll make SearchUI read from URL search params.
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Filter for In Progress items
  const inProgressItems = items.filter(item => item.status === "in_progress")
  
  // Sort logic
  const sortedItems = [...inProgressItems].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title)
    }
    if (sortBy === "progress") {
      // Normalize progress to percentage if possible, otherwise simple value comparison
      // For MVP, just comparing raw extension values or 0
      const progA = a.media_type === "book" ? (a.book.progress ?? 0) : (a.game.progress_hours ?? 0)
      const progB = b.media_type === "book" ? (b.book.progress ?? 0) : (b.game.progress_hours ?? 0)
      return progB - progA // Descending progress
    }
    // Default: recent
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime()
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime()
    return dateB - dateA
  })

  const handleEdit = (item: FullItem) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      setTimeout(() => setSelectedItem(null), 300)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Home</h1>
            <p className="text-muted-foreground mt-1">
              You are currently playing or reading {sortedItems.length} items.
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for new games & books..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-2">
            {/* Sort Control */}
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "poster" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-r-none h-9 w-9"
                onClick={() => setViewMode("poster")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-l-none h-9 w-9"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <LayoutGrid className="h-10 w-10 mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">Nothing in progress</p>
            <p className="text-sm">Start a new adventure from your backlog!</p>
          </div>
        ) : (
          <>
            {viewMode === "poster" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {sortedItems.map((item) => (
                  <PosterItem key={item.id} item={item} onEdit={handleEdit} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-8">
                {sortedItems.map((item) => (
                  <TableItem key={item.id} item={item} onEdit={handleEdit} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <StatusSheet 
        item={selectedItem} 
        open={isSheetOpen} 
        onOpenChange={handleSheetOpenChange} 
      />
    </div>
  )
}
