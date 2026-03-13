import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IconPencil,
  IconPlaylistAdd,
  IconRefresh,
  IconStar,
  IconTrash,
  IconEye,
} from "@tabler/icons-react";
import type { FullItem, Status } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { statusIcons, statusLabels } from "@/components/status-icons";
import { getStatusDate, useShelfStore } from "@/store/useShelfStore";
import { useMetadataEnrich } from "@/hooks/useMetadataEnrich";
import { ManageListsDialog } from "@/components/lists/ManageListsDialog";

interface PosterItemProps {
  item: FullItem;
  onEdit: (item: FullItem) => void;
  mobileTapAction?: "edit" | "details";
  hideStatusDate?: boolean;
}

const STATUS_BAR: Record<Status, string> = {
  in_collection: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
};

function getProgressLabel(item: FullItem): string | null {
  if (item.media_type === "game") {
    const h = item.game.progress_hours;
    const m = item.game.progress_minutes;
    if (h <= 0 && m <= 0) return null;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  } else {
    const p = item.book.progress;
    if (p && p > 0) {
      return item.book.page_count ? `${p} / ${item.book.page_count}` : `${p}`;
    }
  }
  return null;
}

function CardBody({
  item,
  statusText,
}: {
  item: FullItem;
  statusText: string;
}) {
  const isGame = item.media_type === "game";
  const progressLabel = getProgressLabel(item);
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif");

  const subtitle = isGame
    ? item.game.developer || item.game.publisher || ""
    : item.book.author || item.book.publisher || "";

  return (
    <div className="flex flex-col h-full">
      {/* Cover with overlays */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <img
          src={coverUrl}
          alt={item.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />

        {/* Bottom: progress (left) | score (right) */}
        {(progressLabel || item.user_score != null) && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between items-stretch pointer-events-none">
            {progressLabel ? (
              <div className="flex items-center bg-black/70 backdrop-blur-sm px-3 h-7 text-white text-xs font-semibold">
                {progressLabel}
              </div>
            ) : (
              <div />
            )}
            {item.user_score != null && (
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2.5 h-7 text-white text-xs font-semibold shrink-0">
                <IconStar className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                <span>{item.user_score}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title + subtitle */}
      <div className="px-2.5 pt-2 pb-1.5 flex-1">
        <h3
          className="font-bold text-sm leading-tight line-clamp-1"
          title={item.title}
        >
          {item.title}
        </h3>
        <p
          className={cn(
            "text-[11px] text-muted-foreground truncate mt-0.5 min-h-[1rem]",
            !subtitle && "invisible",
          )}
        >
          {subtitle || " "}
        </p>
      </div>

      {/* Status bar */}
      <div
        className={cn(
          "w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px]",
          STATUS_BAR[item.status],
        )}
      >
        <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">
          {statusIcons[item.status]}
        </span>
        <span className="truncate">{statusText}</span>
      </div>
    </div>
  );
}

function pathToLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/books") return "Books";
  if (pathname === "/games") return "Games";
  if (pathname === "/search") return "Search";
  if (pathname.startsWith("/lists/")) return "List";
  return "Collection";
}

export function PosterItem({
  item,
  onEdit,
  mobileTapAction = "edit",
  hideStatusDate,
}: PosterItemProps) {
  const location = useLocation();
  const backLabel = pathToLabel(location.pathname);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { enrichSingle } = useMetadataEnrich();
  const preferences = useShelfStore((s) => s.preferences);
  const statusDate = getStatusDate(item);
  const statusText = hideStatusDate
    ? statusLabels[item.status]
    : statusDate
      ? formatDate(statusDate, preferences?.date_format)
      : statusLabels[item.status];

  // Cancel hover on scroll
  useEffect(() => {
    if (!isHovered) return;
    const hide = () => setIsHovered(false);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", hide, { capture: true });
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (window.innerWidth < 768) return;
    setIsHovered(true);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className="poster-item relative z-0"
        data-hovered={isHovered || undefined}
        style={isHovered ? { zIndex: 50 } : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card */}
        <div className="flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A]">
          {mobileTapAction === "edit" ? (
            <div
              className="md:hidden cursor-pointer"
              onClick={() => onEdit(item)}
            >
              <CardBody item={item} statusText={statusText} />
            </div>
          ) : (
            <Link to={`/item/${item.id}`} state={{ backLabel }} className="md:hidden flex flex-col">
              <CardBody item={item} statusText={statusText} />
            </Link>
          )}

          {/* Desktop: navigates to detail */}
          <Link to={`/item/${item.id}`} state={{ backLabel }} className="hidden md:flex md:flex-col">
            <CardBody item={item} statusText={statusText} />
          </Link>
        </div>

        {/* Hover flyout — desktop only, overlays the poster */}
        <div
          className={cn(
            "absolute inset-0 z-10 bg-zinc-900/95 backdrop-blur-sm text-white flex-col hidden md:flex",
            "transition-opacity duration-150",
            isHovered
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={`/item/${item.id}`}
            state={{ backLabel }}
            className="flex items-center gap-3 px-3 flex-1 hover:bg-white/10 w-full"
            onClick={() => setIsHovered(false)}
          >
            <IconEye className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">View Details</span>
          </Link>

          <button
            className="flex items-center gap-3 px-3 flex-1 hover:bg-white/10 text-left w-full"
            onClick={() => { setIsHovered(false); onEdit(item); }}
          >
            <IconPencil className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">Edit Status</span>
          </button>

          <button
            className="flex items-center gap-3 px-3 flex-1 hover:bg-white/10 text-left w-full disabled:opacity-50"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try { await enrichSingle(item); } finally { setSyncing(false); }
            }}
          >
            <IconRefresh className={cn("h-4 w-4 shrink-0", syncing && "animate-spin")} />
            <span className="text-sm font-semibold whitespace-nowrap">{syncing ? "Syncing…" : "Sync"}</span>
          </button>

          <button
            className="flex items-center gap-3 px-3 flex-1 hover:bg-white/10 text-left w-full"
            onClick={() => { setIsHovered(false); setIsManageListsOpen(true); }}
          >
            <IconPlaylistAdd className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">Add to List…</span>
          </button>

          <button
            className="flex items-center gap-3 px-3 flex-1 bg-red-600 hover:bg-red-700 text-left w-full"
            onClick={() => { setIsHovered(false); onEdit(item); }}
          >
            <IconTrash className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">Delete</span>
          </button>
        </div>
      </div>

      <ManageListsDialog
        itemId={item.id}
        open={isManageListsOpen}
        onOpenChange={setIsManageListsOpen}
      />
    </>
  );
}
