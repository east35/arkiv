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
 *   - CORS_ALLOWED_ORIGINS (optional, comma-separated)
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------------------------------------------------------------------
// Security + CORS
// ---------------------------------------------------------------------------

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
]

const allowedOrigins = new Set(
  (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
}

const BOOKS_API_BASE = "https://www.googleapis.com/books/v1/volumes"
const MAX_BODY_BYTES = 4_096
const MAX_SEARCH_QUERY_LENGTH = 100
const MAX_BOOK_ID_LENGTH = 120
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 90

const requestCounts = new Map<string, { count: number; resetAt: number }>()

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY secrets")
}

const authClient = createClient(supabaseUrl, supabaseAnonKey)

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getCorsHeaders(req: Request): Headers {
  const headers = new Headers(baseCorsHeaders)
  const origin = req.headers.get("origin")
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
  }
  return headers
}

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin")
  return !origin || allowedOrigins.has(origin)
}

function jsonResponse(req: Request, payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...Object.fromEntries(getCorsHeaders(req).entries()),
      "Content-Type": "application/json",
    },
  })
}

function enforceBodyLimit(req: Request): void {
  const contentLength = req.headers.get("content-length")
  if (!contentLength) return
  const bytes = Number(contentLength)
  if (Number.isFinite(bytes) && bytes > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body is too large")
  }
}

function enforceRateLimit(userId: string): void {
  const now = Date.now()
  const entry = requestCounts.get(userId)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new HttpError(429, "Too many requests, please try again shortly")
  }
  entry.count += 1
  requestCounts.set(userId, entry)
}

async function requireAuthenticatedUser(req: Request): Promise<{ id: string }> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Authentication required")
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    throw new HttpError(401, "Authentication required")
  }

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
    throw new HttpError(401, "Authentication required")
  }

  return { id: data.user.id }
}

function validateSearchQuery(query: unknown): string {
  if (typeof query !== "string") {
    throw new HttpError(400, "query must be a string")
  }
  const normalized = query.trim()
  if (!normalized) {
    throw new HttpError(400, "query is required")
  }
  if (normalized.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new HttpError(400, `query must be ${MAX_SEARCH_QUERY_LENGTH} characters or fewer`)
  }
  if (containsControlChars(normalized)) {
    throw new HttpError(400, "query contains invalid characters")
  }
  return normalized
}

function validateBookId(id: unknown): string {
  if (typeof id !== "string") {
    throw new HttpError(400, "id must be a string")
  }
  const normalized = id.trim()
  if (!normalized) {
    throw new HttpError(400, "id is required")
  }
  if (normalized.length > MAX_BOOK_ID_LENGTH) {
    throw new HttpError(400, `id must be ${MAX_BOOK_ID_LENGTH} characters or fewer`)
  }
  if (/\s/.test(normalized) || containsControlChars(normalized)) {
    throw new HttpError(400, "id contains invalid characters")
  }
  return normalized
}

function containsControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32) return true
  }
  return false
}

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
    const responseBody = await res.text()
    console.error("Google Books search failed", { status: res.status, responseBody })
    throw new HttpError(502, "External book service is temporarily unavailable")
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
    const responseBody = await res.text()
    console.error("Google Books details failed", { status: res.status, id, responseBody })
    throw new HttpError(502, "External book service is temporarily unavailable")
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
    if (!isOriginAllowed(req)) {
      return jsonResponse(req, { error: "Origin not allowed" }, 403)
    }
    return new Response("ok", { headers: getCorsHeaders(req) })
  }

  try {
    if (!isOriginAllowed(req)) {
      throw new HttpError(403, "Origin not allowed")
    }
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed")
    }

    enforceBodyLimit(req)
    const user = await requireAuthenticatedUser(req)
    enforceRateLimit(user.id)

    const body = await req.json()
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid JSON payload")
    }
    const { action, query, id } = body as Record<string, unknown>

    let data: unknown

    switch (action) {
      case "search":
        data = await searchBooks(validateSearchQuery(query))
        break

      case "details":
        data = await getBookDetails(validateBookId(id))
        break

      default:
        throw new HttpError(400, 'Invalid action. Use "search" or "details".')
    }

    return jsonResponse(req, data)
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { error: err.message }, err.status)
    }
    console.error("google-books-proxy unexpected error:", err)
    return jsonResponse(req, { error: "Internal server error" }, 500)
  }
})
