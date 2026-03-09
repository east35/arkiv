/**
 * Google Books Proxy Edge Function
 *
 * Proxies requests to the Google Books API, keeping the API key server-side.
 *
 * Endpoints (via `action` field in POST body):
 *   - search:  { action: "search", query: string }
 *   - details: { action: "details", id: string }
 *
 * Required Supabase secrets:
 *   - GOOGLE_BOOKS_API_KEY
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

// ---------------------------------------------------------------------------
// CORS headers (allow browser requests from any origin during dev)
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const BOOKS_API_BASE = "https://www.googleapis.com/books/v1/volumes"

/**
 * Get the Google Books API key from Supabase secrets.
 */
function getApiKey(): string {
  const key = Deno.env.get("GOOGLE_BOOKS_API_KEY")
  if (!key) {
    throw new Error("Missing GOOGLE_BOOKS_API_KEY secret")
  }
  return key
}

// ---------------------------------------------------------------------------
// Search: returns compact book results for autocomplete
// ---------------------------------------------------------------------------
async function searchBooks(query: string) {
  const apiKey = getApiKey()
  const params = new URLSearchParams({
    q: query,
    maxResults: "10",
    printType: "books",
    key: apiKey,
  })

  const res = await fetch(`${BOOKS_API_BASE}?${params}`)
  if (!res.ok) {
    throw new Error(`Google Books search failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const items = data.items || []

  return items.map((item: Record<string, unknown>) => {
    const info = item.volumeInfo as Record<string, unknown>
    const imageLinks = info.imageLinks as Record<string, string> | undefined

    return {
      id: item.id,
      title: info.title || "Untitled",
      authors: (info.authors as string[]) || [],
      thumbnail: imageLinks?.thumbnail?.replace("http:", "https:") || null,
      pageCount: info.pageCount || null,
      publishedDate: info.publishedDate || null,
    }
  })
}

// ---------------------------------------------------------------------------
// Details: returns full book metadata for item creation
// ---------------------------------------------------------------------------
async function getBookDetails(id: string) {
  const apiKey = getApiKey()
  const res = await fetch(`${BOOKS_API_BASE}/${id}?key=${apiKey}`)

  if (!res.ok) {
    throw new Error(`Google Books details failed: ${res.status} ${await res.text()}`)
  }

  const item = await res.json()
  const info = item.volumeInfo as Record<string, unknown>
  const imageLinks = info.imageLinks as Record<string, string> | undefined

  // Extract ISBN-13 if available, fallback to ISBN-10
  const identifiers = (info.industryIdentifiers as Array<{ type: string; identifier: string }>) || []
  const isbn = identifiers.find((i) => i.type === "ISBN_13")?.identifier
    || identifiers.find((i) => i.type === "ISBN_10")?.identifier
    || null

  return {
    id: item.id,
    title: info.title || "Untitled",
    authors: (info.authors as string[]) || [],
    publisher: (info.publisher as string) || null,
    publishedDate: (info.publishedDate as string) || null,
    description: (info.description as string) || null,
    pageCount: (info.pageCount as number) || null,
    categories: (info.categories as string[]) || [],
    thumbnail: imageLinks?.thumbnail?.replace("http:", "https:")
      || imageLinks?.smallThumbnail?.replace("http:", "https:")
      || null,
    isbn,
    averageRating: (info.averageRating as number) || null,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { action, query, id } = await req.json()

    let data: unknown

    switch (action) {
      case "search":
        if (!query || typeof query !== "string") {
          return new Response(JSON.stringify({ error: "query is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        data = await searchBooks(query)
        break

      case "details":
        if (!id || typeof id !== "string") {
          return new Response(JSON.stringify({ error: "id (string) is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        data = await getBookDetails(id)
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use "search" or "details".' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("google-books-proxy error:", err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
