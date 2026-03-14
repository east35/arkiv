/**
 * NotesPanel — the item workspace.
 *
 * Contains ProgressTracker, NotesList, BookmarkList, and (optionally) AIChat.
 * `NotesPanelContent` is the workspace body; `NotesPanel` wraps it in a Sheet
 * for the desktop slide-in view.
 */

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItemNotes } from "@/hooks/useItemNotes";
import { useItemBookmarks } from "@/hooks/useItemBookmarks";
import { useItemProgress } from "@/hooks/useItemProgress";
import { useAIChat } from "@/hooks/useAIChat";
import { useShelfStore } from "@/store/useShelfStore";
import { NotesList } from "./NotesList";
import { BookmarkList } from "./BookmarkList";
import { ProgressTracker } from "./ProgressTracker";
import { AIChat } from "./AIChat";
import type { MediaType } from "@/types";

interface NotesPanelContentProps {
  itemId: string;
  mediaType?: MediaType;
}

export function NotesPanelContent({ itemId }: NotesPanelContentProps) {
  const preferences = useShelfStore((s) => s.preferences);
  const hasAI = Boolean(preferences?.ai_provider && preferences?.ai_api_key);

  const { notes, fetchNotes, createNote, updateNote, deleteNote } =
    useItemNotes();
  const { bookmarks, fetchBookmarks, createBookmark, deleteBookmark } =
    useItemBookmarks();
  const { progress, fetchProgress, upsertProgress } = useItemProgress();
  const {
    conversation,
    loading: aiLoading,
    error: aiError,
    fetchConversation,
    sendMessage,
    setError: setAiError,
  } = useAIChat();

  const [lastMessage, setLastMessage] = useState("");

  useEffect(() => {
    fetchNotes(itemId);
    fetchBookmarks(itemId);
    fetchProgress(itemId);
    if (hasAI) fetchConversation(itemId);
  }, [itemId, hasAI]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = async (message: string) => {
    setLastMessage(message);
    await sendMessage(itemId, message);
  };

  const handleRetry = () => {
    if (lastMessage) handleSendMessage(lastMessage);
    else setAiError(null);
  };

  return (
    <div className="space-y-6 px-3">
      <ProgressTracker
        progress={progress}
        onSave={async (update) => {
          await upsertProgress(itemId, update);
        }}
      />

      <div className="border-t pt-6">
        <NotesList
          notes={notes}
          onCreate={async (content) => {
            await createNote(itemId, content);
          }}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
      </div>

      <div className="border-t pt-6">
        <BookmarkList
          bookmarks={bookmarks}
          onCreate={async (title, url) => {
            await createBookmark(itemId, title, url);
          }}
          onDelete={deleteBookmark}
        />
      </div>

      {hasAI && (
        <div className="border-t pt-6">
          <AIChat
            conversation={conversation}
            loading={aiLoading}
            error={aiError}
            onSend={handleSendMessage}
            onRetry={handleRetry}
          />
        </div>
      )}
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
