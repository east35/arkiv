/**
 * Arkiv — Item Bookmarks Hook
 *
 * CRUD for per-item bookmarks stored in the item_bookmarks table.
 * In demo mode all writes are in-memory only.
 */

import { useCallback, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { ItemBookmark, LinkType } from "@/types"

const BOOKMARK_TYPE_STORAGE_KEY = "arkiv-bookmark-types"
const linkTypes = new Set<LinkType>(["guide", "wiki", "review", "forum", "store", "other"])
type BookmarkTypeMap = Record<string, LinkType>

export interface BookmarkDraft {
  title: string
  url: string
  note?: string
  linkType?: LinkType
}

function normalizeLinkTypeValue(value: unknown): LinkType {
  if (typeof value !== "string") return "other"

  const normalized = value.trim().toLowerCase()
  if (linkTypes.has(normalized as LinkType)) {
    return normalized as LinkType
  }

  return "other"
}

function isValidTimestamp(value: string | null | undefined): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime())
}

function loadStoredBookmarkTypes(): BookmarkTypeMap {
  if (typeof window === "undefined") return {}

  try {
    const stored = window.localStorage.getItem(BOOKMARK_TYPE_STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return {}

    return Object.fromEntries(
      Object.entries(parsed).map(([bookmarkId, linkType]) => [
        bookmarkId,
        normalizeLinkTypeValue(linkType),
      ]),
    )
  } catch {
    return {}
  }
}

function persistStoredBookmarkTypes(bookmarkTypes: BookmarkTypeMap): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(BOOKMARK_TYPE_STORAGE_KEY, JSON.stringify(bookmarkTypes))
  } catch {
    // Ignore storage failures and keep the in-memory types usable.
  }
}

