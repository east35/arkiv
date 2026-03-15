import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
]

const configuredAllowedOrigins = Deno.env.get("CORS_ALLOWED_ORIGINS")?.trim()

const allowedOrigins = new Set(
  (configuredAllowedOrigins ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const allowsAnyOrigin = !configuredAllowedOrigins || allowedOrigins.has("*")

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
}

const MAX_BODY_BYTES = 4_096
const MAX_TITLE_LENGTH = 200
const MAX_URL_LENGTH = 2_048
const MAX_FETCH_BODY_BYTES = 512 * 1024
const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 8_000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const USER_AGENT = "ArkivBookmarkBot/1.0 (+https://arkiv.app)"
const imagePathPattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i
const weakThumbnailPattern = /(favicon|apple-touch-icon|mask-icon|mstile|android-chrome|logo|avatar|badge|sprite|brandmark|site-icon|app-icon)/i
const strongThumbnailScore = 70
const supportedPorts = new Set(["", "80", "443"])
const linkTypes = new Set(["guide", "wiki", "review", "forum", "store", "other"])

const requestCounts = new Map<string, { count: number; resetAt: number }>()

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
const port = Number(Deno.env.get("PORT") || 8000)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY secrets")
}

const authClient = createClient(supabaseUrl, supabaseAnonKey) as any

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface ItemBookmarkRow {
  id: string
  item_id: string
  user_id: string
  title: string
  url: string
  note: string | null
  link_type: string
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

interface ThumbnailCandidate {
  url: string
  score: number
  weak: boolean
}

type MutationResult<T> = {
  data: T | null
  error: unknown
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== "object") return ""

  return [
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "",
    typeof (error as { details?: unknown }).details === "string"
      ? (error as { details: string }).details
      : "",
    typeof (error as { hint?: unknown }).hint === "string"
      ? (error as { hint: string }).hint
      : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function getMissingOptionalColumn(
  error: unknown,
  table: string,
  optionalColumns: string[],
): string | null {
  const errorText = getErrorText(error).toLowerCase()
  if (!errorText || !errorText.includes(table.toLowerCase())) {
    return null
  }

  const isMissingColumnError = errorText.includes("schema cache")
    || errorText.includes("does not exist")
    || errorText.includes("unknown column")
  if (!isMissingColumnError) return null

  for (const column of optionalColumns) {
    const columnPattern = new RegExp(
      `('${escapeRegex(column)}'|"${escapeRegex(column)}"|\\b${escapeRegex(table)}\\.${escapeRegex(column)}\\b|\\b${escapeRegex(column)}\\b)`,
      "i",
    )
    if (columnPattern.test(errorText)) {
      return column
    }
  }

  return null
}

async function executeBookmarkMutationWithFallback<T>(
  optionalColumns: string[],
  mutation: (supportedOptionalColumns: Set<string>) => Promise<MutationResult<T>>,
): Promise<T> {
  const supportedOptionalColumns = new Set(optionalColumns)

  while (true) {
    const { data, error } = await mutation(supportedOptionalColumns)
    if (!error) {
      if (data == null) {
        throw new Error("Bookmark mutation returned no data")
      }
      return data
    }

    const missingColumn = getMissingOptionalColumn(
      error,
      "item_bookmarks",
      Array.from(supportedOptionalColumns),
    )
    if (!missingColumn) {
      throw error
    }

    supportedOptionalColumns.delete(missingColumn)
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
        // Fall back to anonymous requester key
      }
    }
  }

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const origin = req.headers.get("origin")?.trim()
  const userAgent = req.headers.get("user-agent")?.trim()
  return [forwardedFor, origin, userAgent].filter(Boolean).join("|") || "anonymous"
}

async function requireAuthenticatedUser(req: Request): Promise<{ id: string; token: string }> {
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

  return { id: data.user.id, token }
}

