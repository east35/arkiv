import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IconDots,
  IconPencil,
  IconPlaylistAdd,
  IconRefresh,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import type { FullItem, Status } from "@/types";
import { getStatusDate, useShelfStore } from "@/store/useShelfStore";
import { cn, formatDate } from "@/lib/utils";
import { statusIcons, statusLabels } from "@/components/status-icons";
import { useMetadataEnrich } from "@/hooks/useMetadataEnrich";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManageCollectionsDialog } from "@/components/collections/ManageCollectionsDialog";
import { iconActionButtonClassName } from "@/lib/icon-action-button";

interface TableItemProps {
  item: FullItem;
  onEdit: (item: FullItem) => void;
  mobileTapAction?: "edit" | "details";
  hideStatusDate?: boolean;
  stacked?: boolean;
  isFirst?: boolean;
  className?: string;
}

const STATUS_BLOCK: Record<Status, string> = {
  in_library: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
};

const STATUS_STRIP: Record<Status, string> = {
  in_library: "bg-zinc-300",
  backlog: "bg-purple-500",
  in_progress: "bg-primary",
  completed: "bg-green-500",
  paused: "bg-yellow-400",
  dropped: "bg-red-500",
};

function formatGameProgress(hours: number, minutes: number): string {
  if (hours <= 0 && minutes <= 0) return "-";
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function RowBody({
  item,
  statusText,
  onEdit,
  mobileTapAction,
  backLabel,
}: {
  item: FullItem;
  statusText: string;
  onEdit: (item: FullItem) => void;
  mobileTapAction: "edit" | "details";
  backLabel: string;
}) {
  const isGame = item.media_type === "game";
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_small/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif");
  const subtitle = isGame ? item.game.developer : item.book.author;
  const progressDisplay = isGame
    ? formatGameProgress(item.game.progress_hours, item.game.progress_minutes)
    : item.book.progress && item.book.progress > 0
      ? `${item.book.progress} / ${item.book.page_count ?? "?"}`
      : "-";

  const row = (
    <div className="flex items-stretch h-16">
      {/* Status colour strip */}
      <div className={cn("w-1 shrink-0", STATUS_STRIP[item.status])} />

      {/* Cover */}
      <div className="w-10 shrink-0 overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={item.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Title + subtitle — absorbs all available space */}
      <div className="flex min-w-0 flex-1 items-center px-3 border-r border-border">
        <div className="min-w-0 w-full">
          <h3
            className="truncate text-sm font-bold leading-tight"
            title={item.title}
          >
            {item.title}
          </h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {subtitle || ""}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="w-14 shrink-0 border-r border-border flex items-center justify-center gap-1 text-xs font-semibold">
        {item.user_score != null ? (
          <>
            <IconStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span>{item.user_score}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40">-</span>
        )}
      </div>

      {/* Progress */}
      <div className="w-20 px-1 shrink-0 border-r border-border flex items-center justify-center text-xs font-semibold">
        <span className="text-muted-foreground">{progressDisplay}</span>
      </div>

      {/* Status / date */}
      <div
        className={cn(
          "w-28 shrink-0 flex items-center justify-center gap-1.5 text-[11px] font-semibold",
          STATUS_BLOCK[item.status],
        )}
      >
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 shrink-0">
          {statusIcons[item.status]}
        </span>
        <span className="truncate">{statusText}</span>
      </div>
    </div>
  );

  if (mobileTapAction === "edit") {
    return (
      <>
        <div className="cursor-pointer md:hidden" onClick={() => onEdit(item)}>
          {row}
        </div>
        <Link
          to={`/item/${item.id}`}
          state={{ backLabel }}
          className="hidden md:block"
        >
          {row}
        </Link>
      </>
    );
  }

  return (
    <Link to={`/item/${item.id}`} state={{ backLabel }} className="block">
      {row}
    </Link>
  );
}

export function TableItem({
  item,
  onEdit,
  mobileTapAction = "edit",
  hideStatusDate,
  stacked = false,
  isFirst = false,
  className,
}: TableItemProps) {
  const location = useLocation();
  const backLabel =
    location.pathname === "/"
      ? "Home"
      : location.pathname === "/books"
        ? "Books"
        : location.pathname === "/games"
          ? "Games"
          : location.pathname === "/search"
            ? "Search"
            : location.pathname.startsWith("/collections/")
              ? "Collection"
              : "Library";
  const [isManageCollectionsOpen, setIsManageCollectionsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { enrichSingle } = useMetadataEnrich();
  const statusDate = getStatusDate(item);
  const preferences = useShelfStore((s) => s.preferences);
  const statusText = hideStatusDate
    ? statusLabels[item.status]
    : statusDate
      ? formatDate(statusDate, preferences?.date_format)
      : statusLabels[item.status];

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden bg-card text-card-foreground dark:bg-[#0A0A0A]",
          stacked ? "border-b border-border/60" : "border border-border/60",
          stacked && isFirst && "border-t",
          className,
        )}
      >
        <RowBody
          item={item}
          statusText={statusText}
          onEdit={onEdit}
          mobileTapAction={mobileTapAction}
          backLabel={backLabel}
        />

        <div
          className="hidden md:flex absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className={iconActionButtonClassName()}
              aria-label="Item actions"
            >
              <IconDots className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                {syncing ? "Syncing..." : "Sync"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsManageCollectionsOpen(true)}
              >
                <IconPlaylistAdd className="h-4 w-4 mr-2" />
                Add to Collection...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onEdit(item)}
              >
                <IconTrash className="h-4 w-4 mr-2" />
                Delete...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ManageCollectionsDialog
        itemId={item.id}
        open={isManageCollectionsOpen}
        onOpenChange={setIsManageCollectionsOpen}
      />
    </>
  );
}
