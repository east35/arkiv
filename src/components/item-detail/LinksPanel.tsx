import { useEffect } from "react"
import { useItemBookmarks } from "@/hooks/useItemBookmarks"
import type { BookmarkDraft } from "@/hooks/useItemBookmarks"
import type { ItemBookmark } from "@/types"
import { LinksList } from "./LinksList"

interface LinksPanelProps {
  itemId: string
  mode?: "embedded" | "page"
  bookmarks?: ItemBookmark[]
  loading?: boolean
  error?: string | null
  onCreateBookmark?: (draft: BookmarkDraft) => Promise<void>
  onDeleteBookmark?: (bookmarkId: string) => Promise<void>
}

export function LinksPanel({
  itemId,
  mode = "embedded",
  bookmarks: controlledBookmarks,
  loading: controlledLoading,
  error: controlledError,
  onCreateBookmark,
  onDeleteBookmark,
}: LinksPanelProps) {
  const {
    bookmarks,
    loading,
    error,
    fetchBookmarks,
    createBookmark,
    deleteBookmark,
  } = useItemBookmarks()
  const isControlled = Array.isArray(controlledBookmarks)
    && typeof onCreateBookmark === "function"
    && typeof onDeleteBookmark === "function"

  useEffect(() => {
    if (isControlled) return

    void fetchBookmarks(itemId).catch((err) => {
      console.error(err)
    })
  }, [fetchBookmarks, isControlled, itemId])

  const openExternal = (link: ItemBookmark) => {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  const links = controlledBookmarks ?? bookmarks
  const linksLoading = controlledLoading ?? loading
  const linksError = controlledError ?? error
  const handleCreate = onCreateBookmark ?? (async (draft) => {
    await createBookmark(itemId, draft)
  })
  const handleDelete = onDeleteBookmark ?? deleteBookmark

  return (
    <div className={mode === "page" ? "min-h-[560px] bg-muted/30" : "bg-muted/30"}>
      <LinksList
        links={links}
        loading={linksLoading}
        error={linksError}
        onOpen={openExternal}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  )
}
