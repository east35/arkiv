/**
 * IGDB Proxy Edge Function
 *
 * Proxies requests to the IGDB API, handling Twitch OAuth server-side
 * so client credentials are never exposed to the browser.
 *
 * Endpoints (via `action` field in POST body):
 *   - search:  { action: "search", query: string }
 *   - details: { action: "details", id: number }
 *
 * Required Supabase secrets:
 *   - TWITCH_CLIENT_ID
 *   - TWITCH_CLIENT_SECRET
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

const MAX_BODY_BYTES = 4_096
const MAX_SEARCH_QUERY_LENGTH = 100
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60

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

function containsControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32) return true
  }
  return false
}

function validateGameId(id: unknown): number {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id must be a positive integer")
  }
  return id
}

// ---------------------------------------------------------------------------
// Twitch OAuth token cache (in-memory, lives for the function's lifetime)
// ---------------------------------------------------------------------------
let cachedToken: string | null = null
let tokenExpiresAt = 0

/**
 * Fetch a Twitch app access token using client credentials grant.
 * Tokens are cached in memory and refreshed when expired.
 */
async function getTwitchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  const clientId = Deno.env.get("TWITCH_CLIENT_ID")
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")

  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET secrets")
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  })

  if (!res.ok) {
    const responseBody = await res.text()
    console.error("Twitch OAuth failed", { status: res.status, responseBody })
    throw new HttpError(502, "External game service authentication failed")
  }

  const data = await res.json()
  cachedToken = data.access_token
  // Refresh 5 minutes before actual expiry
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  return cachedToken!
}

/**
 * Make a request to the IGDB API.
 * IGDB uses Apicalypse query language sent as the POST body.
 */
async function igdbFetch(endpoint: string, body: string): Promise<unknown> {
  const token = await getTwitchToken()
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!

  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  })

  if (!res.ok) {
    // If unauthorized, clear cache so next request re-authenticates
    if (res.status === 401) {
      cachedToken = null
      tokenExpiresAt = 0
    }
    const responseBody = await res.text()
    console.error("IGDB API error", { status: res.status, endpoint, responseBody })
    throw new HttpError(502, "External game service is temporarily unavailable")
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Search: returns compact game results for autocomplete
// ---------------------------------------------------------------------------
async function searchGames(query: string) {
  const body = `
    search "${query.replace(/"/g, '\\"')}";
    fields id, name, cover.image_id, platforms.name, summary, first_release_date;
    limit 10;
  `
  const results = await igdbFetch("games", body) as Array<Record<string, unknown>>

  return results.map((game) => ({
    id: game.id,
    name: game.name,
    cover: game.cover
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${(game.cover as Record<string, string>).image_id}.jpg`
      : null,
    platforms: ((game.platforms as Array<{ name: string }>) || []).map((p) => p.name),
    summary: game.summary || null,
    releaseDate: game.first_release_date
      ? new Date((game.first_release_date as number) * 1000).toISOString().split("T")[0]
      : null,
  }))
}

// ---------------------------------------------------------------------------
// Details: returns full game metadata for item creation
// ---------------------------------------------------------------------------
async function getGameDetails(id: number) {
  const body = `
    where id = ${id};
    fields id, name, summary, cover.image_id,
           genres.name, themes.name, platforms.name,
           involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
           screenshots.image_id, first_release_date,
           aggregated_rating, parent_game.name,
           remasters.name, standalone_expansions.name,
           similar_games.name, similar_games.cover.image_id;
    limit 1;
  `
  const results = await igdbFetch("games", body) as Array<Record<string, unknown>>
  if (!results.length) return null

  const game = results[0]
  const companies = (game.involved_companies as Array<Record<string, unknown>>) || []

  return {
    id: game.id,
    name: game.name,
    summary: game.summary || null,
    cover: game.cover
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${(game.cover as Record<string, string>).image_id}.jpg`
      : null,
    genres: ((game.genres as Array<{ name: string }>) || []).map((g) => g.name),
    themes: ((game.themes as Array<{ name: string }>) || []).map((t) => t.name),
    platforms: ((game.platforms as Array<{ name: string }>) || []).map((p) => p.name),
    developer: companies.find((c) => c.developer)
      ? ((companies.find((c) => c.developer) as Record<string, Record<string, string>>).company).name
      : null,
    publisher: companies.find((c) => c.publisher)
      ? ((companies.find((c) => c.publisher) as Record<string, Record<string, string>>).company).name
      : null,
    screenshots: ((game.screenshots as Array<{ image_id: string }>) || []).map(
      (s) => `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
    ),
    releaseDate: game.first_release_date
      ? new Date((game.first_release_date as number) * 1000).toISOString().split("T")[0]
      : null,
    sourceScore: game.aggregated_rating ? Number((game.aggregated_rating as number).toFixed(2)) : null,
    // Related content
    parentGame: game.parent_game ? (game.parent_game as { name: string }).name : null,
    remasters: ((game.remasters as Array<{ name: string }>) || []).map((r) => r.name),
    standaloneExpansions: ((game.standalone_expansions as Array<{ name: string }>) || []).map((e) => e.name),
    similarGames: ((game.similar_games as Array<{ name: string; cover?: { image_id: string } }>) || []).map((g) => ({
      name: g.name,
      cover: g.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg`
        : null,
    })),
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
        data = await searchGames(validateSearchQuery(query))
        break

      case "details":
        data = await getGameDetails(validateGameId(id))
        break

      default:
        throw new HttpError(400, 'Invalid action. Use "search" or "details".')
    }

    return jsonResponse(req, data)
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { error: err.message }, err.status)
    }
    console.error("igdb-proxy unexpected error:", err)
    return jsonResponse(req, { error: "Internal server error" }, 500)
  }
})
