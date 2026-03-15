import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  IconExternalLink,
  IconLinkPlus,
  IconTrash,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import type { ItemBookmark, LinkType } from "@/types"
import type { BookmarkDraft } from "@/hooks/useItemBookmarks"
import { LinkTypeIcon } from "./LinkTypeIcon"

interface LinksListProps {
  links: ItemBookmark[]
  loading?: boolean
  error?: string | null
  onOpen: (link: ItemBookmark) => void
  onCreate: (draft: BookmarkDraft) => Promise<void>
  onDelete: (bookmarkId: string) => Promise<void>
}

const emptyDraft: BookmarkDraft = {
  title: "",
  url: "",
  linkType: "other",
}

const LINK_TYPE_OPTIONS: Array<{ value: LinkType; label: string }> = [
  { value: "guide", label: "Guide" },
  { value: "wiki", label: "Wiki" },
  { value: "review", label: "Review" },
  { value: "forum", label: "Forum" },
  { value: "store", label: "Store" },
  { value: "other", label: "Other" },
]

function LinkTypeTile({ linkType }: { linkType: LinkType }) {
  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-muted/80 text-lg font-semibold text-foreground/80 md:size-20">
      <LinkTypeIcon linkType={linkType} className="h-7 w-7 md:h-9 md:w-9" />
    </div>
  )
}

export function LinksList({
  links,
  loading = false,
  error,
  onOpen,
  onCreate,
  onDelete,
}: LinksListProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [draft, setDraft] = useState<BookmarkDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const moveSelection = (nextIndex: number) => {
    itemRefs.current[nextIndex]?.focus()
  }

  const handleCreate = async () => {
    if (!draft.title?.trim() || !draft.url?.trim()) return
    setSaving(true)
    try {
      await onCreate({
        title: draft.title.trim(),
        url: draft.url.trim(),
        linkType: draft.linkType ?? "other",
      })
      setDraft(emptyDraft)
      toast.success("Saved link added")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save link")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId)
    try {
      await onDelete(bookmarkId)
      toast.success("Saved link removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete link")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
        {loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading saved links…</div>
        )}
        {!loading && error && (
          <div className="px-4 py-6 text-sm text-destructive">{error}</div>
        )}
        {!loading && !error && links.length > 0 && (
          <div role="list" aria-label="Saved links">
            {links.map((link, index) => {
              return (
                <div key={link.id} className="border-b bg-background">
                  <div className="group/link flex items-stretch gap-0">
                    <LinkTypeTile linkType={link.link_type} />
                    <button
                      ref={(element) => {
                        itemRefs.current[index] = element
                      }}
                      type="button"
                      tabIndex={0}
                      className="min-w-0 flex-1 px-5 py-4 text-left outline-none transition-colors hover:bg-accent/30 focus-visible:bg-accent/30"
                      onClick={() => onOpen(link)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault()
                          moveSelection(Math.min(index + 1, links.length - 1))
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault()
                          moveSelection(Math.max(index - 1, 0))
                        } else if (event.key === "Home") {
                          event.preventDefault()
                          moveSelection(0)
                        } else if (event.key === "End") {
                          event.preventDefault()
                          moveSelection(links.length - 1)
                        } else if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onOpen(link)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-semibold tracking-tight text-foreground">
                          {link.title}
                        </span>
                        <IconExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mr-3 self-center border-0 text-destructive opacity-0 transition-opacity group-hover/link:opacity-100 focus-visible:opacity-100"
                      disabled={deletingId === link.id}
                      onClick={() => void handleDelete(link.id)}
                      aria-label={`Delete ${link.title}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="space-y-0">
          <Input
            value={draft.title ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Label"
            className="border-0 border-b bg-background px-4"
          />
          <Input
            value={draft.url ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://example.com"
            className="border-0 bg-background px-4"
          />
          <NativeSelect
            value={draft.linkType ?? "other"}
            onValueChange={(value) => setDraft((current) => ({ ...current, linkType: value as LinkType }))}
            variant="detail"
            className="border-0"
          >
            {LINK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !draft.title?.trim() || !draft.url?.trim()}
            className="w-full border-0"
          >
            <IconLinkPlus className="h-4 w-4" />
            {saving ? "Saving…" : "Save Link"}
          </Button>
        </div>
      </div>
    </div>
  )
}
