import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"

interface ManageListsDialogProps {
  itemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageListsDialog({ itemId, open, onOpenChange }: ManageListsDialogProps) {
  const { lists } = useShelfStore()
  const { fetchLists, fetchItemMemberships, addItemToList, removeItemFromList } = useLists()
  
  const [memberListIds, setMemberListIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoading(true)
        try {
          if (lists.length === 0) await fetchLists()
          
          const memberships = await fetchItemMemberships(itemId)
          setMemberListIds(new Set(memberships.map(m => m.list_id)))
        } catch (err) {
          console.error(err)
          toast.error("Failed to load list memberships")
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [open, itemId, fetchLists, fetchItemMemberships, lists.length])

  const toggleList = async (listId: string) => {
    const isMember = memberListIds.has(listId)
    setTogglingId(listId)
    
    try {
      if (isMember) {
        await removeItemFromList(listId, itemId)
        setMemberListIds(prev => {
          const next = new Set(prev)
          next.delete(listId)
          return next
        })
        toast.success("Removed from list")
      } else {
        await addItemToList(listId, itemId)
        setMemberListIds(prev => new Set(prev).add(listId))
        toast.success("Added to list")
      }
    } catch (err) {
      console.error(err)
      toast.error(isMember ? "Failed to remove from list" : "Failed to add to list")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Lists</DialogTitle>
          <DialogDescription>
            Select lists to add this item to.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No lists found. Create one to get started.
            </div>
          ) : (
            lists.map(list => {
              const isMember = memberListIds.has(list.id)
              const isToggling = togglingId === list.id
              
              return (
                <button
                  key={list.id}
                  onClick={() => toggleList(list.id)}
                  disabled={isToggling}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md border text-sm transition-colors hover:bg-accent text-left",
                    isMember ? "bg-accent/50 border-primary/50" : "bg-card"
                  )}
                >
                  <span className="font-medium truncate">{list.name}</span>
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isMember && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="pt-2 border-t mt-2">
           {/* Reuse CreateListDialog but we need to trigger it. 
               Since CreateListDialog has its own trigger button, we can just render it here 
               but styling might need adjustment. 
               Actually better to just have a button that opens it. 
               However, nesting dialogs is tricky in Radix UI unless managed carefully.
               For now, keep it simple. */}
           <div className="text-xs text-center text-muted-foreground">
             Go to Lists page to create new lists.
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
