import { useMemo, useState } from "react"
import {
  IconDots,
  IconMessageCircle,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { AIConversationThread } from "@/types"

interface AIThreadListProps {
  threads: AIConversationThread[]
  activeThreadId: string | null
  disabled?: boolean
  onCreateThread: () => Promise<void>
  onSelectThread: (threadId: string) => void
  onRenameThread: (threadId: string, title: string) => Promise<void>
  onDeleteThread: (threadId: string) => Promise<void>
}

function formatUpdatedAt(value: string): string {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true })
  } catch {
    return "just now"
  }
}

export function AIThreadList({
  threads,
  activeThreadId,
  disabled = false,
  onCreateThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
}: AIThreadListProps) {
  const [renameTarget, setRenameTarget] = useState<AIConversationThread | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AIConversationThread | null>(null)
  const [savingRename, setSavingRename] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const orderedThreads = useMemo(
    () => threads.slice(0, 8),
    [threads],
  )

  if (orderedThreads.length === 0) {
    return null
  }

  return (
    <>
      <div className="border-b border-border/60 bg-background/80 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Threads
            </div>
            <div className="text-xs text-muted-foreground">
              {activeThreadId ? "Active thread is scoped to this discussion only." : "Start a focused thread for this item."}
            </div>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              void onCreateThread()
            }}
          >
            <IconPlus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
          {orderedThreads.map((thread) => {
            const isActive = thread.id === activeThreadId
            const turnLabel = thread.messages.length > 0
              ? `${Math.ceil(thread.messages.length / 2)} turns`
              : "No messages yet"

            return (
              <div
                key={thread.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors",
                  isActive
                    ? "border-foreground/15 bg-foreground/5"
                    : "border-border/60 bg-background/70",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => onSelectThread(thread.id)}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isActive ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <IconMessageCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("truncate text-sm font-medium", isActive ? "text-foreground" : "text-foreground/90")}>
                      {thread.title}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {turnLabel} · {formatUpdatedAt(thread.updated_at)}
                    </div>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label={`Manage thread ${thread.title}`}
                    disabled={disabled}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <IconDots className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameTarget(thread)
                        setRenameValue(thread.title)
                      }}
                    >
                      <IconPencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(thread)}
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
            setRenameValue("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
            <DialogDescription>
              Give this conversation a shorter, clearer title so it stays easy to revisit.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!renameTarget || !renameValue.trim() || savingRename) return

              setSavingRename(true)
              void onRenameThread(renameTarget.id, renameValue.trim())
                .then(() => {
                  setRenameTarget(null)
                  setRenameValue("")
                })
                .catch(() => null)
                .finally(() => setSavingRename(false))
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Thread title"
              maxLength={80}
            />
            <DialogFooter>
              <Button type="submit" disabled={!renameValue.trim() || savingRename}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete thread?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the full message history for this thread from future AI context. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting || !deleteTarget}
              onClick={() => {
                if (!deleteTarget || deleting) return

                setDeleting(true)
                void onDeleteThread(deleteTarget.id)
                  .then(() => {
                    setDeleteTarget(null)
                  })
                  .catch(() => null)
                  .finally(() => setDeleting(false))
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
