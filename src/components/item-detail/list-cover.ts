import type { FullItem, List } from "@/types"

export function getListCoverUrl(list: List, items: FullItem[]): string | null {
  const previewIds = list.preview_item_ids?.length
    ? list.preview_item_ids
    : [list.cover_item_id, list.first_item_id].filter((id): id is string => Boolean(id))

  for (const id of previewIds) {
    const coverUrl = items.find((item) => item.id === id)?.cover_url
    if (coverUrl) return coverUrl
  }

  return null
}