function validateItemId(itemId: unknown): string {
  if (typeof itemId !== "string") {
    throw new HttpError(400, "itemId must be a string")
  }
  const normalized = itemId.trim()
  if (!normalized) {
    throw new HttpError(400, "itemId is required")
  }
  return normalized
}

function validateTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new HttpError(400, "title must be a string")
  }
  const normalized = title.trim()
  if (!normalized) {
    throw new HttpError(400, "title is required")
  }
  if (normalized.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `title must be ${MAX_TITLE_LENGTH} characters or fewer`)
  }
  return normalized
}

function validateOptionalTitle(title: unknown): string | undefined {
  if (title == null) return undefined
  return validateTitle(title)
}

function validateOptionalNote(note: unknown): string | null | undefined {
  if (note === undefined) return undefined
  if (note === null) return null
  if (typeof note !== "string") {
    throw new HttpError(400, "note must be a string")
  }

  const normalized = note.trim()
  if (!normalized) return null
  if (normalized.length > 4_000) {
    throw new HttpError(400, "note must be 4000 characters or fewer")
  }
  return normalized
}

function validateLinkType(linkType: unknown, fallback = "other"): string {
  if (linkType == null) return fallback
  if (typeof linkType !== "string") {
    throw new HttpError(400, "linkType must be a string")
  }

  const normalized = linkType.trim().toLowerCase()
  if (!linkTypes.has(normalized)) {
    throw new HttpError(400, "linkType is invalid")
  }
  return normalized
}

function validateOptionalLinkType(linkType: unknown): string | undefined {
  if (linkType == null) return undefined
  return validateLinkType(linkType)
}

function validateBookmarkUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "url must be a string")
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new HttpError(400, "url is required")
  }
  if (normalized.length > MAX_URL_LENGTH) {
    throw new HttpError(400, `url must be ${MAX_URL_LENGTH} characters or fewer`)
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new HttpError(400, "url must be a valid absolute URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "url must use http or https")
  }
  if (parsed.username || parsed.password) {
    throw new HttpError(400, "url must not contain credentials")
  }
  if (!supportedPorts.has(parsed.port)) {
    throw new HttpError(400, "url must use the default http or https port")
  }

  validatePublicHostname(parsed.hostname)
  return parsed.toString()
}

function validateOptionalBookmarkUrl(value: unknown): string | undefined {
  if (value == null) return undefined
  return validateBookmarkUrl(value)
}

function validatePublicHostname(hostname: string): void {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) {
    throw new HttpError(400, "url hostname is required")
  }

  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || normalized.endsWith(".internal")
    || normalized.endsWith(".home")
    || normalized.endsWith(".arpa")
  ) {
    throw new HttpError(400, "url must point to a public website")
  }

  if (normalized.includes(":")) {
    throw new HttpError(400, "IPv6 bookmark hosts are not supported")
  }

  if (isIpv4Address(normalized)) {
    if (!isPublicIpv4(normalized)) {
      throw new HttpError(400, "url must point to a public website")
    }
    return
  }

  if (!normalized.includes(".")) {
    throw new HttpError(400, "url must point to a public website")
  }
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".")
  if (parts.length !== 4) return false
  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

function isPublicIpv4(hostname: string): boolean {
  const [a, b] = hostname.split(".").map((part) => Number(part))

  if (a === 0 || a === 10 || a === 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a >= 224) return false
  return true
}

async function ensureItemOwnership(userClient: any, itemId: string): Promise<void> {
  const { data, error } = await userClient
    .from("items")
    .select("id")
    .eq("id", itemId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new HttpError(404, "Item not found")
  }
}

async function getOwnedBookmark(
  userClient: any,
  itemId: string,
  bookmarkId: string,
): Promise<ItemBookmarkRow> {
  if (typeof bookmarkId !== "string" || !bookmarkId.trim()) {
    throw new HttpError(400, "bookmarkId is required")
  }

  const { data, error } = await userClient
    .from("item_bookmarks")
    .select("*")
    .eq("id", bookmarkId.trim())
    .eq("item_id", itemId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new HttpError(404, "Saved link not found")
  }

  return data as ItemBookmarkRow
}

