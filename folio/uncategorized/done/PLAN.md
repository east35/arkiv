---
title: "PLAN"
slug: "PLAN"
status: done
category: uncategorized
priority: medium
owner: ""
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: []
updated_at: "2026-03-11T14:10:10.395241+00:00"
created_at: "2026-03-09T18:03:36.758976+00:00"
---
# ShelfLog MVP Implementation Plan

**Overall Progress:** `95%`

## TLDR

Build ShelfLog from zero to functional MVP: a personal media tracker for games and books with fuzzy search, status tracking, library views, lists, statistics, and settings. Replace Yamtrack. Stack: Vite + React 19 + Tailwind v4 + shadcn/ui + Zustand + Supabase.

## Critical Decisions

- **Router:** React Router v7 — mature, widely adopted, good shadcn/ui ecosystem compatibility.
- **IGDB proxy:** IGDB requires server-side Twitch OAuth. Supabase Edge Function is the natural fit to avoid exposing credentials client-side.
- **Google Books:** Public API with key — can call client-side with env var, but Edge Function keeps it consistent with IGDB pattern.
- **Supabase schema first:** RLS policies, auth, and table design must be defined before any frontend data layer.
- **Tailwind v4 plugin mode:** No `tailwind.config.js` — all config via CSS `@theme`. Scaffold doc confirms this.
- **Agent assignment:** Opus handles backend (Supabase, schema, RLS, Edge Functions, data hooks, types). Gemini handles frontend (UI components, views, styling, routing). Steps are tagged below.

---

## Tasks

- [x] � **Step 1: Project Scaffold** `🤖 Gemini`
  - [x] � Initialize Vite + React 19 + TypeScript (strict)
  - [x] � Install and configure Tailwind v4 (plugin mode via `@tailwindcss/vite`)
  - [x] � Install shadcn/ui, Zustand v5, Fuse.js v7, Lucide React
  - [x] � Configure path aliases (`@/` → `src/`)
  - [x] � Install and configure React Router v7
  - [x] � Verify `npm run dev` works with a hello-world page

> ⚠️ **CONTEXT SWITCH → Opus** for Steps 2–3 (backend + data layer)

- [x] � **Step 2: Supabase Backend Setup** `🤖 Opus`
  - [x] � Create Supabase project
  - [x] � Design and apply database schema (items, books, games, lists, list_items, user_preferences)
  - [x] � Configure Auth (email/password)
  - [x] � Write RLS policies (user-scoped data)
  - [x] � Install `@supabase/supabase-js`, configure client
  - [x] � Create Edge Function for IGDB proxy (Twitch OAuth + search/details)
  - [x] � Create Edge Function for Google Books proxy (search/details)

- [x] � **Step 3: Core Types & State** `🤖 Opus`
  - [x] � Define TypeScript types (`Item`, `Book`, `Game`, `Status`, `MediaType`, `List`, `UserPreferences`)
  - [x] � Build Zustand store: items CRUD, filters, sort, view toggle
  - [x] � Integrate Fuse.js for local fuzzy search over tracked items
  - [x] � Build Supabase data hooks (fetch, upsert, delete with RLS)

> ⚠️ **CONTEXT SWITCH → Gemini** for Steps 4–7 (shell, auth UI, status sheet, library views)

- [x] � **Step 4: Shell & Navigation** `🤖 Gemini`
  - [x] � App shell layout (sidebar/nav + content area)
  - [x] � 8 routes: Home, Search, Games, Books, Statistics, Lists, Settings, Sign Out
  - [x] � Responsive nav (sidebar on desktop, bottom bar or drawer on mobile)
  - [x] � Auth gate (redirect to login if unauthenticated)

- [x] � **Step 5: Auth Flows** `🤖 Gemini`
  - [x] � Sign up page
  - [x] � Sign in page
  - [x] � Sign out with confirmation alert
  - [x] � Auth state in Zustand, Supabase session listener

