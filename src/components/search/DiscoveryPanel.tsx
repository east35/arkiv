import { IconLoader2 } from "@tabler/icons-react"
import { SearchResultItem } from "./SearchResultItem"
import type { DiscoveryResult } from "@/hooks/useDiscovery"
import type { SearchResult } from "@/hooks/useExternalSearch"

interface DiscoveryPanelProps {
  newReleases: DiscoveryResult[]
  upcoming: DiscoveryResult[]
  loading: boolean
  onAdd: (result: SearchResult) => void
  committingId: string | number | null
}

function formatReleaseDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

function DiscoverySection({
  title,
  items,
  onAdd,
  committingId,
}: {
  title: string
  items: DiscoveryResult[]
  onAdd: (result: SearchResult) => void
  committingId: string | number | null
}) {
  if (!items.length) return null

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-none">
        {items.map((item) => (
          <div key={item.id} className="flex-none w-32 sm:w-36">
            <SearchResultItem
              result={item}
              viewMode="poster"
              onAdd={onAdd}
              isAdding={committingId === item.id}
            />
            {item.releaseDate && (
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {formatReleaseDate(item.releaseDate)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DiscoveryPanel({
  newReleases,
  upcoming,
  loading,
  onAdd,
  committingId,
}: DiscoveryPanelProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!newReleases.length && !upcoming.length) return null

  return (
    <div>
      <DiscoverySection
        title="New Releases"
        items={newReleases}
        onAdd={onAdd}
        committingId={committingId}
      />
      <DiscoverySection
        title="Coming Soon"
        items={upcoming}
        onAdd={onAdd}
        committingId={committingId}
      />
    </div>
  )
}
