import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { usePromptSuggestions } from "@/hooks/usePromptSuggestions";
import type {
  ItemBookmark,
  ItemNote,
  ItemProgress,
  MediaType,
  Status,
} from "@/types";

interface AIPromptSuggestionsProps {
  itemId: string;
  mediaType: MediaType;
  status?: Status;
  progress: ItemProgress | null;
  notes: ItemNote[];
  bookmarks: ItemBookmark[];
  ready?: boolean;
  onSelect: (prompt: string) => void;
}

export function AIPromptSuggestions({
  itemId,
  mediaType,
  status,
  progress,
  notes,
  bookmarks,
  ready = true,
  onSelect,
}: AIPromptSuggestionsProps) {
  const { prompts, loading, error, refresh } = usePromptSuggestions({
    itemId,
    mediaType,
    status,
    progress,
    notes,
    bookmarks,
    enabled: ready,
  });

  return (
    <div className="overflow-hidden rounded-sm border border-[#cecece] bg-muted/30 dark:border-border/60">
      <div className="flex items-center justify-between border-b border-[#cecece] px-3 py-2 dark:border-border/60">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Suggested Prompts
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={!ready || loading}
          className="h-7 w-7 border-0"
          aria-label="Refresh suggested prompts"
        >
          {loading ? (
            <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <IconRefresh className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="divide-y">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-background/80 hover:bg-accent/40 transition-colors cursor-pointer"
          >
            <img
              src="/logo/arkiv-icon-black.svg"
              alt=""
              className="h-4 w-4 shrink-0 opacity-40 dark:hidden"
            />
            <img
              src="/logo/arkiv-icon-white.svg"
              alt=""
              className="hidden h-4 w-4 shrink-0 opacity-40 dark:block"
            />
            <span className="text-sm text-muted-foreground">{prompt}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="border-t border-[#cecece] px-3 py-2 text-xs text-muted-foreground dark:border-border/60">
          Suggestions may be out of date.
        </div>
      )}
    </div>
  );
}
