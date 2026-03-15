import { useState } from "react";
import { IconTrash, IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ItemNote } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface NotesListProps {
  notes: ItemNote[];
  onCreate: (content: string) => Promise<void>;
  onUpdate: (noteId: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export function NotesList({
  notes,
  onCreate,
  onUpdate,
  onDelete,
}: NotesListProps) {
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    const content = newContent.trim();
    if (!content) return;
    setSaving(true);
    try {
      await onCreate(content);
      setNewContent("");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: ItemNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleUpdate = async (noteId: string) => {
    const content = editContent.trim();
    if (!content) return;
    try {
      await onUpdate(noteId, content);
      setEditingId(null);
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await onDelete(noteId);
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="bg-background/80 p-4 space-y-1">
          {editingId === note.id ? (
            <>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  <IconX className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon-sm" onClick={() => handleUpdate(note.id)}>
                  <IconCheck className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(note.updated_at), {
                    addSuffix: true,
                  })}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => startEdit(note)}
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === note.id}
                    onClick={() => handleDelete(note.id)}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new note */}
      <div>
        <Textarea
          placeholder="Add a note…"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="min-h-[80px] resize-none text-sm bg-[#f5f5f5] dark:bg-[#262626]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={saving || !newContent.trim()}
          className="w-full"
        >
          {saving ? "Saving…" : "Add Note"}
        </Button>
      </div>
    </div>
  );
}
