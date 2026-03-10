# ShelfLog
 
ShelfLog is a personal library tracker for **games** and **books**. It replaces Yamtrack with better UX (including **fuzzy search**) and a clean workflow for statuses, progress, ratings, and notes.
 
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
