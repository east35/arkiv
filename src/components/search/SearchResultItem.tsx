import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/hooks/useExternalSearch";
import type { ViewMode } from "@/types";

interface SearchResultItemProps {
  result: SearchResult;
  viewMode: ViewMode;
  isDesktop: boolean;
  isAdding: boolean;
  onAdd: (result: SearchResult) => void;
  onMobileTap: (result: SearchResult) => void;
}

function getCoverUrl(result: SearchResult): string {
  if (result.cover) return result.cover;

  return result.mediaType === "game"
    ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
    : "https://books.google.com/googlebooks/images/no_cover_thumb.gif";
}

function getMetaText(result: SearchResult): string {
  return [result.subtitle, result.year].filter(Boolean).join(" • ");
}

function PosterSearchResult({
  result,
  isDesktop,
  isAdding,
  onAdd,
  onMobileTap,
}: Omit<SearchResultItemProps, "viewMode">) {
  const coverUrl = getCoverUrl(result);
  const metaText = getMetaText(result);
  const handleActivate = () => {
    if (isAdding) return;
    if (isDesktop) {
      onAdd(result);
      return;
    }
    onMobileTap(result);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A]",
        "cursor-pointer",
        isAdding && "opacity-75",
      )}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Add ${result.title} to collection`}
      aria-disabled={isAdding}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={result.title}
          className="h-full w-full object-cover transition-transform duration-300 md:group-hover:scale-105"
          loading="lazy"
        />

        {/* Plus icon on hover (desktop) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/30">
          <button
            className="flex h-10 w-10 items-center justify-center bg-white/90 text-black transition-transform hover:scale-110 disabled:opacity-60"
            disabled={isAdding}
            onClick={(event) => {
              event.stopPropagation();
              handleActivate();
            }}
            aria-label={`Add ${result.title} to collection`}
          >
            {isAdding ? (
              <IconLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <IconPlus className="h-5 w-5" />
            )}
          </button>
        </div>

        {isAdding && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <IconLoader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="px-2.5 pt-2 pb-3">
        <h3
          className="line-clamp-1 text-sm font-bold leading-tight"
          title={result.title}
        >
          {result.title}
        </h3>
        <p
          className={cn(
            "mt-0.5 min-h-[1rem] truncate text-[11px] text-muted-foreground",
            !metaText && "invisible",
          )}
          title={metaText}
        >
          {metaText || " "}
        </p>
      </div>
    </div>
  );
}

function TableSearchResult({
  result,
  isAdding,
  onAdd,
}: Omit<SearchResultItemProps, "viewMode">) {
  const coverUrl = getCoverUrl(result);
  const metaText = getMetaText(result);

  return (
    <div
      className={cn(
        "group flex items-stretch h-16 border bg-card text-card-foreground dark:bg-[#0A0A0A] overflow-hidden",
        isAdding && "opacity-75",
      )}
    >
      {/* Cover */}
      <div className="w-10 shrink-0 overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={result.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Title + subtitle */}
      <div className="flex min-w-0 flex-1 items-center px-3 border-r border-border">
        <div className="min-w-0 w-full">
          <h3 className="truncate text-sm font-bold leading-tight" title={result.title}>
            {result.title}
          </h3>
          <p
            className={cn("mt-0.5 truncate text-[11px] text-muted-foreground", !metaText && "invisible")}
            title={metaText}
          >
            {metaText || " "}
          </p>
        </div>
      </div>

      {/* Add button — flush, no border, white/black bg */}
      <button
        className="shrink-0 flex items-center gap-2 px-4 text-sm font-semibold bg-white text-black dark:bg-black dark:text-white hover:bg-white/90 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        disabled={isAdding}
        onClick={() => onAdd(result)}
        aria-label={`Add ${result.title} to collection`}
      >
        {isAdding ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4" />
        )}
        {isAdding ? "Adding..." : "Add to Collection"}
      </button>
    </div>
  );
}

export function SearchResultItem(props: SearchResultItemProps) {
  if (props.viewMode === "table") {
    return <TableSearchResult {...props} />;
  }

  return <PosterSearchResult {...props} />;
}
