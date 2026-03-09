import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { format } from "date-fns"
import { 
  ArrowLeft, 
  Calendar, 
  BookOpen, 
  Gamepad2, 
  MoreHorizontal, 
  Edit,
  Trash2
} from "lucide-react"

import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { FullItem, Status } from "@/types"

const statusColors: Record<Status, string> = {
  backlog: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
  dropped: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items } = useShelfStore()
  const { fetchItems, deleteItem } = useItems()
  
  const [item, setItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Find item in store or fetch
  useEffect(() => {
    if (!id) return
    
    const found = items.find(i => i.id === id)
    if (found) {
      setItem(found)
    } else {
      // If not found (refresh), fetch all
      fetchItems().then(allItems => {
        const fresh = allItems.find(i => i.id === id)
        if (fresh) setItem(fresh)
      })
    }
  }, [id, items, fetchItems])

  // If still loading or not found
  if (!item && !items.length) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!item) return <div className="p-8 text-center text-muted-foreground">Item not found</div>

  const isGame = item.media_type === "game"
  const coverUrl = item.cover_url || (isGame 
    ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png" 
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem(item.id)
      navigate("/")
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to={-1 as any} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Status
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        
        {/* Left: Cover & Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-lg overflow-hidden border shadow-sm aspect-[2/3] bg-muted relative">
            <img 
              src={coverUrl} 
              alt={item.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <Badge className={cn("backdrop-blur-md bg-background/80 shadow-sm", statusColors[item.status])} variant="outline">
                <span className="capitalize font-semibold">{item.status.replace("_", " ")}</span>
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {/* Score */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Score</div>
              <div className="text-3xl font-bold flex items-baseline gap-1">
                {item.user_score ? (
                  <span className="text-primary">{item.user_score}</span>
                ) : (
                  <span className="text-muted-foreground/30">-</span>
                )}
                <span className="text-sm text-muted-foreground font-normal">/ 10</span>
              </div>
            </div>

            {/* Progress */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Progress</div>
              <div className="text-lg font-medium">
                {isGame ? (
                  <>
                    {item.game.progress_hours}h {item.game.progress_minutes}m
                  </>
                ) : (
                  <>
                    {item.book.progress ?? 0} <span className="text-muted-foreground text-sm">/ {item.book.page_count ?? "?"} pages</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details & Tabs */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {isGame ? <Gamepad2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                {isGame ? item.game.developer : item.book.author}
              </span>
              
              {(isGame ? item.game.release_date : item.book.publish_date) && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(isGame ? item.game.release_date! : item.book.publish_date!).getFullYear()}
                  </span>
                </>
              )}

              {isGame && item.game.platforms.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{item.game.platforms[0]}</span>
                  {item.game.platforms.length > 1 && (
                    <Badge variant="secondary" className="text-[10px] h-5 ml-1">+{item.game.platforms.length - 1}</Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              {/* <TabsTrigger value="history">History</TabsTrigger> */}
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              {item.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">{item.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.genres.map(g => (
                      <Badge key={g} variant="secondary">{g}</Badge>
                    ))}
                    {item.genres.length === 0 && <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Dates</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Added</span>
                      <span>{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                    </div>
                    {item.started_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started</span>
                        <span>{format(new Date(item.started_at), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {item.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed</span>
                        <span>{format(new Date(item.completed_at), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              {item.notes ? (
                <div className="bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap">
                  {item.notes}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>No notes yet.</p>
                  <Button variant="link" onClick={() => setIsSheetOpen(true)}>Add a note</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <StatusSheet 
        item={item} 
        open={isSheetOpen} 
        onOpenChange={setIsSheetOpen} 
      />
    </div>
  )
}
