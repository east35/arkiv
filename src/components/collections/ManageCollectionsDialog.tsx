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
import { useCollections } from "@/hooks/useCollections"
import { useShelfStore } from "@/store/useShelfStore"
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog"
import { cn } from "@/lib/utils"
import type { Collection } from "@/types"

interface ManageCollectionsDialogProps {
  itemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CollectionRow({ collection, isMember, isToggling, onToggle, items }: {
  collection: Collection
  isMember: boolean
  isToggling: boolean
  onToggle: () => void
  items: ReturnType<typeof useShelfStore.getState>["items"]
}) {
  const coverItemId = collection.cover_item_id ?? collection.first_item_id ?? null
  const coverUrl = coverItemId ? (items.find(i => i.id === coverItemId)?.cover_url ?? null) : null
  const itemCount = collection.item_count ?? 0

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
          <img src={coverUrl} alt={collection.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground/30">
            {collection.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name & count */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{collection.name}</p>
        {collection.description && (
          <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
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

export function ManageCollectionsDialog({ itemId, open, onOpenChange }: ManageCollectionsDialogProps) {
  const { collections, items } = useShelfStore()
  const { fetchCollections, fetchItemMemberships, addItemToCollection, removeItemFromCollection } = useCollections()

  const [memberCollectionIds, setMemberCollectionIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const refreshMemberships = async () => {
    const memberships = await fetchItemMemberships(itemId)
    setMemberCollectionIds(new Set(memberships.map((membership) => membership.collection_id)))
  }

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoading(true)
        try {
          if (collections.length === 0) await fetchCollections()
          await refreshMemberships()
        } catch (err) {
          console.error(err)
          toast.error("Failed to load collection memberships")
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [open, itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollection = async (collectionId: string) => {
    const isMember = memberCollectionIds.has(collectionId)
    setTogglingId(collectionId)
    try {
      if (isMember) {
        await removeItemFromCollection(collectionId, itemId)
        setMemberCollectionIds((prev) => {
          const next = new Set(prev)
          next.delete(collectionId)
          return next
        })
        toast.success("Removed from collection")
      } else {
        await addItemToCollection(collectionId, itemId)
        setMemberCollectionIds((prev) => new Set(prev).add(collectionId))
        toast.success("Added to collection")
      }
      fetchCollections()
    } catch (err) {
      console.error(err)
      toast.error(isMember ? "Failed to remove from collection" : "Failed to add to collection")
    } finally {
      setTogglingId(null)
    }
  }

  const handleCollectionCreated = async (collectionId: string) => {
    try {
      await addItemToCollection(collectionId, itemId)
      await Promise.all([refreshMemberships(), fetchCollections()])
      toast.success("Added to new collection")
    } catch {
      toast.error("Collection created but failed to add item")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Collections</DialogTitle>
            <DialogDescription>Select collections to add this item to.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : collections.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No collections yet.</p>
            ) : (
              collections.map(collection => (
                <CollectionRow
                  key={collection.id}
                  collection={collection}
                  isMember={memberCollectionIds.has(collection.id)}
                  isToggling={togglingId === collection.id}
                  onToggle={() => toggleCollection(collection.id)}
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
              New collection — add item automatically
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCollectionCreated}
      />
    </>
  )
}
