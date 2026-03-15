/**
 * Arkiv — Core Type Definitions
 *
 * These types mirror the Supabase schema and are used throughout
 * the frontend for type-safe data handling.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Supported media types */
export type MediaType = "game" | "book"

/** Item tracking statuses */
export type Status = "in_library" | "backlog" | "in_progress" | "paused" | "completed" | "dropped" | "revisiting"

/** Data source for an item */
export type Source = "igdb" | "google_books" | "hardcover" | "manual"

/** Date display format preference */
export type DateFormat = "iso" | "eu" | "us" | "long"

/** Time display format preference */
export type TimeFormat = "12hr" | "24hr"

/** Library view mode */
export type ViewMode = "poster" | "table"

/** Sort options for library views */
export type SortField = "rating" | "title" | "progress" | "started_at" | "completed_at" | "created_at"

/** Sort direction */
export type SortDirection = "asc" | "desc"

// ---------------------------------------------------------------------------
// Database Row Types
// ---------------------------------------------------------------------------

/** Core item — shared fields for all tracked media */
export interface Item {
  id: string
  user_id: string
  media_type: MediaType
  title: string
  cover_url: string | null
  genres: string[]
  description: string | null
  status: Status
  user_score: number | null
  source_score: number | null
  source: Source
  external_id: string | null
  source_votes: number | null
  started_at: string | null
  completed_at: string | null
  paused_at: string | null
  dropped_at: string | null
  revisit_started_at: string | null
  created_at: string
  updated_at: string
}

/** Book-specific extension fields */
export interface BookFields {
  item_id: string
  author: string | null
  publisher: string | null
  publish_date: string | null
  page_count: number | null
  progress: number | null
  format: string | null
  themes: string[]
  isbn: string | null
  hardcover_slug: string | null
  library: string | null
  series_name: string | null
  series_position: number | null
  tag_categories: Record<string, string[]> | null
}

/** Game-specific extension fields */
export interface GameFields {
  item_id: string
  developer: string | null
  publisher: string | null
  release_date: string | null
  platforms: string[]
  format: string | null
  themes: string[]
  screenshots: string[]
  progress_hours: number
  progress_minutes: number
  library: string | null
  game_modes: string[]
  player_perspectives: string[]
  game_category: number | null
  steam_id: string | null
  active_platform: string | null
  similar_games: Array<{ id?: number; name: string; cover: string | null; releaseDate?: string | null }>
  hltb_average: number | null
  hltb_main: number | null
  hltb_main_extra: number | null
  hltb_completionist: number | null
}

/** Full book: core item + book-specific fields */
export interface BookItem extends Item {
  media_type: "book"
  book: BookFields
}

/** Full game: core item + game-specific fields */
export interface GameItem extends Item {
  media_type: "game"
  game: GameFields
}

/** Union type for any fully-hydrated item */
export type FullItem = BookItem | GameItem

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** User-created collection */
export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_item_id: string | null
  created_at: string
  updated_at: string
  item_count?: number
  first_item_id?: string | null
  preview_item_ids?: string[]
}

/** Junction row: item membership in a collection */
export interface CollectionItem {
  id: string
  collection_id: string
  item_id: string
  added_at: string
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/** Single status transition event */
export interface ActivityLogEntry {
  id: string
  user_id: string
  item_id: string
  from_status: Status | null
  to_status: Status
  occurred_at: string
}

// ---------------------------------------------------------------------------
// User Preferences
// ---------------------------------------------------------------------------

export type AIProvider = "openai" | "gemini"
export type LinkType = "guide" | "wiki" | "review" | "forum" | "store" | "other"

export interface UserPreferences {
  user_id: string
  username: string | null
  hide_hover_overlay: boolean
  theme: "light" | "dark" | "system"
  date_format: DateFormat
  time_format: TimeFormat
  home_statuses: Status[]
  steam_id: string | null
  calibre_path: string | null
  ai_provider: AIProvider | null
  ai_api_key: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Notes Tab Types
// ---------------------------------------------------------------------------

export interface ItemNote {
  id: string
  item_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface ItemBookmark {
  id: string
  item_id: string
  user_id: string
  title: string
  url: string
  note: string | null
  link_type: LinkType
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface ItemProgress {
  item_id: string
  user_id: string
  type: string | null
  value: string | null
  confidence: string | null
  updated_at: string
}

export interface AIMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface AIConversationThread {
  id: string
  item_id: string
  user_id: string
  title: string
  title_source: "auto" | "manual"
  messages: AIMessage[]
  summary: string | null
  summary_message_count: number
  spoiler_scope: string | null
  created_at: string
  updated_at: string
}

export interface AIItemMemory {
  id: string
  item_id: string
  user_id: string
  spoiler_preference: string | null
  response_style: string | null
  durable_preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PromptSuggestionsResponse {
  prompts: string[]
  cached: boolean
}

// ---------------------------------------------------------------------------
// UI State Types
// ---------------------------------------------------------------------------

/** Filter state for library views */
export interface LibraryFilters {
  status: Status | "all"
  source: Source | "all"
  search: string
}

/** Sort state for library views */
export interface LibrarySort {
  field: SortField
  direction: SortDirection
}

// ---------------------------------------------------------------------------
// API Response Types (Edge Function payloads)
// ---------------------------------------------------------------------------

/** IGDB search result (compact) */
export interface IgdbSearchResult {
  id: number
  name: string
  cover: string | null
  platforms: string[]
  summary: string | null
  releaseDate: string | null
}

/** IGDB full details */
export interface IgdbGameDetails {
  id: number
  name: string
  summary: string | null
  storyline: string | null
  cover: string | null
  genres: string[]
  themes: string[]
  platforms: string[]
  developer: string | null
  publisher: string | null
  screenshots: string[]
  releaseDate: string | null
  sourceScore: number | null
  ratingsCount: number | null
  franchise: string | null
  library: string | null
  gameModes: string[]
  playerPerspectives: string[]
  gameCategory: number | null
  steamId: string | null
  parentGame: string | null
  remasters: string[]
  standaloneExpansions: string[]
  similarGames: Array<{ id?: number; name: string; cover: string | null; releaseDate?: string | null }>
  hltb_average: number | null
  hltb_main: number | null
  hltb_main_extra: number | null
  hltb_completionist: number | null
}

/** Hardcover search result (compact) */
export interface HardcoverSearchResult {
  id: number
  title: string
  authors: string[]
  image: string | null
  pages: number | null
  releaseYear: number | null
}

// ---------------------------------------------------------------------------
// Discovery Types
// ---------------------------------------------------------------------------

/** A search result extended with discovery metadata */
export interface DiscoveryResult {
  id: string | number
  title: string
  subtitle: string
  cover?: string | null
  year?: string | null
  mediaType: MediaType
  releaseDate: string       // "YYYY-MM-DD"
  status: "new" | "upcoming"
}

/** Hardcover full book details */
export interface HardcoverBookDetails {
  id: number
  title: string
  subtitle: string | null
  authors: string[]
  publisher: string | null
  releaseDate: string | null
  description: string | null
  pages: number | null
  genres: string[]
  tagCategories: Record<string, string[]>
  image: string | null
  isbn: string | null
  rating: number | null  // 0–5 scale (community average)
  ratingsCount: number | null
  slug: string | null
  seriesName: string | null
  seriesPosition: number | null
}
