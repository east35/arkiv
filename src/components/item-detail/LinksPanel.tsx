import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { IconArrowRight } from "@tabler/icons-react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useItemBookmarks } from "@/hooks/useItemBookmarks"
import type { ItemBookmark } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LinksList } from "./LinksList"
import { LinkTypeIcon } from "./LinkTypeIcon"

interface LinksPanelProps {
  itemId: string
  itemHref: string
  mode?: "embedded" | "page"
}

export function LinksPanel({
  itemId,
  itemHref,
  mode = "embedded",
}: LinksPanelProps) {
  const navigate = useNavigate()
  const isTabletUp = useMediaQuery("(min-width: 768px)")
  const {
    bookmarks,
    loading,
    error,
    fetchBookmarks,
    createBookmark,
    deleteBookmark,
  } = useItemBookmarks()

  useEffect(() => {
    void fetchBookmarks(itemId).catch((err) => {
      console.error(err)
    })
  }, [fetchBookmarks, itemId])

  const openExternal = (link: ItemBookmark) => {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  const renderCompactThumbnail = (link: ItemBookmark) => {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden bg-muted/80 text-base font-semibold text-foreground/80">
        <LinkTypeIcon linkType={link.link_type} className="h-6 w-6" />
      </div>
    )
  }

  if (!isTabletUp) {
    if (mode === "embedded") {
      return (
        <div className="space-y-3 bg-muted/30 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Saved Links</p>
              <p className="text-xs text-muted-foreground">Reference links for this item.</p>
            </div>
            <Badge variant="secondary" className="border-0 bg-background px-2.5">
              {bookmarks.length}
            </Badge>
          </div>
          {bookmarks.length > 0 ? (
            <div className="space-y-1 bg-background/80 py-2">
              {bookmarks.slice(0, 3).map((bookmark) => (
                <button
                  key={bookmark.id}
                  type="button"
                  onClick={() => openExternal(bookmark)}
                  className="flex items-stretch gap-0 text-left transition-colors hover:bg-accent/35"
                >
                  {renderCompactThumbnail(bookmark)}
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                    <p className="truncate text-base font-semibold tracking-tight text-foreground">
                      {bookmark.title}
                    </p>
                    <IconArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-background/80 px-4 py-5 text-sm text-muted-foreground">
              No saved links yet.
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`${itemHref}/links`)}
            className="w-full border-0"
          >
            {bookmarks.length > 0 ? "View All Links" : "Manage Links"}
          </Button>
        </div>
      )
    }

    return (
      <LinksList
        links={bookmarks}
        loading={loading}
        error={error}
        onOpen={openExternal}
        onCreate={async (draft) => {
          await createBookmark(itemId, draft)
        }}
        onDelete={deleteBookmark}
      />
    )
  }

  return (
    <div className={mode === "page" ? "min-h-[560px] bg-muted/30" : "bg-muted/30"}>
      <LinksList
        links={bookmarks}
        loading={loading}
        error={error}
        onOpen={openExternal}
        onCreate={async (draft) => {
          await createBookmark(itemId, draft)
        }}
        onDelete={deleteBookmark}
      />
    </div>
  )
}