async function createBookmark(
  userClient: any,
  userId: string,
  itemId: string,
  title: string,
  url: string,
  note: string | null,
  linkType: string,
): Promise<ItemBookmarkRow> {
  const thumbnailUrl = await resolveBookmarkThumbnail(url)
  const bookmark = await executeBookmarkMutationWithFallback<ItemBookmarkRow>(
    ["note", "link_type", "thumbnail_url"],
    async (supportedOptionalColumns) => {
      const payload: Record<string, unknown> = {
        item_id: itemId,
        user_id: userId,
        title,
        url,
      }

      if (supportedOptionalColumns.has("note")) {
        payload.note = note
      }
      if (supportedOptionalColumns.has("link_type")) {
        payload.link_type = linkType
      }
      if (supportedOptionalColumns.has("thumbnail_url")) {
        payload.thumbnail_url = thumbnailUrl
      }

      const { data, error } = await userClient
        .from("item_bookmarks")
        .insert(payload)
        .select("*")
        .single()

      return { data: data as ItemBookmarkRow | null, error }
    },
  )

  return bookmark
}

async function updateBookmark(
  userClient: any,
  itemId: string,
  bookmarkId: string,
  updates: {
    title?: string
    url?: string
    note?: string | null
    linkType?: string
  },
): Promise<ItemBookmarkRow> {
  const existingBookmark = await getOwnedBookmark(userClient, itemId, bookmarkId)
  const nextUrl = updates.url ?? existingBookmark.url
  const nextTitle = updates.title ?? existingBookmark.title
  const nextNote = updates.note === undefined ? existingBookmark.note : updates.note
  const nextLinkType = updates.linkType ?? existingBookmark.link_type
  const shouldRefreshThumbnail = nextUrl !== existingBookmark.url
    || !existingBookmark.thumbnail_url
    || isLikelyWeakThumbnailUrl(existingBookmark.thumbnail_url)
  let refreshedThumbnail: string | null | undefined

  const bookmark = await executeBookmarkMutationWithFallback<ItemBookmarkRow>(
    ["note", "link_type", "thumbnail_url", "updated_at"],
    async (supportedOptionalColumns) => {
      const payload: Record<string, unknown> = {
        title: nextTitle,
        url: nextUrl,
      }

      if (supportedOptionalColumns.has("note")) {
        payload.note = nextNote
      }
      if (supportedOptionalColumns.has("link_type")) {
        payload.link_type = nextLinkType
      }
      if (supportedOptionalColumns.has("thumbnail_url")) {
        if (shouldRefreshThumbnail) {
          if (refreshedThumbnail === undefined) {
            refreshedThumbnail = await resolveBookmarkThumbnail(nextUrl)
          }
          payload.thumbnail_url = refreshedThumbnail
        } else {
          payload.thumbnail_url = existingBookmark.thumbnail_url
        }
      }
      if (supportedOptionalColumns.has("updated_at")) {
        payload.updated_at = new Date().toISOString()
      }

      const { data, error } = await userClient
        .from("item_bookmarks")
        .update(payload)
        .eq("id", existingBookmark.id)
        .select("*")
        .single()

      return { data: data as ItemBookmarkRow | null, error }
    },
  )

  return bookmark
}

