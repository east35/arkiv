import { useState } from "react"
import { IconTrash, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { ItemBookmark } from "@/types"

interface BookmarkListProps {
  bookmarks: ItemBookmark[]
  onCreate: (title: string, url: string) => Promise<void>
  onDelete: (bookmarkId: string) => Promise<void>
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function BookmarkList({ bookmarks, onCreate, onDelete }: BookmarkListProps) {
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [urlError, setUrlError] = useState("")

  const validateUrl = (value: string): boolean => {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  const handleCreate = async () => {
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()
    if (!trimmedTitle || !trimmedUrl) return
    if (!validateUrl(trimmedUrl)) {
      setUrlError("Please enter a valid URL (include https://)")
      return
    }
    setUrlError("")
    setSaving(true)
    try {
      await onCreate(trimmedTitle, trimmedUrl)
      setTitle("")
      setUrl("")
    } catch {
      toast.error("Failed to save bookmark")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId)
    try {
      await onDelete(bookmarkId)
    } catch {
      toast.error("Failed to delete bookmark")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Bookmarks</h3>

      {bookmarks.length === 0 && (
        <p className="text-sm text-muted-foreground">No bookmarks yet. Save useful links below.</p>
      )}

      {bookmarks.map((bookmark) => (
        <div key={bookmark.id} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 group"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate group-hover:underline">
                {bookmark.title}
              </span>
              <IconExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
            <div className="text-[11px] text-muted-foreground truncate">{getDomain(bookmark.url)}</div>
          </a>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive shrink-0"
            disabled={deletingId === bookmark.id}
            onClick={() => handleDelete(bookmark.id)}
          >
            <IconTrash className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {/* Add new bookmark */}
      <div className="space-y-2">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm"
        />
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError("") }}
          className="text-sm"
        />
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={saving || !title.trim() || !url.trim()}
          className="w-full"
        >
          {saving ? "Saving…" : "Add Bookmark"}
        </Button>
      </div>
    </div>
  )
}
