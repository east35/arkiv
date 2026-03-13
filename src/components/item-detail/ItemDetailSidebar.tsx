import { IconFlag, IconPencil } from "@tabler/icons-react";
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
    <div className="space-y-0 border-r">
      {/* Cover Image — edge-to-edge, no rounding */}
      <div className="w-full aspect-[2/3] overflow-hidden bg-muted border-b">
        <img
          src={coverUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Sidebar card — framed module below cover */}
      <div className="bg-card rounded-b-lg">
      {/* Your Progress */}
      <div className="pt-5 pb-4 px-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Your Progress
        </div>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold tracking-tight">
            {isGame
              ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
              : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`}
          </span>
          {item.status === "completed" && (
            <IconFlag className="h-5 w-5 text-green-500 fill-green-500" />
          )}
        </div>
      </div>

      {/* Platform / Format row */}
      <div className="flex items-center justify-between py-3  px-4 border-t border-border/60">
        <span className="text-sm text-muted-foreground">{platformLabel}</span>
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

      {/* Scores — side-by-side */}
      <div className="grid grid-cols-2 gap-4 py-4  px-4 border-t border-border/60">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Your Score
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {item.user_score ? (
              <span>
                {item.user_score}
                <span className="text-sm text-muted-foreground font-normal">
                  /10
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Community Score
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {item.source_score ? (
              <span>
                {Math.round(item.source_score / 10)}
                <span className="text-sm text-muted-foreground font-normal">
                  /10
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </div>
          {item.source_votes != null && item.source_votes > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.source_votes.toLocaleString()} Votes
            </div>
          )}
        </div>
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
      </div>{/* end bg-card wrapper */}
    </div>
  );
}
