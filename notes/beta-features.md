# Beta Features — Implementation Plan

**Overall Progress:** `100%`

## TLDR
Enhance item detail views for games and books with richer metadata, user-selectable fields (active platform, book format), series/collection browsing, and recommendations. Fix the floating notes button color and align mobile module styling with desktop.

## Critical Decisions
- **Active Platform (games):** New `active_platform` column on `games` table (nullable string). Defaults to `null`; sidebar/mobile show `active_platform ?? platforms[0]`. All available platforms rendered as selectable options in the StatusSheet.
- **Book Format:** Already exists as `format` on `books` table. Just needs a Physical/Digital selector in the StatusSheet.
- **Series/Collection (games):** IGDB proxy already returns `collection` name. We need a new Edge Function action (`collection-games`) that queries IGDB's `collections` endpoint to get all games in that collection with covers. Cache results client-side per session.
- **Recommendations (games):** `similar_games` is stored in DB and fetched from IGDB. The `RecommendationsRow` component exists but isn't rendering — debug why (likely cover URL format issue: stored as full URL string but code prepends IGDB base URL again).
- **Recommendations (books):** Hardcover doesn't return similar books directly. Investigate social graph API for "what others are reading." If not feasible this iteration, skip.
- **Mobile module colors:** Apply `bg-muted` backgrounds to mobile accordion section headers to match desktop card/module pattern.
- **Notes button:** Replace `bg-blue-600` with `bg-primary` to use design system color `#1F19F6`.

---

## Tasks

- [x] � **Step 1: Fix Floating Notes Button Color**
  - [x] � Replace `bg-blue-600 hover:bg-blue-700` with `bg-primary hover:bg-primary/90` in `ItemDetail.tsx`

- [x] � **Step 2: Mobile Module Colors**
  - [x] � Add `bg-muted` background to `MobileAccordion` section containers to match desktop card styling

- [x] � **Step 3: Active Platform Field (Games)**
  - [x] � DB migration: add `active_platform text` column to `games` table
  - [x] � Add `active_platform: string | null` to `GameFields` type
  - [x] � Add platform selector (NativeSelect from available `platforms[]`) to StatusSheet for games
  - [x] � Wire `active_platform` into `onSubmit` → `extensionUpdates` in StatusSheet
  - [x] � Update sidebar + mobile to display `active_platform ?? platforms[0]`
  - [x] � Show original release platform (first in `platforms[]`) in the metadata bar at top of detail content

- [x] � **Step 4: Book Format Selector**
  - [x] � Add Physical/Digital selector (NativeSelect) to StatusSheet for books
  - [x] � Wire `format` into `onSubmit` → `extensionUpdates` in StatusSheet

- [x] 🟩 **Step 5: Fix Game Recommendations**
  - [x] 🟩 Fixed cover URL bug: component was double-prepending IGDB base URL. Now uses `rec.cover` directly (already a full URL)
  - [x] 🟩 Upgraded proxy to store `t_cover_big` instead of `t_cover_small` for better quality
  - [x] 🟩 Recommendations already render on both desktop (`ItemDetailContent`) and mobile (accordion section)
  - [x] 🟩 Added `id` to `similar_games` data (proxy + types) for library matching + commit flow
  - [x] 🟩 Refactored to PosterItem-style cards: library items link to detail, external items show "+ Add to Collection"

- [x] 🟩 **Step 6: Games in Same Collection (Series)**
  - [x] 🟩 Add new `collection-games` action to `igdb-proxy` Edge Function — query IGDB `collections` endpoint by name, return list of games with name + cover
  - [x] 🟩 Create `CollectionRow` component with PosterItem-style cards, library matching, and "+ Add to Collection" for external items
  - [x] 🟩 Add to desktop `ItemDetailContent` and mobile accordion (render when `item.game.collection` exists)
  - [x] 🟩 Note: Refactor `CollectionRow` and `RecommendationsRow` to PosterItem-style cards for consistency

- [x] � **Step 7: Books in Same Series**
  - [x] � Query user's own library for books with matching `series_name` (filter from Zustand store, no external API)
  - [x] � Create `SeriesRow` component (same horizontal scroll pattern, sorted by series_position, links to item detail)
  - [x] � Add to desktop `ItemDetailContent` and mobile accordion (render when `item.book.series_name` exists)

- [x] � **Step 8: Book Recommendations (Research)**
  - [x] � Investigated Hardcover GraphQL API — no `similar_books` or recommendation endpoint exists
  - [x] 🟩 Closest option: query popular books by same author or from same series, but not true recs
  - [x] � **Decision: Deferred.** Will revisit if Hardcover adds a recommendations endpoint, or explore Open Library as an alternative source