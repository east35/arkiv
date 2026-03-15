/**
 * Arkiv — AI Chat Hook
 *
 * Manages per-item AI conversation threads stored in ai_conversation_threads.
 * The edge function handles response generation; this hook manages thread CRUD,
 * active-thread selection, and message sending.
 */

import { useCallback, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { AIConversationThread, AIMessage } from "@/types"

const DEFAULT_THREAD_TITLE = "New thread"
const LEGACY_THREAD_TITLE = "Discussion"

type ChatStorageMode = "threads" | "legacy"

interface LegacyAIConversation {
  id: string
  item_id: string
  user_id: string
  messages: AIMessage[]
  summary: string | null
  created_at: string
  updated_at: string
}

function sortThreads(threads: AIConversationThread[]): AIConversationThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

function upsertThread(
  current: AIConversationThread[],
  nextThread: AIConversationThread,
): AIConversationThread[] {
  const next = current.some((thread) => thread.id === nextThread.id)
    ? current.map((thread) => (thread.id === nextThread.id ? nextThread : thread))
    : [nextThread, ...current]

  return sortThreads(next)
}

function getStoredActiveThreadKey(itemId: string): string {
  return `arkiv-ai-active-thread:${itemId}`
}

function readStoredActiveThreadId(itemId: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(getStoredActiveThreadKey(itemId))
  } catch {
    return null
  }
}

