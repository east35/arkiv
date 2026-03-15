/**
 * Arkiv — AI Chat Hook
 *
 * Sends messages to the ai-chat-proxy edge function and persists the
 * conversation in ai_conversations.
 * In demo mode all operations are no-ops.
 */

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useShelfStore } from "@/store/useShelfStore"
import type { AIConversation } from "@/types"

export function useAIChat() {
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversation = useCallback(async (itemId: string): Promise<AIConversation | null> => {
    if (isDemoMode) {
      setConversation(null)
      return null
    }
    const { data, error: fetchError } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("item_id", itemId)
      .maybeSingle()
    if (fetchError) throw fetchError
    const result = data as AIConversation | null
    setConversation(result)
    return result
  }, [isDemoMode])

  const sendMessage = useCallback(async (itemId: string, message: string): Promise<void> => {
    if (isDemoMode) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("ai-chat-proxy", {
        body: { itemId, message },
      })
      if (invokeError) {
        // Extract the actual error message from the response body
        const body = await (invokeError as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(body?.error ?? invokeError.message)
      }
      const { reply } = data as { reply: string }
      if (!reply) throw new Error("Empty reply from AI")

      // Refresh conversation from DB (edge function already persisted the update)
      const { data: updated, error: refetchError } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("item_id", itemId)
        .maybeSingle()
      if (refetchError) throw refetchError
      setConversation(updated as AIConversation | null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setLoading(false)
    }
  }, [isDemoMode])

  return { conversation, loading, error, setError, fetchConversation, sendMessage }
}
