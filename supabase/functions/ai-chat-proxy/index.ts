import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Simple in-memory rate limiter per user (resets when function instance restarts)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const port = Number(Deno.env.get("PORT") || 8000)

Deno.serve({ port }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Decode JWT manually (verify_jwt = false, we do it ourselves)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.slice(7)

    // Build service-role client for privileged reads
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Build user client (RLS) to verify the user session
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { itemId, message } = await req.json()
    if (!itemId || !message) {
      return new Response(JSON.stringify({ error: "Missing itemId or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch AI config from user_preferences using service role (key never touches client)
    const { data: prefs, error: prefsError } = await serviceClient
      .from("user_preferences")
      .select("ai_provider, ai_api_key")
      .eq("user_id", user.id)
      .single()

    if (prefsError || !prefs?.ai_provider || !prefs?.ai_api_key) {
      return new Response(JSON.stringify({ error: "AI provider not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch context in parallel
    const [itemRes, progressRes, notesRes, bookmarksRes, conversationRes] = await Promise.all([
      serviceClient.from("items").select("title, media_type, description").eq("id", itemId).single(),
      serviceClient.from("item_progress").select("*").eq("item_id", itemId).maybeSingle(),
      serviceClient.from("item_notes").select("content, created_at").eq("item_id", itemId).order("created_at"),
      serviceClient.from("item_bookmarks").select("title, url").eq("item_id", itemId).order("created_at"),
      serviceClient.from("ai_conversations").select("*").eq("item_id", itemId).maybeSingle(),
    ])

    const item = itemRes.data
    if (!item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const progress = progressRes.data
    const notes = (notesRes.data ?? []) as { content: string; created_at: string }[]
    const bookmarks = (bookmarksRes.data ?? []) as { title: string; url: string }[]
    const conversation = conversationRes.data as { messages: AIMessage[]; summary: string | null } | null

    // Context compaction: if conversation has > 20 messages, summarise oldest
    let messages: AIMessage[] = conversation?.messages ?? []
    let summary = conversation?.summary ?? null

    if (messages.length > 20) {
      const toSummarise = messages.slice(0, messages.length - 10)
      const recent = messages.slice(messages.length - 10)

      const summaryReply = await callAI(
        prefs.ai_provider,
        prefs.ai_api_key,
        "Summarise the following conversation concisely, preserving key facts and decisions. Reply with only the summary text.",
        toSummarise,
      )
      summary = summaryReply
      messages = recent

      // Persist compacted state
      await serviceClient
        .from("ai_conversations")
        .upsert(
          { item_id: itemId, user_id: user.id, messages, summary, updated_at: new Date().toISOString() },
          { onConflict: "item_id" },
        )
    }

    // Build system prompt
    const progressText = progress
      ? `${progress.type ?? ""} ${progress.value ?? ""}${progress.confidence ? ` (${progress.confidence})` : ""}`.trim()
      : "Unknown"

    const notesText = notes.length > 0
      ? notes.map((n) => `- ${n.content}`).join("\n")
      : "None"

    const bookmarksText = bookmarks.length > 0
      ? bookmarks.map((b) => `- [${b.title}](${b.url})`).join("\n")
      : "None"

    const systemPrompt = [
      `You are a helpful discussion partner for "${item.title}" (${item.media_type}).`,
      item.description ? `\nDescription: ${item.description}` : "",
      `\nUser's current progress: ${progressText}`,
      `IMPORTANT: Do not reveal or hint at story events, twists, or content beyond this progress point.`,
      `\nUser's notes:\n${notesText}`,
      `\nUser's bookmarks:\n${bookmarksText}`,
      summary ? `\nEarlier conversation summary:\n${summary}` : "",
      `\nBe conversational, insightful, and avoid spoilers past the user's progress.`,
    ].filter(Boolean).join("\n")

    // Add the new user message to history for the API call
    const historyWithNew: AIMessage[] = [
      ...messages,
      { role: "user", content: message, timestamp: new Date().toISOString() },
    ]

    const reply = await callAI(prefs.ai_provider, prefs.ai_api_key, systemPrompt, historyWithNew)

    // Persist updated conversation
    const now = new Date().toISOString()
    const assistantMsg: AIMessage = { role: "assistant", content: reply, timestamp: now }
    const updatedMessages: AIMessage[] = [
      ...messages,
      { role: "user", content: message, timestamp: now },
      assistantMsg,
    ]

    await serviceClient
      .from("ai_conversations")
      .upsert(
        { item_id: itemId, user_id: user.id, messages: updatedMessages, summary, updated_at: now },
        { onConflict: "item_id" },
      )

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("ai-chat-proxy error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    const status = message === "Invalid Anthropic API key"
      || message === "AI provider not configured"
      || message.startsWith("Unknown AI provider:")
      ? 400
      : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

// ─── AI Provider Router ───────────────────────────────────────────────────────

async function callAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, systemPrompt, messages)
    case "anthropic":
      return callAnthropic(apiKey, systemPrompt, messages)
    case "gemini":
      return callGemini(apiKey, systemPrompt, messages)
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

async function callOpenAI(apiKey: string, systemPrompt: string, messages: AIMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callAnthropic(apiKey: string, systemPrompt: string, messages: AIMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const errorText = await res.text()

    try {
      const parsed = JSON.parse(errorText)
      const upstreamType = parsed?.error?.type
      const upstreamMessage = parsed?.error?.message

      if (upstreamType === "authentication_error") {
        throw new Error("Invalid Anthropic API key")
      }

      if (upstreamMessage) {
        throw new Error(`Anthropic error: ${upstreamMessage}`)
      }
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message !== errorText) {
        throw parseError
      }
    }

    throw new Error(`Anthropic error: ${errorText}`)
  }
  const data = await res.json()
  return data.content[0].text
}

async function callGemini(apiKey: string, systemPrompt: string, messages: AIMessage[]): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `${systemPrompt}\n\nBegin conversation.` }] },
    { role: "model", parts: [{ text: "Understood. I'm ready to discuss this with you." }] },
    ...messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    },
  )
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}
