/**
 * Supabase Client
 *
 * Single shared instance for the entire app.
 * Reads project URL and anon key from environment variables.
 * These are safe to expose client-side — RLS enforces access control.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const proxyFunctionsInDev = import.meta.env.DEV
  && import.meta.env.VITE_SUPABASE_FUNCTIONS_PROXY !== "false"

const FUNCTIONS_PATH = "/functions/v1"
const DEV_FUNCTIONS_PROXY_PATH = "/__supabase/functions/v1"

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. " +
    "Copy .env.example to .env.local and fill in your Supabase project credentials."
  )
}

const supabaseOrigin = new URL(supabaseUrl).origin

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const supabaseFetch: typeof fetch = (input, init) => {
  const url = new URL(getRequestUrl(input))

  if (!proxyFunctionsInDev || url.origin !== supabaseOrigin || !url.pathname.startsWith(FUNCTIONS_PATH)) {
    return fetch(input, init)
  }

  // Route edge-function calls through the local dev server to avoid browser CORS
  // failures when the frontend is served from a local hostname or LAN IP.
  const proxiedUrl = `${DEV_FUNCTIONS_PROXY_PATH}${url.pathname.slice(FUNCTIONS_PATH.length)}${url.search}`
  return fetch(proxiedUrl, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
})
