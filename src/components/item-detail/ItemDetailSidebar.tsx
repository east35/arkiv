import { IconPencil } from "@tabler/icons-react";
import { formatDateTime } from "@/lib/utils";
import type { FullItem, UserPreferences } from "@/types";

interface ItemDetailSidebarProps {
  item: FullItem;
  preferences: UserPreferences | null;
  onEditClick: () => void;
}

export function ItemDetailSidebar({
  item,
  preferences,
  onEditClick,
}: ItemDetailSidebarProps) {
  const isGame = item.media_type === "game";
  const platformLabel = isGame ? "Platform" : "Format";
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif");

  return (
    <div className="space-y-0 border-r border-r-[#cecece] dark:border-r-border">
      {/* Cover Image — edge-to-edge, no rounding */}
      <div className="w-full aspect-[2/3] overflow-hidden bg-muted border-b">
        <img
          src={coverUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Sidebar card — framed module below cover */}
      <div className="rounded-b-lg bg-[#e6e6e6] dark:bg-card">
        {/* Progress */}
        <div className="flex justify-between py-3 px-4 text-sm">
          <span className="text-muted-foreground">
            {isGame ? "Time Played" : "Pages Read"}
          </span>
          <span className="flex font-medium gap-2">
            {isGame
              ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
              : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`}
            <button
              onClick={onEditClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        {/* Platform / Format row */}
        <div className="flex items-center justify-between py-3 px-4 border-t border-border/60 text-sm">
          <span className="text-muted-foreground tx-sm">{platformLabel}</span>
          <span className="flex items-center gap-2 text-sm font-medium">
            {isGame
              ? item.game.active_platform || item.game.platforms[0] || "—"
              : item.book.format || "Digital"}
            <button
              onClick={onEditClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        {/* Scores */}
        <div className="border-t border-border/60 divide-y divide-border/60">
          <div className="flex justify-between py-3 px-4 text-sm">
            <span className="text-muted-foreground ">Your Score</span>
            <span className="font-medium gap-2 flex">
              {item.user_score != null ? `${item.user_score}/10` : "—"}
              <button
                onClick={onEditClick}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconPencil className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          {isGame && (
            <div className="flex justify-between py-3 px-4 text-sm">
              <span className="text-muted-foreground">IGDB Score</span>
              <span className="font-medium">
                {item.source_score != null
                  ? `${Math.round(item.source_score / 10)}/10`
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="border-t border-border/60 divide-y divide-border/60">
          <div className="flex justify-between py-3 px-4 text-sm">
            <span className="text-muted-foreground">Added</span>
            <span>
              {formatDateTime(
                item.created_at,
                preferences?.date_format,
                preferences?.time_format,
              )}
            </span>
          </div>
          {item.started_at && (
            <div className="flex justify-between py-3 px-4 text-sm">
              <span className="text-muted-foreground">Started</span>
              <span>
                {formatDateTime(
                  item.started_at,
                  preferences?.date_format,
                  preferences?.time_format,
                )}
              </span>
            </div>
          )}
          {item.completed_at && (
            <div className="flex justify-between py-3 px-4 text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span>
                {formatDateTime(
                  item.completed_at,
                  preferences?.date_format,
                  preferences?.time_format,
                )}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* end bg-card wrapper */}
    </div>
  );
}
