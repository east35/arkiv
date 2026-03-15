/**
 * Hardcover Proxy Edge Function
 *
 * Proxies requests to the Hardcover GraphQL API, keeping the API key server-side.
 *
 * Endpoints (via `action` field in POST body):
 *   - search:  { action: "search", query: string, limit?: number, offset?: number }
 *   - details: { action: "details", id: number }
 *
 * Required Supabase secrets:
 *   - HARDCOVER_API_KEY
 *   - CORS_ALLOWED_ORIGINS (optional, comma-separated)
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

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
const allowsAnyOrigin = allowedOrigins.has("*")

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
}

const HARDCOVER_GRAPHQL_URL = "https://api.hardcover.app/v1/graphql"
const MAX_BODY_BYTES = 4_096
const MAX_SEARCH_QUERY_LENGTH = 100
const DEFAULT_SEARCH_LIMIT = 20
const MAX_SEARCH_LIMIT = 50
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
const HARDCOVER_TIMEOUT_MS = 12_000
const HARDCOVER_MAX_RETRIES = 1
const RETRY_BACKOFF_MS = 300

const requestCounts = new Map<string, { count: number; resetAt: number }>()


class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

function getCorsHeaders(req: Request): Headers {
  const headers = new Headers(baseCorsHeaders)
  const origin = req.headers.get("origin")
  if (origin && (allowsAnyOrigin || allowedOrigins.has(origin) || isLocalhostOrigin(origin))) {
    headers.set("Access-Control-Allow-Origin", origin)
  } else if (allowsAnyOrigin) {
    headers.set("Access-Control-Allow-Origin", "*")
  }
  return headers
}

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin")
  return allowsAnyOrigin || !origin || allowedOrigins.has(origin) || isLocalhostOrigin(origin)
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

function getRequesterKey(req: Request): string {
  const authHeader = req.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim()
    if (token) {
      // Decode JWT payload locally — no outgoing network call needed for rate-limiting.
      try {
        const [, payloadB64] = token.split(".")
        if (payloadB64) {
          const padding = (4 - (payloadB64.length % 4)) % 4
          const payload = JSON.parse(atob(payloadB64 + "=".repeat(padding)))
          if (typeof payload.sub === "string" && payload.sub) {
            return payload.sub
          }
        }
      } catch {
        // Fall through to anonymous key
      }
    }
  }

  // Anonymous fallback key for unauthenticated/stale-session clients.
  // This keeps the endpoint usable while still applying a per-requester
  // in-memory rate limit to reduce abuse.
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const origin = req.headers.get("origin")?.trim()
  const userAgent = req.headers.get("user-agent")?.trim()
  return [forwardedFor, origin, userAgent].filter(Boolean).join("|") || "anonymous"
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

function validateBookId(id: unknown): number {
  const n = typeof id === "number" ? id : parseInt(String(id), 10)
  if (isNaN(n) || n <= 0) {
    throw new HttpError(400, "id must be a positive integer")
  }
  return n
}

function containsControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32) return true
  }
  return false
}

function validateSearchLimit(limit: unknown): number {
  if (limit == null) return DEFAULT_SEARCH_LIMIT

  const value = typeof limit === "number" ? limit : parseInt(String(limit), 10)
  if (!Number.isInteger(value) || value <= 0 || value > MAX_SEARCH_LIMIT) {
    throw new HttpError(400, `limit must be an integer between 1 and ${MAX_SEARCH_LIMIT}`)
  }
  return value
}

function validateSearchOffset(offset: unknown): number {
  if (offset == null) return 0

  const value = typeof offset === "number" ? offset : parseInt(String(offset), 10)
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(400, "offset must be a non-negative integer")
  }
  return value
}

/**
 * Get the Hardcover API key from Supabase secrets.
 */
function getApiKey(): string {
  const key = Deno.env.get("HARDCOVER_API_KEY")
  if (!key) {
    throw new Error("Missing HARDCOVER_API_KEY secret")
  }
  return key
}

/**
 * Execute a GraphQL query against the Hardcover API.
 */
