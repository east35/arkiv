/**
 * NotesPanel — the item workspace.
 *
 * Contains ProgressTracker, LinksPanel, NotesList, and (optionally) AIChat.
 * `NotesPanelContent` is the workspace body; `NotesPanel` wraps it in a Sheet
 * for the desktop slide-in view.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItemNotes } from "@/hooks/useItemNotes";
import { useItemProgress } from "@/hooks/useItemProgress";
import { useItemBookmarks } from "@/hooks/useItemBookmarks";
import { useAIChat } from "@/hooks/useAIChat";
import { useShelfStore } from "@/store/useShelfStore";
import { NotesList } from "./NotesList";
import { ProgressTracker } from "./ProgressTracker";
import { AIChat } from "./AIChat";
import { AIPromptSuggestions } from "./AIPromptSuggestions";
import { LinksPanel } from "./LinksPanel";
import type { MediaType, Status } from "@/types";

interface NotesPanelContentProps {
  itemId: string;
  mediaType?: MediaType;
  status?: Status;
  variant?: "compact" | "sections";
  onPromptClick?: (prompt: string) => void;
}

export function NotesPanelContent({
  itemId,
  mediaType,
  status,
  variant = "compact",
  onPromptClick,
}: NotesPanelContentProps) {
  const preferences = useShelfStore((s) => s.preferences);
  const hasAI = Boolean(preferences?.ai_provider && preferences?.ai_api_key);

  const { notes, fetchNotes, createNote, updateNote, deleteNote } =
    useItemNotes();
  const { progress, fetchProgress, upsertProgress } = useItemProgress();
  const {
    bookmarks,
    loading: bookmarksLoading,
    error: bookmarksError,
    fetchBookmarks,
    createBookmark,
    deleteBookmark,
  } = useItemBookmarks();
  const [contextReady, setContextReady] = useState({
    itemId,
    notes: false,
    progress: false,
    bookmarks: false,
  });

  useEffect(() => {
    let cancelled = false;

    const markReady = (key: "notes" | "progress" | "bookmarks") => {
      if (cancelled) return;
      setContextReady((current) => {
        const nextBase = current.itemId === itemId
          ? current
          : {
              itemId,
              notes: false,
              progress: false,
              bookmarks: false,
            };

        return { ...nextBase, [key]: true };
      });
    };

    void fetchNotes(itemId).catch((err) => {
      console.error(err);
    }).finally(() => markReady("notes"));

    void fetchProgress(itemId).catch((err) => {
      console.error(err);
    }).finally(() => markReady("progress"));

    void fetchBookmarks(itemId).catch((err) => {
      console.error(err);
    }).finally(() => markReady("bookmarks"));

    return () => {
      cancelled = true;
    };
  }, [fetchBookmarks, fetchNotes, fetchProgress, itemId]);

  const isSections = variant === "sections";
  const outer = isSections ? "bg-[#e6e6e6] dark:bg-card" : "space-y-6 px-3";
  const section = (extra?: string) =>
    cn(isSections ? "p-6 border-b border-[#cecece] dark:border-border/60 last:border-b-0" : "", extra);
  const suggestionContextReady =
    contextReady.itemId === itemId
    && contextReady.notes
    && contextReady.progress
    && contextReady.bookmarks;

  return (
    <div className={outer}>
      <div className={section()}>
        <h3 className="text-foreground tx-sm mb-3">Progress</h3>
        <ProgressTracker
          key={`${itemId}:${progress?.type ?? "chapter"}:${progress?.value ?? ""}`}
          progress={progress}
          onSave={async (update) => {
            await upsertProgress(itemId, update);
          }}
        />
        {hasAI && mediaType && onPromptClick && (
          <div className="mt-4">
            <AIPromptSuggestions
              itemId={itemId}
              mediaType={mediaType}
              status={status}
              progress={progress}
              notes={notes}
              bookmarks={bookmarks}
              ready={suggestionContextReady}
              onSelect={onPromptClick}
            />
          </div>
        )}
      </div>

      <div className={section(isSections ? "" : "border-t pt-6")}>
        <h3 className="text-foreground tx-sm mb-3">Bookmarks</h3>
        <LinksPanel
          itemId={itemId}
          mode="embedded"
          bookmarks={bookmarks}
          loading={bookmarksLoading}
          error={bookmarksError}
          onCreateBookmark={async (draft) => {
            await createBookmark(itemId, draft);
          }}
          onDeleteBookmark={deleteBookmark}
        />
      </div>

      <div className={section(isSections ? "" : "border-t pt-6")}>
        <h3 className="text-foreground tx-sm mb-3">Notes</h3>
        <NotesList
          notes={notes}
          onCreate={async (content) => {
            await createNote(itemId, content);
          }}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
      </div>
    </div>
  );
}

// ─── Discuss tab content ──────────────────────────────────────────────────────

export function DiscussContent({
  itemId,
  title,
  pendingMessage,
  onPendingMessageSent,
  fillHeight = false,
}: {
  itemId: string;
  title?: string;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
  fillHeight?: boolean;
}) {
  const preferences = useShelfStore((s) => s.preferences);
  const hasAI = Boolean(preferences?.ai_provider && preferences?.ai_api_key);
  const {
    threads,
    activeThread,
    activeThreadId,
    supportsThreading,
    loading,
    threadLoading,
    error,
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
    selectThread,
    sendMessage,
    setError,
  } = useAIChat();
  const [lastMessage, setLastMessage] = useState("");

  useEffect(() => {
    if (hasAI) {
      void fetchThreads(itemId);
    }
  }, [fetchThreads, hasAI, itemId]);

  const handleSend = async (message: string) => {
    if (!hasAI) return;
    setLastMessage(message);
    await sendMessage(itemId, message);
  };

  useEffect(() => {
    if (!hasAI || !pendingMessage || loading || threadLoading) return;
    queueMicrotask(() => {
      void handleSend(pendingMessage);
      onPendingMessageSent?.();
    });
  }, [pendingMessage, hasAI, loading, threadLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    if (lastMessage) void handleSend(lastMessage);
    else setError(null);
  };

  if (!hasAI) {
    return (
      <div className="px-3 py-8 text-sm text-muted-foreground">
        Configure an AI provider in Settings to use Discuss.
      </div>
    );
  }

  return (
    <div className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
      <AIChat
        threads={threads}
        activeThread={activeThread}
        supportsThreading={supportsThreading}
        loading={loading}
        threadLoading={threadLoading}
        error={error}
        onSend={handleSend}
        onRetry={handleRetry}
        onCreateThread={async () => {
          await createThread(itemId);
        }}
        onSelectThread={(threadId) => {
          if (threadId !== activeThreadId) {
            selectThread(itemId, threadId);
          }
        }}
        onRenameThread={renameThread}
        onDeleteThread={(threadId) => deleteThread(itemId, threadId)}
        fillHeight={fillHeight}
        title={title}
      />
    </div>
  );
}

// ─── Sheet wrapper (desktop) ─────────────────────────────────────────────────

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  mediaType: MediaType;
  title?: string;
}

export function NotesPanel({
  open,
  onOpenChange,
  itemId,
  mediaType,
  title,
}: NotesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="mb-6">
          <SheetTitle>{title ?? "Notes"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mr-6 pr-6">
          <NotesPanelContent itemId={itemId} mediaType={mediaType} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
