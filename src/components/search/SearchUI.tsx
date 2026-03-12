import { useState, useEffect, useRef } from "react";
import {
  useSearchParams,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import {
  IconSearch,
  IconLoader2,
  IconDeviceGamepad2,
  IconBook,
  IconX,
  IconLayoutGrid,
  IconTable,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchResultItem } from "./SearchResultItem";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useExternalSearch,
  SEARCH_DEBOUNCE_MS,
  type SearchResult,
} from "@/hooks/useExternalSearch";
import { useCommitItem, SHEET_CLOSE_DELAY_MS } from "@/hooks/useCommitItem";
import { useItems } from "@/hooks/useItems";
import { StatusSheet } from "@/components/status-sheet/StatusSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MediaType, FullItem } from "@/types";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CollectionTypeSwitcher } from "@/components/library/CollectionTypeSwitcher";
import { useShelfStore } from "@/store/useShelfStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export function SearchUI() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mediaType, setMediaType] = useState<MediaType>(
    (searchParams.get("type") as MediaType) || "game",
  );
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // null → no alert; "status" → ask to update status; "cancel" → ask to cancel add
  const [alertPhase, setAlertPhase] = useState<"status" | "cancel" | null>(
    null,
  );
  const [pendingItem, setPendingItem] = useState<FullItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<SearchResult | null>(null);
  const statusChoiceMade = useRef(false);
  const viewMode = useShelfStore((state) => state.viewMode);
  const setViewMode = useShelfStore((state) => state.setViewMode);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { scrolled } = useOutletContext<{ scrolled?: boolean }>();

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const { results, loading, search, clearResults } = useExternalSearch();
  const { commit, committingId } = useCommitItem();
  const { deleteItem } = useItems();

  // Attempt focus on mount — works reliably on desktop, best-effort on iOS
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep URL in sync with filter state
  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("type", mediaType);
    if (query) {
      nextParams.set("q", query);
    }
    setSearchParams(nextParams, { replace: true });
  }, [mediaType, query, setSearchParams]);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery, mediaType);
    } else {
      clearResults();
    }
  }, [debouncedQuery, mediaType, search, clearResults]);

  const handleAdd = async (result: SearchResult) => {
    const item = await commit(result.id, mediaType);
    if (item) {
      setPendingItem(item);
      statusChoiceMade.current = false;
      setAlertPhase("status");
    }
  };

  const handleConfirmAdd = async () => {
    if (!confirmResult) return;
    const result = confirmResult;
    setConfirmResult(null);
    await handleAdd(result);
  };

  // Status alert handlers
  const handleUpdateStatus = () => {
    statusChoiceMade.current = true;
    setAlertPhase(null);
    setIsSheetOpen(true);
  };

  const handleJustAdd = () => {
    statusChoiceMade.current = true;
    setAlertPhase(null);
    setPendingItem(null);
  };

  const handleStatusAlertOpenChange = (open: boolean) => {
    if (!open && !statusChoiceMade.current) {
      // Dismissed without a choice (e.g. Escape) → ask about cancelling
      setAlertPhase("cancel");
    }
  };

  // Cancel alert handlers
  const handleConfirmCancel = async () => {
    if (pendingItem) await deleteItem(pendingItem.id);
    setAlertPhase(null);
    setPendingItem(null);
  };

  const handleKeepItem = () => {
    setAlertPhase(null);
    setPendingItem(null);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setTimeout(() => setPendingItem(null), SHEET_CLOSE_DELAY_MS);
    }
  };

  const typeItems = [
    { value: "game" as MediaType, label: "Games", icon: IconDeviceGamepad2 },
    { value: "book" as MediaType, label: "Books", icon: IconBook },
  ];
  const viewModeItems = [
    { value: "poster", icon: IconLayoutGrid, ariaLabel: "Poster View" },
    { value: "table", icon: IconTable, ariaLabel: "Table View" },
  ];

  return (
    <div className="flex flex-col fixed md:relative inset-0 md:inset-auto z-[60] md:z-auto bg-[#f5f5f5] dark:bg-[#171717]">
      <div
        className={cn(
          "sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pt-6 sm:pb-6 pb-2",
          scrolled && "border-b",
        )}
      >
        <div className="flex items-center justify-between gap-2 py-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Add to Collection
          </h1>
          <div className="flex items-center gap-2">
            <SegmentedControl
              value={mediaType}
              onValueChange={(value) => setMediaType(value as MediaType)}
              items={typeItems.map(({ value, label, icon }) => ({
                value,
                label,
                icon,
                ariaLabel: label,
              }))}
              size="sm"
              className="hidden md:block"
              listClassName="!h-[38px] !p-0.5 !gap-0.5"
              triggerClassName="!h-[34px] !px-4 !py-0 !leading-none"
            />
            <SegmentedControl
              value={viewMode}
              onValueChange={(value) =>
                setViewMode(value as "poster" | "table")
              }
              items={viewModeItems}
              size="sm"
              className="hidden md:block"
              listClassName="!h-[38px] !p-0.5 !gap-0.5"
              triggerClassName="!h-[34px] !w-9 !px-0 !py-0"
            />
            {/* Mobile close */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <IconX className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative border-b bg-[#FBFBFB] dark:bg-[#0F0F0F]">
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          autoFocus
          inputMode="search"
          placeholder={`Search for ${mediaType}s...`}
          className="pl-12 pr-12 h-11 border-0 focus-visible:ring-0 !bg-transparent dark:!bg-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f5] px-4 pb-8 dark:bg-[#171717] sm:px-6">
        <div className="mx-auto w-full max-w-[1400px] py-6">
          {!loading && debouncedQuery && results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : viewMode === "poster" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  viewMode={viewMode}
                  isDesktop={isDesktop}
                  onAdd={handleAdd}
                  onMobileTap={setConfirmResult}
                  isAdding={committingId === result.id}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-5xl flex-col gap-2">
              {results.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  viewMode={viewMode}
                  isDesktop={isDesktop}
                  onAdd={handleAdd}
                  onMobileTap={setConfirmResult}
                  isAdding={committingId === result.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <StatusSheet
        item={pendingItem}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
      />

      <AlertDialog
        open={!!confirmResult}
        onOpenChange={(open) => {
          if (!open) setConfirmResult(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Add "{confirmResult?.title}" to your collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd}>
              Add to Collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert 1: offer to update status */}
      <AlertDialog
        open={alertPhase === "status"}
        onOpenChange={handleStatusAlertOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update status?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingItem?.title}" was added to your collection. Would you
              like to update its status now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleJustAdd}>
              No, just add to collection
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus}>
              Yes, update status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert 2: confirm cancelling the add */}
      <AlertDialog open={alertPhase === "cancel"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel adding to collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{pendingItem?.title}" from your collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepItem}>
              No, keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile type picker — pinned to bottom of full-screen overlay */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background pb-safe">
        <CollectionTypeSwitcher
          value={mediaType}
          onValueChange={setMediaType}
          className="w-full"
        />
      </div>
    </div>
  );
}