async function hardcoverQuery(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const apiKey = getApiKey()
  let attempt = 0

  while (attempt <= HARDCOVER_MAX_RETRIES) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort("timeout"), HARDCOVER_TIMEOUT_MS)
    const startedAt = Date.now()

    try {
      const res = await fetch(HARDCOVER_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Hardcover expects the raw token in the authorization header
          // (no "Bearer " prefix).
          "authorization": apiKey,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const responseBody = await res.text()
        console.error("Hardcover GraphQL request failed", { status: res.status, responseBody })
        throw new HttpError(502, "External book service is temporarily unavailable")
      }

      const json = await res.json() as {
        data?: unknown
        errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>
      }
      if (json.errors?.length) {
        const firstError = json.errors[0]?.message?.trim() || "Unknown GraphQL error"
        console.error("Hardcover GraphQL errors", json.errors)
        throw new HttpError(502, `External book service error: ${firstError}`)
      }

      console.info("Hardcover GraphQL request succeeded", {
        durationMs: Date.now() - startedAt,
        attempt: attempt + 1,
      })

      return json.data
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError"
      const isLastAttempt = attempt >= HARDCOVER_MAX_RETRIES

      if (isAbort) {
        console.error("Hardcover GraphQL request timed out", {
          timeoutMs: HARDCOVER_TIMEOUT_MS,
          attempt: attempt + 1,
        })
        if (isLastAttempt) {
          throw new HttpError(504, "External book service timed out")
        }
      } else if (!(err instanceof HttpError)) {
        console.error("Hardcover GraphQL network error", { err, attempt: attempt + 1 })
        if (isLastAttempt) {
          throw new HttpError(502, "External book service is temporarily unavailable")
        }
      } else {
        throw err
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * (attempt + 1)))
      attempt += 1
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new HttpError(502, "External book service is temporarily unavailable")
}

// ---------------------------------------------------------------------------
// Search: returns compact book results for autocomplete
// ---------------------------------------------------------------------------
async function searchBooks(query: string, limit: number, offset: number) {
  const fetchLimit = Math.min(limit + 1, MAX_SEARCH_LIMIT)
  const page = Math.floor(offset / limit) + 1
  const gql = `
    query SearchBooks($query: String!, $perPage: Int!, $page: Int!) {
      search(query: $query, query_type: "books", per_page: $perPage, page: $page) {
        results
      }
    }
  `

  const data = await hardcoverQuery(gql, { query, perPage: fetchLimit, page }) as {
    search?: { results?: string }
  }

  // results is a JSON string containing Typesense search results
  const rawResults = data?.search?.results
  if (!rawResults) return { results: [], hasMore: false }

  let parsed: { hits?: Array<{ document?: Record<string, unknown> }> }
  try {
    parsed = typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults
  } catch {
    return { results: [], hasMore: false }
  }

  const hits = parsed.hits ?? []

  const extractAuthorNames = (doc: Record<string, unknown>): string[] => {
    const toNames = (input: unknown): string[] => {
      if (!Array.isArray(input)) return []
      return input
        .map((entry) => {
          if (typeof entry === "string") return entry.trim()
          if (!entry || typeof entry !== "object") return ""

          const record = entry as Record<string, unknown>
          if (typeof record.name === "string") return record.name.trim()

          if (record.author && typeof record.author === "object") {
            const author = record.author as Record<string, unknown>
            if (typeof author.name === "string") return author.name.trim()
          }

          return ""
        })
        .filter(Boolean)
    }

    const fallbackAuthors = typeof doc.author === "string"
      ? doc.author.split(",").map((name) => name.trim()).filter(Boolean)
      : []

    const names = [
      ...toNames(doc.cached_contributors),
      ...toNames(doc.contributions),
      ...toNames(doc.authors),
      ...toNames(doc.author_names),
      ...fallbackAuthors,
    ]

    return Array.from(new Set(names))
  }

  const partialResults = hits
    .map((hit) => {
      const doc = hit.document
      if (!doc) return null
      const image = doc.image as Record<string, string> | null
      return {
        id: doc.id as number,
        title: (doc.title as string) || "Untitled",
        authors: extractAuthorNames(doc),
        image: image?.url ?? null,
        pages: (doc.pages as number) ?? null,
        releaseYear: (doc.release_year as number) ?? null,
      }
    })
    .filter((
      result,
    ): result is {
      id: number
      title: string
      authors: string[]
      image: string | null
      pages: number | null
      releaseYear: number | null
    } => result !== null)

  const ids = Array.from(new Set(partialResults.map((result) => result.id)))
  if (!ids.length) {
    return {
      results: partialResults.slice(0, limit),
      hasMore: partialResults.length > limit,
    }
  }

  const metadataGql = `
    query SearchBookMetadata($ids: [Int!]!) {
      books(where: { id: { _in: $ids } }) {
        id
        title
        pages
        release_date
        image { url }
        contributions { author { name } }
      }
    }
  `

  const metadata = await hardcoverQuery(metadataGql, { ids }) as {
    books?: Array<{
      id?: number
      title?: string
      pages?: number | null
      release_date?: string | null
      image?: { url?: string } | null
      contributions?: Array<{ author?: { name?: string } }> | null
    }>
  }

  const metadataById = new Map(
    (metadata.books ?? [])
      .filter((book): book is NonNullable<typeof book> & { id: number } => typeof book?.id === "number")
      .map((book) => [
        book.id,
        {
          title: book.title ?? null,
          pages: book.pages ?? null,
          releaseYear: book.release_date ? parseInt(book.release_date.slice(0, 4), 10) || null : null,
          image: book.image?.url ?? null,
          authors: (book.contributions ?? []).map((c) => c.author?.name ?? "").filter(Boolean),
        },
      ]),
  )

  const hydratedResults = partialResults.map((result) => {
    const canonical = metadataById.get(result.id)
    if (!canonical) return result

    return {
      ...result,
      title: canonical.title || result.title,
      authors: canonical.authors.length ? canonical.authors : result.authors,
      image: canonical.image ?? result.image,
      pages: canonical.pages ?? result.pages,
      releaseYear: canonical.releaseYear ?? result.releaseYear,
    }
  })

  return {
    results: hydratedResults.slice(0, limit),
    hasMore: hydratedResults.length > limit,
  }
}

