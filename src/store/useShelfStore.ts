/**
 * ShelfLog — Global Store (Zustand)
 *
 * Central state management for items, filters, sort, view mode,
 * and local fuzzy search via Fuse.js.
 */

import { create } from "zustand"
import Fuse, { type IFuseOptions } from "fuse.js"
import type {
  FullItem,
  List,
  UserPreferences,
  LibraryFilters,
  LibrarySort,
  ViewMode,
  Status,
  MediaType,
} from "@/types"

// ---------------------------------------------------------------------------
// Fuse.js Configuration
// ---------------------------------------------------------------------------

/** Fields to index for fuzzy search over tracked items */
const FUSE_OPTIONS: IFuseOptions<FullItem> = {
  keys: [
    { name: "title", weight: 0.6 },
    { name: "description", weight: 0.2 },
    { name: "genres", weight: 0.1 },
    { name: "notes", weight: 0.1 },
  ],
  threshold: 0.35,        // Balance between fuzzy tolerance and relevance
  includeScore: true,
  minMatchCharLength: 2,
}

// ---------------------------------------------------------------------------
// Store Shape
// ---------------------------------------------------------------------------

interface ShelfState {
  // --- Data ---
  items: FullItem[]
  lists: List[]
  preferences: UserPreferences | null

  // --- UI State ---
  filters: LibraryFilters
  sort: LibrarySort
  viewMode: ViewMode

  // --- Fuse.js instance (rebuilt when items change) ---
  _fuse: Fuse<FullItem> | null

  // --- Actions: Data ---
  setItems: (items: FullItem[]) => void
  addItem: (item: FullItem) => void
  updateItem: (id: string, partial: Partial<FullItem>) => void
  removeItem: (id: string) => void
  setLists: (lists: List[]) => void
  setPreferences: (prefs: UserPreferences) => void

  // --- Actions: UI ---
  setFilters: (filters: Partial<LibraryFilters>) => void
  setSort: (sort: Partial<LibrarySort>) => void
  setViewMode: (mode: ViewMode) => void

  // --- Derived: filtered + sorted items ---
  getFilteredItems: (mediaType?: MediaType) => FullItem[]

  // --- Search ---
  searchItems: (query: string) => FullItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rebuild the Fuse index from the current item list */
function buildFuse(items: FullItem[]): Fuse<FullItem> {
  return new Fuse(items, FUSE_OPTIONS)
}

/** Get the numeric sort value for progress (media-type aware) */
function getProgressValue(item: FullItem): number {
  if (item.media_type === "book") {
    return item.book.progress ?? 0
  }
  return item.game.progress_hours * 60 + item.game.progress_minutes
}

/** Get the status-specific date for an item */
function getStatusDate(item: FullItem): string | null {
  const dateMap: Record<Status, string | null> = {
    backlog: item.created_at,
    in_progress: item.started_at,
    paused: item.paused_at,
    completed: item.completed_at,
    dropped: item.dropped_at,
  }
  return dateMap[item.status]
}

/** Compare two items by a sort field */
function compareItems(a: FullItem, b: FullItem, field: LibrarySort["field"]): number {
  switch (field) {
    case "title":
      return a.title.localeCompare(b.title)
    case "rating":
      return (a.user_score ?? -1) - (b.user_score ?? -1)
    case "progress":
      return getProgressValue(a) - getProgressValue(b)
    case "started_at": {
      const aDate = a.started_at ?? ""
      const bDate = b.started_at ?? ""
      return aDate.localeCompare(bDate)
    }
    case "completed_at": {
      const aDate = a.completed_at ?? ""
      const bDate = b.completed_at ?? ""
      return aDate.localeCompare(bDate)
    }
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useShelfStore = create<ShelfState>((set, get) => ({
  // --- Data ---
  items: [],
  lists: [],
  preferences: null,

  // --- UI State ---
  filters: {
    status: "all",
    source: "all",
    search: "",
  },
  sort: {
    field: "title",
    direction: "asc",
  },
  viewMode: "poster",

  // --- Fuse ---
  _fuse: null,

  // --- Actions: Data ---

  setItems: (items) =>
    set({ items, _fuse: buildFuse(items) }),

  addItem: (item) =>
    set((state) => {
      const items = [...state.items, item]
      return { items, _fuse: buildFuse(items) }
    }),

  updateItem: (id, partial) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, ...partial } as FullItem : item
      )
      return { items, _fuse: buildFuse(items) }
    }),

  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id)
      return { items, _fuse: buildFuse(items) }
    }),

  setLists: (lists) => set({ lists }),

  setPreferences: (preferences) => set({ preferences }),

  // --- Actions: UI ---

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  setSort: (partial) =>
    set((state) => ({
      sort: { ...state.sort, ...partial },
    })),

  setViewMode: (viewMode) => set({ viewMode }),

  // --- Derived ---

  getFilteredItems: (mediaType) => {
    const { items, filters, sort } = get()

    let result = items

    // Filter by media type if specified (for Games/Books views)
    if (mediaType) {
      result = result.filter((item) => item.media_type === mediaType)
    }

    // Filter by status
    if (filters.status !== "all") {
      result = result.filter((item) => item.status === filters.status)
    }

    // Filter by source
    if (filters.source !== "all") {
      result = result.filter((item) => item.source === filters.source)
    }

    // Fuzzy search (if search query is present, use Fuse.js)
    if (filters.search.trim()) {
      const fuse = get()._fuse
      if (fuse) {
        const searchResults = fuse.search(filters.search.trim())
        const searchIds = new Set(searchResults.map((r) => r.item.id))
        result = result.filter((item) => searchIds.has(item.id))
      }
    }

    // Sort
    const direction = sort.direction === "asc" ? 1 : -1
    result.sort((a, b) => compareItems(a, b, sort.field) * direction)

    return result
  },

  // --- Search ---

  searchItems: (query) => {
    const fuse = get()._fuse
    if (!fuse || !query.trim()) return []
    return fuse.search(query.trim()).map((result) => result.item)
  },
}))

// ---------------------------------------------------------------------------
// Export helper for status date (used across components)
// ---------------------------------------------------------------------------
export { getStatusDate }
