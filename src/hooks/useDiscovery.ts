import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { MediaType, DiscoveryResult } from "@/types"

export type { DiscoveryResult }

async function readFunctionError(
  error: unknown,
  response?: Response,
): Promise<{ message: string; unsupported: boolean } | null> {
  if (!error) return null

  const status = response?.status ?? 0
  let message = error instanceof Error ? error.message : String(error)

  if (response) {
    try {
      const payload = await response.clone().json() as { error?: unknown }
      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim()
      }
    } catch {
      try {
        const text = (await response.clone().text()).trim()
        if (text) message = text
      } catch {
        // Fall back to the SDK error message.
      }
    }
  }

  const unsupported = [400, 404].includes(status)
    && /invalid action|not found/i.test(message)

  return { message, unsupported }
}

export function useDiscovery() {
  const [newReleases, setNewReleases] = useState<DiscoveryResult[]>([])
  const [upcoming, setUpcoming] = useState<DiscoveryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (mediaType: MediaType) => {
    setLoading(true)
    setError(null)
    const fn = mediaType === "game" ? "igdb-proxy" : "hardcover-proxy"
    try {
      const [newRes, upcomingRes] = await Promise.all([
        supabase.functions.invoke(fn, { body: { action: "discovery", mode: "new", limit: 20 } }),
        supabase.functions.invoke(fn, { body: { action: "discovery", mode: "upcoming", limit: 20 } }),
      ])

      const [newFailure, upcomingFailure] = await Promise.all([
        readFunctionError(newRes.error, newRes.response),
        readFunctionError(upcomingRes.error, upcomingRes.response),
      ])

      if (newFailure?.unsupported || upcomingFailure?.unsupported) {
        setNewReleases(newFailure ? [] : (newRes.data?.results ?? []))
        setUpcoming(upcomingFailure ? [] : (upcomingRes.data?.results ?? []))
        return
      }

      if (newFailure) throw new Error(newFailure.message)
      if (upcomingFailure) throw new Error(upcomingFailure.message)

      setNewReleases(newRes.data?.results ?? [])
      setUpcoming(upcomingRes.data?.results ?? [])
    } catch (err) {
      // Soft fail — discovery is best-effort, not blocking
      const message = err instanceof Error ? err.message : String(err)
      console.error("[useDiscovery] failed:", message, err)
      setError(message)
      setNewReleases([])
      setUpcoming([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { newReleases, upcoming, loading, error, fetch }
}
