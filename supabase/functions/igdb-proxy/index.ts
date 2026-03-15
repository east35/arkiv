/**
 * IGDB Proxy Edge Function
 *
 * Proxies requests to the IGDB API, handling Twitch OAuth server-side
 * so client credentials are never exposed to the browser.
 *
 * Endpoints (via `action` field in POST body):
 *   - search:  { action: "search", query: string, limit?: number, offset?: number }
 *   - details: { action: "details", id: number }
 *
 * Required Supabase secrets:
 *   - TWITCH_CLIENT_ID
 *   - TWITCH_CLIENT_SECRET
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

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
}

const MAX_BODY_BYTES = 4_096
const MAX_SEARCH_QUERY_LENGTH = 100
const DEFAULT_SEARCH_LIMIT = 20
const MAX_SEARCH_LIMIT = 50
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
const IGDB_RETRY_ATTEMPTS = 4
const LIBRARY_COLLECTION_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const LIBRARY_GAMES_CACHE_TTL_MS = 30 * 60 * 1000
const HLTB_BASE_URL = "https://howlongtobeat.com"
const HLTB_FINDER_INIT_PATH = "/api/finder/init"
const HLTB_FINDER_PATH = "/api/finder"
const HLTB_TIMEOUT_MS = 8_000
const HLTB_TOKEN_TTL_MS = 10 * 60 * 1000
const HLTB_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

const requestCounts = new Map<string, { count: number; resetAt: number }>()
const hltbCache = new Map<string, HltbTimes | null>()
const libraryCollectionCache = new Map<string, CacheEntry<LibraryCollectionMatch | null>>()
const libraryGamesCache = new Map<string, CacheEntry<LibraryGameSummary[]>>()

let cachedHltbAuthToken: string | null = null
let hltbAuthTokenExpiresAt = 0

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type LibraryCollectionMatch = {
  id: number
  name: string
  gameIds: number[]
}

type LibraryGameSummary = {
  id: number
  name: string
  cover: string | null
  releaseDate: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function writeCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): T {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}

function normalizeLibraryCacheKey(value: string): string {
  return value.trim().toLowerCase()
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
  if (origin && (allowedOrigins.has(origin) || isLocalhostOrigin(origin))) {
    headers.set("Access-Control-Allow-Origin", origin)
  }
  return headers
}

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin")
  return !origin || allowedOrigins.has(origin) || isLocalhostOrigin(origin)
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

function enforceRateLimit(key: string): void {
  const now = Date.now()
  const entry = requestCounts.get(key)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new HttpError(429, "Too many requests, please try again shortly")
  }
  entry.count += 1
  requestCounts.set(key, entry)
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

  // Fallback for unauthenticated/stale-session clients — still rate-limited by IP.
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
async function igdbFetch(
  endpoint: string,
  body: string,
  retries = IGDB_RETRY_ATTEMPTS,
): Promise<unknown> {
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
    // Retry on 429 with exponential backoff and respect Retry-After when present.
    if (res.status === 429 && retries > 0) {
      const attempt = IGDB_RETRY_ATTEMPTS - retries + 1
      const retryAfterHeader = Number(res.headers.get("retry-after"))
      const retryDelayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : Math.min(4_000, 500 * 2 ** attempt)
      await sleep(retryDelayMs)
      return igdbFetch(endpoint, body, retries - 1)
    }
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

type HltbTimes = {
  hltb_average: number | null
  hltb_main: number | null
  hltb_main_extra: number | null
  hltb_completionist: number | null
}

type HltbSearchResult = {
  game_name?: string
  comp_main?: number | string | null
  comp_plus?: number | string | null
  comp_all?: number | string | null
  comp_100?: number | string | null
  release_world?: number | string | null
  similarity?: number | string | null
}

type HltbFinderResponse = {
  data?: HltbSearchResult[]
}

type HltbFinderInitResponse = {
  token?: string
}

function normalizeHltbTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function buildHltbSearchVariants(title: string): string[] {
  const variants: string[] = []
  const push = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, " ")
    if (!normalized || variants.includes(normalized)) return
    variants.push(normalized)
  }

  push(title)
  push(title.split(":")[0] ?? "")
  push(title.replace(/[™®©]/g, ""))
  push(title.replace(/[^\w\s]/g, " "))
  return variants
}

function secondsToHours(value: unknown): number | null {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string"
      ? parseFloat(value)
      : NaN
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.round((numeric / 3600) * 10) / 10
}

function hasAnyHltbTime(value: HltbTimes): boolean {
  return Object.values(value).some((entry) => entry != null)
}

function mapHltbTimes(result: HltbSearchResult): HltbTimes {
  return {
    hltb_average: secondsToHours(result.comp_all),
    hltb_main: secondsToHours(result.comp_main),
    hltb_main_extra: secondsToHours(result.comp_plus),
    hltb_completionist: secondsToHours(result.comp_100),
  }
}

function getHltbReleaseYear(result: HltbSearchResult): number | null {
  const raw = result.release_world
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const year = parseInt(raw.slice(0, 4), 10)
    return Number.isFinite(year) ? year : null
  }
  return null
}

function getHltbSimilarity(result: HltbSearchResult): number {
  const raw = result.similarity
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const similarity = parseFloat(raw)
    return Number.isFinite(similarity) ? similarity : 0
  }
  return 0
}

function scoreHltbResult(
  result: HltbSearchResult,
  normalizedTitle: string,
  releaseYear: number | null,
): number {
  const candidate = normalizeHltbTitle(result.game_name ?? "")
  if (!candidate) return -1

  let score = getHltbSimilarity(result)
  if (candidate === normalizedTitle) score += 3
  else if (candidate.startsWith(normalizedTitle) || normalizedTitle.startsWith(candidate)) score += 1.5
  else if (candidate.includes(normalizedTitle) || normalizedTitle.includes(candidate)) score += 0.75

  if (releaseYear != null) {
    const candidateYear = getHltbReleaseYear(result)
    if (candidateYear === releaseYear) score += 0.5
  }

  return score
}

function getHltbRequestHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "origin": HLTB_BASE_URL,
    "referer": `${HLTB_BASE_URL}/`,
    "user-agent": HLTB_USER_AGENT,
  }

  if (token) {
    headers["x-auth-token"] = token
  }

  return headers
}

async function getHltbAuthToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedHltbAuthToken && Date.now() < hltbAuthTokenExpiresAt) {
    return cachedHltbAuthToken
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort("timeout"), HLTB_TIMEOUT_MS)

  try {
    const res = await fetch(`${HLTB_BASE_URL}${HLTB_FINDER_INIT_PATH}?t=${Date.now()}`, {
      headers: getHltbRequestHeaders(),
      signal: controller.signal,
    })

    if (!res.ok) {
      const responseBody = await res.text()
      console.warn("HowLongToBeat token init failed", { status: res.status, responseBody })
      throw new Error("HowLongToBeat token init failed")
    }

    const payload = await res.json() as HltbFinderInitResponse
    if (!payload.token) {
      throw new Error("HowLongToBeat token init returned no token")
    }

    cachedHltbAuthToken = payload.token
    hltbAuthTokenExpiresAt = Date.now() + HLTB_TOKEN_TTL_MS
    return payload.token
  } finally {
    clearTimeout(timeoutId)
  }
}

async function hltbSearch(query: string): Promise<HltbSearchResult[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort("timeout"), HLTB_TIMEOUT_MS)

    try {
      const token = await getHltbAuthToken(attempt > 0)
      const res = await fetch(`${HLTB_BASE_URL}${HLTB_FINDER_PATH}`, {
        method: "POST",
        headers: {
          ...getHltbRequestHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          searchType: "games",
          searchTerms: query.split(/\s+/).filter(Boolean),
          searchPage: 1,
          size: 20,
          searchOptions: {
            games: {
              userId: 0,
              platform: "",
              sortCategory: "popular",
              rangeCategory: "main",
              rangeTime: { min: 0, max: 0 },
              gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
              rangeYear: { min: "", max: "" },
              modifier: "",
            },
            users: { sortCategory: "postcount" },
            lists: { sortCategory: "follows" },
            filter: "",
            sort: 0,
            randomizer: 0,
          },
          useCache: true,
        }),
        signal: controller.signal,
      })

      if (res.status === 403 && attempt === 0) {
        cachedHltbAuthToken = null
        hltbAuthTokenExpiresAt = 0
        continue
      }

      if (!res.ok) {
        const responseBody = await res.text()
        console.warn("HowLongToBeat search failed", { status: res.status, responseBody })
        return []
      }

      const payload = await res.json() as HltbFinderResponse
      return Array.isArray(payload.data) ? payload.data : []
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return []
}

async function getHowLongToBeatData(title: string, releaseDate: string | null): Promise<HltbTimes | null> {
  const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) || null : null
  const normalizedTitle = normalizeHltbTitle(title)
  const cacheKey = `${normalizedTitle}|${releaseYear ?? ""}`
  if (hltbCache.has(cacheKey)) return hltbCache.get(cacheKey) ?? null

  const variants = buildHltbSearchVariants(title)

  for (const query of variants) {
    try {
      const results = await hltbSearch(query)
      if (!results.length) continue

      const best = results
        .filter((result) => hasAnyHltbTime(mapHltbTimes(result)))
        .sort((a, b) => scoreHltbResult(b, normalizedTitle, releaseYear) - scoreHltbResult(a, normalizedTitle, releaseYear))[0]

      if (!best) continue

      const mapped = mapHltbTimes(best)
      if (!hasAnyHltbTime(mapped)) continue
      hltbCache.set(cacheKey, mapped)
      return mapped
    } catch (err) {
      console.warn("HowLongToBeat lookup failed", { title, query, err })
    }
  }

  hltbCache.set(cacheKey, null)
  return null
}

// ---------------------------------------------------------------------------
// Search: returns compact game results for autocomplete
// ---------------------------------------------------------------------------
async function searchGames(query: string, limit: number, offset: number) {
  const fetchLimit = Math.min(limit + 1, MAX_SEARCH_LIMIT)
  const body = `
    search "${query.replace(/"/g, '\\"')}";
    fields id, name, cover.image_id, platforms.name, summary, first_release_date;
    limit ${fetchLimit};
    offset ${offset};
  `
  const results = await igdbFetch("games", body) as Array<Record<string, unknown>>

  return {
    results: results.slice(0, limit).map((game) => ({
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
    })),
    hasMore: results.length > limit,
  }
}

// ---------------------------------------------------------------------------
// Details: returns full game metadata for item creation
// ---------------------------------------------------------------------------
async function getGameDetails(id: number) {
  const body = `
    where id = ${id};
    fields id, name, summary, storyline, cover.image_id,
           genres.name, themes.name, platforms.name,
           involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
           screenshots.image_id, first_release_date,
           total_rating, total_rating_count, parent_game.name,
           franchises.name, collection.name,
           game_modes.name, player_perspectives.name,
           category,
           external_games.category, external_games.uid,
           remasters.name, standalone_expansions.name,
           similar_games.id, similar_games.name, similar_games.cover.image_id, similar_games.first_release_date;
    limit 1;
  `
  const results = await igdbFetch("games", body) as Array<Record<string, unknown>>
  if (!results.length) return null

  const game = results[0]
  const companies = (game.involved_companies as Array<Record<string, unknown>>) || []
  const releaseDate = game.first_release_date
    ? new Date((game.first_release_date as number) * 1000).toISOString().split("T")[0]
    : null

  // Extract Steam App ID from external_games (category=1 is Steam)
  const externalGames = (game.external_games as Array<{ category: number; uid: string }>) || []
  const steamEntry = externalGames.find((eg) => eg.category === 1)
  const steamId = steamEntry?.uid ?? null
  let hltb: HltbTimes | null = null

  try {
    hltb = await getHowLongToBeatData(String(game.name ?? ""), releaseDate)
  } catch (err) {
    console.warn("HowLongToBeat enrichment skipped", { id, err })
  }

  return {
    id: game.id,
    name: game.name,
    summary: game.summary || null,
    storyline: (game.storyline as string) ?? null,
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
    releaseDate,
    // Use total_rating (weighted critic + community) as the primary score
    sourceScore: game.total_rating != null ? Number((game.total_rating as number).toFixed(1)) : null,
    ratingsCount: (game.total_rating_count as number) ?? null,
    franchise: ((game.franchises as Array<{ name: string }>) ?? [])[0]?.name ?? null,
    library: game.collection ? (game.collection as { name: string }).name : null,
    gameModes: ((game.game_modes as Array<{ name: string }>) || []).map((m) => m.name),
    playerPerspectives: ((game.player_perspectives as Array<{ name: string }>) || []).map((p) => p.name),
    gameCategory: game.category != null ? (game.category as number) : null,
    steamId,
    // Related content
    parentGame: game.parent_game ? (game.parent_game as { name: string }).name : null,
    remasters: ((game.remasters as Array<{ name: string }>) || []).map((r) => r.name),
    standaloneExpansions: ((game.standalone_expansions as Array<{ name: string }>) || []).map((e) => e.name),
    similarGames: ((game.similar_games as Array<{ id: number; name: string; cover?: { image_id: string }; first_release_date?: number }>) || []).map((g) => ({
      id: g.id,
      name: g.name,
      cover: g.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null,
      releaseDate: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().split("T")[0]
        : null,
    })),
    hltb_average: hltb?.hltb_average ?? null,
    hltb_main: hltb?.hltb_main ?? null,
    hltb_main_extra: hltb?.hltb_main_extra ?? null,
    hltb_completionist: hltb?.hltb_completionist ?? null,
  }
}

// ---------------------------------------------------------------------------
// Library Games: returns all games in a named IGDB collection
// ---------------------------------------------------------------------------
async function getLibraryGames(libraryName: string) {
  const cacheKey = normalizeLibraryCacheKey(libraryName)
  const cachedGames = readCacheEntry(libraryGamesCache, cacheKey)
  if (cachedGames) return cachedGames

  // Step 1: Find the IGDB collection ID by name (exact match, case-insensitive)
  let collectionMatch = readCacheEntry(libraryCollectionCache, cacheKey)
  if (collectionMatch === undefined) {
    const searchBody = `
      search "${libraryName.replace(/"/g, '\\"')}";
      fields id, name, games;
      limit 5;
    `
    const igdbCollections = await igdbFetch("collections", searchBody) as Array<Record<string, unknown>>

    if (!igdbCollections.length) {
      return writeCacheEntry(libraryGamesCache, cacheKey, [], LIBRARY_GAMES_CACHE_TTL_MS)
    }

    // Pick the best match (prefer exact name match)
    const exact = igdbCollections.find(
      (collection) => (collection.name as string).toLowerCase() === cacheKey,
    )
    const igdbCollection = exact || igdbCollections[0]
    collectionMatch = writeCacheEntry(
      libraryCollectionCache,
      cacheKey,
      igdbCollection
        ? {
            id: igdbCollection.id as number,
            name: igdbCollection.name as string,
            gameIds: ((igdbCollection.games as number[]) || []).slice(0, 50),
          }
        : null,
      LIBRARY_COLLECTION_CACHE_TTL_MS,
    )
  }

  const gameIds = collectionMatch?.gameIds ?? []
  if (!gameIds.length) {
    return writeCacheEntry(libraryGamesCache, cacheKey, [], LIBRARY_GAMES_CACHE_TTL_MS)
  }

  // Step 2: Fetch game details for all games in the matched IGDB collection (up to 50)
  const idsClause = gameIds.join(",")
  const gamesBody = `
    where id = (${idsClause});
    fields id, name, cover.image_id, first_release_date;
    sort first_release_date asc;
    limit 50;
  `
  const games = await igdbFetch("games", gamesBody) as Array<Record<string, unknown>>

  return writeCacheEntry(
    libraryGamesCache,
    cacheKey,
    games.map((game) => ({
      id: game.id as number,
      name: game.name as string,
      cover: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${(game.cover as Record<string, string>).image_id}.jpg`
        : null,
      releaseDate: game.first_release_date
        ? new Date((game.first_release_date as number) * 1000).toISOString().split("T")[0]
        : null,
    })),
    LIBRARY_GAMES_CACHE_TTL_MS,
  )
}

// ---------------------------------------------------------------------------
// Discovery: new releases and upcoming games
// ---------------------------------------------------------------------------

function igdbCoverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

function formatGameSubtitle(platforms: string[]): string {
  const clean = platforms.filter(Boolean)
  if (!clean.length) return "Unknown Platform"
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]}, ${clean[1]}`
  return `${clean[0]} +${clean.length - 1} more`
}

async function getDiscoveryGames(mode: "new" | "upcoming", limit: number) {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - 14 * 86400

  const whereClause = mode === "new"
    ? `where date >= ${windowStart} & date <= ${now}`
    : `where date > ${now}`
  const sortClause = mode === "new" ? "sort date desc" : "sort date asc"

  const body = `
    fields game.id, game.name, game.cover.image_id, game.slug, date, platform.name;
    ${whereClause};
    ${sortClause};
    limit 200;
  `

  const rows = await igdbFetch("release_dates", body) as Array<Record<string, unknown>>

  // Deduplicate by game.id — Strategy B: collapse by game, collect all platforms
  const gameMap = new Map<number, { game: Record<string, unknown>; date: number; platforms: Set<string> }>()
  for (const row of rows) {
    const game = row.game as Record<string, unknown> | null
    if (!game || typeof game.id !== "number") continue

    const gameId = game.id as number
    const rowDate = typeof row.date === "number" ? row.date : 0
    const platformName = (row.platform as { name?: string } | null)?.name ?? null

    const existing = gameMap.get(gameId)
    if (!existing) {
      gameMap.set(gameId, {
        game,
        date: rowDate,
        platforms: platformName ? new Set([platformName]) : new Set(),
      })
    } else {
      // For upcoming: keep earliest date; for new: keep latest date within window
      if (mode === "upcoming" ? rowDate < existing.date : rowDate > existing.date) {
        existing.date = rowDate
      }
      if (platformName) existing.platforms.add(platformName)
    }
  }

  const results = Array.from(gameMap.values())
    .slice(0, limit)
    .map(({ game, date, platforms }) => {
      const cover = game.cover as { image_id?: string } | null
      const dateStr = date > 0 ? new Date(date * 1000).toISOString().split("T")[0] : null
      return {
        id: game.id as number,
        title: (game.name as string) || "Unknown",
        subtitle: formatGameSubtitle(Array.from(platforms)),
        cover: cover?.image_id ? igdbCoverUrl(cover.image_id) : null,
        year: dateStr ? dateStr.slice(0, 4) : null,
        mediaType: "game" as const,
        releaseDate: dateStr ?? "",
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

    const body = await req.json()
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid JSON payload")
    }

    const { action, query, id, limit, offset, mode } = body as Record<string, unknown>

    let data: unknown

    switch (action) {
      case "search":
        {
          const normalizedLimit = validateSearchLimit(limit)
          const normalizedOffset = validateSearchOffset(offset)
          const pagedResults = await searchGames(validateSearchQuery(query), normalizedLimit, normalizedOffset)
          data = limit == null && offset == null ? pagedResults.results : pagedResults
        }
        break

      case "details":
        data = await getGameDetails(validateGameId(id))
        break

      case "library-games":
        data = await getLibraryGames(validateSearchQuery(query))
        break

      case "discovery": {
        const discoveryMode = mode === "upcoming" ? "upcoming" : "new"
        const lim = typeof limit === "number" ? Math.min(limit, 50) : 20
        data = await getDiscoveryGames(discoveryMode, lim)
        break
      }

      default:
        throw new HttpError(400, 'Invalid action. Use "search", "details", "library-games", or "discovery".')
    }

    return jsonResponse(req, data)
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { error: err.message }, err.status)
    }
    console.error("igdb-proxy unexpected error:", err)
    return jsonResponse(req, { error: "Internal server error" }, 500)
  }
}, { port: Number(Deno.env.get("PORT") ?? 8000) })
