import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconPlus, IconLoader2 } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useShelfStore } from "@/store/useShelfStore";
import { useCommitItem } from "@/hooks/useCommitItem";
import { statusIcons, statusLabels } from "@/components/status-icons";
import { cn } from "@/lib/utils";
import type { FullItem, Status } from "@/types";

/** Shape returned by the igdb-proxy `library-games` action */
interface LibraryGame {
  id: number;
  name: string;
  cover: string | null;
  releaseDate: string | null;
}

interface LibraryRowProps {
  item: FullItem;
  onEmpty?: () => void;
}

/* Status bar colours — mirrors PosterItem */
const STATUS_BAR: Record<Status, string> = {
  in_library: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
};

const COVER_FALLBACK =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png";

/**
 * Displays all games in the same IGDB library as the current game.
 * Uses the same poster card style as PosterItem.
 * - Games already in the user's library link directly to their detail page.
 * - External games are committed silently, then navigated to their new detail page.
 * - "Back to" label shows the current game's title.
 */
export function LibraryRow({ item, onEmpty }: LibraryRowProps) {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(false);
  const items = useShelfStore((s) => s.items);
  const { commit, committingId } = useCommitItem();
  const navigate = useNavigate();

  const libraryName = item.media_type === "game" ? item.game.library : null;

  useEffect(() => {
    if (!libraryName) return;

    let cancelled = false;
    setLoading(true);

    supabase.functions
      .invoke("igdb-proxy", {
        body: { action: "library-games", query: libraryName },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && Array.isArray(data)) {
          const filtered = data.filter(
            (g: LibraryGame) => g.name !== item.title,
          );
          setGames(filtered);
          if (filtered.length === 0) onEmpty?.();
        } else {
          onEmpty?.();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryName, item.title, onEmpty]);

  // Build a map of external IGDB IDs → library items for quick lookup
  const libraryByExternalId = new Map(
    items
      .filter((i) => i.media_type === "game" && i.external_id)
      .map((i) => [String(i.external_id), i]),
  );

  /** Quick-add: commit external game, then navigate to its new detail page */
  const handleQuickAdd = async (e: React.MouseEvent, gameId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = await commit(gameId, "game");
    if (newItem) {
      navigate(`/item/${newItem.id}`, { state: { backLabel: item.title } });
    }
  };

  if (!libraryName || (!loading && games.length === 0)) return null;

  return (
    <div>
      <h3 className="text-foreground tx-sm mb-3 hidden md:block">
        More in {libraryName}
      </h3>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4">Loading…</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {games.map((game) => {
            const libraryItem = libraryByExternalId.get(String(game.id));
            const isAdding = committingId === game.id;
            const cover =
              libraryItem?.cover_url || game.cover || COVER_FALLBACK;
            const title = libraryItem?.title || game.name;
            const subtitle =
              libraryItem && libraryItem.media_type === "game"
                ? libraryItem.game.developer || libraryItem.game.publisher || ""
                : game.releaseDate
                  ? String(new Date(game.releaseDate).getFullYear())
                  : "";

            const linkTo = libraryItem
              ? `/item/${libraryItem.id}`
              : `/item/external/game/${game.id}`;

            return (
              <Link
                key={game.id}
                to={linkTo}
                state={{ backLabel: item.title }}
                className="overflow-hidden bg-card dark:bg-[#0A0A0A] flex flex-col group"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  <img
                    src={cover}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      View Details
                    </span>
                  </div>
                </div>
                <div className="px-2.5 pt-2 pb-1.5 flex-1">
                  <h4
                    className="font-bold text-sm leading-tight line-clamp-1"
                    title={title}
                  >
                    {title}
                  </h4>
                  <p
                    className={cn(
                      "text-[11px] text-muted-foreground truncate mt-0.5 min-h-[1rem]",
                      !subtitle && "invisible",
                    )}
                  >
                    {subtitle || " "}
                  </p>
                </div>
                {libraryItem ? (
                  <div
                    className={cn(
                      "w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px]",
                      STATUS_BAR[libraryItem.status],
                    )}
                  >
                    <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">
                      {statusIcons[libraryItem.status]}
                    </span>
                    <span className="truncate">
                      {statusLabels[libraryItem.status]}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleQuickAdd(e, game.id)}
                    disabled={isAdding}
                    className="w-full shrink-0 px-3 py-2 flex items-center gap-2 font-semibold text-[11px] bg-zinc-300 text-zinc-950 hover:bg-zinc-400 transition-colors disabled:opacity-60"
                  >
                    {isAdding ? (
                      <IconLoader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <IconPlus className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {isAdding ? "Adding…" : "Add"}
                    </span>
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
