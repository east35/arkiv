import { useEffect, useRef, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  Link,
  useOutletContext,
} from "react-router-dom";
import {
  IconSearchOff,
  IconArrowLeft,
  IconPencil,
  IconPlaylist,
  IconUser,
  IconCalendar,
  IconStack2,
  IconDeviceGamepad2,
  IconBookmark,
  IconInfoCircle,
  IconList,
  IconStarFilled,
} from "@tabler/icons-react";

import { useShelfStore } from "@/store/useShelfStore";
import { useItems } from "@/hooks/useItems";
import { useCollections } from "@/hooks/useCollections";
import { StatusSheet } from "@/components/status-sheet/StatusSheet";
import type { StatusSheetFocusField } from "@/components/status-sheet/StatusSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ManageCollectionsDialog } from "@/components/collections/ManageCollectionsDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { FullItem } from "@/types";
import { formatDateTime } from "@/lib/utils";

import { useMetadataEnrich } from "@/hooks/useMetadataEnrich";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ItemDetailHeader } from "@/components/item-detail/ItemDetailHeader";
import { ItemDetailSidebar } from "@/components/item-detail/ItemDetailSidebar";
import {
  ItemDetailContent,
  ItemDetailHero,
} from "@/components/item-detail/ItemDetailContent";
import {
  MobileAccordion,
  AccordionSection,
} from "@/components/item-detail/MobileAccordion";
import {
  NotesPanelContent,
  DiscussContent,
} from "@/components/item-detail/NotesPanel";
import { RecommendationsRow } from "@/components/item-detail/RecommendationsRow";
import { LibraryRow } from "@/components/item-detail/LibraryRow";
import { SeriesRow } from "@/components/item-detail/SeriesRow";
import { HowLongToBeatSection } from "@/components/item-detail/HowLongToBeatSection";
import { getCollectionCoverUrl } from "@/components/item-detail/collection-cover";
import { hasHowLongToBeatData } from "@/lib/howlongtobeat";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  useOutletContext<{ scrolled?: boolean }>();
  const locationState = location.state as {
    backLabel?: string;
    initialTab?: string;
    openNotes?: boolean;
  } | null;
  const backLabel: string | null = locationState?.backLabel ?? null;
  const initialTab = (locationState?.initialTab ?? "overview") as
    | "overview"
    | "notes"
    | "discuss";
  const { items, collections, preferences } = useShelfStore();
  const { fetchItems } = useItems();
  const { fetchItemMemberships, fetchCollections } = useCollections();

  const [item, setItem] = useState<FullItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetFocusField, setSheetFocusField] = useState<StatusSheetFocusField | undefined>();
  const [isManageCollectionsOpen, setIsManageCollectionsOpen] = useState(false);
  const [itemCollectionIds, setItemCollectionIds] = useState<string[]>([]);
  const [desktopTab, setDesktopTab] = useState<
    "overview" | "notes" | "discuss"
  >(initialTab);
  const [mobileTab, setMobileTab] = useState<"overview" | "notes" | "discuss">(
    initialTab,
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [libraryEmpty, setLibraryEmpty] = useState(false);
  const [hltbLoading, setHltbLoading] = useState(false);
  const enrichedForItem = useRef<string | null>(null);
  const { enrichSingle } = useMetadataEnrich();
  const hasAI = Boolean(preferences?.ai_provider && preferences?.ai_api_key);
  const activeDesktopTab =
    !hasAI && desktopTab === "discuss" ? "notes" : desktopTab;
  const activeMobileTab =
    !hasAI && mobileTab === "discuss" ? "notes" : mobileTab;

  const handleDeleteSuccess = (deletedItem: FullItem) => {
    setItem((current) => (current?.id === deletedItem.id ? null : current));
    setIsSheetOpen(false);

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/home");
  };

  // Find item in store or fetch
  useEffect(() => {
    if (!id) return;
    const found = items.find((i) => i.id === id);
    if (found) {
      setItem(found);
    } else {
      fetchItems().then((allItems) => {
        const fresh = allItems.find((i) => i.id === id);
        if (fresh) setItem(fresh);
      });
    }
  }, [id, items, fetchItems]);

  // Fetch collection memberships
  useEffect(() => {
    if (!id) return;
    if (collections.length === 0) fetchCollections().catch(() => {});
    fetchItemMemberships(id)
      .then((memberships) => {
        setItemCollectionIds(
          memberships.map((membership) => membership.collection_id),
        );
      })
      .catch(() => {});
  }, [id, fetchItemMemberships, fetchCollections, collections.length]);

  // Reset per-item state when navigating to a different item
  useEffect(() => {
    setLibraryEmpty(false);
    enrichedForItem.current = null;
  }, [id]);

  // Auto-enrich game silently when key external metadata is missing.
  useEffect(() => {
    if (!item || item.media_type !== "game") return;
    const missingSimilarGames =
      !item.game.similar_games || item.game.similar_games.length === 0;
    const missingHltb = !hasHowLongToBeatData(item.game);
    if (!missingSimilarGames && !missingHltb) return;
    if (enrichedForItem.current === item.id) return;
    enrichedForItem.current = item.id;
    if (missingHltb) setHltbLoading(true);
    void enrichSingle(item, true).finally(() => setHltbLoading(false));
  }, [item, enrichSingle]);

  const itemCollections = collections.filter((collection) =>
    itemCollectionIds.includes(collection.id),
  );

  /* ── Loading / 404 ── */
  if (!item && !items.length) return <LoadingState className="h-full" />;

  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been deleted or the link is invalid."
        icon={<IconSearchOff className="h-12 w-12" />}
        className="h-full"
        action={
          <Button variant="outline" onClick={() => navigate("/home")}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        }
      />
    );
  }

  const isGame = item.media_type === "game";
  const coverUrl =
    item.cover_url ||
    (isGame
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
      : "https://books.google.com/googlebooks/images/no_cover_thumb.gif");

  const selectedPlatformDisplay = isGame
    ? item.game.active_platform || item.game.platforms[0] || "—"
    : item.book.format || "Digital";

  const minimizedHeader = (
    <div className="flex items-center gap-3 bg-background">
      <div className="h-[52px] w-[35px] shrink-0 overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={item.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedPlatformDisplay}
        </p>
      </div>
    </div>
  );

  /* Build mobile metadata segments (pipe-separated) */
  const mobileMeta: {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[] = [];
  if (isGame) {
    if (item.game.developer)
      mobileMeta.push({ icon: IconUser, text: item.game.developer });
  } else {
    if (item.book.author)
      mobileMeta.push({ icon: IconUser, text: item.book.author });
  }
  const dateStr = isGame ? item.game.release_date : item.book.publish_date;
  if (dateStr)
    mobileMeta.push({
      icon: IconCalendar,
      text: String(new Date(dateStr).getFullYear()),
    });
  if (isGame && item.game.library)
    mobileMeta.push({ icon: IconStack2, text: item.game.library });
  if (!isGame && item.book.series_name)
    mobileMeta.push({ icon: IconStack2, text: item.book.series_name });
  const selectedPlatformText = isGame
    ? item.game.active_platform || item.game.platforms[0] || null
    : item.book.format || null;
  if (selectedPlatformText)
    mobileMeta.push({ icon: IconDeviceGamepad2, text: selectedPlatformText });

  const mobileDetailLabelClass =
    "text-sm font-medium leading-tight text-muted-foreground/75";
  const mobileDetailRowValueClass =
    "max-w-[62%] text-right text-sm font-medium leading-tight text-foreground";
  const mobileBadgeClassName = "bg-gray-600 p-3 text-white";
  const platformLabel = isGame ? "Platform" : "Format";

  return (
    <>
      <div className="flex-1 relative bg-background max-md:flex max-md:flex-col max-md:h-full max-md:overflow-hidden">
        {/* ═══════════════ Sticky Header ═══════════════ */}
        <ItemDetailHeader
          item={item}
          backLabel={backLabel}
          onStatusClick={() => { setSheetFocusField(undefined); setIsSheetOpen(true); }}
        />

        {/* ═══════════════ Desktop Layout ═══════════════ */}
        <div className="hidden md:block">
          <div className="max-w-5xl mx-auto grid grid-cols-[280px_1fr] items-start pb-20">
            {/* Left column — sidebar (always visible) */}
            <ItemDetailSidebar
              item={item}
              preferences={preferences}
              onEditField={(field) => { setSheetFocusField(field); setIsSheetOpen(true); }}
            />

            {/* Right column — hero always visible, tabs + content below */}
            <div className="min-w-0">
              <ItemDetailHero item={item} />

              {/* Segmented control between hero and content */}
              <div>
                <SegmentedControl
                  value={activeDesktopTab}
                  onValueChange={(v) =>
                    setDesktopTab(v as "overview" | "notes" | "discuss")
                  }
                  items={[
                    {
                      value: "overview",
                      label: "Overview",
                      ariaLabel: "Overview",
                    },
                    { value: "notes", label: "Notes", ariaLabel: "Notes" },
                    ...(hasAI
                      ? [
                          {
                            value: "discuss",
                            label: "Discuss",
                            ariaLabel: "Discuss",
                          },
                        ]
                      : []),
                  ]}
                  fullWidth
                  listClassName="!p-0 !gap-0 !border-0 !h-[55px] !bg-muted"
                  triggerClassName="!h-[55px] font-semibold text-sm !bg-muted data-active:!bg-[#e6e6e6] dark:data-active:!bg-card data-active:!text-foreground"
                />
              </div>

              {activeDesktopTab === "overview" && (
                <ItemDetailContent
                  item={item}
                  itemCollections={itemCollections}
                  isHltbLoading={hltbLoading}
                />
              )}
              {activeDesktopTab === "notes" && (
                <NotesPanelContent
                  itemId={item.id}
                  mediaType={item.media_type}
                  variant="sections"
                  onPromptClick={(prompt) => {
                    setPendingPrompt(prompt);
                    setDesktopTab("discuss");
                  }}
                />
              )}
              {hasAI && activeDesktopTab === "discuss" && (
                <div className="bg-[#e6e6e6] dark:bg-card">
                  <DiscussContent
                    itemId={item.id}
                    pendingMessage={pendingPrompt}
                    onPendingMessageSent={() => setPendingPrompt(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════ Mobile Layout — Overview & Notes ═══════════════ */}
        {activeMobileTab !== "discuss" && (
        <div className="md:hidden flex-1 overflow-y-auto min-h-0">
          {activeMobileTab === "overview" ? (
            <>
              {/* Cover — centered, large */}
              <div className="flex justify-center px-8 pt-4">
                <div className="w-[200px] aspect-[2/3] overflow-hidden rounded-lg">
                  <img
                    src={coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Title + metadata — centered */}
              <div className="text-center px-6 pt-5 pb-2">
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  {item.title}
                </h1>
                {mobileMeta.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {mobileMeta.map((m, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <m.icon className="h-3.5 w-3.5 shrink-0" />
                        {m.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            minimizedHeader
          )}

          {activeMobileTab === "overview" ? (
            <div className="pt-4">
              <MobileAccordion>
                {/* Your Details */}
                <AccordionSection
                  title="Your Details"
                  icon={IconBookmark}
                  contentClassName="pb-0"
                >
                  <div className="space-y-0">
                    {/* Progress */}
                    <div className="flex items-start justify-between gap-4 pb-4">
                      <span className={mobileDetailLabelClass}>
                        {isGame ? "Time Played" : "Pages Read"}
                      </span>
                      <span className={mobileDetailRowValueClass}>
                        {isGame
                          ? `${item.game.progress_hours}h ${item.game.progress_minutes}m`
                          : `${item.book.progress ?? 0} / ${item.book.page_count ?? "?"}`}
                      </span>
                    </div>

                    {/* Platform */}
                    <div className="flex items-center justify-between gap-4 border-t border-border/60 py-4">
                      <span className={mobileDetailLabelClass}>
                        {platformLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSheetOpen(true)}
                        className="flex items-center gap-2 text-right text-sm font-semibold leading-tight text-foreground transition-colors hover:text-foreground/80"
                      >
                        {isGame
                          ? item.game.active_platform ||
                            item.game.platforms[0] ||
                            "—"
                          : item.book.format || "Digital"}
                        <IconPencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-6 border-t border-border/60 py-4">
                      <div className="space-y-1.5">
                        <div className={mobileDetailLabelClass}>Your Score</div>
                        <div className="text-[2rem] font-bold tracking-tight leading-none">
                          {item.user_score ? (
                            <>
                              {item.user_score}
                              <span className="text-sm font-normal text-muted-foreground">
                                /10
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className={mobileDetailLabelClass}>
                          Community Score
                        </div>
                        <div className="text-[2rem] font-bold tracking-tight leading-none">
                          {item.source_score ? (
                            <>
                              {Math.round(item.source_score / 10)}
                              <span className="text-sm font-normal text-muted-foreground">
                                /10
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </div>
                        {item.source_votes != null && item.source_votes > 0 && (
                          <div className="text-[11px] font-medium leading-none text-muted-foreground/75">
                            {item.source_votes.toLocaleString()} votes
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="border-t border-border/60 divide-y divide-border/60">
                      <div className="flex items-start justify-between gap-4 py-3.5">
                        <span className={mobileDetailLabelClass}>Added</span>
                        <span className={mobileDetailRowValueClass}>
                          {formatDateTime(
                            item.created_at,
                            preferences?.date_format,
                            preferences?.time_format,
                          )}
                        </span>
                      </div>
                      {item.started_at && (
                        <div className="flex items-start justify-between gap-4 py-3.5">
                          <span className={mobileDetailLabelClass}>
                            Started
                          </span>
                          <span className={mobileDetailRowValueClass}>
                            {formatDateTime(
                              item.started_at,
                              preferences?.date_format,
                              preferences?.time_format,
                            )}
                          </span>
                        </div>
                      )}
                      {item.completed_at && (
                        <div className="flex items-start justify-between gap-4 py-3.5">
                          <span className={mobileDetailLabelClass}>
                            Completed
                          </span>
                          <span className={mobileDetailRowValueClass}>
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
                </AccordionSection>

                {/* Game / Book Details */}
                <AccordionSection
                  title={isGame ? "Game Details" : "Book Details"}
                  icon={IconInfoCircle}
                >
                  <div className="space-y-5">
                    {isGame && (
                      <HowLongToBeatSection
                        value={item.game}
                        isLoading={hltbLoading}
                      />
                    )}
                    {item.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {item.description}
                      </p>
                    )}
                    {item.genres.length > 0 && (
                      <div>
                        <h4 className={`${mobileDetailLabelClass} mb-2`}>
                          Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.genres.map((g) => (
                            <Badge
                              key={g}
                              variant="secondary"
                              className={mobileBadgeClassName}
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {isGame && item.game.themes.length > 0 && (
                      <div>
                        <h4 className={`${mobileDetailLabelClass} mb-2`}>
                          Themes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.game.themes.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className={mobileBadgeClassName}
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>

                {/* Collections */}
                <AccordionSection title="Collections" icon={IconList}>
                  <div className="space-y-3">
                    {itemCollections.length > 0 ? (
                      itemCollections.map((collection) => {
                        const coverUrl = getCollectionCoverUrl(
                          collection,
                          items,
                        );

                        return (
                          <div
                            key={collection.id}
                            className="flex overflow-hidden border bg-card"
                          >
                            <div className="h-[78px] w-[62px] shrink-0 overflow-hidden bg-secondary/50">
                              {coverUrl ? (
                                <img
                                  src={coverUrl}
                                  alt={collection.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <IconPlaylist className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                              <span className="font-medium text-sm truncate block">
                                {collection.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {collection.item_count
                                  ? `${collection.item_count} Items`
                                  : ""}
                              </span>
                            </div>
                            <Link
                              to={`/collections/${collection.id}`}
                              className="flex shrink-0 items-center border-l border-border/60 px-4 text-xs font-semibold transition-colors hover:bg-accent/40"
                            >
                              View Collection
                            </Link>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Not in any collections.
                        <Button
                          variant="link"
                          onClick={() => setIsManageCollectionsOpen(true)}
                          className="px-1 h-auto"
                        >
                          Add to collection
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionSection>

                {/* Library / Series (games only) */}
                {isGame && item.game.library && !libraryEmpty && (
                  <AccordionSection
                    title={`More in ${item.game.library}`}
                    icon={IconStack2}
                  >
                    <div>
                      <LibraryRow
                        item={item}
                        onEmpty={() => setLibraryEmpty(true)}
                      />
                    </div>
                  </AccordionSection>
                )}

                {/* Series (books only) */}
                {!isGame &&
                  item.book.series_name &&
                  items.filter(
                    (i) =>
                      i.media_type === "book" &&
                      item.media_type === "book" &&
                      i.book.series_name === item.book.series_name &&
                      i.id !== item.id,
                  ).length > 0 && (
                    <AccordionSection
                      title={`More in ${item.book.series_name}`}
                      icon={IconStack2}
                    >
                      <div>
                        <SeriesRow item={item} />
                      </div>
                    </AccordionSection>
                  )}

                {/* Recommendations (games only) */}
                {isGame &&
                  item.game.similar_games &&
                  item.game.similar_games.length > 0 && (
                    <AccordionSection
                      title="Recommendations"
                      icon={IconStarFilled}
                    >
                      <div>
                        <RecommendationsRow item={item} />
                      </div>
                    </AccordionSection>
                  )}
              </MobileAccordion>
            </div>
          ) : (
            <div className="px-4 pt-6 pb-6">
              <NotesPanelContent
                itemId={item.id}
                mediaType={item.media_type}
                onPromptClick={(prompt) => {
                  setPendingPrompt(prompt);
                  setMobileTab("discuss");
                }}
              />
            </div>
          )}
        </div>
        )}

        {/* ═══════════════ Mobile Layout — Discuss ═══════════════ */}
        {activeMobileTab === "discuss" && (
        <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
          {minimizedHeader}
          <DiscussContent
            itemId={item.id}
            pendingMessage={pendingPrompt}
            onPendingMessageSent={() => setPendingPrompt(null)}
            fillHeight
          />
        </div>
        )}

        {/* ═══════════════ Mobile Bottom Bar ═══════════════ */}
        <div className="md:hidden flex-shrink-0 bg-background">
          <SegmentedControl
            value={activeMobileTab}
            onValueChange={(v) =>
              setMobileTab(v as "overview" | "notes" | "discuss")
            }
            items={[
              { value: "overview", label: "Overview", ariaLabel: "Overview" },
              { value: "notes", label: "Notes", ariaLabel: "Notes" },
              ...(hasAI
                ? [{ value: "discuss", label: "Discuss", ariaLabel: "Discuss" }]
                : []),
            ]}
            fullWidth
            listClassName="!p-0 !gap-0 !border-0 !h-[55px]"
            triggerClassName="!h-[55px] font-semibold text-sm"
          />
        </div>

        {/* ═══════════════ Sheets / Dialogs ═══════════════ */}
        <StatusSheet
          item={item}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onDeleteSuccess={handleDeleteSuccess}
          focusField={sheetFocusField}
        />
        <ManageCollectionsDialog
          itemId={item.id}
          open={isManageCollectionsOpen}
          onOpenChange={setIsManageCollectionsOpen}
        />
      </div>
    </>
  );
}
