# Post-Import Metadata Enrich

**Type:** Improvement  
**Priority:** High  
**Effort:** Medium  
**Status:** Backlog  

## TL;DR

Imported Yamtrack data is missing most metadata — only title, cover URL, status, progress, and score came through. We need a one-time bulk enrich pass that re-fetches full metadata from IGDB / Google Books for all imported items, then deprecate the import feature entirely.

## Current State

- Yamtrack CSV import works, but the CSV only contains: `title`, `image`, `status`, `score`, `progress`, `source`, `media_id`
- Imported items are missing: **genres, description, developer/publisher (games), author/publisher (books), release/publish dates, platforms, page counts, themes, screenshots**
- The `external_id` field stores `source:media_id` (e.g. `igdb:12345`, `hardcover:67890`) — we have the keys to look up full metadata

## Expected Outcome

- A one-time "Enrich Library" action (button in Settings > Data, or a standalone script)
- For each item missing metadata:
  - Parse `external_id` to extract source + ID
  - Call the appropriate Edge Function (IGDB for games, Google Books for books)
  - Backfill: genres, description, developer/author, publisher, release_date/publish_date, platforms, page_count, themes, screenshots
- Progress indicator showing enrichment status
- After enrichment is complete, remove/hide the Import feature from the UI

## Relevant Files

- `src/lib/yamtrack-parser.ts` — current import mapper (sets most extension fields to `null`)
- `src/hooks/useCommitItem.ts` — existing fetch-metadata-and-create flow (reusable pattern)
- `src/hooks/useExternalSearch.ts` — IGDB/Google Books API integration
- `supabase/functions/igdb-proxy/` — IGDB Edge Function
- `supabase/functions/google-books-proxy/` — Google Books Edge Function

## Notes

- This is a one-time personal migration task — not a recurring feature
- After enrichment completes successfully, deprecate the `/import` route and remove nav link
- Rate limiting: IGDB has a 4 req/sec limit — batch with delays
- `hardcover` source maps to `google_books` in our system — may need to search by title rather than ID for books since Hardcover IDs ≠ Google Books IDs
- Consider a dry-run mode that shows what would be enriched before committing
