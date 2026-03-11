---
title: "ALPHA-REFINEMENT"
slug: "ALPHA-REFINEMENT"
status: done
category: uncategorized
priority: medium
owner: ""
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: []
updated_at: "2026-03-11T14:10:20.975446+00:00"
created_at: "2026-03-11T13:41:22.300597+00:00"
---
# ShelfLog Alpha Refinement Plan

**Overall Progress:** `91%`

## TLDR

Harden ShelfLog for alpha release: fix critical bugs, polish UX rough edges, ensure data integrity, and address missing functionality discovered during initial use. Focus on stability and completeness before beta.

## Critical Decisions

- **Metadata Enrich:** One-time bulk backfill for Yamtrack imports using stored `external_id`, then deprecate import feature entirely.
- **Error Handling:** Add graceful degradation for API failures (IGDB/Google Books down, rate limits, network errors).
- **Empty States:** Already implemented in Step 15, but verify all edge cases (no search results, failed fetches, etc.).
- **Theme Support:** User added `ThemeProvider` and theme preference — ensure it persists correctly and syncs with user preferences table.

---

## Tasks

### Data Integrity & Migration

- [x] � **Step 1: Post-Import Metadata Enrichment**
  - [x] � Build bulk enrich hook (`useMetadataEnrich`)
  - [x] � Parse `external_id` → fetch from IGDB/Google Books Edge Functions
  - [x] � Backfill: genres, description, developer/author, publisher, dates, platforms, page_count, themes, screenshots
  - [x] � Handle rate limits (IGDB: 4 req/sec) with batching + delays
  - [x] � Progress UI in Settings > Data tab
  - [x] � Handle edge case: Hardcover IDs ≠ Google Books IDs (fallback to title search)
  - [ ] 🟥 After completion, remove `/import` route and nav link (deferred — run enrich first)

### Bug Fixes

- [x] � **Step 2: Error Handling & Edge Cases**
  - [x] � Search: Already has toast error handling + loading spinner
  - [x] � Item Detail: Proper Loader2 spinner + 404 state with icon and back button
  - [x] � Status Sheet: Clamped progress inputs (score 0-10, pages ≥0, minutes 0-59)
  - [x] � Lists: Proper Loader2 spinner + 404 state with icon and back button
  - [x] � Statistics: Already safe (null checks, empty array guards)

- [x] � **Step 3: Theme Persistence**
  - [x] � ThemeProvider already persists to DB via `updatePreferences({ theme })`
  - [x] � Loads from DB on init via `useEffect` on `preferences?.theme`
  - [x] � Settings UI syncs via `handleThemeChange` → `setTheme`

### UX Polish

- [x] � **Step 4: Loading & Feedback States**
  - [x] � Home page: Loader2 spinner before items arrive
  - [x] 🟩 LibraryView: Loader2 spinner before items arrive
  - [x] � SearchResultItem: Already disables button + shows spinner during commit
  - [x] � StatusSheet: Already shows toast on save/delete success/error

- [x] � **Step 5: Mobile UX Refinement**
  - [x] � Bottom nav: `pb-16 md:pb-0` on main, `pb-safe` for iOS home indicator
  - [x] � All headers already `sticky top-0 z-10`
  - [x] � PosterItem quick actions: added `focus-within:opacity-100` for touch
  - [x] � ListDetail remove buttons: added `focus:opacity-100` for touch

- [x] � **Step 6: Keyboard Navigation & Focus Management**
  - [x] � Radix UI Dialog/Sheet primitives handle focus trap, Escape, and focus return natively
  - [x] � All interactive elements use semantic HTML buttons with aria-labels

### Performance

- [x] � **Step 7: Optimization Pass**
  - [x] � Library search: client-side Fuse.js over Zustand store — no debounce needed
  - [x] � External search: already debounced via `useDebounce` hook
  - [x] � Images: already use `loading="lazy"` on all poster grids
  - [x] � Zustand + useCallback prevent unnecessary re-renders

### Missing Features

- [x] � **Step 8: Search Query Params**
  - [x] � SearchUI reads `?q=` from URL on mount via `useSearchParams`
  - [x] � URL updated as user types (replace mode, no history spam)

- [x] � **Step 9: List Management Polish**
  - [x] � Added "Add to List..." to Item Detail dropdown menu + ManageListsDialog
  - [ ] � Show list membership badges on Item Detail (deferred — low priority)
  - [ ] � Bulk actions (deferred — beta feature)

- [x] � **Step 10: Settings Enhancements**
  - [x] � Username validation: 2–30 chars, alphanumeric + underscores, with toast errors
  - [ ] � Change password flow (deferred — needs Supabase Auth integration)
  - [ ] � Account deletion confirm dialog (deferred — beta feature)

### Testing & Validation

- [ ] � **Step 11: Manual QA Pass**
  - [ ] 🟥 Test all CRUD flows: Create, Read, Update, Delete for items, lists
  - [ ] 🟥 Test all status transitions (backlog → in_progress → completed, etc.)
  - [ ] 🟥 Test search for both games and books (verify results render correctly)
  - [ ] 🟥 Test CSV export (verify all fields present, correct format)
  - [ ] 🟥 Test RLS policies (create second test user, verify data isolation)

---

## Notes

- **Deprecation:** After Step 1 completes, remove `/import` from nav and routes.
- **Theme:** User already added `ThemeProvider` — just need to wire up DB persistence.
- **Scope Creep:** Avoid adding new features. Focus on stability and polish only.
- **Beta Blockers:** Steps 1-3 are critical. Steps 4-11 are nice-to-have but not blockers.