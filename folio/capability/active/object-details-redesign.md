# Object Details Redesign — Implementation Plan

**Overall Progress:** `100%`

## TLDR

Redesign the Item Detail page (`/item/:id`) to match the new Figma designs. Key changes: relocate status badge to top-right header, side-by-side score cards, description truncation with "read more", collapsible accordion sections on mobile, Notes as a slide-out panel (desktop) / tab (mobile), redesigned Lists section, and a new Recommendations row. Desktop and mobile are structurally different layouts.

## Critical Decisions

- **Recommendations data:** `similarGames` is returned by the IGDB Edge Function but **not persisted** to the DB. Two options: (a) store at commit time in a new `jsonb` column on `games`, or (b) re-fetch from IGDB on detail view via `external_id`. Decision: **store at commit time** — avoids extra API calls, works offline/fast, and IGDB rate limits are tight. Books don't have equivalent data from Hardcover yet, so Recommendations will be games-only for now.
- **Mobile accordion vs flat scroll:** Design shows collapsible sections ("Your Details", "Game Details", "Lists", "Recommendations"). Use a simple disclosure pattern (no library needed — just `useState` toggles with Tailwind transitions).
- **Notes panel:** Desktop uses a slide-out panel from the right edge (not a tab). Mobile uses a bottom tab bar ("Overview" / "Notes"). Implement as a conditional layout, not a shared Tabs component.
- **Description truncation:** CSS `line-clamp` with a "read more…" link that opens a modal/alert with the full text (per design annotation).
- **Platform edit icon:** The pencil icon next to platform in the design opens the StatusSheet (same as the status button). No new edit flow needed.

---

## Tasks

- [x] � **Step 0: Schema — Store Recommendations**
  - [x] � Add `similar_games jsonb DEFAULT '[]'` column to `games` table via Supabase migration
  - [x] � Update `GameFields` type to include `similar_games: Array<{ name: string; cover: string | null }>`
  - [x] � Update the search commit flow (`useItems` or equivalent) to persist `similarGames` from IGDB details response into the new column

- [x] � **Step 1: Desktop Layout — Header & Status Badge**
  - [x] � Move status pill + edit icon to a sticky top bar (right-aligned), alongside the back button (left-aligned)
  - [x] � Remove current below-cover status button on desktop
  - [x] � Style the status pill to match design (colored background, flag icon, "Completed" label, divider, edit icon)

- [x] � **Step 2: Desktop Layout — Left Column Redesign**
  - [x] � Cover image (full-width in column, no max-width constraint)
  - [x] � "Your Progress" card: time display + green flag icon, platform row with edit pencil icon
  - [x] � Side-by-side "Your Score" / "Community Score" cards (2-column grid within left column)
  - [x] � Date rows: Added, Started, Completed (label left, value right)

- [x] � **Step 3: Desktop Layout — Right Column Redesign**
  - [x] � Title (large), metadata row (developer | year | series | platform) with pipe separators
  - [x] � Description with `line-clamp-4` and "read more…" CTA that opens a dialog
  - [x] � Genres and Themes as badge chips in labeled sections
  - [x] � "Notes" slide-out button fixed to right edge (opens a right-side panel overlay)
  - [x] � Lists section: cover thumbnail + list name + item count + "View List" button
  - [x] � Recommendations section: horizontal scrollable row of cover cards (title + studio below)

- [x] � **Step 4: Mobile Layout — Collapsed Accordion**
  - [x] � Back button, centered cover, centered title + metadata row
  - [x] � Collapsible sections with chevron: "Your Details", "Game/Book Details", "Lists", "Recommendations"
  - [x] � All sections default to collapsed state
  - [x] � Floating status bar at bottom (green pill + edit icon) — keep existing mobile FAB pattern

- [x] � **Step 5: Mobile Layout — Tab Bar & Notes**
  - [x] � Bottom tab bar with "Overview" / "Notes" tabs (above the status FAB)
  - [x] � Notes tab shows full notes content or empty state with "Add a note" CTA
  - [x] � Overview tab shows the accordion sections from Step 4

- [x] � **Step 6: Desktop Max-Width Constraint**
  - [x] � Ensure the detail layout is capped at `max-w-5xl` and centered on ultra-wide screens (per max-width design variant)
  - [x] � Sidebar + content area should respect this constraint naturally

- [x] � **Step 7: Polish & Edge Cases**
  - [x] � Book variant: adjust left column for page progress instead of time, author instead of developer, no Recommendations section (data unavailable)
  - [x] � Empty states: no score, no lists, no recommendations, no notes
  - [x] � Dark mode verification (designs are dark-themed)
  - [x] � Verify "Add to List" button still accessible (move to a secondary action or integrate into Lists section)
  - [x] � Responsive breakpoint: ensure clean transition at `md` between mobile accordion and desktop two-column

---

## Notes

- The current `ItemDetail.tsx` is 464 lines. The redesign will likely require splitting into sub-components (e.g., `ItemDetailHeader`, `ItemDetailSidebar`, `ItemDetailContent`, `MobileAccordionSection`, `RecommendationsRow`, `NotesPanel`).
- `max-w-5xl` is already set on the current layout container — Step 6 may be a no-op verification.
- "Add to Collection" button visible in the sidebar in the design is an existing global action, not part of this scope.
