import { useNavigate, useParams } from "react-router-dom"
import { IconArrowLeft, IconSearchOff } from "@tabler/icons-react"
import { useItemById } from "@/hooks/useItemById"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { LinksPanel } from "@/components/item-detail/LinksPanel"

export default function ItemLinks() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { item, loading } = useItemById(id)

  if (loading) {
    return <LoadingState className="h-full" />
  }

  if (!item || !id) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been deleted or the link is invalid."
        icon={<IconSearchOff className="h-12 w-12" />}
        className="h-full"
        action={
          <Button variant="secondary" onClick={() => navigate("/home")} className="border-0">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-20 flex min-h-[55px] items-center gap-3 bg-background px-4">
        <button
          type="button"
          onClick={() => navigate(`/item/${item.id}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">Saved Links</p>
          <p className="truncate text-xs text-muted-foreground">{item.title}</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <LinksPanel
          itemId={item.id}
          mode="page"
        />
      </div>
    </div>
  )
}
