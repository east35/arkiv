# ShelfLog MVP Implementation Plan

**Overall Progress:** `0%`

## TLDR

Build ShelfLog from zero to functional MVP: a personal media tracker for games and books with fuzzy search, status tracking, library views, lists, statistics, and settings. Replace Yamtrack. Stack: Vite + React 19 + Tailwind v4 + shadcn/ui + Zustand + Supabase.

## Critical Decisions

- **Router:** React Router v7 — mature, widely adopted, good shadcn/ui ecosystem compatibility.
- **IGDB proxy:** IGDB requires server-side Twitch OAuth. Supabase Edge Function is the natural fit to avoid exposing credentials client-side.
- **Google Books:** Public API with key — can call client-side with env var, but Edge Function keeps it consistent with IGDB pattern.
- **Supabase schema first:** RLS policies, auth, and table design must be defined before any frontend data layer.
- **Tailwind v4 plugin mode:** No `tailwind.config.js` — all config via CSS `@theme`. Scaffold doc confirms this.

---

## Tasks

- [ ] 🟥 **Step 1: Project Scaffold**
  - [ ] 🟥 Initialize Vite + React 19 + TypeScript (strict)
  - [ ] 🟥 Install and configure Tailwind v4 (plugin mode via `@tailwindcss/vite`)
  - [ ] 🟥 Install shadcn/ui, Zustand v5, Fuse.js v7, Lucide React
  - [ ] 🟥 Configure path aliases (`@/` → `src/`)
  - [ ] 🟥 Install and configure React Router v7
  - [ ] 🟥 Verify `npm run dev` works with a hello-world page

- [ ] 🟥 **Step 2: Supabase Backend Setup**
  - [ ] 🟥 Create Supabase project
  - [ ] 🟥 Design and apply database schema (items, books, games, lists, list_items, user_preferences)
  - [ ] 🟥 Configure Auth (email/password)
  - [ ] 🟥 Write RLS policies (user-scoped data)
  - [ ] 🟥 Install `@supabase/supabase-js`, configure client
  - [ ] 🟥 Create Edge Function for IGDB proxy (Twitch OAuth + search/details)
  - [ ] 🟥 Create Edge Function for Google Books proxy (search/details)

- [ ] 🟥 **Step 3: Core Types & State**
  - [ ] 🟥 Define TypeScript types (`Item`, `Book`, `Game`, `Status`, `MediaType`, `List`, `UserPreferences`)
  - [ ] 🟥 Build Zustand store: items CRUD, filters, sort, view toggle
  - [ ] 🟥 Integrate Fuse.js for local fuzzy search over tracked items
  - [ ] 🟥 Build Supabase data hooks (fetch, upsert, delete with RLS)

- [ ] 🟥 **Step 4: Shell & Navigation**
  - [ ] 🟥 App shell layout (sidebar/nav + content area)
  - [ ] 🟥 8 routes: Home, Search, Games, Books, Statistics, Lists, Settings, Sign Out
  - [ ] 🟥 Responsive nav (sidebar on desktop, bottom bar or drawer on mobile)
  - [ ] 🟥 Auth gate (redirect to login if unauthenticated)

- [ ] 🟥 **Step 5: Auth Flows**
  - [ ] 🟥 Sign up page
  - [ ] 🟥 Sign in page
  - [ ] 🟥 Sign out with confirmation alert
  - [ ] 🟥 Auth state in Zustand, Supabase session listener

- [ ] 🟥 **Step 6: Status Sheet**
  - [ ] 🟥 Modal (desktop) / sheet (mobile) component
  - [ ] 🟥 Fields: status picker, score counter (0–10, tenths), progress (page or time), dates, notes
  - [ ] 🟥 Auto-date behavior on status transitions
  - [ ] 🟥 Update CTA (disabled until dirty), Delete CTA (confirmation)
  - [ ] 🟥 Metadata row (backlog date, source, lists)

- [ ] 🟥 **Step 7: Library Views (Games + Books)**
  - [ ] 🟥 Shared library view component parameterized by media type
  - [ ] 🟥 Data controls: fuzzy search, status filter, source filter, sort, view toggle
  - [ ] 🟥 Poster view: responsive grid, cover cards with status icon + date
  - [ ] 🟥 Table view: Cover · Title · Score · Progress · Status · Start Date · End Date
  - [ ] 🟥 Quick actions: edit (status sheet), list management, activity history
  - [ ] 🟥 Hover overlay on desktop, tap on mobile (with hide preference)

- [ ] 🟥 **Step 8: Search (External API)**
  - [ ] 🟥 Media type picker (Games / Books)
  - [ ] 🟥 Autocomplete input hitting Edge Functions
  - [ ] 🟥 Preview results list before committing to library
  - [ ] 🟥 Commit flow: fetch full metadata → create item → open status sheet

- [ ] 🟥 **Step 9: Home View**
  - [ ] 🟥 Display all "In Progress" items (games + books combined)
  - [ ] 🟥 Sort: Title, Recent, Completed
  - [ ] 🟥 Reuse poster/table card components from library views

- [ ] 🟥 **Step 10: Item Detail Views**
  - [ ] 🟥 Book detail: Overview, User Notes, History, Details, Actions, Related Content
  - [ ] 🟥 Game detail: Overview (cover + screenshots), Details, Actions, Related Content
  - [ ] 🟥 Status sheet integration from detail view
  - [ ] 🟥 Related content sections (series, recommendations, etc. — data-dependent)

- [ ] 🟥 **Step 11: Lists**
  - [ ] 🟥 Lists overview: create new list (name + description), search, sort, list cards
  - [ ] 🟥 List detail: header, filters (status, media type), sort, poster/table toggle
  - [ ] 🟥 Add/remove items from lists (from status sheet or quick action)
  - [ ] 🟥 List cover defaults to first item, user-selectable

- [ ] 🟥 **Step 12: Statistics**
  - [ ] 🟥 Date range controls (predefined tabs + custom range picker)
  - [ ] 🟥 High-level stat cards: Completed, Avg Rating, Most Active Date, Streak
  - [ ] 🟥 Activity heatmap (GitHub-style)
  - [ ] 🟥 Charts: Media Type distribution, Status distribution, Status by Media Type, Score distribution
  - [ ] 🟥 Top Rated Media list
  - [ ] 🟥 Timeline feed (vertical, cards alternating left/right, grouped by month)

- [ ] 🟥 **Step 13: Settings**
  - [ ] 🟥 Account: username edit, change password
  - [ ] 🟥 Linked Accounts: Steam ID, Calibre path (UI only for MVP — sync is post-MVP)
  - [ ] 🟥 Preferences: hover overlay toggle, date format, time format
  - [ ] 🟥 Export Data: CSV export of full library

- [ ] 🟥 **Step 14: Yamtrack Import**
  - [ ] 🟥 CSV upload UI
  - [ ] 🟥 Parse and map Yamtrack CSV columns to ShelfLog schema
  - [ ] 🟥 Skip rows with media_type other than `game` or `book`
  - [ ] 🟥 Batch insert into Supabase

- [ ] 🟥 **Step 15: Polish & Ship**
  - [ ] 🟥 Responsive pass (all views mobile-friendly)
  - [ ] 🟥 Loading states, error handling, empty states
  - [ ] 🟥 Accessibility audit (keyboard nav, screen reader labels)
  - [ ] 🟥 Deploy (hosting TBD — Vercel/Netlify for frontend, Supabase hosted)