- [x] � **Step 6: Status Sheet** `🤖 Gemini`
  - [x] � Modal (desktop) / sheet (mobile) component
  - [x] � Fields: status picker, score counter (0–10, tenths), progress (page or time), dates, notes
  - [x] � Auto-date behavior on status transitions
  - [x] � Update CTA (disabled until dirty), Delete CTA (confirmation)
  - [x] � Metadata row (backlog date, source, lists)

- [x] � **Step 7: Library Views (Games + Books)** `🤖 Gemini`
  - [x] � Shared library view component parameterized by media type
  - [x] � Data controls: fuzzy search, status filter, source filter, sort, view toggle
  - [x] � Poster view: responsive grid, cover cards with status icon + date
  - [x] � Table view: Cover · Title · Score · Progress · Status · Start Date · End Date
  - [x] � Quick actions: edit (status sheet), list management, activity history
  - [x] � Hover overlay on desktop, tap on mobile (with hide preference)

> ⚠️ **CONTEXT SWITCH → Opus** for Step 8 (Edge Function integration + commit flow logic)

- [x] � **Step 8: Search (External API)** `🤖 Opus + Gemini`
  - [x] � Media type picker (Games / Books)
  - [x] � Autocomplete input hitting Edge Functions
  - [x] � Preview results list before committing to library
  - [x] � Commit flow: fetch full metadata → create item → open status sheet

> ⚠️ **CONTEXT SWITCH → Gemini** for Steps 9–12 (views + UI)

- [x] � **Step 9: Home View** `🤖 Gemini`
  - [x] � Display all "In Progress" items (games + books combined)
  - [x] � Sort: Title, Recent, Progress
  - [x] � Reuse poster/table card components from library views

- [x] � **Step 10: Item Detail Views** `🤖 Gemini`
  - [x] � Book detail: Overview, User Notes, Details, Actions
  - [x] � Game detail: Overview, Details, Actions
  - [x] � Status sheet integration from detail view
  - [x] � Back navigation and delete action

- [x] � **Step 11: Lists** `🤖 Gemini`
  - [x] � Lists overview: create new list (name + description), list cards
  - [x] � List detail: header, delete list, remove items
  - [x] � Add items to lists (via "Add to List" dialog in quick actions)
  - [x] � List membership management dialog

- [x] 🟩 **Step 12: Statistics** `🤖 Opus (Logic) + Gemini (UI)`
  - [x] 🟩 Aggregation logic (Opus): count by status, average score, streaks
  - [x] 🟩 Date range filtering logic (Opus)
  - [x] � UI: Date range controls (predefined tabs + custom range picker)
  - [x] � UI: High-level stat cards: Completed, Avg Rating, Most Active Date, Streak
  - [x] � UI: Activity heatmap (GitHub-style)
  - [x] � UI: Charts: Media Type distribution, Status distribution, Score distribution
  - [x] � UI: Top Rated Media list

- [x] � **Step 13: Settings** `🤖 Gemini`
  - [x] � Account: username edit, change password
  - [x] � Linked Accounts: Steam ID, Calibre path (UI only for MVP — sync is post-MVP)
  - [x] � Preferences: hover overlay toggle, date format, time format
  - [x] � Export Data: CSV export of full library

> ⚠️ **CONTEXT SWITCH → Opus** for Step 14 (CSV parsing + batch insert logic)

- [x] � **Step 14: Yamtrack Import** `🤖 Opus`
  - [x] � CSV upload UI
  - [x] � Parse and map Yamtrack CSV columns to ShelfLog schema
  - [x] � Skip rows with media_type other than `game` or `book`
  - [x] � Batch insert into Supabase

> ⚠️ **CONTEXT SWITCH → Gemini** for Step 15 (responsive, states, a11y)

- [x] � **Step 15: Polish & Ship** `🤖 Gemini`
  - [x] � Responsive pass (all views mobile-friendly)
  - [x] � Loading states, error handling, empty states
  - [x] � Accessibility audit (keyboard nav, screen reader labels)
  - [ ] 🟥 Deploy (hosting TBD — Vercel/Netlify for frontend, Supabase hosted)