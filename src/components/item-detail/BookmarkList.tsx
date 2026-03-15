import { useMemo, useState } from "react";
import { IconTrash, IconExternalLink } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ItemBookmark } from "@/types";

interface BookmarkListProps {
  bookmarks: ItemBookmark[];
  onCreate: (title: string, url: string) => Promise<void>;
  onDelete: (bookmarkId: string) => Promise<void>;
}

const imagePathPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getBookmarkThumbnailCandidates(
  url: string,
  thumbnailUrl?: string | null,
): string[] {
  try {
    const parsedUrl = new URL(url);
    const candidates: string[] = [];

    if (thumbnailUrl?.trim()) {
      candidates.push(thumbnailUrl.trim());
    }

    if (imagePathPattern.test(parsedUrl.pathname)) {
      candidates.push(url);
    }

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      candidates.push(`${parsedUrl.origin}/apple-touch-icon.png`);
      candidates.push(`${parsedUrl.origin}/apple-touch-icon-precomposed.png`);
      candidates.push(`${parsedUrl.origin}/favicon.ico`);
      candidates.push(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=128`,
      );
    }

    return [...new Set(candidates)];
  } catch {
    return [];
  }
}

function getBookmarkInitial(title: string, url: string): string {
  const source = title.trim() || getDomain(url);
  const match = source.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

function BookmarkThumbnail({
  title,
  url,
  thumbnailUrl,
  className,
}: {
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  const candidates = useMemo(
    () => getBookmarkThumbnailCandidates(url, thumbnailUrl),
    [thumbnailUrl, url],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  const activeCandidate = candidates[candidateIndex];
  const fallbackLabel = getBookmarkInitial(title, url);

  return (
    <div
      className={cn(
        "flex size-14 aspect-square shrink-0 items-center justify-center overflow-hidden bg-muted/40 text-sm font-semibold text-foreground/80",
        className,
      )}
      aria-hidden="true"
    >
      {activeCandidate ? (
        <img
          src={activeCandidate}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setCandidateIndex((currentIndex) => currentIndex + 1);
          }}
        />
      ) : (
        <span>{fallbackLabel}</span>
      )}
    </div>
  );
}

export function BookmarkList({
  bookmarks,
  onCreate,
  onDelete,
}: BookmarkListProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState("");
  const [activeBookmark, setActiveBookmark] = useState<ItemBookmark | null>(
    null,
  );

  const validateUrl = (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (!trimmedTitle || !trimmedUrl) return;
    if (!validateUrl(trimmedUrl)) {
      setUrlError("Please enter a valid URL (include https://)");
      return;
    }
    setUrlError("");
    setSaving(true);
    try {
      await onCreate(trimmedTitle, trimmedUrl);
      setTitle("");
      setUrl("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bookmark",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId);
    try {
      await onDelete(bookmarkId);
    } catch {
      toast.error("Failed to delete bookmark");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3.5">
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        Bookmarks
      </h3>

      {bookmarks.length === 0 && (
        <div className="bg-card/40 px-4 py-5 text-sm text-muted-foreground">
          No bookmarks yet. Save useful links below.
        </div>
      )}

      <div className="grid gap-1">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="group/bookmark border-b relative overflow-hidden bg-background transition-colors hover:bg-accent/40"
          >
            <a
              href={bookmark.url}
              rel="noreferrer"
              title={bookmark.url}
              aria-label={`${bookmark.title} (${getDomain(bookmark.url)})`}
              className="flex min-h-[44px] items-center gap-3 pr-12 pl-0 outline-none transition-colors focus-visible:bg-muted/40"
              onClick={(event) => {
                event.preventDefault();
                setActiveBookmark(bookmark);
              }}
            >
              <BookmarkThumbnail
                key={bookmark.url}
                title={bookmark.title}
                url={bookmark.url}
                thumbnailUrl={bookmark.thumbnail_url}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold tracking-tight text-foreground group-hover/bookmark:underline">
                    {bookmark.title}
                  </span>
                  <IconExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover/bookmark:text-foreground/60" />
                </div>
              </div>
            </a>
            <Button
              size="icon-sm"
              variant="ghost"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/bookmark:opacity-100 group-focus-within/bookmark:opacity-100"
              aria-label={`Delete bookmark ${bookmark.title}`}
              disabled={deletingId === bookmark.id}
              onClick={() => handleDelete(bookmark.id)}
            >
              <IconTrash className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 pt-1">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 border-0 bg-background/80 px-4 text-sm shadow-none"
        />
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          className="h-12 border-0 bg-background/80 px-4 text-sm shadow-none"
        />
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        <Button
          size="default"
          variant="secondary"
          onClick={handleCreate}
          disabled={saving || !title.trim() || !url.trim()}
          className="h-12 w-full border-0 text-sm font-semibold tracking-tight"
        >
          {saving ? "Saving…" : "Add Bookmark"}
        </Button>
      </div>

      <Dialog
        open={Boolean(activeBookmark)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveBookmark(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="h-[calc(100vh-24px)] max-h-none w-[calc(100vw-24px)] max-w-none gap-0 overflow-hidden p-0"
        >
          <div className="flex min-h-12 items-center justify-between gap-3 px-4">
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-semibold">
                {activeBookmark?.title ?? "Bookmark"}
              </DialogTitle>
            </div>
            <DialogClose render={<Button variant="ghost" size="sm" />}>
              Close
            </DialogClose>
          </div>
          {activeBookmark && (
            <iframe
              title={activeBookmark.title}
              src={activeBookmark.url}
              className="h-full w-full bg-background"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