async function checkBookmarkEmbeddable(
  bookmarkUrl: string,
  appOrigin: string | null,
): Promise<{ embeddable: boolean }> {
  try {
    const headResponse = await fetchHeadersWithRedirects(bookmarkUrl, "HEAD")
      .catch(() => fetchHeadersWithRedirects(bookmarkUrl, "GET"))

    const xFrameOptions = headResponse.response.headers.get("x-frame-options")?.toLowerCase() ?? ""
    if (xFrameOptions.includes("deny") || xFrameOptions.includes("sameorigin")) {
      return { embeddable: false }
    }

    const csp = headResponse.response.headers.get("content-security-policy")
      ?? headResponse.response.headers.get("content-security-policy-report-only")
      ?? ""
    const frameAncestors = extractFrameAncestors(csp)
    if (frameAncestors && !isOriginAllowedByFrameAncestors(frameAncestors, appOrigin)) {
      return { embeddable: false }
    }

    return { embeddable: true }
  } catch (error) {
    console.warn("bookmark embed check failed", { bookmarkUrl, error })
    return { embeddable: false }
  }
}

async function backfillMissingThumbnails(
  userClient: any,
  itemId: string,
): Promise<ItemBookmarkRow[]> {
  const { data, error } = await userClient
    .from("item_bookmarks")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true })

  if (error) throw error

  const bookmarks = ((data as ItemBookmarkRow[] | null) ?? [])
    .filter((bookmark) => !bookmark.thumbnail_url || isLikelyWeakThumbnailUrl(bookmark.thumbnail_url))
    .slice(0, 8)
  if (!bookmarks.length) return []

  const updates = await Promise.allSettled(
    bookmarks.map(async (bookmark) => {
      const thumbnailUrl = await resolveBookmarkThumbnail(bookmark.url)
      if (!thumbnailUrl) return null

      const { data: updated, error: updateError } = await userClient
        .from("item_bookmarks")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", bookmark.id)
        .select("*")
        .single()

      if (updateError) throw updateError
      return updated as ItemBookmarkRow
    }),
  )

  return updates.flatMap((result) => {
    if (result.status === "fulfilled" && result.value) {
      return [result.value]
    }
    if (result.status === "rejected") {
      console.warn("bookmark thumbnail backfill failed", result.reason)
    }
    return []
  })
}

async function resolveBookmarkThumbnail(bookmarkUrl: string): Promise<string | null> {
  try {
    const parsedUrl = new URL(bookmarkUrl)
    if (imagePathPattern.test(parsedUrl.pathname)) {
      return parsedUrl.toString()
    }

    const pageResponse = await fetchHeadersWithRedirects(bookmarkUrl, "GET")
    const contentType = pageResponse.response.headers.get("content-type")?.toLowerCase() ?? ""

    if (contentType.startsWith("image/")) {
      return pageResponse.url
    }

    const html = await readResponseText(pageResponse.response, MAX_FETCH_BODY_BYTES)
    const candidates = collectThumbnailCandidates(html, pageResponse.url)
    return candidates[0]?.url ?? null
  } catch (error) {
    console.warn("bookmark thumbnail resolution failed", { bookmarkUrl, error })
    return null
  }
}

async function fetchHeadersWithRedirects(
  initialUrl: string,
  method: "GET" | "HEAD",
): Promise<{ response: Response; url: string }> {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const parsedUrl = new URL(currentUrl)
    validatePublicHostname(parsedUrl.hostname)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort("timeout"), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(currentUrl, {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8",
          "user-agent": USER_AGENT,
        },
      })

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location")
        if (!location) {
          throw new Error("Redirect response missing location header")
        }
        currentUrl = new URL(location, currentUrl).toString()
        continue
      }

      if (!response.ok) {
        throw new Error(`External site returned ${response.status}`)
      }

      return { response, url: currentUrl }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error("Too many redirects")
}

async function readResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("External page is too large to inspect")
    }
    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let result = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new Error("External page is too large to inspect")
    }
    result += decoder.decode(value, { stream: true })
  }

  result += decoder.decode()
  return result
}