// ---------------------------------------------------------------------------
// Details: returns full book metadata for item creation
// ---------------------------------------------------------------------------
async function getBookDetails(id: number) {
  const gql = `
    query BookDetails($id: Int!) {
      books_by_pk(id: $id) {
        id
        title
        subtitle
        description
        pages
        release_date
        rating
        ratings_count
        slug
        image { url }
        contributions { author { name } }
        cached_tags
        book_series { position series { name } }
        editions(limit: 1, where: { isbn_13: { _is_null: false } }) {
          publisher { name }
          isbn_13
        }
      }
    }
  `

  const data = await hardcoverQuery(gql, { id }) as {
    books_by_pk?: Record<string, unknown>
  }

  const book = data?.books_by_pk
  if (!book) {
    throw new HttpError(404, "Book not found")
  }

  const image = book.image as { url?: string } | null
  const contributions = (book.contributions as Array<{ author?: { name?: string } }>) ?? []
  const editions = (book.editions as Array<{ publisher?: { name?: string }; isbn_13?: string }>) ?? []
  const firstEdition = editions[0] ?? null

  // cached_tags is a JSON scalar: { "Genre": [{tag:"Fantasy",...}], "Moods": [...], ... }
  const rawTags = book.cached_tags as Record<string, Array<{ tag?: string }>> | null
  const genreTags = (rawTags?.["Genre"] ?? []).map((t) => t.tag ?? "").filter(Boolean)
  const tagCategories: Record<string, string[]> = {}
  for (const [category, tags] of Object.entries(rawTags ?? {})) {
    if (category === "Genre") continue
    const vals = (tags as Array<{ tag?: string }>).map((t) => t.tag ?? "").filter(Boolean)
    if (vals.length) tagCategories[category] = vals
  }

  const series = (book.book_series as Array<{ position?: number; series?: { name?: string } }> | null)?.[0]

  return {
    id: book.id as number,
    title: (book.title as string) || "Untitled",
    subtitle: (book.subtitle as string) ?? null,
    authors: contributions.map((c) => c.author?.name ?? "").filter(Boolean),
    publisher: firstEdition?.publisher?.name ?? null,
    releaseDate: (book.release_date as string) ?? null,
    description: (book.description as string) ?? null,
    pages: (book.pages as number) ?? null,
    genres: genreTags,
    tagCategories,
    image: image?.url ?? null,
    isbn: firstEdition?.isbn_13 ?? null,
    rating: (book.rating as number) ?? null, // 0–5 scale
    ratingsCount: (book.ratings_count as number) ?? null,
    slug: (book.slug as string) ?? null,
    seriesName: series?.series?.name ?? null,
    seriesPosition: series?.position ?? null,
  }
}

