---
title: "Supabase Schema Design"
slug: "supabase-schema-design"
status: active
category: infrastructure
priority: critical
owner: "east35"
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: ["shelflog"]
updated_at: "2026-03-09T17:52:00.000000+00:00"
created_at: "2026-03-09T17:52:00.000000+00:00"
---

## Overview

Single-tenant Supabase Postgres database. Every table is user-scoped via `user_id` FK to `auth.users`. Row Level Security enforces isolation. No shared/public data.

## Auth

- **Provider:** Supabase Auth (email + password)
- **Session:** Supabase JS client handles tokens automatically
- **User identity:** `auth.users.id` (UUID) — referenced as `user_id` across all tables

---

## Tables

### `items`

The core table. Every tracked book or game is a row here. Shared fields live on this table; media-specific fields live in `books` or `games` (1:1 relationship).

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `user_id` | uuid | `auth.uid()` | FK → `auth.users`, NOT NULL |
| `media_type` | text | — | `'game'` or `'book'`, NOT NULL, CHECK |
| `title` | text | — | NOT NULL |
| `cover_url` | text | NULL | Fetched from metadata API |
| `genres` | text[] | `'{}'` | Array of genre strings |
| `description` | text | NULL | |
| `status` | text | `'backlog'` | CHECK: `backlog`, `in_progress`, `paused`, `completed`, `dropped` |
| `user_score` | numeric(3,1) | NULL | 0.0–10.0 |
| `source_score` | numeric(5,2) | NULL | From IGDB or Google Books |
| `notes` | text | NULL | Freeform |
| `source` | text | `'manual'` | CHECK: `igdb`, `google_books`, `manual` |
| `external_id` | text | NULL | IGDB ID or Google Books ID |
| `started_at` | timestamptz | NULL | Auto-set on → In Progress |
| `completed_at` | timestamptz | NULL | Auto-set on → Completed |
| `paused_at` | timestamptz | NULL | Auto-set on → Paused |
| `dropped_at` | timestamptz | NULL | Auto-set on → Dropped |
| `created_at` | timestamptz | `now()` | Backlog date |
| `updated_at` | timestamptz | `now()` | Updated via trigger |

**Indexes:**

- `idx_items_user_id` on `(user_id)`
- `idx_items_user_status` on `(user_id, status)`
- `idx_items_user_media` on `(user_id, media_type)`
- Unique: `(user_id, external_id)` WHERE `external_id IS NOT NULL` — prevents duplicate imports

### `books`

1:1 extension of `items` where `media_type = 'book'`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `item_id` | uuid | — | PK, FK → `items.id` ON DELETE CASCADE |
| `author` | text | NULL | |
| `publisher` | text | NULL | |
| `publish_date` | text | NULL | String — formats vary from Google Books |
| `page_count` | integer | NULL | Total pages from source |
| `progress` | integer | NULL | Current page |
| `format` | text | NULL | e.g., paperback, hardcover, ebook |
| `themes` | text[] | `'{}'` | |
| `isbn` | text | NULL | |
| `collection` | text | NULL | Calibre library reference |

### `games`

1:1 extension of `items` where `media_type = 'game'`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `item_id` | uuid | — | PK, FK → `items.id` ON DELETE CASCADE |
| `developer` | text | NULL | |
| `publisher` | text | NULL | |
| `release_date` | text | NULL | String — formats vary from IGDB |
| `platforms` | text[] | `'{}'` | |
| `format` | text | NULL | e.g., digital, physical |
| `themes` | text[] | `'{}'` | |
| `screenshots` | text[] | `'{}'` | URLs from IGDB |
| `progress_hours` | integer | 0 | Hours played |
| `progress_minutes` | integer | 0 | Minutes played (0–59) |
| `collection` | text | NULL | Steam, custom source |
| `similar_games` | jsonb | `'[]'` | Array of `{name, cover}` from IGDB |

### `lists`

User-created lists. Can contain both books and games.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `user_id` | uuid | `auth.uid()` | FK → `auth.users`, NOT NULL |
| `name` | text | — | NOT NULL |
| `description` | text | NULL | |
| `cover_item_id` | uuid | NULL | FK → `items.id` ON DELETE SET NULL, user-selected cover |
| `created_at` | timestamptz | `now()` | |
| `updated_at` | timestamptz | `now()` | |

**Indexes:**

- `idx_lists_user_id` on `(user_id)`

### `list_items`

Junction table. An item can appear in multiple lists.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `list_id` | uuid | — | FK → `lists.id` ON DELETE CASCADE, NOT NULL |
| `item_id` | uuid | — | FK → `items.id` ON DELETE CASCADE, NOT NULL |
| `added_at` | timestamptz | `now()` | |

