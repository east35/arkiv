import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { ItemDetailHeader } from "@/components/item-detail/ItemDetailHeader"
import { NotesPanelContent } from "@/components/item-detail/NotesPanel"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Button } from "@/components/ui/button"
import { IconArrowLeft, IconSearchOff } from "@tabler/icons-react"
import type { FullItem } from "@/types"

export default function ItemDetailNotes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backLabel: string | null =
    (location.state as { backLabel?: string } | null)?.backLabel ?? null

  const { items } = useShelfStore()
  const { fetchItems } = useItems()

  const [item, setItem] = useState<FullItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    const found = items.find((i) => i.id === id)
    if (found) {
      setItem(found)
    } else {
      fetchItems().then((all) => {
        const fresh = all.find((i) => i.id === id)
        if (fresh) setItem(fresh)
      })
    }
  }, [id, items, fetchItems])

  const handleDeleteSuccess = () => {
    navigate("/home")
  }

  if (!item && !items.length) return <LoadingState className="h-full" />

  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been deleted or the link is invalid."
        icon={<IconSearchOff className="h-12 w-12" />}
        className="h-full"
        action={
          <Button variant="outline" onClick={() => navigate("/home")}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        }
      />
    )
  }

  return (
    <>
      <ItemDetailHeader
        backLabel={backLabel}
        item={item}
        onStatusClick={() => setIsSheetOpen(true)}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-20">
        <NotesPanelContent itemId={item.id} />
      </div>

      <StatusSheet
        item={item}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  )
}