function collectThumbnailCandidates(html: string, pageUrl: string): ThumbnailCandidate[] {
  const candidates: ThumbnailCandidate[] = []

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseHtmlAttributes(tag)
    const key = (attributes.property ?? attributes.name ?? attributes.itemprop ?? "").toLowerCase()
    const content = attributes.content
    if (!content) continue

    if (key === "og:image:secure_url") {
      pushCandidate(candidates, content, pageUrl, 110)
    } else if (key === "og:image" || key === "og:image:url") {
      pushCandidate(candidates, content, pageUrl, 100)
    } else if (key === "twitter:image" || key === "twitter:image:src") {
      pushCandidate(candidates, content, pageUrl, 90)
    } else if (key === "image" || key === "thumbnailurl") {
      pushCandidate(candidates, content, pageUrl, 80)
    }
  }

  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const jsonText = match[1]?.trim()
    if (!jsonText) continue
    for (const imageUrl of extractJsonLdImageUrls(jsonText)) {
      pushCandidate(candidates, imageUrl, pageUrl, 70)
    }
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attributes = parseHtmlAttributes(tag)
    const width = Number.parseInt(attributes.width ?? "", 10)
    const height = Number.parseInt(attributes.height ?? "", 10)
    const maxDimension = Math.max(
      Number.isFinite(width) ? width : 0,
      Number.isFinite(height) ? height : 0,
    )

    let baseScore = 58
    if (maxDimension >= 1200) baseScore += 24
    else if (maxDimension >= 800) baseScore += 18
    else if (maxDimension >= 400) baseScore += 12
    else if (maxDimension >= 200) baseScore += 6
    else if (maxDimension > 0 && maxDimension <= 96) baseScore -= 24

    const altText = (attributes.alt ?? "").toLowerCase()
    if (/(cover|hero|feature|article|header|poster|thumbnail|preview)/.test(altText)) {
      baseScore += 8
    }

    if (attributes.src) {
      pushCandidate(candidates, attributes.src, pageUrl, baseScore)
    }

    const srcsetCandidate = getLargestSrcsetCandidate(attributes.srcset)
    if (srcsetCandidate) {
      pushCandidate(candidates, srcsetCandidate, pageUrl, baseScore + 4)
    }
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = parseHtmlAttributes(tag)
    const href = attributes.href
    if (!href) continue

    const relTokens = (attributes.rel ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    if (!relTokens.length) continue

    const sizeBonus = getIconSizeBonus(attributes.sizes)

    if (relTokens.includes("apple-touch-icon") || relTokens.includes("apple-touch-icon-precomposed")) {
      pushCandidate(candidates, href, pageUrl, 60 + sizeBonus)
    } else if (relTokens.includes("icon") || relTokens.includes("shortcut")) {
      const hrefScore = href.toLowerCase().includes("favicon") ? 42 : 50
      pushCandidate(candidates, href, pageUrl, hrefScore + sizeBonus)
    }
  }

  const baseUrl = new URL(pageUrl)
  pushCandidate(candidates, `${baseUrl.origin}/apple-touch-icon.png`, pageUrl, 35)
  pushCandidate(candidates, `${baseUrl.origin}/favicon.ico`, pageUrl, 20)

  const uniqueCandidates = new Map<string, ThumbnailCandidate>()
  const strongestNonWeakCandidate = candidates.reduce<number>((best, candidate) => {
    if (!candidate.weak) {
      return Math.max(best, candidate.score)
    }
    return best
  }, -Infinity)

  const filteredCandidates = strongestNonWeakCandidate >= strongThumbnailScore
    ? candidates.filter((candidate) => !candidate.weak)
    : candidates

  for (const candidate of filteredCandidates) {
    const previousCandidate = uniqueCandidates.get(candidate.url)
    if (!previousCandidate || candidate.score > previousCandidate.score) {
      uniqueCandidates.set(candidate.url, candidate)
    }
  }

  return Array.from(uniqueCandidates.values())
    .sort((a, b) => b.score - a.score)
}

function extractFrameAncestors(csp: string): string[] | null {
  if (!csp.trim()) return null

  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"))

  if (!directive) return null
  return directive
    .split(/\s+/)
    .slice(1)
    .filter(Boolean)
}

