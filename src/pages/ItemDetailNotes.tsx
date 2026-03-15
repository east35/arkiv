import { useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useItemById } from "@/hooks/useItemById"
import { ItemDetailHeader } from "@/components/item-detail/ItemDetailHeader"
import { NotesPanelContent } from "@/components/item-detail/NotesPanel"
import { StatusSheet } from "@/components/status-sheet/StatusSheet"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Button } from "@/components/ui/button"
import { IconArrowLeft, IconSearchOff } from "@tabler/icons-react"

export default function ItemDetailNotes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backLabel: string | null =
    (location.state as { backLabel?: string } | null)?.backLabel ?? null

  const { item, loading } = useItemById(id)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleDeleteSuccess = () => {
    navigate("/home")
  }

  if (loading) return <LoadingState className="h-full" />

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

      <div className="mx-auto max-w-2xl bg-[#e6e6e6] pb-20 dark:bg-card">
        <NotesPanelContent
          itemId={item.id}
          mediaType={item.media_type}
          status={item.status}
          variant="sections"
        />
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
