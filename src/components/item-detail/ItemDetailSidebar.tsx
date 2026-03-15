import { IconPencil, IconExternalLink } from "@tabler/icons-react";
import { formatDateTime } from "@/lib/utils";
import type { FullItem, BookItem, UserPreferences } from "@/types";
import type { StatusSheetFocusField } from "@/components/status-sheet/StatusSheet";

interface ItemDetailSidebarProps {
  item: FullItem;
  preferences: UserPreferences | null;
  onEditField: (field: StatusSheetFocusField) => void;
}

function SidebarRow({
  label,
  value,
  onEdit,
  action,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="flex items-center gap-2 font-medium text-right min-w-0">
        <span className="truncate">{value}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
          >
            <IconPencil className="h-3.5 w-3.5" />
          </button>
        )}
        {action}
      </span>
    </div>
  );
}

function igdbSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hardcoverUrl(item: BookItem): string {
  const slug = item.book.hardcover_slug ?? igdbSlug(item.title);
  return `https://hardcover.app/books/${slug}`;
}

export function ItemDetailSidebar({
  item,
  preferences,
  onEditField,
}: ItemDetailSidebarProps) {
  const isGame = item.media_type === "game";
  const platformLabel = isGame ? "Platform" : "Format";
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif");

  const igdbUrl = isGame ? `https://www.igdb.com/games/${igdbSlug(item.title)}` : null;

  return (
    <div className="space-y-0">
      {/* Cover Image — edge-to-edge, no rounding */}
      <div className="w-full aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Sidebar card — framed module below cover */}
      <div className="rounded-b-lg bg-[#e6e6e6] dark:bg-card border-r border-r-[#cecece] dark:border-r-border divide-y divide-[#cecece] dark:divide-border/60">
        <SidebarRow
          label={isGame ? "Time Played" : "Pages Read"}
          value={
            isGame
              ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
              : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`
          }
          onEdit={() => onEditField("progress")}
        />

        <SidebarRow
          label={platformLabel}
          value={
            isGame
              ? item.game.active_platform || item.game.platforms[0] || "—"
              : item.book.format
                ? item.book.format.charAt(0).toUpperCase() + item.book.format.slice(1).toLowerCase()
                : "Digital"
          }
          onEdit={() => onEditField("platform")}
        />

        <SidebarRow
          label="Your Score"
          value={item.user_score != null ? `${item.user_score} / 10` : "—"}
          onEdit={() => onEditField("score")}
        />

        {isGame && (
          <SidebarRow
            label="IGDB Score"
            value={
              item.source_score != null
                ? `${Math.round(item.source_score / 10)} / 10`
                : "—"
            }
            action={
              igdbUrl ? (
                <a
                  href={igdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : undefined
            }
          />
        )}

        {!isGame && (
          <SidebarRow
            label="Hardcover"
            value={
              item.source_score != null
                ? `${(item.source_score / 2).toFixed(1)} / 5`
                : "—"
            }
            action={
              <a
                href={hardcoverUrl(item as BookItem)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <IconExternalLink className="h-3.5 w-3.5" />
              </a>
            }
          />
        )}

        <SidebarRow
          label="Added"
          value={formatDateTime(
            item.created_at,
            preferences?.date_format,
            preferences?.time_format,
          )}
          onEdit={() => onEditField("dates")}
        />

        {item.started_at && (
          <SidebarRow
            label="Started"
            value={formatDateTime(
              item.started_at,
              preferences?.date_format,
              preferences?.time_format,
            )}
            onEdit={() => onEditField("dates")}
          />
        )}

        {item.completed_at && (
          <SidebarRow
            label="Completed"
            value={formatDateTime(
              item.completed_at,
              preferences?.date_format,
              preferences?.time_format,
            )}
            onEdit={() => onEditField("dates")}
          />
        )}
      </div>
    </div>
  );
}
