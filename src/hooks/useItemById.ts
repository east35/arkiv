import { useEffect, useState } from "react"
import { useItems } from "@/hooks/useItems"
import { useShelfStore } from "@/store/useShelfStore"
import type { FullItem } from "@/types"

export function useItemById(id?: string) {
  const { items } = useShelfStore()
  const { fetchItems } = useItems()
  const [fetchedState, setFetchedState] = useState<{
    itemId: string
    item: FullItem | null
  } | null>(null)
  const storeItem = id ? items.find((entry) => entry.id === id) ?? null : null
  const fetchedItem = id && fetchedState?.itemId === id ? fetchedState.item : undefined

  useEffect(() => {
    if (!id || storeItem) return

    let cancelled = false
    fetchItems()
      .then((allItems) => {
        if (!cancelled) {
          setFetchedState({
            itemId: id,
            item: allItems.find((entry) => entry.id === id) ?? null,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [fetchItems, id, storeItem])

  return {
    item: storeItem ?? fetchedItem ?? null,
    loading: Boolean(id) && !storeItem && fetchedItem === undefined,
  }
}
