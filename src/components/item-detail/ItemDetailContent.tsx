import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { IconPlaylist, IconUser, IconCalendar, IconStack2, IconDeviceGamepad2 } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RecommendationsRow } from "./RecommendationsRow"
import type { FullItem, List } from "@/types"

interface ItemDetailContentProps {
  item: FullItem
  itemLists: List[]
}

export function ItemDetailContent({ item, itemLists }: ItemDetailContentProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const [isClamped, setIsClamped] = useState(false)
  const descRef = useRef<HTMLParagraphElement>(null)
  const isGame = item.media_type === "game"

  useEffect(() => {
    const el = descRef.current
    if (el) setIsClamped(el.scrollHeight > el.clientHeight)
  }, [item.description])

  /* Build metadata segments with icons */
  const meta: { icon: React.ComponentType<{ className?: string }>; text: string }[] = []
  if (isGame) {
    if (item.game.developer) meta.push({ icon: IconUser, text: item.game.developer })
  } else {
    if (item.book.author) meta.push({ icon: IconUser, text: item.book.author })
  }
  const dateStr = isGame ? item.game.release_date : item.book.publish_date
  if (dateStr) meta.push({ icon: IconCalendar, text: String(new Date(dateStr).getFullYear()) })
  if (isGame && item.game.collection) meta.push({ icon: IconStack2, text: item.game.collection })
  if (!isGame && item.book.series_name) meta.push({ icon: IconStack2, text: item.book.series_name })
  if (isGame && item.game.platforms.length > 0) meta.push({ icon: IconDeviceGamepad2, text: item.game.platforms[0] })

  return (
    <div>
      {/* ── Group 1: Hero block — title, metadata, description ── */}
      {/* min-h matches the cover art (280px × 1.5 aspect ratio = 420px) */}
      <div className="bg-card rounded-lg p-6 flex flex-col overflow-hidden border-b" style={{ height: 419 }}>
        <h1 className="text-5xl font-bold tracking-tight mb-3">{item.title}</h1>
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
        {item.description && (
          <div className="flex-1 min-h-0">
            <p ref={descRef} className="text-base leading-relaxed text-muted-foreground whitespace-pre-line line-clamp-[10]">
              {item.description}
            </p>
            {isClamped && (
              <button
                onClick={() => setIsDescriptionOpen(true)}
                className="text-primary font-medium text-sm mt-1 hover:underline"
              >
                read more…
              </button>
            )}
            <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{item.title}</DialogTitle>
                  <DialogDescription>Full description</DialogDescription>
                </DialogHeader>
                <p className="whitespace-pre-line leading-relaxed mt-4">{item.description}</p>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* ── Group 2: Tags, lists, recommendations ── */}
      <div className="bg-card rounded-lg p-6 space-y-6">
        {/* Genres & Themes */}
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          {item.genres.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {item.genres.map(g => (
                  <Badge key={g} variant="secondary" className="px-3 py-1 text-sm font-normal">{g}</Badge>
                ))}
              </div>
            </div>
          )}
          {isGame && item.game.themes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {item.game.themes.map(t => (
                  <Badge key={t} variant="secondary" className="px-3 py-1 text-sm font-normal">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lists */}
        {itemLists.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Lists</h3>
            <div className="space-y-2">
              {itemLists.map(list => (
                <div
                  key={list.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background/50"
                >
                  <div className="h-10 w-10 rounded overflow-hidden bg-secondary/50 shrink-0 flex items-center justify-center">
                    <IconPlaylist className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{list.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {list.item_count ? `${list.item_count} Items` : "List"}
                    </p>
                  </div>
                  <Link
                    to={`/lists/${list.id}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    View List
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <RecommendationsRow item={item} />
      </div>
    </div>
  )
}