function writeStoredActiveThreadId(itemId: string, threadId: string | null): void {
  if (typeof window === "undefined") return

  try {
    const key = getStoredActiveThreadKey(itemId)
    if (threadId) {
      window.localStorage.setItem(key, threadId)
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage failures and keep in-memory selection usable.
  }
}

function isMissingRelationError(error: unknown, relationName: string): boolean {
  if (!error || typeof error !== "object") return false

  const code = "code" in error ? String(error.code ?? "") : ""
  const message = "message" in error ? String(error.message ?? "") : ""
  const hint = "hint" in error ? String(error.hint ?? "") : ""

  return code === "PGRST205"
    || message.includes(`'public.${relationName}'`)
    || hint.includes(`'public.${relationName}'`)
}

function mapLegacyConversationToThread(conversation: LegacyAIConversation): AIConversationThread {
  return {
    id: conversation.id,
    item_id: conversation.item_id,
    user_id: conversation.user_id,
    title: LEGACY_THREAD_TITLE,
    title_source: "manual",
    messages: conversation.messages ?? [],
    summary: conversation.summary ?? null,
    summary_message_count: 0,
    spoiler_scope: null,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
  }
}

function buildLegacyPlaceholderThread(itemId: string, timestamp: string): AIConversationThread {
  return {
    id: `legacy-placeholder-${itemId}`,
    item_id: itemId,
    user_id: "legacy",
    title: LEGACY_THREAD_TITLE,
    title_source: "manual",
    messages: [],
    summary: null,
    summary_message_count: 0,
    spoiler_scope: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

interface ChatFunctionResponse {
  reply: string
  thread?: AIConversationThread | null
}

export function useAIChat() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [threads, setThreads] = useState<AIConversationThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [storageMode, setStorageMode] = useState<ChatStorageMode>("threads")
  const [loading, setLoading] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )

  const selectThread = useCallback((itemId: string, threadId: string | null) => {
    setActiveThreadId(threadId)
    writeStoredActiveThreadId(itemId, threadId)
  }, [])

  const fetchLegacyConversation = useCallback(async (itemId: string): Promise<AIConversationThread[]> => {
    const { data, error: fetchError } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("item_id", itemId)
      .maybeSingle()

    if (fetchError) throw fetchError

    const mapped = data
      ? [mapLegacyConversationToThread(data as LegacyAIConversation)]
      : []
    const nextActiveThreadId = mapped[0]?.id ?? null

    setStorageMode("legacy")
    setThreads(mapped)
    selectThread(itemId, nextActiveThreadId)
    return mapped
  }, [selectThread])

  const fetchThreads = useCallback(async (itemId: string): Promise<AIConversationThread[]> => {
    if (isDemoMode) {
      setStorageMode("threads")
      setThreads([])
      selectThread(itemId, null)
      return []
    }

    if (storageMode === "legacy") {
      return fetchLegacyConversation(itemId)
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("ai_conversation_threads")
        .select("*")
        .eq("item_id", itemId)
        .order("updated_at", { ascending: false })

      if (fetchError) throw fetchError

      const result = (data as AIConversationThread[] | null) ?? []
      const storedThreadId = readStoredActiveThreadId(itemId)
      const nextActiveThreadId = result.some((thread) => thread.id === activeThreadId)
        ? activeThreadId
        : result.some((thread) => thread.id === storedThreadId)
        ? storedThreadId
        : result[0]?.id ?? null

      setStorageMode("threads")
      setThreads(result)
      selectThread(itemId, nextActiveThreadId)
      return result
    } catch (fetchError) {
      if (isMissingRelationError(fetchError, "ai_conversation_threads")) {
        return fetchLegacyConversation(itemId)
      }

      throw fetchError
    }
  }, [activeThreadId, fetchLegacyConversation, isDemoMode, selectThread, storageMode])

  const createThread = useCallback(async (
    itemId: string,
    title = DEFAULT_THREAD_TITLE,
  ): Promise<AIConversationThread> => {
    const now = new Date().toISOString()
    const normalizedTitle = title.trim() || DEFAULT_THREAD_TITLE

    if (isDemoMode) {
      const thread: AIConversationThread = {
        id: crypto.randomUUID(),
        item_id: itemId,
        user_id: "demo",
        title: normalizedTitle,
        title_source: normalizedTitle === DEFAULT_THREAD_TITLE ? "auto" : "manual",
        messages: [],
        summary: null,
        summary_message_count: 0,
        spoiler_scope: null,
        created_at: now,
        updated_at: now,
      }
      setThreads((current) => upsertThread(current, thread))
      selectThread(itemId, thread.id)
      return thread
    }

    if (storageMode === "legacy") {
      return activeThread ?? buildLegacyPlaceholderThread(itemId, now)
    }

    setThreadLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error: insertError } = await supabase
        .from("ai_conversation_threads")
        .insert({
          item_id: itemId,
          user_id: session!.user.id,
          title: normalizedTitle,
          title_source: normalizedTitle === DEFAULT_THREAD_TITLE ? "auto" : "manual",
        })
        .select("*")
        .single()

      if (insertError) throw insertError

      const thread = data as AIConversationThread
      setThreads((current) => upsertThread(current, thread))
      selectThread(itemId, thread.id)
      return thread
    } catch (insertError) {
      if (isMissingRelationError(insertError, "ai_conversation_threads")) {
        setStorageMode("legacy")
        return activeThread ?? buildLegacyPlaceholderThread(itemId, now)
      }

      throw insertError
    } finally {
      setThreadLoading(false)
    }
  }, [activeThread, isDemoMode, selectThread, storageMode])

  const renameThread = useCallback(async (
    threadId: string,
    title: string,
  ): Promise<void> => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) return

    if (isDemoMode) {
      setThreads((current) =>
        current.map((thread) => (
          thread.id === threadId
            ? { ...thread, title: normalizedTitle, title_source: "manual" }
            : thread
        )),
      )
      return
    }

    if (storageMode === "legacy") {
      return
    }

    setThreadLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from("ai_conversation_threads")
        .update({
          title: normalizedTitle,
          title_source: "manual",
        })
        .eq("id", threadId)

      if (updateError) throw updateError

      setThreads((current) =>
        current.map((thread) => (
          thread.id === threadId
            ? { ...thread, title: normalizedTitle, title_source: "manual" }
            : thread
        )),
      )
    } finally {
      setThreadLoading(false)
    }
  }, [isDemoMode, storageMode])

  const deleteThread = useCallback(async (
    itemId: string,
    threadId: string,
  ): Promise<void> => {
    const remaining = threads.filter((thread) => thread.id !== threadId)
    const nextActiveThreadId = activeThreadId === threadId
      ? remaining[0]?.id ?? null
      : activeThreadId

    if (isDemoMode) {
      setThreads(remaining)
      selectThread(itemId, nextActiveThreadId)
      return
    }

    if (storageMode === "legacy") {
      setThreadLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from("ai_conversations")
          .delete()
          .eq("id", threadId)

        if (deleteError) throw deleteError

        setThreads([])
        selectThread(itemId, null)
      } finally {
        setThreadLoading(false)
      }
      return
    }

    setThreadLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from("ai_conversation_threads")
        .delete()
        .eq("id", threadId)

      if (deleteError) throw deleteError

      setThreads(remaining)
      selectThread(itemId, nextActiveThreadId)
    } finally {
      setThreadLoading(false)
    }
  }, [activeThreadId, isDemoMode, selectThread, storageMode, threads])

  const sendMessage = useCallback(async (itemId: string, message: string): Promise<void> => {
    if (isDemoMode) {
      const now = new Date().toISOString()
      let thread = activeThread

      if (!thread) {
        thread = {
          id: crypto.randomUUID(),
          item_id: itemId,
          user_id: "demo",
          title: DEFAULT_THREAD_TITLE,
          title_source: "auto",
          messages: [],
          summary: null,
          summary_message_count: 0,
          spoiler_scope: null,
          created_at: now,
          updated_at: now,
        }
      }

      const updatedThread: AIConversationThread = {
        ...thread,
        messages: [
          ...thread.messages,
          { role: "user", content: message, timestamp: now },
          { role: "assistant", content: "Demo mode reply.", timestamp: now },
        ],
        updated_at: now,
      }

      setThreads((current) => upsertThread(current, updatedThread))
      selectThread(itemId, updatedThread.id)
      return
    }

    const now = new Date().toISOString()
    const previousThreads = threads
    const initialThread = storageMode === "threads"
      ? activeThread ?? await createThread(itemId)
      : activeThread
    const optimisticThread: AIConversationThread = initialThread
      ? {
          ...initialThread,
          messages: [
            ...initialThread.messages,
            { role: "user", content: message, timestamp: now },
          ],
          updated_at: now,
        }
      : {
          id: `local-pending-${itemId}`,
          item_id: itemId,
          user_id: "local",
          title: LEGACY_THREAD_TITLE,
          title_source: "manual",
          messages: [{ role: "user", content: message, timestamp: now }],
          summary: null,
          summary_message_count: 0,
          spoiler_scope: null,
          created_at: now,
          updated_at: now,
        }

    setLoading(true)
    setError(null)
    setThreads((current) => upsertThread(current, optimisticThread))
    selectThread(itemId, optimisticThread.id)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("ai-chat-proxy", {
        body: {
          itemId,
          message,
          ...(storageMode === "threads" && initialThread ? { threadId: initialThread.id } : {}),
        },
      })

      if (invokeError) {
        const body = await (invokeError as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(body?.error ?? invokeError.message)
      }

      const { reply, thread } = (data ?? {}) as ChatFunctionResponse
      if (!reply) throw new Error("Empty reply from AI")

      if (thread) {
        setThreads((current) => upsertThread(current, thread))
        selectThread(itemId, thread.id)
        return
      }

      const refreshedThreads = await fetchThreads(itemId).catch(() => [])
      if (refreshedThreads.length > 0) {
        return
      }

      const localThread: AIConversationThread = {
        ...optimisticThread,
        messages: [
          ...optimisticThread.messages,
          { role: "assistant", content: reply, timestamp: now },
        ],
        updated_at: now,
      }

      setThreads((current) => upsertThread(current, localThread))
      selectThread(itemId, localThread.id)
    } catch (err) {
      setThreads(previousThreads)
      selectThread(itemId, activeThread?.id ?? null)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setLoading(false)
    }
  }, [activeThread, createThread, fetchThreads, isDemoMode, selectThread, storageMode, threads])

  return {
    threads,
    activeThread,
    activeThreadId,
    supportsThreading: storageMode === "threads",
    loading,
    threadLoading,
    error,
    setError,
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
    selectThread: (itemId: string, threadId: string | null) => selectThread(itemId, threadId),
    sendMessage,
  }
}
