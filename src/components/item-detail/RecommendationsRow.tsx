import { Link, useNavigate } from "react-router-dom"
import { IconPlus, IconLoader2 } from "@tabler/icons-react"
import { useShelfStore } from "@/store/useShelfStore"
import { useCommitItem } from "@/hooks/useCommitItem"
import { statusIcons, statusLabels } from "@/components/status-icons"
import { cn } from "@/lib/utils"
import type { FullItem, Status } from "@/types"

interface RecommendationsRowProps {
  item: FullItem
  maxItems?: number
}

/* Status bar colours — mirrors PosterItem */
const STATUS_BAR: Record<Status, string> = {
  in_collection: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
}

const COVER_FALLBACK =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

/**
 * Displays recommended similar games using PosterItem-style cards.
 * - All cards show "View Details" on hover and link to the detail page.
 * - Library cards show status bar; external cards show "Add to Collection" tag.
 * - Clicking the "Add to Collection" tag quick-adds the game without navigating.
 * - "Back to" label shows the current game's title.
 */
export function RecommendationsRow({ item, maxItems = 10 }: RecommendationsRowProps) {
  const items = useShelfStore((s) => s.items)
  const { commit, committingId } = useCommitItem()
  const navigate = useNavigate()

  if (item.media_type !== "game" || !item.game.similar_games || item.game.similar_games.length === 0) {
    return null
  }

  // Build a map of external IGDB IDs → library items for quick lookup
  const libraryByExternalId = new Map(
    items
      .filter((i) => i.media_type === "game" && i.external_id)
      .map((i) => [String(i.external_id), i])
  )

  /** Quick-add: commit external game, then navigate to its new detail page */
  const handleQuickAdd = async (e: React.MouseEvent, gameId: number) => {
    e.preventDefault()
    e.stopPropagation()
    const newItem = await commit(gameId, "game")
    if (newItem) {
      navigate(`/item/${newItem.id}`, { state: { backLabel: item.title } })
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 hidden md:block">Recommendations</h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {item.game.similar_games.slice(0, maxItems).map((rec) => {
          const libraryItem = rec.id ? libraryByExternalId.get(String(rec.id)) : undefined
          const isAdding = rec.id != null && committingId === rec.id
          const cover = libraryItem?.cover_url || rec.cover || COVER_FALLBACK
          const title = libraryItem?.title || rec.name
          const subtitle = libraryItem && libraryItem.media_type === "game"
            ? libraryItem.game.developer || libraryItem.game.publisher || ""
            : ""

          const linkTo = libraryItem
            ? `/item/${libraryItem.id}`
            : rec.id != null
              ? `/item/external/game/${rec.id}`
              : null

          // If no linkable ID, render static card
          if (!linkTo) {
            return (
              <div key={rec.name} className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col opacity-60">
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  <img src={cover} alt={title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="px-2.5 pt-2 pb-1.5">
                  <h4 className="font-bold text-sm leading-tight line-clamp-1" title={title}>{title}</h4>
                </div>
              </div>
            )
          }

          return (
            <Link
              key={rec.name}
              to={linkTo}
              state={{ backLabel: item.title }}
              className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col group"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <img src={cover} alt={title} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">View Details</span>
                </div>
              </div>
              <div className="px-2.5 pt-2 pb-1.5 flex-1">
                <h4 className="font-bold text-sm leading-tight line-clamp-1" title={title}>{title}</h4>
                <p className={cn("text-[11px] text-muted-foreground truncate mt-0.5 min-h-[1rem]", !subtitle && "invisible")}>
                  {subtitle || " "}
                </p>
              </div>
              {libraryItem ? (
                <div className={cn("w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px]", STATUS_BAR[libraryItem.status])}>
                  <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{statusIcons[libraryItem.status]}</span>
                  <span className="truncate">{statusLabels[libraryItem.status]}</span>
                </div>
              ) : rec.id != null ? (
                <button
                  onClick={(e) => handleQuickAdd(e, rec.id!)}
                  disabled={isAdding}
                  className="w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px] bg-zinc-300 text-zinc-950 hover:bg-zinc-400 transition-colors disabled:opacity-60"
                >
                  {isAdding ? (
                    <IconLoader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <IconPlus className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{isAdding ? "Adding…" : "Add"}</span>
                </button>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