**Constraints:**

- Unique: `(list_id, item_id)` — no duplicates within a list

### `activity_log`

Tracks status changes for timeline feed and statistics. One row per status transition.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `user_id` | uuid | `auth.uid()` | FK → `auth.users`, NOT NULL |
| `item_id` | uuid | — | FK → `items.id` ON DELETE CASCADE, NOT NULL |
| `from_status` | text | NULL | NULL if first status assignment |
| `to_status` | text | — | NOT NULL |
| `occurred_at` | timestamptz | `now()` | |

**Indexes:**

- `idx_activity_user_date` on `(user_id, occurred_at DESC)`
- `idx_activity_item` on `(item_id)`

### `user_preferences`

One row per user. Created on sign-up.

| Column | Type | Default | Notes |
|---|---|---|---|
| `user_id` | uuid | — | PK, FK → `auth.users` ON DELETE CASCADE |
| `username` | text | NULL | Display name |
| `hide_hover_overlay` | boolean | `false` | Touch device preference |
| `date_format` | text | `'iso'` | CHECK: `iso`, `eu`, `us`, `long` |
| `time_format` | text | `'12hr'` | CHECK: `12hr`, `24hr` |
| `steam_id` | text | NULL | Steam 64-bit ID (post-MVP sync) |
| `calibre_path` | text | NULL | Local Calibre DB path (post-MVP sync) |
| `created_at` | timestamptz | `now()` | |
| `updated_at` | timestamptz | `now()` | |

---

## Row Level Security

All tables use the same pattern: users can only access their own rows.

```sql
-- Pattern applied to: items, books (via join), games (via join), lists, list_items, activity_log, user_preferences

ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- items, lists, activity_log, user_preferences (have direct user_id)
CREATE POLICY "Users can CRUD own rows"
  ON <table>
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- books, games (user_id lives on parent items table)
CREATE POLICY "Users can CRUD own book/game rows"
  ON books  -- or games
  FOR ALL
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = item_id AND items.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = item_id AND items.user_id = auth.uid()));

-- list_items (user_id lives on parent lists table)
CREATE POLICY "Users can CRUD own list items"
  ON list_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND lists.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND lists.user_id = auth.uid()));
```

---

## Triggers

### `updated_at` auto-update

Applied to: `items`, `lists`, `user_preferences`.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Repeat for lists, user_preferences
```

### `user_preferences` auto-create on sign-up

```sql
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();
```

---

## Edge Functions

### `igdb-proxy`

- **Auth:** Twitch Client Credentials OAuth (client_id + client_secret stored as Supabase secrets)
- **Endpoints:**
  - `POST /igdb-proxy/search` — body: `{ query: string }` → returns array of game results (id, name, cover, platforms, summary)
  - `POST /igdb-proxy/details` — body: `{ id: number }` → returns full game metadata (companies, screenshots, genres, themes, release date)
- **Token caching:** Twitch tokens last ~60 days. Cache in memory or Supabase vault; refresh on 401.

### `google-books-proxy`

- **Auth:** Google Books API key stored as Supabase secret
- **Endpoints:**
  - `POST /google-books-proxy/search` — body: `{ query: string }` → returns array of book results (id, title, authors, thumbnail, pageCount)
  - `POST /google-books-proxy/details` — body: `{ id: string }` → returns full book metadata (publisher, publishedDate, isbn, description, categories)

---

## Design Rationale

- **Single `items` table + extension tables** rather than separate `books`/`games` tables — enables unified queries for Home view, Lists, Statistics, and mixed-media operations without unions.
- **`activity_log`** is append-only — powers the timeline feed and statistics (streak, heatmap, most active day) without parsing item timestamps.
- **`text` for dates from external APIs** — IGDB and Google Books return inconsistent date formats (sometimes year-only). Storing as text avoids parse failures; display formatting happens client-side.
- **`progress` split differently per media type** — books use a single integer (page count); games use hours + minutes (two integers). This avoids a single overloaded column.
- **No `companies` array on games** — developer and publisher are separate text fields for simpler display. IGDB's company model is complex; we flatten it.

## Open Questions

- **Steam auth method:** Steam 64-bit ID stored in preferences. Actual sync (GetOwnedGames API) is post-MVP. Do we validate the ID format on save?
- **Calibre multi-database:** Some users have multiple Calibre libraries. Single `calibre_path` field may need to become an array or separate table. Deferring — post-MVP.
- **Activity log granularity:** Should we log score changes and progress updates, or only status transitions? Starting with status-only to keep it simple.
