# ShelfLog MVP

## Problem

Replace Yamtrack. Track games and books with statuses, progress, ratings, and notes. Yamtrack's exact-match search is a constant pain point — fuzzy search is a must.

## Media Types

- **Games** — in scope
- **Books** — in scope
- **Comics** — deferred (series subscriptions, issue variants, and expiry make it a separate problem)

---

## Data Model

### Shared Fields (all items)

| Field | Type | Notes |
|---|---|---|
| Title | string | |
| Media type | enum (`game`, `book`) | |
| Cover | URL | Fetched from metadata API |
| Genres | string[] | |
| Description | string | |
| Status | enum | See Status values below |
| User Score | float, 0–10 | To the tenths |
| Source Score | float | From IGDB or Google Books |
| Notes | freeform text | |
| Source | enum (`igdb`, `google_books`, `manual`) | |
| External ID | string | IGDB ID or Google Books ID |
| Started At | datetime | Auto-set on → In Progress |
| Completed At | datetime | Auto-set on → Completed |
| Paused At | datetime | Auto-set on → Paused |
| Dropped At | datetime | Auto-set on → Dropped |

### Status Values

`Backlog` · `In Progress` · `Paused` · `Completed` · `Dropped`

### Book-Specific Fields

| Field | Notes |
|---|---|
| Author | |
| Publisher | |
| Publish Date | |
| Page Count | From Google Books |
| Progress | Current page (numeric) |
| Format | |
| Themes | |
| ISBN | |
| Collection | Calibre library reference |

### Game-Specific Fields

| Field | Notes |
|---|---|
| Developer / Publisher | Companies from IGDB |
| Release Date | |
| Platforms | |
| Format | |
| Themes | |
| Screenshots | From IGDB |
| Progress | Time played — hours + minutes, fuzzy entry (no strict HH:MM) |
| Collection | Steam or custom source |

---

## Navigation

1. **Home** — In Progress items (games + books), sortable
2. **Search** — type picker (games/books), autocomplete, preview before commit
3. **Games** — full games library view
4. **Books** — full books library view
5. **Statistics** — analytics dashboard
6. **Lists** — user-created lists (can mix media types)
7. **Settings** — account, linked accounts, preferences, export
8. **Sign Out** — confirmation alert

---

## Views

### Library Views (Games + Books — identical structure)

**Data Controls**
- Fuzzy search (limited to tracked items)
- Filter 1: status (All / Backlog / In Progress / Paused / Completed / Dropped)
- Filter 2: source (Steam / Manually Entered / Custom Source)
- Sort: Rating, Title, Progress, Start Date, Completed Date
- View toggle: Poster / Table

**Poster View**
- Responsive grid of object previews
- Each card: cover, title, status icon + associated date
- Quick actions on hover (desktop) / tap (mobile): Edit (status sheet), List management, Activity history

**Table View**

Columns: Cover · Title · Score · Progress · Status · Start Date · End Date

---

### Status Sheet

Triggered from any item card. Modal on desktop, sheet on mobile.

| Field | Behavior |
|---|---|
| Status | Single-select picker |
| Score | Counter, 0–10 to the tenths |
| Progress | Page count (books) or time played (games, fuzzy hours/minutes) |
| Started | Native date picker, auto-set on → In Progress |
| Status Date | Native date picker, auto-set on → Completed / Paused / Dropped |
| Notes | Free text |
| Metadata | Backlog date, data source, lists this item is in |

**CTAs:** Update (disabled until changed) · Delete (confirmation alert)

---

### Lists View

- New List CTA → sheet/modal: Name + Description, Create disabled until filled
- Sort: Name / Last Item Added / Items Count / Newest First
- Search lists
- List preview card: cover (first item added, user-selectable), title, description, item count
- Edit on hover/tap

### List Detail View

- Header: list title, item count, Edit CTA
- Filter 1: status
- Filter 2: media type (All / Books / Games)
- Sort: Status / Date Added / Media Type / Title
- Same Poster / Table view toggle as library views

---

### Statistics View

**Date Range**
- Predefined: Today, Yesterday, This Week, Last 7 Days, This Month, Last 30 Days, Last 90 Days, This Year, Last 6 Months, Last 12 Months, All Time
- Custom: start + end date picker with range preview

**Widgets**

| Widget | Description |
|---|---|
| Completed Items | Count / total |
| Average Rating | Avg / 10 |
| Most Active Date | Day of week + % of activity |
| Current Streak | Days active, longest streak |
| Activity Heatmap | GitHub-style grid, X = month, Y = day of week |
| Media Type Distribution | Pie chart: Games / Books |
| Status Distribution | Pie chart: all statuses |
| Status by Media Type | Stacked bar chart |
| Score Distribution | Bar chart, X = 0–10, sliced by media type |
| Top Rated Media | Combined list, sorted by score + completion date |
| Timeline Feed | Vertical chronological timeline, cards alt left/right, grouped by month |

---

### Settings View

**Account**
- Username · Save Changes
- Change Password (current + new + confirm, visibility toggles)

**Linked Accounts**
- Steam: Steam 64-bit ID *(open question: confirm auth method)*
- Calibre: local SQLite path *(open question: multi-database support)*

**Preferences**
- Hide hover overlay on touch devices (toggle)
- Date format: ISO / EU / US / Long
- Time format: 12hr / 24hr
- Save Preferences CTA

**Notifications** — TBD

**Export Data** — CSV export CTA

---

## Item Detail View

### Book Detail

Sections: Overview · User Notes · History · Details · Actions · Related Content

- **Overview:** cover, title, genres, description, status (→ status sheet), source score, user score
- **History:** started, ended, progress (page count)
- **Details:** format, page count, author, publish date, publisher, themes, ISBN, source, collection
- **Actions:** Add to list · Activity history · Sync metadata
- **Related Content:** Series · Recommendations · Other books by author

### Game Detail

Sections: Overview · Details · Actions · Related Content

- **Overview:** cover, screenshots, title, genres, description, status (→ status sheet), IGDB score, user score
- **Details:** format, release date, themes, platforms, companies, source, collection
- **Actions:** Add to list · Activity history · Sync metadata
- **Related Content:** Parent Game · Remasters · Standalone Expansions · Recommendations

---

## Integrations

| Service | Purpose | Priority |
|---|---|---|
| IGDB | Game metadata + cover + screenshots | MVP |
| Google Books | Book metadata + cover + page count | MVP |
| Yamtrack CSV | Import existing library | MVP |
| Steam | Owned games sync via `GetOwnedGames` | Post-MVP |
| Calibre | Owned books sync via local SQLite | Post-MVP |

**Yamtrack import:** rows with `media_type` other than `game` or `book` are silently skipped.

---

## Out of Scope

- Comics tracking
- Social / sharing features
- Native iOS/Android app
- PlayStation, Kindle, Epic, GOG, Xbox (no reliable public APIs)
- Notifications (TBD, not MVP)

---

## Vision / Future

- **Ambient Display** — dedicated web page for an Android tablet; shows in-progress covers + high-level monthly stats. POC exists for Yamtrack.

---

## Stack

- **Frontend:** Vite + React + Tailwind CSS v4
- **State:** Zustand
- **Backend:** Supabase (Postgres, RLS, Auth, Storage)
- **Code agents:** Claude Code (backend/planning), Gemini (frontend)
