import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import {
  IconSearchOff,
  IconArrowLeft,
  IconArrowNarrowLeft,
  IconFlag,
  IconEdit,
  IconPencil,
  IconPlaylist,
  IconUser,
  IconCalendar,
  IconStack2,
  IconDeviceGamepad2,
  IconBookmark,
  IconInfoCircle,
  IconList,
  IconStarFilled,
} from "@tabler/icons-react"

import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { useLists } from "@/hooks/useLists"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ManageListsDialog } from "@/components/lists/ManageListsDialog"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import type { FullItem, Status } from "@/types"
import { statusIcons } from "@/components/status-icons"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils"

import { SegmentedControl } from "@/components/ui/segmented-control"
import { ItemDetailHeader } from "@/components/item-detail/ItemDetailHeader"
import { ItemDetailSidebar } from "@/components/item-detail/ItemDetailSidebar"
import { ItemDetailContent } from "@/components/item-detail/ItemDetailContent"
import { MobileAccordion, AccordionSection } from "@/components/item-detail/MobileAccordion"
import { NotesPanel } from "@/components/item-detail/NotesPanel"
import { RecommendationsRow } from "@/components/item-detail/RecommendationsRow"

/* ── Status colour map (matches PosterItem STATUS_BAR) ── */
const statusBg: Record<Status, string> = {
  in_collection: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backLabel: string = (location.state as any)?.backLabel ?? null
  const { items, lists, preferences } = useShelfStore()
  const { fetchItems } = useItems()
  const { fetchItemMemberships, fetchLists } = useLists()

  const [item, setItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isManageListsOpen, setIsManageListsOpen] = useState(false)
  const [itemListIds, setItemListIds] = useState<string[]>([])
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<"overview" | "notes">("overview")
  const [scrollbarW, setScrollbarW] = useState(0)

  // Track scrollbar width of the main scroll container so the Notes tab can dodge it
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("main.app-scroll-area")
    if (!el) return
    const measure = () => setScrollbarW(el.offsetWidth - el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Find item in store or fetch
  useEffect(() => {
    if (!id) return
    const found = items.find(i => i.id === id)
    if (found) {
      setItem(found)
    } else {
      fetchItems().then(allItems => {
        const fresh = allItems.find(i => i.id === id)
        if (fresh) setItem(fresh)
      })
    }
  }, [id, items, fetchItems])

  // Fetch list memberships
  useEffect(() => {
    if (!id) return
    if (lists.length === 0) fetchLists().catch(() => {})
    fetchItemMemberships(id).then(memberships => {
      setItemListIds(memberships.map(m => m.list_id))
    }).catch(() => {})
  }, [id, fetchItemMemberships, fetchLists, lists.length])

  const itemLists = lists.filter(l => itemListIds.includes(l.id))

  /* ── Loading / 404 ── */
  if (!item && !items.length) return <LoadingState className="h-full" />

  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been deleted or the link is invalid."
        icon={<IconSearchOff className="h-12 w-12" />}
        className="h-full"
        action={
          <Button variant="outline" onClick={() => navigate("/")}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Collection
          </Button>
        }
      />
    )
  }

  const isGame = item.media_type === "game"
  const coverUrl = item.cover_url || (isGame
    ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif")

  /* Build mobile metadata segments (pipe-separated) */
  const mobileMeta: { icon: React.ComponentType<{ className?: string }>; text: string }[] = []
  if (isGame) {
    if (item.game.developer) mobileMeta.push({ icon: IconUser, text: item.game.developer })
  } else {
    if (item.book.author) mobileMeta.push({ icon: IconUser, text: item.book.author })
  }
  const dateStr = isGame ? item.game.release_date : item.book.publish_date
  if (dateStr) mobileMeta.push({ icon: IconCalendar, text: String(new Date(dateStr).getFullYear()) })
  if (isGame && item.game.collection) mobileMeta.push({ icon: IconStack2, text: item.game.collection })
  if (!isGame && item.book.series_name) mobileMeta.push({ icon: IconStack2, text: item.book.series_name })
  if (isGame && item.game.platforms.length > 0) mobileMeta.push({ icon: IconDeviceGamepad2, text: item.game.platforms[0] })

  return (
    <>
      <div className="flex-1 relative bg-background">
        {/* ═══════════════ Sticky Header ═══════════════ */}
        <ItemDetailHeader
          item={item}
          backLabel={backLabel}
          onStatusClick={() => setIsSheetOpen(true)}
        />

        {/* ═══════════════ Desktop Layout ═══════════════ */}
        <div className="hidden md:block">
          <div className="max-w-5xl mx-auto grid grid-cols-[280px_1fr] pb-20">
            {/* Left column — sidebar */}
            <ItemDetailSidebar
              item={item}
              preferences={preferences}
              onEditClick={() => setIsSheetOpen(true)}
            />

            {/* Right column — content */}
            <ItemDetailContent
              item={item}
              itemLists={itemLists}
            />
          </div>

          {/* Floating "Notes" tab — fixed to right viewport edge */}
          <button
            onClick={() => setIsNotesOpen(true)}
            className="fixed top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white pl-3 pr-6 py-2.5 rounded-l-lg shadow-lg transition-all duration-150"
            style={{ right: scrollbarW }}
          >
            <IconArrowNarrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold">Notes</span>
          </button>
        </div>

        {/* ═══════════════ Mobile Layout ═══════════════ */}
        <div className="md:hidden pb-40">
          {/* Cover — centered, large */}
          <div className="flex justify-center px-8 pt-4">
            <div className="w-[200px] aspect-[2/3] overflow-hidden rounded-lg">
              <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Title + metadata — centered */}
          <div className="text-center px-6 pt-5 pb-2">
            <h1 className="text-2xl font-bold tracking-tight mb-2">{item.title}</h1>
            {mobileMeta.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {mobileMeta.map((m, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <m.icon className="h-3.5 w-3.5 shrink-0" />
                    {m.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tab content */}
          {mobileTab === "overview" ? (
            <div className="pt-4">
              <MobileAccordion>
                {/* Your Details */}
                <AccordionSection title="Your Details" icon={IconBookmark}>
                  <div className="space-y-4 px-1 pb-3 pt-1">
                    {/* Progress */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Progress</div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {isGame
                            ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
                            : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`}
                        </span>
                        {item.status === "completed" && (
                          <IconFlag className="h-5 w-5 text-green-500 fill-green-500" />
                        )}
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="flex items-center justify-between py-2 border-t text-sm">
                      <span className="text-muted-foreground">Platform</span>
                      <span className="flex items-center gap-2 font-medium">
                        {isGame ? (item.game.platforms[0] || "—") : (item.book.format || "Digital")}
                        <IconPencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-4 py-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase mb-0.5">Your Score</div>
                        <div className="text-2xl font-bold">
                          {item.user_score ? (
                            <>{item.user_score}<span className="text-sm text-muted-foreground font-normal">/10</span></>
                          ) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase mb-0.5">Community Score</div>
                        <div className="text-2xl font-bold">
                          {item.source_score ? (
                            <>{Math.round(item.source_score / 10)}<span className="text-sm text-muted-foreground font-normal">/10</span></>
                          ) : "—"}
                        </div>
                        {item.source_votes != null && item.source_votes > 0 && (
                          <div className="text-xs text-muted-foreground">{item.source_votes.toLocaleString()} Votes</div>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="divide-y text-sm">
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Added</span>
                        <span>{formatDateTime(item.created_at, preferences?.date_format, preferences?.time_format)}</span>
                      </div>
                      {item.started_at && (
                        <div className="flex justify-between py-2">
                          <span className="text-muted-foreground">Started</span>
                          <span>{formatDateTime(item.started_at, preferences?.date_format, preferences?.time_format)}</span>
                        </div>
                      )}
                      {item.completed_at && (
                        <div className="flex justify-between py-2">
                          <span className="text-muted-foreground">Completed</span>
                          <span>{formatDateTime(item.completed_at, preferences?.date_format, preferences?.time_format)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionSection>

                {/* Game / Book Details */}
                <AccordionSection title={isGame ? "Game Details" : "Book Details"} icon={IconInfoCircle}>
                  <div className="space-y-4 px-1 pb-3 pt-1">
                    {item.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {item.description}
                      </p>
                    )}
                    {item.genres.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Genres</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.genres.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
                        </div>
                      </div>
                    )}
                    {isGame && item.game.themes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Themes</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.game.themes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>

                {/* Lists */}
                <AccordionSection title="Lists" icon={IconList}>
                  <div className="space-y-2 px-1 pb-3 pt-1">
                    {itemLists.length > 0 ? (
                      itemLists.map(list => (
                        <div key={list.id} className="flex items-center gap-3 p-3 bg-card border rounded-md">
                          <div className="h-8 w-8 rounded bg-secondary/50 flex items-center justify-center shrink-0">
                            <IconPlaylist className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{list.name}</span>
                            <span className="text-xs text-muted-foreground">{list.item_count ? `${list.item_count} Items` : ""}</span>
                          </div>
                          <Link
                            to={`/lists/${list.id}`}
                            className="text-xs font-medium px-3 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            View List
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Not in any lists.
                        <Button variant="link" onClick={() => setIsManageListsOpen(true)} className="px-1 h-auto">Add to list</Button>
                      </div>
                    )}
                  </div>
                </AccordionSection>

                {/* Recommendations (games only) */}
                {isGame && item.game.similar_games && item.game.similar_games.length > 0 && (
                  <AccordionSection title="Recommendations" icon={IconStarFilled}>
                    <div className="pb-3 pt-1">
                      <RecommendationsRow item={item} />
                    </div>
                  </AccordionSection>
                )}
              </MobileAccordion>
            </div>
          ) : (
            /* Notes tab content */
            <div className="px-4 pt-6">
              {item.notes ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground bg-card p-4 rounded-lg border">
                  {item.notes}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border-2 border-dashed rounded-lg">
                  <div className="text-muted-foreground text-sm">No notes yet</div>
                  <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)}>
                    Add a note
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════ Mobile Bottom Bar ═══════════════ */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-background">
          {/* Status bar — full-width, status colour */}
          <button
            onClick={() => setIsSheetOpen(true)}
            className={cn(
              "w-full h-[55px] flex items-center justify-between px-4 text-sm font-semibold",
              statusBg[item.status]
            )}
          >
            <span className="flex items-center gap-2">
              {item.status === "completed" ? <IconFlag className="h-4 w-4" /> : statusIcons[item.status]}
              {item.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
            <span className="flex items-center gap-3">
              <span className="h-5 w-px bg-white/30" />
              <IconEdit className="h-4 w-4" />
            </span>
          </button>

          {/* Tab bar — reuses SegmentedControl like CollectionTypeSwitcher */}
          <SegmentedControl
            value={mobileTab}
            onValueChange={(v) => setMobileTab(v as "overview" | "notes")}
            items={[
              { value: "overview", label: "Overview", ariaLabel: "Overview" },
              { value: "notes", label: "Notes", ariaLabel: "Notes" },
            ]}
            fullWidth
            listClassName="!p-0 !gap-0 !border-0 !h-[55px]"
            triggerClassName="!h-[55px] font-semibold text-sm text-foreground"
          />
        </div>

        {/* ═══════════════ Sheets / Dialogs ═══════════════ */}
        <StatusSheet item={item} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
        <ManageListsDialog itemId={item.id} open={isManageListsOpen} onOpenChange={setIsManageListsOpen} />
        <NotesPanel
          open={isNotesOpen}
          onOpenChange={setIsNotesOpen}
          notes={item.notes}
          onEditClick={() => {
            setIsNotesOpen(false)
            setIsSheetOpen(true)
          }}
        />
      </div>
    </>
  )
}
