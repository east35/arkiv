import { useEffect, useState } from "react"
import { Link, useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom"
import {
  IconArrowLeft,
  IconPlus,
  IconUser,
  IconCalendar,
  IconStack2,
  IconDeviceGamepad2,
  IconLoader2,
} from "@tabler/icons-react"

import { supabase } from "@/lib/supabase"
import { useCommitItem } from "@/hooks/useCommitItem"
import { useShelfStore } from "@/store/useShelfStore"
import { statusIcons, statusLabels } from "@/components/status-icons"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MediaType, IgdbGameDetails, HardcoverBookDetails, IgdbSearchResult, BookItem, Status } from "@/types"
import { toast } from "sonner"

const GAME_COVER_FALLBACK =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
const BOOK_COVER_FALLBACK =
  "https://books.google.com/googlebooks/images/no_cover_thumb.gif"

const STATUS_BAR: Record<Status, string> = {
  in_library: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
}

/**
 * Detail page for external items not yet in the user's library.
 * Fetches full details from IGDB/Hardcover proxy, displays a read-only
 * detail view, and offers an "Add to Library" action that commits
 * the item then redirects to the real item detail page.
 *
 * Route: /item/external/:mediaType/:externalId
 */
export default function ExternalItemDetail() {
  const { mediaType, externalId } = useParams<{
    mediaType: string
    externalId: string
  }>()
  const navigate = useNavigate()
  const location = useLocation()
  useOutletContext<{ scrolled?: boolean }>()
  const backLabel: string = (location.state as any)?.backLabel ?? null

  const [details, setDetails] = useState<IgdbGameDetails | HardcoverBookDetails | null>(null)
  const [loadedDetailKey, setLoadedDetailKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingRecommendationName, setResolvingRecommendationName] = useState<string | null>(null)
  const { commit, committingId } = useCommitItem()
  const items = useShelfStore((s) => s.items)
  const isCommitting = committingId === Number(externalId)

  const isGame = mediaType === "game"
  const validMediaType = mediaType === "game" || mediaType === "book"
  const detailKey = validMediaType && externalId ? `${mediaType}:${externalId}` : null

  // Fetch details from proxy
  useEffect(() => {
    if (!externalId || !validMediaType) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetails(null)
    setLoadedDetailKey(null)

    const fn = isGame ? "igdb-proxy" : "hardcover-proxy"
    supabase.functions
      .invoke(fn, { body: { action: "details", id: Number(externalId) } })
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return
        if (fetchErr || !data) {
          setError("Could not load details.")
        } else {
          setDetails(data)
          setLoadedDetailKey(detailKey)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load details.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [detailKey, externalId, isGame, validMediaType])

  /** Commit item to library, then navigate to the real detail page */
  const handleAddToLibrary = async () => {
    if (!externalId || !validMediaType) return
    const newItem = await commit(Number(externalId), mediaType as MediaType)
    if (newItem) {
      navigate(`/item/${newItem.id}`, { replace: true, state: { backLabel } })
    }
  }

  const navigateToRecommendation = (gameId: number, backLabelText: string) => {
    const libraryItem = items.find(
      (item) => item.media_type === "game" && item.external_id === String(gameId)
    )

    navigate(
      libraryItem ? `/item/${libraryItem.id}` : `/item/external/game/${gameId}`,
      { state: { backLabel: backLabelText } },
    )
  }

  const resolveRecommendationId = async (similarGame: { id?: number; name: string }) => {
    if (similarGame.id != null) return similarGame.id

    setResolvingRecommendationName(similarGame.name)

    try {
      const { data, error: searchError } = await supabase.functions.invoke("igdb-proxy", {
        body: { action: "search", query: similarGame.name },
      })

      if (searchError) throw searchError

      const searchResults = (data as IgdbSearchResult[] | null) ?? []
      const normalizedName = similarGame.name.trim().toLowerCase()
      const exactMatch = searchResults.find(
        (result) => result.name.trim().toLowerCase() === normalizedName,
      )
      const resolvedId = exactMatch?.id ?? searchResults[0]?.id ?? null

      if (resolvedId == null) {
        toast.error(`Could not open ${similarGame.name}.`)
      }

      return resolvedId
    } catch {
      toast.error(`Could not open ${similarGame.name}.`)
      return null
    } finally {
      setResolvingRecommendationName(null)
    }
  }

  const handleRecommendationClick = async (similarGame: { id?: number; name: string }) => {
    const resolvedId = await resolveRecommendationId(similarGame)
    if (resolvedId == null) return

    navigateToRecommendation(resolvedId, title)
  }

  const handleRecommendationQuickAdd = async (
    e: React.MouseEvent,
    similarGame: { id?: number; name: string },
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const resolvedId = await resolveRecommendationId(similarGame)
    if (resolvedId == null) return

    const newItem = await commit(resolvedId, "game")
    if (newItem) {
      navigate(`/item/${newItem.id}`, { state: { backLabel: title } })
    }
  }

  const isContentLoading = loading || (detailKey != null && loadedDetailKey !== detailKey && !error)

  const header = (
    <div
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between bg-background",
      )}
    >
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        style={{ height: "55px" }}
      >
        <IconArrowLeft className="h-5 w-5" />
        <span className="hidden sm:inline">
          {backLabel ? `Back to ${backLabel}` : "Back"}
        </span>
        <span className="sm:hidden">Back</span>
      </button>

      <button
        onClick={handleAddToLibrary}
        disabled={isCommitting || isContentLoading}
        className="hidden md:flex items-center self-stretch px-5 gap-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-opacity disabled:opacity-60"
      >
        {isCommitting ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4" />
        )}
        <span>{isCommitting ? "Adding…" : "Add to Library"}</span>
      </button>
    </div>
  )

  /* ── Loading / Error states ── */
  if (isContentLoading) {
    return (
      <div className="flex-1 relative bg-background">
        {header}
        <LoadingState className="h-[calc(100dvh-55px)]" />
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="flex-1 relative bg-background">
        {header}
        <EmptyState
          title="Item not found"
          description={error || "Could not load external item details."}
          className="h-[calc(100dvh-55px)]"
          action={
            <Button variant="outline" onClick={() => navigate(-1)}>
              <IconArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          }
        />
      </div>
    )
  }

  /* ── Derive display fields from proxy response ── */
  const gameDetails = isGame ? (details as IgdbGameDetails) : null
  const bookDetails = !isGame ? (details as HardcoverBookDetails) : null

  const title = gameDetails?.name ?? bookDetails?.title ?? "Unknown"
  const coverUrl = gameDetails?.cover ?? bookDetails?.image ?? (isGame ? GAME_COVER_FALLBACK : BOOK_COVER_FALLBACK)
  const description = gameDetails?.summary ?? bookDetails?.description ?? null
  const genres = gameDetails?.genres ?? bookDetails?.genres ?? []
  const themes = gameDetails?.themes ?? []
  const seriesLibraryBooks = !isGame && bookDetails?.seriesName
    ? items
      .filter((item): item is BookItem => item.media_type === "book" && item.book.series_name === bookDetails.seriesName)
      .sort((a, b) => {
        const posA = a.book.series_position ?? Number.POSITIVE_INFINITY
        const posB = b.book.series_position ?? Number.POSITIVE_INFINITY
        if (posA !== posB) return posA - posB
        return a.title.localeCompare(b.title)
      })
      .slice(0, 9)
    : []

  /* Metadata segments */
  const meta: { icon: React.ComponentType<{ className?: string }>; text: string }[] = []
  if (gameDetails?.developer) meta.push({ icon: IconUser, text: gameDetails.developer })
  if (bookDetails?.authors?.[0]) meta.push({ icon: IconUser, text: bookDetails.authors[0] })
  const dateStr = gameDetails?.releaseDate ?? bookDetails?.releaseDate ?? null
  if (dateStr) meta.push({ icon: IconCalendar, text: String(new Date(dateStr).getFullYear()) })
  if (gameDetails?.library) meta.push({ icon: IconStack2, text: gameDetails.library })
  if (gameDetails?.platforms?.[0]) meta.push({ icon: IconDeviceGamepad2, text: gameDetails.platforms[0] })

  const sourceScore = gameDetails?.sourceScore ?? (bookDetails?.rating ? Math.round(bookDetails.rating * 10) : null)
  const ratingsCount = gameDetails?.ratingsCount ?? bookDetails?.ratingsCount ?? null
  const libraryByExternalId = new Map(
    items
      .filter((item) => item.media_type === "game" && item.external_id)
      .map((item) => [String(item.external_id), item]),
  )
  const renderRecommendationCards = (maxItems: number, gridClassName: string) => (
    <div className={gridClassName}>
      {gameDetails?.similarGames.slice(0, maxItems).map((sg) => {
        const isResolvingRecommendation = resolvingRecommendationName === sg.name
        const libraryItem = sg.id != null ? libraryByExternalId.get(String(sg.id)) : undefined
        const isAdding = sg.id != null && committingId === sg.id
        const cover = libraryItem?.cover_url || sg.cover || GAME_COVER_FALLBACK
        const recommendationTitle = libraryItem?.title || sg.name
        const subtitle = libraryItem && libraryItem.media_type === "game"
          ? libraryItem.game.developer || libraryItem.game.publisher || ""
          : sg.releaseDate ? String(new Date(sg.releaseDate).getFullYear()) : ""

        return (
          <div
            key={`${sg.id ?? "search"}-${sg.name}`}
            className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col"
          >
            <button
              type="button"
              className="group flex flex-1 flex-col text-left"
              onClick={() => void handleRecommendationClick(sg)}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <img
                  src={cover}
                  alt={recommendationTitle}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center",
                    isResolvingRecommendation ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {isResolvingRecommendation ? (
                    <IconLoader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <span className="text-white text-xs font-semibold">View Details</span>
                  )}
                </div>
              </div>
              <div className="px-2.5 pt-2 pb-1.5 flex-1">
                <h4 className="font-bold text-sm leading-tight line-clamp-1" title={recommendationTitle}>
                  {recommendationTitle}
                </h4>
                <p
                  className={cn(
                    "text-[11px] text-muted-foreground truncate mt-0.5 min-h-[1rem]",
                    !subtitle && "invisible",
                  )}
                >
                  {subtitle || " "}
                </p>
              </div>
            </button>
            {libraryItem ? (
              <div className={cn("w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px]", STATUS_BAR[libraryItem.status])}>
                <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{statusIcons[libraryItem.status]}</span>
                <span className="truncate">{statusLabels[libraryItem.status]}</span>
              </div>
            ) : (
              <button
                onClick={(e) => void handleRecommendationQuickAdd(e, sg)}
                disabled={isResolvingRecommendation || isAdding}
                className="w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px] bg-zinc-300 text-zinc-950 hover:bg-zinc-400 transition-colors disabled:opacity-60"
              >
                {isResolvingRecommendation || isAdding ? (
                  <IconLoader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <IconPlus className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {isAdding ? "Adding…" : isResolvingRecommendation ? "Loading…" : "Add"}
                </span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex-1 relative bg-background max-md:flex max-md:flex-col max-md:h-dvh max-md:overflow-hidden">
      {header}

      {/* ═══════════════ Desktop Layout ═══════════════ */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto grid grid-cols-[280px_1fr] pb-20">
          {/* Left column — cover + community score */}
          <div className="sticky top-[56px] self-start">
            <div className="aspect-[2/3] w-full overflow-hidden">
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
            </div>

            <div className="p-5 space-y-4 bg-muted">
              {/* Community score */}
              {sourceScore != null && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Community Score</div>
                  <div className="text-2xl font-bold">
                    {Math.round(sourceScore / 10)}<span className="text-sm text-muted-foreground font-normal">/10</span>
                  </div>
                  {ratingsCount != null && ratingsCount > 0 && (
                    <div className="text-xs text-muted-foreground">{ratingsCount.toLocaleString()} Votes</div>
                  )}
                </div>
              )}

              {/* Platforms (games only) */}
              {gameDetails?.platforms && gameDetails.platforms.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Platforms</div>
                  <div className="flex flex-wrap gap-1">
                    {gameDetails.platforms.map(p => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pages (books only) */}
              {bookDetails?.pages && (
                <div className="flex items-center justify-between text-sm py-2 border-t">
                  <span className="text-muted-foreground">Pages</span>
                  <span className="font-medium">{bookDetails.pages}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right column — content */}
          <div className="min-w-0 bg-[#e6e6e6] dark:bg-card">
            {/* Hero block */}
            <div className="p-6 flex flex-col overflow-hidden border-b" style={{ minHeight: 280, backgroundColor: 'var(--muted)' }}>
              <h1 className="text-5xl font-bold tracking-tight mb-3">{title}</h1>
              {meta.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground text-base mb-5">
                  {meta.map((m, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <m.icon className="h-4 w-4 shrink-0" />
                      {m.text}
                    </span>
                  ))}
                </div>
              )}

              {description && (
                <p className="text-base text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-line">
                  {description}
                </p>
              )}
            </div>

            {/* Genres + Themes */}
            <div className="bg-[#e6e6e6] p-6 space-y-6 dark:bg-card">
              {genres.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
                  </div>
                </div>
              )}
              {themes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {themes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                </div>
              )}

              {/* Similar games */}
              {gameDetails?.similarGames && gameDetails.similarGames.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
                  {renderRecommendationCards(10, "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ Mobile Layout ═══════════════ */}
      <div className="md:hidden flex-1 overflow-y-auto min-h-0">
        {/* Cover */}
        <div className="flex justify-center px-8 pt-4">
          <div className="w-[200px] aspect-[2/3] overflow-hidden rounded-lg">
            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title + metadata */}
        <div className="text-center px-6 pt-5 pb-2">
          <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
          {meta.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {meta.map((m, i) => (
                <span key={i} className="flex items-center gap-1">
                  <m.icon className="h-3.5 w-3.5 shrink-0" />
                  {m.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="px-6 pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
              {description}
            </p>
          </div>
        )}

        {/* Genres + Themes */}
        <div className="px-6 pt-4 space-y-4">
          {genres.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
              </div>
            </div>
          )}
          {themes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Themes</h4>
              <div className="flex flex-wrap gap-2">
                {themes.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
          )}

          {/* Community score */}
          {sourceScore != null && (
            <div className="pt-2">
              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Community Score</div>
              <div className="text-2xl font-bold">
                {Math.round(sourceScore / 10)}<span className="text-sm text-muted-foreground font-normal">/10</span>
              </div>
              {ratingsCount != null && ratingsCount > 0 && (
                <div className="text-xs text-muted-foreground">{ratingsCount.toLocaleString()} Votes</div>
              )}
            </div>
          )}

          {gameDetails?.similarGames && gameDetails.similarGames.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Recommendations</h4>
              {renderRecommendationCards(9, "grid grid-cols-3 gap-3")}
            </div>
          )}

          {!isGame && bookDetails?.seriesName && (
            <div className="pt-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Series</h4>
              {seriesLibraryBooks.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {seriesLibraryBooks.map((book) => (
                    <Link
                      key={book.id}
                      to={`/item/${book.id}`}
                      state={{ backLabel: title }}
                      className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden">
                        <img
                          src={book.cover_url || BOOK_COVER_FALLBACK}
                          alt={book.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-2.5 pt-2 pb-1.5">
                        <h4 className="font-bold text-sm leading-tight line-clamp-1" title={book.title}>
                          {book.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-card px-4 py-3 dark:bg-[#0A0A0A]">
                  <div className="text-sm font-semibold">{bookDetails.seriesName}</div>
                  {bookDetails.seriesPosition != null && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Book {bookDetails.seriesPosition}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ Mobile Bottom Bar — Add to Library ═══════════════ */}
      <div className="md:hidden flex-shrink-0">
        <button
          onClick={handleAddToLibrary}
          disabled={isCommitting}
          className={cn(
            "w-full h-[55px] flex items-center justify-center gap-2 text-sm font-semibold",
            "bg-primary text-primary-foreground disabled:opacity-60"
          )}
        >
          {isCommitting ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconPlus className="h-4 w-4" />
          )}
          <span>{isCommitting ? "Adding…" : "Add to Library"}</span>
        </button>
      </div>
    </div>
  )
}