// ---------------------------------------------------------------------------
// Discovery: new releases and upcoming books
// ---------------------------------------------------------------------------
async function getDiscoveryBooks(mode: "new" | "upcoming", limit: number) {
  const today = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 14 * 86400 * 1000).toISOString().slice(0, 10)

  let gql: string
  let variables: Record<string, unknown>

  if (mode === "new") {
    gql = `
      query DiscoveryBooksNew($start: date!, $today: date!, $limit: Int!) {
        books(
          where: { release_date: { _gte: $start, _lte: $today } }
          order_by: { release_date: desc }
          limit: $limit
        ) {
          id
          title
          release_date
          image { url }
          contributions { author { name } }
        }
      }
    `
    variables = { start: startDate, today, limit }
  } else {
    gql = `
      query DiscoveryBooksUpcoming($today: date!, $limit: Int!) {
        books(
          where: { release_date: { _gt: $today } }
          order_by: { release_date: asc }
          limit: $limit
        ) {
          id
          title
          release_date
          image { url }
          contributions { author { name } }
        }
      }
    `
    variables = { today, limit }
  }

  const data = await hardcoverQuery(gql, variables) as {
    books?: Array<{
      id?: number
      title?: string
      release_date?: string | null
      image?: { url?: string } | null
      contributions?: Array<{ author?: { name?: string } }> | null
    }>
  }

  const books = data?.books ?? []
  const results = books.map((book) => {
    const authors = (book.contributions ?? []).map((c) => c.author?.name ?? "").filter(Boolean)
    const releaseDate = book.release_date ?? ""
    const year = releaseDate ? releaseDate.slice(0, 4) : null
    return {
      id: book.id as number,
      title: book.title || "Untitled",
      subtitle: authors.length ? authors.join(", ") : "Unknown Author",
      cover: book.image?.url ?? null,
      year,
      mediaType: "book" as const,
      releaseDate,
      status: mode,
    }
  })

  return { results }
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
    const requesterKey = getRequesterKey(req)
    enforceRateLimit(requesterKey)

    const rawBody = await req.text()
    console.log("[debug] hardcover-proxy request:", {
      method: req.method,
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
      bodyLength: rawBody.length,
      bodyPreview: rawBody.slice(0, 100),
    })
    if (!rawBody.trim()) {
      throw new HttpError(400, "Request body is required")
    }
    let body: Record<string, unknown>
    try {
      const parsed = JSON.parse(rawBody) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new HttpError(400, "Invalid JSON payload")
      }
      body = parsed as Record<string, unknown>
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(400, "Invalid JSON payload")
    }
    const { action, query, id, limit, offset, mode } = body as Record<string, unknown>

    let data: unknown

    switch (action) {
      case "search":
        {
          const normalizedLimit = validateSearchLimit(limit)
          const normalizedOffset = validateSearchOffset(offset)
          const pagedResults = await searchBooks(validateSearchQuery(query), normalizedLimit, normalizedOffset)
          data = limit == null && offset == null ? pagedResults.results : pagedResults
        }
        break

      case "details":
        data = await getBookDetails(validateBookId(id))
        break

      case "discovery": {
        const discoveryMode = mode === "upcoming" ? "upcoming" : "new"
        const lim = typeof limit === "number" ? Math.min(limit, 50) : 20
        data = await getDiscoveryBooks(discoveryMode, lim)
        break
      }

      default:
        throw new HttpError(400, 'Invalid action. Use "search", "details", or "discovery".')
    }

    return jsonResponse(req, data)
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { error: err.message }, err.status)
    }
    console.error("hardcover-proxy unexpected error:", err)
    return jsonResponse(req, { error: "Internal server error" }, 500)
  }
}, { port: Number(Deno.env.get("PORT") ?? 8000) })
