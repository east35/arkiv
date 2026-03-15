import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  IconPlaylist,
  IconUser,
  IconCalendar,
  IconStack2,
  IconDeviceGamepad2,
  IconDeviceTablet,
  IconBook2,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RecommendationsRow } from "./RecommendationsRow";
import { LibraryRow } from "./LibraryRow";
import { SeriesRow } from "./SeriesRow";
import { HowLongToBeatSection } from "./HowLongToBeatSection";
import { getCollectionCoverUrl } from "./collection-cover";
import { useShelfStore } from "@/store/useShelfStore";
import type { FullItem, Collection } from "@/types";

interface ItemDetailContentProps {
  item: FullItem;
  itemCollections: Collection[];
  isHltbLoading?: boolean;
}

// ─── Hero block (title, metadata, description) ───────────────────────────────

interface ItemDetailHeroProps {
  item: FullItem;
}

export function ItemDetailHero({ item }: ItemDetailHeroProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [maxDescHeight, setMaxDescHeight] = useState<number | null>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleMetaRef = useRef<HTMLDivElement>(null);
  const isGame = item.media_type === "game";

  // Reset per-item state when navigating to a different item
  useEffect(() => {
    setIsDescriptionOpen(false);
    setIsClamped(false);
    setMaxDescHeight(null);
  }, [item.id]);

  // ResizeObserver on the stable hero + titleMeta elements (not the desc wrapper,
  // which changes height when the "read more" button appears/disappears).
  useEffect(() => {
    const hero = heroRef.current;
    const desc = descRef.current;
    if (!hero || !desc) return;

    const check = () => {
      const lh = parseFloat(getComputedStyle(desc).lineHeight) || 24;
      const heroPaddingV = 64; // p-8 = 32px top + 32px bottom
      const buttonReserve = 28;
      const heroH = hero.clientHeight;
      const titleMetaH = titleMetaRef.current?.clientHeight ?? 0;
      const available = heroH - heroPaddingV - titleMetaH - buttonReserve;
      const snapped = Math.max(lh, Math.floor(available / lh) * lh);

      // Temporarily remove maxHeight to read the full natural scroll height
      desc.style.maxHeight = "none";
      const naturalH = desc.scrollHeight;
      desc.style.maxHeight = "";

      if (naturalH <= snapped + buttonReserve) {
        setMaxDescHeight(null);
        setIsClamped(false);
      } else {
        setMaxDescHeight(snapped);
        setIsClamped(true);
      }
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(hero);
    if (titleMetaRef.current) observer.observe(titleMetaRef.current);
    return () => observer.disconnect();
  }, [item.description]);

  const meta: {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[] = [];
  if (isGame) {
    if (item.game.developer)
      meta.push({ icon: IconUser, text: item.game.developer });
  } else {
    if (item.book.author) meta.push({ icon: IconUser, text: item.book.author });
  }
  const dateStr = isGame ? item.game.release_date : item.book.publish_date;
  if (dateStr)
    meta.push({
      icon: IconCalendar,
      text: String(new Date(dateStr).getFullYear()),
    });
  if (isGame && item.game.library)
    meta.push({ icon: IconStack2, text: item.game.library });
  if (!isGame && item.book.series_name)
    meta.push({ icon: IconStack2, text: item.book.series_name });
  const selectedPlatformText = isGame
    ? item.game.active_platform || item.game.platforms[0] || null
    : item.book.format || null;
  if (selectedPlatformText) {
    let platformIcon = IconDeviceGamepad2;
    if (!isGame) {
      const fmt = selectedPlatformText.toLowerCase();
      platformIcon = fmt === "physical" ? IconBook2 : IconDeviceTablet;
    }
    const platformText = isGame
      ? selectedPlatformText
      : selectedPlatformText.charAt(0).toUpperCase() +
        selectedPlatformText.slice(1).toLowerCase();
    meta.push({ icon: platformIcon, text: platformText });
  }

  return (
    <div
      ref={heroRef}
      className="p-8 flex flex-col overflow-hidden"
      style={{ height: 365, backgroundColor: "var(--muted)" }}
    >
      <div ref={titleMetaRef}>
        <h1 className="text-5xl font-bold tracking-tight mb-3">{item.title}</h1>
        {meta.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground text-base mb-5">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <m.icon className="h-4 w-4 shrink-0" />
                {m.text}
              </span>
            ))}
          </div>
        )}
      </div>
      {item.description && (
        <>
          <div className="flex-1 min-h-0 overflow-hidden">
            <p
              ref={descRef}
              className="overflow-hidden text-base leading-relaxed text-muted-foreground whitespace-pre-line"
              style={
                maxDescHeight !== null
                  ? { maxHeight: maxDescHeight }
                  : undefined
              }
            >
              {item.description}
            </p>
          </div>
          {isClamped && !isDescriptionOpen && (
            <button
              onClick={() => setIsDescriptionOpen(true)}
              className="self-start shrink-0 bg-primary text-white font-medium text-sm mt-2 px-3 py-1 rounded-none border-none hover:opacity-90 transition-opacity"
            >
              read more…
            </button>
          )}
          <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription>Full description</DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-line leading-relaxed mt-4">
                {item.description}
              </p>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// ─── Body (tags, collections, recommendations) ────────────────────────────────

export function ItemDetailContent({
  item,
  itemCollections,
  isHltbLoading,
}: ItemDetailContentProps) {
  const isGame = item.media_type === "game";
  const items = useShelfStore((s) => s.items);
  const showLibraryRow =
    item.media_type === "game" && Boolean(item.game.library);
  const showSeriesRow =
    item.media_type === "book" &&
    Boolean(item.book.series_name) &&
    items.some(
      (libraryItem) =>
        libraryItem.media_type === "book" &&
        libraryItem.book.series_name === item.book.series_name &&
        libraryItem.id !== item.id,
    );
  const showRecommendations =
    item.media_type === "game" &&
    Boolean(item.game.similar_games && item.game.similar_games.length > 0);

  return (
    <div className="min-w-0 bg-[efefef] dark:bg-card">
      {/* ── Tags, collections, recommendations ── */}
      <div className="bg-[#e6e6e6] dark:bg-card">
        {isGame && (
          <HowLongToBeatSection value={item.game} isLoading={isHltbLoading} />
        )}

        {/* Genres & Themes */}
        <div className="flex p-6 border-b border-[#cecece] dark:border-border/60 last:border-b-0 flex-wrap gap-x-12 gap-y-6">
          {item.genres.length > 0 && (
            <div>
              <h3 className="text-foreground tx-sm mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {item.genres.map((g) => (
                  <Badge
                    key={g}
                    variant="secondary"
                    className="bg-gray-600 p-3 text-sm font-normal text-white"
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {isGame && item.game.themes.length > 0 && (
            <div>
              <h3 className="text-foreground tx-sm mb-3">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {item.game.themes.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="bg-gray-600 p-3 text-sm font-normal text-white"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Collections */}
        {itemCollections.length > 0 && (
          <div className="p-6 border-b border-[#cecece] dark:border-border/60 last:border-b-0">
            <h3 className="text-foreground tx-sm mb-3">Collections</h3>
            <div className="space-y-2">
              {itemCollections.map((collection) => {
                const coverUrl = getCollectionCoverUrl(collection, items);

                return (
                  <div
                    key={collection.id}
                    className="flex overflow-hidden bg-background/50"
                  >
                    <div className="h-[88px] w-[72px] shrink-0 overflow-hidden bg-secondary/50">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={collection.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <IconPlaylist className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
                      <h4 className="font-semibold text-sm truncate">
                        {collection.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {collection.item_count
                          ? `${collection.item_count} Items`
                          : "Collection"}
                      </p>
                    </div>
                    <Link
                      to={`/collections/${collection.id}`}
                      className="flex shrink-0 items-center border-l border-[#cecece] dark:border-border/60 px-5 text-sm font-semibold transition-colors hover:bg-accent/40"
                    >
                      View Collection
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {(showLibraryRow || showSeriesRow) && (
          <div className="p-6 mb-3 border-b border-[#cecece] dark:border-border/60 last:border-b-0">
            {/* Library / Series */}
            {showLibraryRow && <LibraryRow key={item.id} item={item} />}
            {showSeriesRow && <SeriesRow item={item} />}
          </div>
        )}
        {showRecommendations && (
          <div className="p-6 mb-3 border-b border-[#cecece] dark:border-border/60 last:border-b-0">
            {/* Recommendations */}
            <RecommendationsRow item={item} />
          </div>
        )}
      </div>
    </div>
  );
}
