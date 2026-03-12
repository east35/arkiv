import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconDots,
  IconPencil,
  IconPlaylistAdd,
  IconRefresh,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import type { FullItem, Status } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { statusIcons, statusLabels } from "@/components/status-icons";
import { getStatusDate, useShelfStore } from "@/store/useShelfStore";
import { useMetadataEnrich } from "@/hooks/useMetadataEnrich";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

export function PosterItem({
  item,
  onEdit,
  mobileTapAction = "edit",
  hideStatusDate,
}: PosterItemProps) {
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { enrichSingle } = useMetadataEnrich();
  const preferences = useShelfStore((s) => s.preferences);
  const statusDate = getStatusDate(item);
  const statusText = hideStatusDate
    ? statusLabels[item.status]
    : statusDate
      ? formatDate(statusDate, preferences?.date_format)
      : statusLabels[item.status];

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A]">
        {/* Mobile: configurable tap behavior */}
        {mobileTapAction === "edit" ? (
          <div
            className="md:hidden cursor-pointer"
            onClick={() => onEdit(item)}
          >
            <CardBody item={item} statusText={statusText} />
          </div>
        ) : (
          <Link to={`/item/${item.id}`} className="md:hidden flex flex-col">
            <CardBody item={item} statusText={statusText} />
          </Link>
        )}

        {/* Desktop: navigates to detail */}
        <Link to={`/item/${item.id}`} className="hidden md:flex md:flex-col">
          <CardBody item={item} statusText={statusText} />
        </Link>

        {/* Actions only: status/date now lives in bottom status bar */}
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "grid h-7 w-7 place-items-center bg-black/70 text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100",
              )}
              aria-label="Item actions"
            >
              <IconDots className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <IconPencil className="h-4 w-4 mr-2" />
                Edit Status
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    await enrichSingle(item);
                  } finally {
                    setSyncing(false);
                  }
                }}
              >
                <IconRefresh
                  className={cn("h-4 w-4 mr-2", syncing && "animate-spin")}
                />
                {syncing ? "Syncing…" : "Sync"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageListsOpen(true)}>
                <IconPlaylistAdd className="h-4 w-4 mr-2" />
                Add to List…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onEdit(item)}
              >
                <IconTrash className="h-4 w-4 mr-2" />
                Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