function isOriginAllowedByFrameAncestors(
  frameAncestors: string[],
  appOrigin: string | null,
): boolean {
  if (frameAncestors.includes("*")) return true
  if (frameAncestors.includes("'none'")) return false
  if (frameAncestors.includes("'self'")) return false
  if (!appOrigin) return false

  return frameAncestors.some((source) => frameAncestorMatchesOrigin(source, appOrigin))
}

function frameAncestorMatchesOrigin(source: string, appOrigin: string): boolean {
  const normalizedSource = source.trim().toLowerCase()
  const normalizedOrigin = appOrigin.trim().toLowerCase()
  if (!normalizedSource || !normalizedOrigin) return false
  if (normalizedSource === normalizedOrigin) return true
  if (normalizedSource === "https:" || normalizedSource === "http:") {
    return normalizedOrigin.startsWith(`${normalizedSource}//`)
  }

  try {
    const sourceUrl = new URL(normalizedSource)
    const originUrl = new URL(normalizedOrigin)

    if (sourceUrl.protocol !== originUrl.protocol) return false
    if (sourceUrl.hostname === originUrl.hostname) return true

    if (sourceUrl.hostname.startsWith("*.")) {
      const hostSuffix = sourceUrl.hostname.slice(1)
      return originUrl.hostname.endsWith(hostSuffix)
    }
  } catch {
    return false
  }

  return false
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const attrRegex = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

  for (const match of tag.matchAll(attrRegex)) {
    const name = match[1]?.toLowerCase()
    if (!name || name === "meta" || name === "link" || name === "script") continue
    const rawValue = match[2] ?? match[3] ?? match[4] ?? ""
    attributes[name] = decodeHtmlEntities(rawValue.trim())
  }

  return attributes
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim()
}

function extractJsonLdImageUrls(jsonText: string): string[] {
  const urls: string[] = []
  const candidates = jsonText
    .split(/<\/script>/i)[0]
    .trim()

  try {
    const parsed = JSON.parse(candidates)
    collectJsonLdValue(parsed, urls)
  } catch {
    // Some sites emit multiple JSON objects or invalid escaping; ignore gracefully.
  }

  return urls
}

function collectJsonLdValue(value: unknown, urls: string[]): void {
  if (!value) return

  if (typeof value === "string") {
    urls.push(value)
    return
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectJsonLdValue(entry, urls)
    }
    return
  }

  if (typeof value !== "object") return

  const record = value as Record<string, unknown>
  for (const key of ["image", "thumbnailUrl", "thumbnail"]) {
    if (key in record) {
      collectJsonLdValue(record[key], urls)
    }
  }

  if ("url" in record && typeof record.url === "string" && imagePathPattern.test(record.url)) {
    urls.push(record.url)
  }
  if ("contentUrl" in record && typeof record.contentUrl === "string") {
    urls.push(record.contentUrl)
  }
  if ("@graph" in record) {
    collectJsonLdValue(record["@graph"], urls)
  }
}

function getIconSizeBonus(rawSizes: string | undefined): number {
  if (!rawSizes) return 0
  const sizes = rawSizes.toLowerCase().split(/\s+/)
  let maxSize = 0

  for (const size of sizes) {
    const match = size.match(/^(\d+)x(\d+)$/)
    if (!match) continue
    const width = Number(match[1])
    const height = Number(match[2])
    maxSize = Math.max(maxSize, Math.min(width, height))
  }

  if (maxSize >= 180) return 10
  if (maxSize >= 96) return 6
  if (maxSize >= 48) return 3
  return 0
}

function pushCandidate(
  candidates: ThumbnailCandidate[],
  rawUrl: string,
  pageUrl: string,
  score: number,
): void {
  const normalizedUrl = normalizeCandidateUrl(rawUrl, pageUrl)
  if (!normalizedUrl) return
  const weak = isLikelyWeakThumbnailUrl(normalizedUrl)
  const adjustedScore = score
    + getThumbnailKeywordBonus(normalizedUrl)
    - (weak ? 30 : 0)
  candidates.push({ url: normalizedUrl, score: adjustedScore, weak })
}

