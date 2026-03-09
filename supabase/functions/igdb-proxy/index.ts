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
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

// ---------------------------------------------------------------------------
// CORS headers (allow browser requests from any origin during dev)
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    throw new Error(`Twitch OAuth failed: ${res.status} ${await res.text()}`)
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
    throw new Error(`IGDB API error: ${res.status} ${await res.text()}`)
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
        data = await searchGames(query)
        break

      case "details":
        if (!id || typeof id !== "number") {
          return new Response(JSON.stringify({ error: "id (number) is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        data = await getGameDetails(id)
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
    console.error("igdb-proxy error:", err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