function normalizeBookmark(
  bookmark: ItemBookmark,
  bookmarkTypes: BookmarkTypeMap = {},
): ItemBookmark {
  const now = new Date().toISOString()
  const createdAt = isValidTimestamp(bookmark.created_at) ? bookmark.created_at : now
  const updatedAt = isValidTimestamp(bookmark.updated_at)
    ? bookmark.updated_at
    : createdAt

  return {
    ...bookmark,
    note: bookmark.note ?? null,
    link_type: normalizeLinkTypeValue(bookmarkTypes[bookmark.id] ?? bookmark.link_type),
    thumbnail_url: bookmark.thumbnail_url ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function mergeBookmarks(
  current: ItemBookmark[],
  updates: ItemBookmark[],
  bookmarkTypes: BookmarkTypeMap = {},
): ItemBookmark[] {
  if (!updates.length) return current

  const normalizedUpdates = updates.map((bookmark) => normalizeBookmark(bookmark, bookmarkTypes))
  const updateMap = new Map(normalizedUpdates.map((bookmark) => [bookmark.id, bookmark]))
  return current.map((bookmark) => updateMap.get(bookmark.id) ?? normalizeBookmark(bookmark, bookmarkTypes))
}


export function useItemBookmarks() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [bookmarks, setBookmarks] = useState<ItemBookmark[]>([])
  const [bookmarkTypes, setBookmarkTypes] = useState<BookmarkTypeMap>(() => loadStoredBookmarkTypes())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bookmarkTypesRef = useRef(bookmarkTypes)

  const setStoredBookmarkTypes = useCallback((
    updater: BookmarkTypeMap | ((current: BookmarkTypeMap) => BookmarkTypeMap),
  ) => {
    setBookmarkTypes((current) => {
      const next = typeof updater === "function" ? updater(current) : updater
      bookmarkTypesRef.current = next
      persistStoredBookmarkTypes(next)
      return next
    })
  }, [])

  const assignBookmarkType = useCallback((bookmarkId: string, linkType: LinkType | undefined) => {
    const normalizedLinkType = normalizeLinkTypeValue(linkType)
    setStoredBookmarkTypes((current) => {
      if (current[bookmarkId] === normalizedLinkType) return current
      return {
        ...current,
        [bookmarkId]: normalizedLinkType,
      }
    })
  }, [setStoredBookmarkTypes])

  const removeBookmarkType = useCallback((bookmarkId: string) => {
    setStoredBookmarkTypes((current) => {
      if (!(bookmarkId in current)) return current

      const next = { ...current }
      delete next[bookmarkId]
      return next
    })
  }, [setStoredBookmarkTypes])


  const fetchBookmarks = useCallback(async (itemId: string): Promise<ItemBookmark[]> => {
    setLoading(true)
    setError(null)
    if (isDemoMode) {
      setBookmarks([])
      setLoading(false)
      return []
    }
    try {
      const { data, error: fetchError } = await supabase
        .from("item_bookmarks")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: true })
      if (fetchError) throw fetchError
      const result = ((data as ItemBookmark[]) ?? [])
        .map((bookmark) => normalizeBookmark(bookmark, bookmarkTypesRef.current))
      setBookmarks(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load saved links"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isDemoMode])

  const createBookmark = useCallback(async (
    itemId: string,
    draft: BookmarkDraft,
  ): Promise<ItemBookmark> => {
    const normalizedLinkType = normalizeLinkTypeValue(draft.linkType)

    if (isDemoMode) {
      const now = new Date().toISOString()
      const bookmark: ItemBookmark = {
        id: crypto.randomUUID(),
        item_id: itemId,
        user_id: "demo",
        title: draft.title,
        url: draft.url,
        note: draft.note?.trim() || null,
        link_type: normalizedLinkType,
        thumbnail_url: null,
        created_at: now,
        updated_at: now,
      }
      const normalizedBookmark = normalizeBookmark(bookmark, bookmarkTypesRef.current)
      assignBookmarkType(normalizedBookmark.id, draft.linkType)
      setBookmarks((prev) => [...prev, normalizedBookmark])
      return normalizedBookmark
    }

    setError(null)
    const { data, error } = await supabase
      .from("item_bookmarks")
      .insert({
        item_id: itemId,
        title: draft.title,
        url: draft.url,
        note: draft.note?.trim() || null,
        link_type: normalizedLinkType,
      })
      .select("*")
      .single()
    if (error) {
      setError(error.message)
      throw error
    }

    assignBookmarkType(data.id, draft.linkType)
    const normalizedBookmark = normalizeBookmark(data as ItemBookmark, {
      ...bookmarkTypesRef.current,
      [data.id]: normalizedLinkType,
    })
    setBookmarks((prev) => [...prev, normalizedBookmark])
    return normalizedBookmark
  }, [assignBookmarkType, isDemoMode])

  const updateBookmark = useCallback(async (
    _itemId: string,
    bookmarkId: string,
    updates: Partial<BookmarkDraft>,
  ): Promise<ItemBookmark> => {
    if (isDemoMode) {
      const now = new Date().toISOString()
      let updatedBookmark: ItemBookmark | null = null

      setBookmarks((prev) => prev.map((bookmark) => {
        if (bookmark.id !== bookmarkId) return bookmark
        updatedBookmark = {
          ...bookmark,
          title: updates.title ?? bookmark.title,
          url: updates.url ?? bookmark.url,
          note: updates.note != null ? (updates.note.trim() || null) : bookmark.note,
          link_type: updates.linkType != null
            ? normalizeLinkTypeValue(updates.linkType)
            : bookmark.link_type,
          updated_at: now,
        }
        return updatedBookmark
      }))

      if (!updatedBookmark) {
        throw new Error("Saved link not found")
      }

      return normalizeBookmark(updatedBookmark)
    }

    setError(null)
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.url !== undefined) payload.url = updates.url
    if (updates.note !== undefined) payload.note = updates.note?.trim() || null
    if (updates.linkType !== undefined) payload.link_type = normalizeLinkTypeValue(updates.linkType)

    const { data, error } = await supabase
      .from("item_bookmarks")
      .update(payload)
      .eq("id", bookmarkId)
      .select("*")
      .single()
    if (error) {
      setError(error.message)
      throw error
    }

    if (updates.linkType != null) {
      assignBookmarkType(data.id, updates.linkType)
    }

    const normalizedBookmark = normalizeBookmark(data as ItemBookmark, updates.linkType != null
      ? { ...bookmarkTypesRef.current, [data.id]: normalizeLinkTypeValue(updates.linkType) }
      : bookmarkTypesRef.current)
    setBookmarks((prev) => mergeBookmarks(prev, [normalizedBookmark], bookmarkTypesRef.current))
    return normalizedBookmark
  }, [assignBookmarkType, isDemoMode])

  const deleteBookmark = useCallback(async (bookmarkId: string): Promise<void> => {
    if (isDemoMode) {
      removeBookmarkType(bookmarkId)
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
      return
    }
    const { error } = await supabase
      .from("item_bookmarks")
      .delete()
      .eq("id", bookmarkId)
    if (error) throw error
    removeBookmarkType(bookmarkId)
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
  }, [isDemoMode, removeBookmarkType])

  return {
    bookmarks: bookmarks.map((bookmark) => normalizeBookmark(bookmark, bookmarkTypes)),
    loading,
    error,
    fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  }
}