function getLargestSrcsetCandidate(srcset: string | undefined): string | null {
  if (!srcset) return null

  let largestWidth = -1
  let bestUrl: string | null = null
  for (const part of srcset.split(",")) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const [urlPart, descriptor] = trimmed.split(/\s+/, 2)
    const widthMatch = descriptor?.match(/^(\d+)w$/)
    const width = widthMatch ? Number(widthMatch[1]) : 0
    if (width >= largestWidth) {
      largestWidth = width
      bestUrl = urlPart
    }
  }

  return bestUrl
}

function isLikelyWeakThumbnailUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const path = `${parsed.hostname}${parsed.pathname}${parsed.search}`.toLowerCase()
    return weakThumbnailPattern.test(path)
  } catch {
    return weakThumbnailPattern.test(url.toLowerCase())
  }
}

function getThumbnailKeywordBonus(url: string): number {
  const normalized = url.toLowerCase()
  let bonus = 0

  if (/(cover|hero|feature|article|poster|preview|header|share)/.test(normalized)) {
    bonus += 10
  }
  if (/(thumb|thumbnail)/.test(normalized)) {
    bonus += 4
  }

  return bonus
}

function normalizeCandidateUrl(rawUrl: string, pageUrl: string): string | null {
  const trimmed = decodeHtmlEntities(rawUrl).trim()
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return null
  }

  try {
    const resolved = new URL(trimmed, pageUrl)
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null
    }

    validatePublicHostname(resolved.hostname)

    const pageProtocol = new URL(pageUrl).protocol
    if (pageProtocol === "https:" && resolved.protocol === "http:") {
      resolved.protocol = "https:"
    }

    return resolved.toString()
  } catch {
    return null
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!isOriginAllowed(req)) {
    return jsonResponse(req, { error: "Origin not allowed" }, 403)
  }

  try {
    enforceBodyLimit(req)
    enforceRateLimit(getRequesterKey(req))

    const { id: userId, token } = await requireAuthenticatedUser(req)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }) as any

    const body = await req.json()
    const action = typeof body?.action === "string" ? body.action : "create"
    const itemId = validateItemId(body?.itemId)

    await ensureItemOwnership(userClient, itemId)

    if (action === "create") {
      const title = validateTitle(body?.title)
      const url = validateBookmarkUrl(body?.url)
      const note = validateOptionalNote(body?.note) ?? null
      const linkType = validateLinkType(body?.linkType)
      const bookmark = await createBookmark(userClient, userId, itemId, title, url, note, linkType)
      return jsonResponse(req, { bookmark }, 201)
    }

    if (action === "update") {
      const bookmarkId = typeof body?.bookmarkId === "string" ? body.bookmarkId : ""
      const bookmark = await updateBookmark(userClient, itemId, bookmarkId, {
        title: validateOptionalTitle(body?.title),
        url: validateOptionalBookmarkUrl(body?.url),
        note: validateOptionalNote(body?.note),
        linkType: validateOptionalLinkType(body?.linkType),
      })
      return jsonResponse(req, { bookmark })
    }

    if (action === "backfill_missing") {
      const bookmarks = await backfillMissingThumbnails(userClient, itemId)
      return jsonResponse(req, { bookmarks })
    }

    if (action === "check_embed") {
      const url = validateBookmarkUrl(body?.url)
      const preview = await checkBookmarkEmbeddable(url, req.headers.get("origin"))
      return jsonResponse(req, preview)
    }

    throw new HttpError(400, "Unsupported action")
  } catch (error) {
    console.error("bookmark-metadata error", error)
    if (error instanceof HttpError) {
      return jsonResponse(req, { error: error.message }, error.status)
    }

    const message = error instanceof Error ? error.message : "Internal server error"
    return jsonResponse(req, { error: message }, 500)
  }
}, { port })
