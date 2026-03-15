import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type {
  ItemBookmark,
  ItemNote,
  ItemProgress,
  MediaType,
  PromptSuggestionsResponse,
  Status,
} from "@/types"

interface UsePromptSuggestionsOptions {
  itemId: string
  mediaType: MediaType
  status?: Status
  progress: ItemProgress | null
  notes: ItemNote[]
  bookmarks: ItemBookmark[]
  enabled?: boolean
}

function formatProgressLabel(progress: ItemProgress | null): string | null {
  if (!progress) return null

  const type = progress.type?.trim()
  const value = progress.value?.trim()
  if (!type && !value) return null
  if (!type) return value ?? null
  if (!value) return type.charAt(0).toUpperCase() + type.slice(1)
  return `${type.charAt(0).toUpperCase() + type.slice(1)} ${value}`
}

function clipText(value: string | null | undefined, maxLength = 38): string | null {
  if (!value) return null

  const cleaned = value.replace(/\s+/g, " ").replace(/["]+/g, "").trim()
  if (!cleaned) return null
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`
}

function dedupePrompts(prompts: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const prompt of prompts) {
    const normalized = prompt.replace(/\s+/g, " ").trim()
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(normalized)
  }

  return result
}

function buildFallbackPrompts(
  mediaType: MediaType,
  status: Status | undefined,
  progress: ItemProgress | null,
  notes: ItemNote[],
  bookmarks: ItemBookmark[],
): string[] {
  const progressLabel = formatProgressLabel(progress)
  const stablePrompts = status === "revisiting"
    ? [
        mediaType === "book"
          ? "What stands out more on a reread?"
          : "What stands out more on a replay?",
        mediaType === "book"
          ? "What should I notice more this time?"
          : "What should I focus on this run?",
      ]
    : [
        progressLabel && progressLabel.length <= 28
          ? `Can you recap everything up to ${progressLabel}?`
          : "Can you recap the story so far?",
        mediaType === "book"
          ? "Who matters most right now?"
          : "What should I pay attention to right now?",
      ]

  const latestNote = clipText(notes[notes.length - 1]?.content)
  const latestBookmark = clipText(bookmarks[bookmarks.length - 1]?.title, 30)
  const contextualPrompts: string[] = []

  if (latestNote) {
    contextualPrompts.push(`How does "${latestNote}" connect so far?`)
  }

  if (latestBookmark) {
    contextualPrompts.push(`Why is "${latestBookmark}" worth remembering?`)
  }

  if (status === "revisiting") {
    contextualPrompts.push(
      mediaType === "book"
        ? "What foreshadowing should I notice now?"
        : "What details are easier to appreciate now?",
    )
  } else {
    contextualPrompts.push(
      mediaType === "book"
        ? "What themes are emerging so far?"
        : "What earlier scene matters most right now?",
      "What should I pay attention to next?",
    )
  }

  return dedupePrompts([...stablePrompts, ...contextualPrompts]).slice(0, 4)
}

function buildContextKey(
  itemId: string,
  mediaType: MediaType,
  status: Status | undefined,
  progress: ItemProgress | null,
  notes: ItemNote[],
  bookmarks: ItemBookmark[],
): string {
  return JSON.stringify({
    itemId,
    mediaType,
    status: status ?? null,
    progress: progress
      ? {
          type: progress.type,
          value: progress.value,
          confidence: progress.confidence,
          updated_at: progress.updated_at,
        }
      : null,
    notes: notes.map((note) => ({
      id: note.id,
      content: note.content,
      updated_at: note.updated_at,
    })),
    bookmarks: bookmarks.map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      note: bookmark.note,
      updated_at: bookmark.updated_at,
      url: bookmark.url,
    })),
  })
}

export function usePromptSuggestions({
  itemId,
  mediaType,
  status,
  progress,
  notes,
  bookmarks,
  enabled = true,
}: UsePromptSuggestionsOptions) {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [prompts, setPrompts] = useState<string[]>(() =>
    buildFallbackPrompts(mediaType, status, progress, notes, bookmarks),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fallbackPrompts = buildFallbackPrompts(mediaType, status, progress, notes, bookmarks)
  const fallbackPromptsJson = JSON.stringify(fallbackPrompts)
  const contextKey = buildContextKey(itemId, mediaType, status, progress, notes, bookmarks)

  useEffect(() => {
    setPrompts(JSON.parse(fallbackPromptsJson) as string[])
  }, [fallbackPromptsJson])

  useEffect(() => {
    if (!enabled || isDemoMode) {
      setLoading(false)
      setError(null)
      return
    }

    const currentRequestId = ++requestIdRef.current
    const loadPrompts = async () => {
      setLoading(true)

      try {
        const { data, error: invokeError } = await supabase.functions.invoke("ai-chat-proxy", {
          body: {
            action: "prompt-suggestions",
            itemId,
          },
        })

        if (invokeError) {
          const body = await (invokeError as { context?: Response }).context?.json?.().catch(() => null)
          throw new Error(body?.error ?? invokeError.message)
        }

        const nextPrompts = dedupePrompts(
          ((data as PromptSuggestionsResponse | null)?.prompts ?? []).slice(0, 4),
        )

        if (currentRequestId !== requestIdRef.current) return
        setPrompts(nextPrompts.length > 0 ? nextPrompts : JSON.parse(fallbackPromptsJson) as string[])
        setError(null)
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return
        setPrompts(JSON.parse(fallbackPromptsJson) as string[])
        setError(err instanceof Error ? err.message : "Failed to load suggestions")
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }

    void loadPrompts()
  }, [contextKey, enabled, fallbackPromptsJson, isDemoMode, itemId])

  const refresh = async () => {
    if (!enabled || isDemoMode) return

    const currentRequestId = ++requestIdRef.current
    setLoading(true)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("ai-chat-proxy", {
        body: {
          action: "prompt-suggestions",
          itemId,
          forceRefresh: true,
        },
      })

      if (invokeError) {
        const body = await (invokeError as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(body?.error ?? invokeError.message)
      }

      const nextPrompts = dedupePrompts(
        ((data as PromptSuggestionsResponse | null)?.prompts ?? []).slice(0, 4),
      )

      if (currentRequestId !== requestIdRef.current) return
      setPrompts(nextPrompts.length > 0 ? nextPrompts : JSON.parse(fallbackPromptsJson) as string[])
      setError(null)
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return
      setPrompts(JSON.parse(fallbackPromptsJson) as string[])
      setError(err instanceof Error ? err.message : "Failed to refresh suggestions")
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  return { prompts, loading, error, refresh }
}
