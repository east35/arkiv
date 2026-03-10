import { useEffect, useState } from "react"
import { IconCheck, IconLoader2, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useLists } from "@/hooks/useLists"
import { useShelfStore } from "@/store/useShelfStore"
import { CreateListDialog } from "@/components/lists/CreateListDialog"
import { cn } from "@/lib/utils"
import type { List } from "@/types"

interface ManageListsDialogProps {
  itemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ListRow({ list, isMember, isToggling, onToggle, items }: {
  list: List
  isMember: boolean
  isToggling: boolean
  onToggle: () => void
  items: ReturnType<typeof useShelfStore.getState>["items"]
}) {
  const coverItemId = list.cover_item_id ?? list.first_item_id ?? null
  const coverUrl = coverItemId ? (items.find(i => i.id === coverItemId)?.cover_url ?? null) : null
  const itemCount = list.item_count ?? 0

  return (
    <button
      onClick={onToggle}
      disabled={isToggling}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg border text-sm transition-colors hover:bg-accent text-left w-full",
        isMember ? "bg-accent/50 border-primary/30" : "bg-card"
      )}
    >
      {/* Cover thumbnail */}
      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
        {coverUrl ? (
          <img src={coverUrl} alt={list.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground/30">
            {list.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name & count */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{list.name}</p>
        {list.description && (
          <p className="text-xs text-muted-foreground truncate">{list.description}</p>
        )}
      </div>

      <span className="text-xs text-muted-foreground shrink-0">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>

      <div className="w-5 shrink-0 flex justify-end">
        {isToggling ? (
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isMember ? (
          <IconCheck className="h-4 w-4 text-primary" />
        ) : null}
      </div>
    </button>
  )
}

export function ManageListsDialog({ itemId, open, onOpenChange }: ManageListsDialogProps) {
  const { lists, items } = useShelfStore()
  const { fetchLists, fetchItemMemberships, addItemToList, removeItemFromList } = useLists()

  const [memberListIds, setMemberListIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const refreshMemberships = async () => {
    const memberships = await fetchItemMemberships(itemId)
    setMemberListIds(new Set(memberships.map(m => m.list_id)))
  }

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoading(true)
        try {
          if (lists.length === 0) await fetchLists()
          await refreshMemberships()
        } catch (err) {
          console.error(err)
          toast.error("Failed to load list memberships")
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [open, itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleList = async (listId: string) => {
    const isMember = memberListIds.has(listId)
    setTogglingId(listId)
    try {
      if (isMember) {
        await removeItemFromList(listId, itemId)
        setMemberListIds(prev => { const next = new Set(prev); next.delete(listId); return next })
        toast.success("Removed from list")
      } else {
        await addItemToList(listId, itemId)
        setMemberListIds(prev => new Set(prev).add(listId))
        toast.success("Added to list")
      }
      fetchLists()
    } catch (err) {
      console.error(err)
      toast.error(isMember ? "Failed to remove from list" : "Failed to add to list")
    } finally {
      setTogglingId(null)
    }
  }

  const handleListCreated = async (listId: string) => {
    try {
      await addItemToList(listId, itemId)
      await Promise.all([refreshMemberships(), fetchLists()])
      toast.success("Added to new list")
    } catch {
      toast.error("List created but failed to add item")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Lists</DialogTitle>
            <DialogDescription>Select lists to add this item to.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lists.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No lists yet.</p>
            ) : (
              lists.map(list => (
                <ListRow
                  key={list.id}
                  list={list}
                  isMember={memberListIds.has(list.id)}
                  isToggling={togglingId === list.id}
                  onToggle={() => toggleList(list.id)}
                  items={items}
                />
              ))
            )}
          </div>

          <div className="pt-2 border-t">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <IconPlus className="h-4 w-4" />
              New list — add item automatically
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleListCreated}
      />
    </>
  )
}
