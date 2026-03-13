import type { FullItem, Collection } from "@/types"

export function getCollectionCoverUrl(collection: Collection, items: FullItem[]): string | null {
  const previewIds = collection.preview_item_ids?.length
    ? collection.preview_item_ids
    : [collection.cover_item_id, collection.first_item_id].filter((id): id is string => Boolean(id))

  for (const id of previewIds) {
    const coverUrl = items.find((item) => item.id === id)?.cover_url
    if (coverUrl) return coverUrl
  }

  return null
}
