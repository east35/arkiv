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
import { useAIChat } from "@/hooks/useAIChat";
import { useShelfStore } from "@/store/useShelfStore";
import { NotesList } from "./NotesList";
import { ProgressTracker } from "./ProgressTracker";
import { AIChat } from "./AIChat";
import { AIPromptSuggestions } from "./AIPromptSuggestions";
import { LinksPanel } from "./LinksPanel";
import type { MediaType } from "@/types";

interface NotesPanelContentProps {
  itemId: string;
  mediaType?: MediaType;
  variant?: "compact" | "sections";
  onPromptClick?: (prompt: string) => void;
}

export function NotesPanelContent({
  itemId,
  mediaType,
  variant = "compact",
  onPromptClick,
}: NotesPanelContentProps) {
  const preferences = useShelfStore((s) => s.preferences);
  const hasAI = Boolean(preferences?.ai_provider && preferences?.ai_api_key);

  const { notes, fetchNotes, createNote, updateNote, deleteNote } =
    useItemNotes();
  const { progress, fetchProgress, upsertProgress } = useItemProgress();

  useEffect(() => {
    fetchNotes(itemId);
    fetchProgress(itemId);
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSections = variant === "sections";
  const outer = isSections ? "bg-[#e6e6e6] dark:bg-card" : "space-y-6 px-3";
  const section = (extra?: string) =>
    cn(isSections ? "p-6 border-b" : "", extra);
  return (
    <div className={outer}>
      <div className={section()}>
        <ProgressTracker
          progress={progress}
          onSave={async (update) => {
            await upsertProgress(itemId, update);
          }}
        />
        {hasAI && mediaType && onPromptClick && (
          <div className="mt-4">
            <AIPromptSuggestions
              mediaType={mediaType}
              onSelect={onPromptClick}
            />
          </div>
        )}
      </div>

      <div className={section(isSections ? "" : "border-t pt-6")}>
        <LinksPanel
          itemId={itemId}
          itemHref={`/item/${itemId}`}
          mode="embedded"
        />
      </div>

      <div className={section(isSections ? "" : "border-t pt-6")}>
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
    conversation,
    loading,
    error,
    fetchConversation,
    sendMessage,
    setError,
  } = useAIChat();
  const [lastMessage, setLastMessage] = useState("");

  useEffect(() => {
    if (hasAI) fetchConversation(itemId);
  }, [itemId, hasAI]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (message: string) => {
    if (!hasAI) return;
    setLastMessage(message);
    await sendMessage(itemId, message);
  };

  useEffect(() => {
    if (!hasAI || !pendingMessage || loading) return;
    queueMicrotask(() => {
      void handleSend(pendingMessage);
      onPendingMessageSent?.();
    });
  }, [pendingMessage, hasAI, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    if (lastMessage) handleSend(lastMessage);
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
        conversation={conversation}
        loading={loading}
        error={error}
        onSend={handleSend}
        onRetry={handleRetry}
        fillHeight={fillHeight}
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
