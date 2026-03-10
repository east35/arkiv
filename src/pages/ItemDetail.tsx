import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { format } from "date-fns"
import {
  IconArrowLeft,
  IconCalendar,
  IconBook,
  IconDeviceGamepad2,
  IconTrash,
  IconLoader2,
  IconSearchOff,
  IconPlaylistAdd,
} from "@tabler/icons-react"

import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { useLists } from "@/hooks/useLists"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ManageListsDialog } from "@/components/lists/ManageListsDialog"
import { cn } from "@/lib/utils"
import type { FullItem } from "@/types"
import { statusIcons, statusColors } from "@/components/status-icons"

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, lists } = useShelfStore()
  const { fetchItems, deleteItem } = useItems()
  const { fetchItemMemberships, fetchLists } = useLists()

  const [item, setItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isManageListsOpen, setIsManageListsOpen] = useState(false)
  const [itemListIds, setItemListIds] = useState<string[]>([])

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

  // Fetch list memberships for this item
  useEffect(() => {
    if (!id) return
    if (lists.length === 0) fetchLists().catch(() => {})
    fetchItemMemberships(id).then(memberships => {
      setItemListIds(memberships.map(m => m.list_id))
    }).catch(() => {})
  }, [id, fetchItemMemberships, fetchLists, lists.length])

  const itemLists = lists.filter(l => itemListIds.includes(l.id))

  // Loading state: show spinner while items are being fetched
  if (!item && !items.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 404 state: items loaded but this ID doesn't exist
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <IconSearchOff className="h-12 w-12" />
        <div className="text-center">
          <p className="text-lg font-medium">Item not found</p>
          <p className="text-sm">It may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Shelf
        </Button>
      </div>
    )
  }

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
    <div className="max-w-5xl mx-auto min-h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 px-4 sm:px-6 mb-6 border-b">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Link to={-1 as any} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex"
              onClick={() => setIsManageListsOpen(true)}
            >
              <IconPlaylistAdd className="h-4 w-4 mr-2" />
              Add to List
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="hidden md:flex"
              onClick={handleDelete}
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: title above cover */}
      <h1 className="md:hidden text-3xl font-bold tracking-tight px-4 mb-4 text-center">{item.title}</h1>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 px-4 sm:px-6 pb-32 md:pb-20">

        {/* Left: Cover & Quick Stats */}
        <div className="space-y-6">
          {/* Cover: centered + constrained on mobile, full-width on desktop */}
          <div className="max-w-[180px] mx-auto md:max-w-none rounded-lg overflow-hidden border shadow-sm aspect-[2/3] bg-muted relative">
            <img
              src={coverUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <Badge className={cn("shadow-sm gap-1.5", statusColors[item.status])} variant="outline">
                {statusIcons[item.status]}
                <span className="capitalize font-semibold">{item.status.replace("_", " ")}</span>
              </Badge>
            </div>
          </div>

          {/* Status CTA — desktop only; mobile uses floating bar */}
          <Button
            className="hidden md:flex w-full font-semibold gap-2"
            size="lg"
            onClick={() => setIsSheetOpen(true)}
          >
            {statusIcons[item.status]}
            {item.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Button>

          <div className="space-y-4">
            {/* Score */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Score</div>
              <div className="text-3xl font-bold flex items-baseline gap-1">
                {item.user_score ? (
                  <span className="font-medium">{item.user_score}</span>
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
            <h1 className="hidden md:block text-4xl font-bold tracking-tight mb-2">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {isGame ? <IconDeviceGamepad2 className="h-4 w-4" /> : <IconBook className="h-4 w-4" />}
                {isGame ? item.game.developer : item.book.author}
              </span>
              
              {(isGame ? item.game.release_date : item.book.publish_date) && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="flex items-center gap-1.5">
                    <IconCalendar className="h-4 w-4" />
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
                  <p className="whitespace-pre-line font-serif">{item.description}</p>
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

              {itemLists.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Lists</h3>
                  <div className="flex flex-col gap-2">
                    {itemLists.map(list => (
                      <Link
                        key={list.id}
                        to={`/lists/${list.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="h-10 w-14 rounded overflow-hidden bg-muted shrink-0">
                          {(() => {
                            const coverId = list.cover_item_id || list.first_item_id
                            const coverItem = coverId ? items.find(i => i.id === coverId) : null
                            return coverItem?.cover_url ? (
                              <img src={coverItem.cover_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-lg font-bold text-muted-foreground/40">
                                {list.name.charAt(0)}
                              </div>
                            )
                          })()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{list.name}</p>
                          {list.description && (
                            <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              {item.notes ? (
                <div className="bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap font-serif">
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

      {/* Mobile floating action bar — above bottom nav */}
      <div
        className="md:hidden fixed left-0 right-0 z-40 flex items-center gap-3 px-4"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        <Button
          className="flex-1 h-12 font-semibold text-base gap-2 rounded-full"
          onClick={() => setIsSheetOpen(true)}
        >
          {statusIcons[item.status]}
          {item.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full shrink-0"
          onClick={() => setIsManageListsOpen(true)}
        >
          <IconPlaylistAdd className="h-5 w-5" />
        </Button>
      </div>

      <StatusSheet
        item={item}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      {item && (
        <ManageListsDialog
          itemId={item.id}
          open={isManageListsOpen}
          onOpenChange={setIsManageListsOpen}
        />
      )}
    </div>
  )
}
