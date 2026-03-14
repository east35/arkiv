# Arkiv
 
Arkiv is a personal library tracker for **games** and **books**. It replaces Yamtrack with better UX (including **fuzzy search**) and a clean workflow for statuses, progress, ratings, and notes.
 
## What’s in scope (MVP)
 
- **Track items** (games + books)
- **Statuses**: Backlog, In Progress, Paused, Completed, Dropped
- **Progress**:
  - books: current page
  - games: time played (hours/minutes, freeform)
- **Ratings** (0–10, tenths)
- **Notes** per item
- **Fuzzy search** over your tracked library
- **Metadata** via integrations:
  - IGDB (games)
  - Google Books (books)
- **Supabase backend** (Auth + Postgres + RLS)
 
For full product scope, see `MVP.md`.
 
## Tech stack
 
- **Frontend**: Vite + React + TypeScript
- **Styling/UI**: Tailwind CSS v4 + shadcn
- **State**: Zustand
- **Backend**: Supabase (Postgres, RLS, Auth, Storage)
 
## Prerequisites
 
- Node.js (modern LTS recommended)
- npm (repo includes a `package-lock.json`)
- A Supabase project (hosted) OR Supabase CLI for local development
 
## Environment variables
 
This app requires Supabase credentials at runtime.
 
1. Create a local env file:
 
```bash
cp .env.example .env.local
```
 
2. Fill in:
 
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_SUPABASE_FUNCTIONS_URL` if you want local dev to hit a local edge-function runner

The app will throw on startup if these are missing (see `src/lib/supabase.ts`).
 
## Getting started
 
Install dependencies:
 
```bash
npm install
```
 
Start the dev server:
 
```bash
npm run dev
```
 
Vite will print the local URL (typically `http://localhost:5173`).
 
## Supabase

### Option A: Hosted Supabase (recommended)
 
- Create a Supabase project
- Copy the project URL and anon key into `.env.local`
- Run the app with `npm run dev`
- Local `npm run dev` automatically proxies Edge Function requests through Vite,
  so your browser does not need direct CORS access to `https://<project>.supabase.co/functions/v1`.
- This uses the hosted functions and does not require Docker or `supabase start`.
- Set `VITE_SUPABASE_FUNCTIONS_PROXY=false` only if you want to bypass the dev proxy.

### Option A1: Local Edge Functions Without Docker

- Install Deno locally.
- Copy `.env.functions.example` to `.env.functions.local` and fill in the secrets needed by your functions.
- By default the local runner starts `igdb-proxy` and `hardcover-proxy`. Only add `google-books-proxy` to `LOCAL_FUNCTIONS` if you still use it.
- Set `VITE_SUPABASE_FUNCTIONS_URL=http://127.0.0.1:54331/functions/v1` in `.env.local`.
- Start the local function runner in one terminal:

```bash
npm run dev:functions
```

- Start the frontend in another:

```bash
npm run dev
```

- In this mode, auth/database/storage still use your hosted Supabase project, but edge-function calls run from local code in `supabase/functions/`.
- This is the recommended path for testing new edge-function changes before deploying them.

### Option A2: Deploy Function Changes To Test Them

- Supabase CLI can deploy without Docker: `npx supabase functions deploy <function-name> --use-api`

### Edge Function security secrets

Set the following Supabase Edge Function secrets before deploying function calls:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `GOOGLE_BOOKS_API_KEY` only if you still deploy `google-books-proxy`
- `CORS_ALLOWED_ORIGINS` (comma-separated allowlist, e.g. `https://app.example.com`)

If you are not using the dev proxy, make sure `CORS_ALLOWED_ORIGINS` includes every local frontend origin you use.
 
### Option B: Local Supabase (CLI)
 
This repo includes a `supabase/` directory with migrations.
 
- Install the Supabase CLI
- Start the local stack from the repo root:
 
```bash
supabase start
```
 
Then update `.env.local` to point at the local API URL and anon key printed by the CLI.
 
## Useful scripts
 
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint
