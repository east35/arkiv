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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const port = Number(Deno.env.get("PORT") || 8000)

Deno.serve({ port }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing auth token" }, 401)
    }

    const token = authHeader.slice(7)

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    if (!checkRateLimit(user.id)) {
      return jsonResponse({ error: "Rate limit exceeded" }, 429)
    }

    const payload = await req.json() as RequestPayload
    const itemId = payload.itemId?.trim()
    if (!itemId) {
      return jsonResponse({ error: "Missing itemId" }, 400)
    }

    if (payload.action === "prompt-suggestions") {
      const suggestionResult = await handlePromptSuggestions(
        serviceClient,
        user.id,
        itemId,
        Boolean(payload.forceRefresh),
      )
      if (!suggestionResult) {
        return jsonResponse({ error: "Item not found" }, 404)
      }
      return jsonResponse(suggestionResult)
    }

    const message = payload.message?.trim()
    if (!message) {
      return jsonResponse({ error: "Missing message" }, 400)
    }

    const prefs = await getUserAIConfig(serviceClient, user.id)
    if (!prefs?.ai_provider || !prefs.ai_api_key) {
      return jsonResponse({ error: "AI provider not configured" }, 400)
    }

    const context = await loadItemContext(serviceClient, user.id, itemId)
    if (!context) {
      return jsonResponse({ error: "Item not found" }, 404)
    }

    const chatResult = await handleChatMessage(
      serviceClient,
      user.id,
      itemId,
      payload.threadId?.trim(),
      message,
      prefs,
      context,
    )
    return jsonResponse(chatResult)
  } catch (err) {
    console.error("ai-chat-proxy error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    const status = message === "Invalid Anthropic API key"
      || message === "AI provider not configured"
      || message.startsWith("Unknown AI provider:")
      ? 400
      : message === "Item not found" || message === "Thread not found"
      ? 404
      : 500

    return jsonResponse({ error: message }, status)
  }
})

interface RequestPayload {
  action?: "prompt-suggestions"
  itemId?: string
  threadId?: string
  message?: string
  forceRefresh?: boolean
}

interface AIMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface CallAIOptions {
  maxTokens?: number
  temperature?: number
}

type ChatResponseMode =
  | "default"
  | "quick-clarification"
  | "strategy"
  | "lore"
  | "comparison"

interface ChatResponseStyle {
  mode: ChatResponseMode
  expanded: boolean
  spoilerSensitive: boolean
  maxTokens: number
  temperature: number
}

interface UserAIConfig {
  ai_provider: string | null
  ai_api_key: string | null
}

interface ItemProgressRow {
  type: string | null
  value: string | null
  confidence: string | null
  updated_at: string
}

interface ItemNoteRow {
  content: string
  created_at: string
  updated_at: string
}

interface ItemBookmarkRow {
  title: string
  note: string | null
  created_at: string
  updated_at: string
}

interface AIConversationThreadRow {
  id: string
  item_id: string
  user_id: string
  title: string
  title_source: "auto" | "manual"
  messages: AIMessage[]
  summary: string | null
  summary_message_count: number
  spoiler_scope: string | null
  created_at: string
  updated_at: string
}

interface LegacyConversationRow {
  id: string
  item_id: string
  user_id: string
  messages: AIMessage[]
  summary: string | null
  created_at: string
  updated_at: string
}

interface ItemSummary {
  title: string
  media_type: "book" | "game"
  description: string | null
  status: string | null
}

interface AIItemMemoryRow {
  spoiler_preference: string | null
  response_style: string | null
  durable_preferences: Record<string, unknown> | null
  updated_at: string
}

interface ItemContext {
  item: ItemSummary
  progress: ItemProgressRow | null
  notes: ItemNoteRow[]
  bookmarks: ItemBookmarkRow[]
  itemMemory: AIItemMemoryRow | null
}

interface PromptSuggestionResult {
  prompts: string[]
  cached: boolean
}

const RECENT_THREAD_MESSAGE_LIMIT = 8
const SUMMARY_UPDATE_MIN_BATCH = 4
const MAX_CONTEXT_NOTES = 4
const MAX_CONTEXT_BOOKMARKS = 4
const MAX_RETRIEVED_SNIPPETS = 3
const THREAD_TITLE_LIMIT = 60

function isMissingRelationError(error: unknown, relationName: string): boolean {
  if (!error || typeof error !== "object") return false

  const code = "code" in error ? String(error.code ?? "") : ""
  const message = "message" in error ? String(error.message ?? "") : ""
  const hint = "hint" in error ? String(error.hint ?? "") : ""

  return code === "PGRST205"
    || message.includes(`'public.${relationName}'`)
    || hint.includes(`'public.${relationName}'`)
}

function detectChatResponseStyle(message: string, item: ItemSummary): ChatResponseStyle {
  const lower = message.toLowerCase()
  const spoilerSensitive = /\bspoiler(?:s|[-\s]?free)?\b|\bno spoilers\b|\bhint\b/.test(lower)
  const expanded = /\b(more detail|deeper|deep dive|detailed|detail|full breakdown|thorough|everything|expanded|longer)\b/.test(lower)

  let mode: ChatResponseMode = "default"

  if (/\b(compare|comparison|vs\.?|versus|difference|different|better|best option|which should|pros and cons)\b/.test(lower)) {
    mode = "comparison"
  } else if (
    item.media_type === "game"
    && /\b(should i|best next step|next step|what now|where do i go|boss|fight|combat|build|loadout|strategy|tips|advice|quest|approach|weapon|gear|level)\b/.test(lower)
  ) {
    mode = "strategy"
  } else if (/\b(remind me|who is|what is|when is|where is|which is|quick|briefly|in one sentence|short answer|clarify)\b/.test(lower)) {
    mode = "quick-clarification"
  } else if (/\b(lore|story|theme|themes|character|characters|motif|meaning|symbol|explain|recap|summary|relationship|why does|how does)\b/.test(lower)) {
    mode = "lore"
  }

  const baseMaxTokens: Record<ChatResponseMode, number> = {
    "default": expanded ? 520 : 300,
    "quick-clarification": expanded ? 340 : 220,
    "strategy": expanded ? 420 : 280,
    "lore": expanded ? 560 : 320,
    "comparison": expanded ? 460 : 300,
  }

  return {
    mode,
    expanded,
    spoilerSensitive,
    maxTokens: baseMaxTokens[mode],
    temperature: expanded ? 0.45 : 0.35,
  }
}

function sanitizePromptList(prompts: unknown[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const prompt of prompts) {
    if (typeof prompt !== "string") continue

    let normalized = prompt
      .replace(/^[\s*\-0-9.)]+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^["']+|["']+$/g, "")

    if (!normalized) continue

    const firstSentence = normalized.match(/^(.+?[?.!])(?:\s|$)/)
    if (firstSentence) {
      normalized = firstSentence[1].trim()
    }

    if (normalized.length < 8 || normalized.length > 96) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(normalized)
  }

  return result
}

function clipText(value: string | null | undefined, maxLength = 38): string | null {
  if (!value) return null

  const cleaned = value.replace(/\s+/g, " ").replace(/["]+/g, "").trim()
  if (!cleaned) return null
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`
}

function formatProgressLabel(progress: ItemProgressRow | null): string | null {
  if (!progress) return null

  const type = progress.type?.trim()
  const value = progress.value?.trim()
  if (!type && !value) return null
  if (!type) return value ?? null
  if (!value) return type.charAt(0).toUpperCase() + type.slice(1)
  return `${type.charAt(0).toUpperCase() + type.slice(1)} ${value}`
}

function allowsFullSpoilers(context: ItemContext): boolean {
  return context.item.status === "revisiting"
    || context.itemMemory?.spoiler_preference === "full"
}

function buildSpoilerLine(context: ItemContext): string {
  return allowsFullSpoilers(context)
    ? `The user has already completed this ${context.item.media_type} or explicitly allows full spoilers. Spoiler restrictions do not apply.`
    : "IMPORTANT: Do not reveal or hint at story events, twists, or content beyond this progress point."
}

function buildThreadSpoilerScope(context: ItemContext): string {
  if (allowsFullSpoilers(context)) {
    return "Full spoilers allowed."
  }

  return `Safe through ${formatProgressLabel(context.progress) ?? "the user's current progress"}.`
}

function buildSharedMemoryText(context: ItemContext, style?: ChatResponseStyle): string {
  const durablePreferences = context.itemMemory?.durable_preferences
    && Object.keys(context.itemMemory.durable_preferences).length > 0
      ? JSON.stringify(context.itemMemory.durable_preferences)
      : null

  return [
    `- Spoiler preference: ${context.itemMemory?.spoiler_preference ?? (allowsFullSpoilers(context) ? "full" : "spoiler-safe")}`,
    `- Current progress: ${formatProgressLabel(context.progress) ?? "Unknown"}`,
    `- Response style preference: ${context.itemMemory?.response_style ?? (style?.expanded ? "expanded" : "compact")}`,
    durablePreferences ? `- Durable preferences: ${durablePreferences}` : "- Durable preferences: None",
  ].join("\n")
}

function buildNotesText(notes: ItemNoteRow[]): string {
  const visibleNotes = notes
    .slice(-MAX_CONTEXT_NOTES)
    .map((note) => clipText(note.content, 180))
    .filter(Boolean)

  return visibleNotes.length > 0
    ? visibleNotes.map((note) => `- ${note}`).join("\n")
    : "None"
}

function buildBookmarksText(bookmarks: ItemBookmarkRow[]): string {
  const visibleBookmarks = bookmarks
    .slice(-MAX_CONTEXT_BOOKMARKS)
    .map((bookmark) => {
      const title = clipText(bookmark.title, 48)
      const note = clipText(bookmark.note, 96)

      if (!title) return null
      return note ? `- ${title} — ${note}` : `- ${title}`
    })
    .filter(Boolean)

  return visibleBookmarks.length > 0
    ? visibleBookmarks.join("\n")
    : "None"
}

function normalizeThreadTitle(title: string | null | undefined): string {
  const cleaned = title?.replace(/\s+/g, " ").trim()
  if (!cleaned) return "New thread"
  return cleaned.slice(0, THREAD_TITLE_LIMIT)
}

function mapLegacyConversationToThread(
  conversation: LegacyConversationRow,
  context: ItemContext,
): AIConversationThreadRow {
  return {
    id: conversation.id,
    item_id: conversation.item_id,
    user_id: conversation.user_id,
    title: "Discussion",
    title_source: "manual",
    messages: conversation.messages ?? [],
    summary: conversation.summary ?? null,
    summary_message_count: 0,
    spoiler_scope: buildThreadSpoilerScope(context),
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
  }
}

function generateThreadTitle(message: string, item: ItemSummary): string {
  const cleaned = message
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .trim()

  const lower = cleaned.toLowerCase()

  if (/\b(compare|comparison|vs\.?|versus|difference|better)\b/.test(lower)) {
    return "Comparison"
  }

  if (/\b(recap|summary|summarize|what happened|story so far)\b/.test(lower)) {
    return item.media_type === "book" ? "Story recap" : "Progress recap"
  }

  if (item.media_type === "game" && /\b(next step|what now|where do i go|strategy|build|hint|boss|fight)\b/.test(lower)) {
    return "Next step advice"
  }

  if (/\b(lore|theme|character|meaning|symbol|explain|why does|how does)\b/.test(lower)) {
    return item.media_type === "book" ? "Story and themes" : "Story and lore"
  }

  const normalized = cleaned
    .replace(/^(can you|could you|would you|please|tell me|help me|i want to know|i want to understand)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .trim()

  if (!normalized) return "New thread"

  return normalizeThreadTitle(normalized)
}

const KEYWORD_STOPWORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "being",
  "before", "between", "book", "both", "game", "give", "from", "have", "into",
  "just", "know", "like", "main", "make", "more", "most", "next", "only", "over",
  "point", "really", "same", "that", "their", "them", "then", "there", "these",
  "they", "this", "those", "through", "what", "when", "where", "which", "while",
  "with", "would", "your",
])

function extractKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !KEYWORD_STOPWORDS.has(token)),
    ),
  ).slice(0, 8)
}

function countKeywordOverlap(content: string, keywords: string[]): number {
  const haystack = content.toLowerCase()
  return keywords.reduce(
    (score, keyword) => score + (haystack.includes(keyword) ? 1 : 0),
    0,
  )
}

function shouldRetrieveOlderThreadContext(message: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false

  return /\b(earlier|before|previous|previously|again|remind me|mentioned|talked about|called back|that scene|that character)\b/i.test(message)
    || keywords.length >= 2
}

function retrieveRelevantOlderThreadSnippets(
  thread: AIConversationThreadRow,
  message: string,
): string[] {
  const olderMessages = thread.messages.slice(0, Math.max(0, thread.messages.length - RECENT_THREAD_MESSAGE_LIMIT))
  if (olderMessages.length === 0) return []

  const keywords = extractKeywords(message)
  if (!shouldRetrieveOlderThreadContext(message, keywords)) return []

  return olderMessages
    .map((entry) => ({
      snippet: `${entry.role === "user" ? "User" : "Assistant"}: ${clipText(entry.content, 220) ?? entry.content}`,
      score: countKeywordOverlap(entry.content, keywords),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVED_SNIPPETS)
    .map((entry) => entry.snippet)
}

function buildResponseTags(style: ChatResponseStyle, item: ItemSummary): string[] {
  const tags: string[] = []

  if (item.status === "revisiting") {
    tags.push("Revisit")
  } else {
    tags.push("Spoiler-free")
  }

  switch (style.mode) {
    case "quick-clarification":
      tags.push("Quick answer")
      break
    case "strategy":
      tags.push("Strategy")
      break
    case "lore":
      tags.push("Lore")
      break
    case "comparison":
      tags.push("Comparison")
      break
    default:
      tags.push(item.media_type === "game" ? "Companion" : "Reading companion")
      break
  }

  if (style.spoilerSensitive) {
    tags.push("Hint")
  }

  return tags.slice(0, 3)
}

function buildResponseShapeGuide(style: ChatResponseStyle, context: ItemContext): string {
  const modeGuidance: Record<ChatResponseMode, string[]> = {
    "default": [
      "Use the default shape: Answer, Key points, optional More context, optional Follow-ups.",
    ],
    "quick-clarification": [
      "Use the quick clarification shape.",
      "Keep it to one short paragraph max, with at most 2 bullets if they help.",
      "Do not add a long explanation unless the user explicitly asked for more detail.",
    ],
    "strategy": [
      "Use the strategy shape.",
      "After Answer, include Best next step, Why, and Watch out for.",
      "Use bullets only for those sections. Avoid long prose.",
    ],
    "lore": [
      "Use the lore/story shape.",
      "Give a short summary first, then up to 3 bullets.",
      "Put any deeper analysis in More context only.",
    ],
    "comparison": [
      "Use the comparison shape.",
      "After Answer, include Differences and optionally Best fit.",
      "Use concise labeled bullets, not dense paragraphs.",
    ],
  }

  const spoilerLevel = allowsFullSpoilers(context)
    ? "Full spoilers are allowed for this thread."
    : `Safe through the user's current progress (${formatProgressLabel(context.progress) ?? "current progress"}).`

  return [
    "Response style rules:",
    `- Default length policy: ${style.expanded ? "expanded, but still tightly structured" : "compact"}.`,
    "- Lead with the direct answer in 1-2 sentences.",
    "- Keep the default answer around 80-160 words unless the user explicitly asks for depth.",
    "- Break support into short sections, bullets, or numbered steps.",
    "- Never write a long unbroken paragraph if bullets or sections would scan faster.",
    "- Avoid filler openings, avoid repeating the user's question, and stay lightweight.",
    "- Use bold only for a few keywords, written with **double asterisks**.",
    "- Use > only for a genuinely important warning or best next step.",
    "- If extra explanation is useful, put it under More context rather than front-loading it.",
    "- If helpful, end with Follow-ups and at most 2 short bullet suggestions.",
    "",
    "Formatting contract:",
    `- First line: Tags: ${buildResponseTags(style, context.item).join(", ")}`,
    `- Second line: Spoiler level: ${style.spoilerSensitive || !allowsFullSpoilers(context) ? spoilerLevel : "Full spoilers allowed."}`,
    "- Separate sections with a blank line.",
    "- Use these exact section titles only when relevant: Answer, Key points, Best next step, Why, Watch out for, Differences, Best fit, More context, Follow-ups.",
    "",
    ...modeGuidance[style.mode].map((line) => `- ${line}`),
  ].join("\n")
}

function stripAssistantIntroFluff(value: string): string {
  return value
    .trim()
    .replace(/^(sure|absolutely|of course|definitely|certainly)[,!.\s]+/i, "")
    .replace(/^(here'?s (?:the )?(?:quick|short) answer)[\s:,-]+/i, "")
    .replace(/^(the (?:quick|short) answer is)[\s:,-]+/i, "")
    .trim()
}

function splitReplyIntoSentences(value: string): string[] {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (!cleaned) return []

  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function replyLooksStructured(value: string): boolean {
  return /(^|\n)(tags:|spoiler(?: level| status)?:|answer:?|key points:?|best next step:?|watch out for:?|differences:?|best fit:?|more context:?|follow-?ups?:)/im.test(value)
    || /^[-*•]\s+/m.test(value)
    || /^\d+\.\s+/m.test(value)
}

function normalizeAssistantReply(rawReply: string, style: ChatResponseStyle, context: ItemContext): string {
  const cleaned = stripAssistantIntroFluff(
    rawReply
      .replace(/^```(?:markdown|md|text)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim(),
  )

  const prefixLines = [
    `Tags: ${buildResponseTags(style, context.item).join(", ")}`,
    `Spoiler level: ${allowsFullSpoilers(context)
      ? "Full spoilers allowed."
      : `Safe through ${formatProgressLabel(context.progress) ?? "your current progress"}.`}`,
  ]

  if (replyLooksStructured(cleaned)) {
    const leadingLines: string[] = []

    if (!/^tags:/im.test(cleaned)) {
      leadingLines.push(prefixLines[0])
    }

    if (!/^spoiler(?: level| status)?:/im.test(cleaned)) {
      leadingLines.push(prefixLines[1])
    }

    return leadingLines.length > 0
      ? `${leadingLines.join("\n")}\n\n${cleaned}`.trim()
      : cleaned
  }

  const sentences = splitReplyIntoSentences(cleaned)
  if (sentences.length === 0) {
    return `${prefixLines.join("\n")}\n\nAnswer\n${cleaned}`.trim()
  }

  const answerSentences: string[] = []
  for (const sentence of sentences) {
    if (answerSentences.length >= 2) break
    const next = [...answerSentences, sentence].join(" ")
    if (answerSentences.length === 0 || next.length <= 180) {
      answerSentences.push(sentence)
    }
  }

  const answer = answerSentences.join(" ").trim()
  const remaining = sentences.slice(answerSentences.length)
  const sections: string[] = [`Answer\n${answer}`]

  if (remaining.length > 0) {
    sections.push(`Key points\n${remaining.slice(0, 3).map((sentence) => `- ${sentence}`).join("\n")}`)
  }

  if (remaining.length > 3) {
    sections.push(`More context\n${remaining.slice(3, 6).map((sentence) => `- ${sentence}`).join("\n")}`)
  }

  return `${prefixLines.join("\n")}\n\n${sections.join("\n\n")}`.trim()
}

function formatConversationMessages(messages: AIMessage[]): string {
  return messages.map((message) => `- ${message.role}: ${message.content}`).join("\n")
}

function buildDiscussionSystemPrompt(
  context: ItemContext,
  thread: AIConversationThreadRow,
  retrievedSnippets: string[],
  style: ChatResponseStyle,
): string {
  const progressText = context.progress
    ? `${context.progress.type ?? ""} ${context.progress.value ?? ""}${context.progress.confidence ? ` (${context.progress.confidence})` : ""}`.trim()
    : "Unknown"

  return [
    `You are a helpful discussion partner for "${context.item.title}" (${context.item.media_type}).`,
    context.item.description ? `\nDescription: ${context.item.description}` : "",
    "\nContext assembly rules:",
    "- Treat this as a topic-focused thread.",
    "- Use the shared item memory across threads only for durable preferences.",
    "- Do not assume facts from unrelated threads.",
    `\nUser's current progress: ${progressText}`,
    buildSpoilerLine(context),
    `\nShared item memory:\n${buildSharedMemoryText(context, style)}`,
    `\nCurrent thread title: ${thread.title}`,
    `\nCurrent thread spoiler scope: ${thread.spoiler_scope ?? buildThreadSpoilerScope(context)}`,
    thread.summary ? `\nCurrent thread summary:\n${thread.summary}` : "",
    retrievedSnippets.length > 0
      ? `\nRelevant older thread snippets:\n${retrievedSnippets.map((snippet) => `- ${snippet}`).join("\n")}`
      : "",
    `\nRecent notes:\n${buildNotesText(context.notes)}`,
    `\nRecent bookmarks:\n${buildBookmarksText(context.bookmarks)}`,
    `\nPreferred response mode: ${style.mode}`,
    `\n${buildResponseShapeGuide(style, context)}`,
    "\nBe conversational, insightful, low-interruption, and avoid spoilers past the user's progress.",
  ].filter(Boolean).join("\n")
}

function buildStableSuggestionPrompts(context: ItemContext): string[] {
  const progressLabel = formatProgressLabel(context.progress)

  if (context.item.status === "revisiting") {
    return sanitizePromptList([
      context.item.media_type === "book"
        ? "What stands out more on a reread?"
        : "What stands out more on a replay?",
      context.item.media_type === "book"
        ? "What should I notice more this time?"
        : "What should I focus on this run?",
    ])
  }

  return sanitizePromptList([
    progressLabel && progressLabel.length <= 28
      ? `Can you recap everything up to ${progressLabel}?`
      : "Can you recap the story so far?",
    context.item.media_type === "book"
      ? "Who matters most right now?"
      : "What should I pay attention to right now?",
  ])
}

function buildHeuristicSuggestionPrompts(context: ItemContext): string[] {
  const prompts: string[] = []
  const latestNote = clipText(context.notes[context.notes.length - 1]?.content)
  const latestBookmark = clipText(context.bookmarks[context.bookmarks.length - 1]?.title, 30)

  if (latestNote) {
    prompts.push(`How does "${latestNote}" connect so far?`)
  }

  if (latestBookmark) {
    prompts.push(`Why is "${latestBookmark}" worth remembering?`)
  }

  if (context.item.status === "revisiting") {
    prompts.push(
      context.item.media_type === "book"
        ? "What foreshadowing should I notice now?"
        : "What details are easier to appreciate now?",
      context.item.media_type === "book"
        ? "Which character reads differently this time?"
        : "What should I do differently this run?",
    )
  } else {
    prompts.push(
      context.item.media_type === "book"
        ? "What themes are emerging so far?"
        : "What earlier scene matters most right now?",
      context.item.media_type === "book"
        ? "What should I pay attention to next?"
        : "Which characters matter most right now?",
      "What should I pay attention to next?",
    )
  }

  return sanitizePromptList(prompts)
}

function mergeSuggestionPrompts(
  stablePrompts: string[],
  aiPrompts: string[],
  heuristicPrompts: string[],
): string[] {
  return sanitizePromptList([...stablePrompts, ...aiPrompts, ...heuristicPrompts]).slice(0, 4)
}

async function hashContext(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function getUserAIConfig(serviceClient: any, userId: string): Promise<UserAIConfig | null> {
  const { data, error } = await serviceClient
    .from("user_preferences")
    .select("ai_provider, ai_api_key")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as UserAIConfig | null
}

async function loadItemContext(
  serviceClient: any,
  userId: string,
  itemId: string,
): Promise<ItemContext | null> {
  const [itemRes, progressRes, notesRes, bookmarksRes, itemMemoryRes] = await Promise.all([
    serviceClient
      .from("items")
      .select("title, media_type, description, status")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle(),
    serviceClient
      .from("item_progress")
      .select("type, value, confidence, updated_at")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle(),
    serviceClient
      .from("item_notes")
      .select("content, created_at, updated_at")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .order("created_at"),
    serviceClient
      .from("item_bookmarks")
      .select("title, note, created_at, updated_at")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .order("created_at"),
    serviceClient
      .from("ai_item_memories")
      .select("spoiler_preference, response_style, durable_preferences, updated_at")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (itemRes.error) throw itemRes.error
  if (progressRes.error) throw progressRes.error
  if (notesRes.error) throw notesRes.error
  if (bookmarksRes.error) throw bookmarksRes.error
  if (itemMemoryRes.error && !isMissingRelationError(itemMemoryRes.error, "ai_item_memories")) {
    throw itemMemoryRes.error
  }

  if (!itemRes.data) return null

  return {
    item: itemRes.data as ItemSummary,
    progress: progressRes.data as ItemProgressRow | null,
    notes: (notesRes.data ?? []) as ItemNoteRow[],
    bookmarks: (bookmarksRes.data ?? []) as ItemBookmarkRow[],
    itemMemory: itemMemoryRes.error ? null : itemMemoryRes.data as AIItemMemoryRow | null,
  }
}

async function loadThread(
  serviceClient: any,
  userId: string,
  itemId: string,
  threadId: string,
): Promise<AIConversationThreadRow | null> {
  const { data, error } = await serviceClient
    .from("ai_conversation_threads")
    .select("*")
    .eq("id", threadId)
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as AIConversationThreadRow | null
}

async function loadLegacyConversation(
  serviceClient: any,
  userId: string,
  itemId: string,
): Promise<LegacyConversationRow | null> {
  const { data, error } = await serviceClient
    .from("ai_conversations")
    .select("*")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as LegacyConversationRow | null
}

async function createThread(
  serviceClient: any,
  userId: string,
  itemId: string,
  title: string,
  context: ItemContext,
): Promise<AIConversationThreadRow> {
  const now = new Date().toISOString()
  const { data, error } = await serviceClient
    .from("ai_conversation_threads")
    .insert({
      item_id: itemId,
      user_id: userId,
      title: normalizeThreadTitle(title),
      title_source: "auto",
      spoiler_scope: buildThreadSpoilerScope(context),
      messages: [],
      summary: null,
      summary_message_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as AIConversationThreadRow
}

async function updateThreadSummaryIfNeeded(
  serviceClient: any,
  prefs: UserAIConfig,
  thread: AIConversationThreadRow,
): Promise<AIConversationThreadRow> {
  if (!prefs.ai_provider || !prefs.ai_api_key) {
    return thread
  }

  const summaryTargetCount = Math.max(0, thread.messages.length - RECENT_THREAD_MESSAGE_LIMIT)
  if (summaryTargetCount <= thread.summary_message_count) {
    return thread
  }

  const unsummarized = thread.messages.slice(thread.summary_message_count, summaryTargetCount)
  if (thread.summary && unsummarized.length < SUMMARY_UPDATE_MIN_BATCH) {
    return thread
  }

  const summaryPrompt = [
    "Update the rolling summary for a single AI discussion thread.",
    "Preserve spoiler boundaries, decisions, user preferences, and unresolved questions.",
    thread.summary ? `Existing summary:\n${thread.summary}` : "",
    `New thread messages to fold in:\n${formatConversationMessages(unsummarized)}`,
    "Reply with only the updated summary text.",
  ].filter(Boolean).join("\n\n")

  const summaryReply = await callAI(
    prefs.ai_provider,
    prefs.ai_api_key,
    "You maintain concise summaries for topic-focused story discussion threads.",
    [{ role: "user", content: summaryPrompt, timestamp: new Date().toISOString() }],
    { maxTokens: 280, temperature: 0.2 },
  )

  const summary = summaryReply.trim()
  const summaryMessageCount = summaryTargetCount

  const { error } = await serviceClient
    .from("ai_conversation_threads")
    .update({
      summary,
      summary_message_count: summaryMessageCount,
    })
    .eq("id", thread.id)
    .eq("user_id", thread.user_id)

  if (error) throw error

  return {
    ...thread,
    summary,
    summary_message_count: summaryMessageCount,
  }
}

async function compactLegacyConversationIfNeeded(
  serviceClient: any,
  userId: string,
  itemId: string,
  prefs: UserAIConfig,
  conversation: LegacyConversationRow | null,
): Promise<LegacyConversationRow | null> {
  if (!conversation || !prefs.ai_provider || !prefs.ai_api_key) {
    return conversation
  }

  let messages = conversation.messages ?? []
  let summary = conversation.summary ?? null

  if (messages.length <= 20) {
    return conversation
  }

  const toSummarise = messages.slice(0, messages.length - 10)
  const recent = messages.slice(messages.length - 10)
  const summaryPrompt = [
    "Update the running summary of this discussion.",
    "Preserve key facts, decisions, and any spoiler-safe boundaries already established.",
    summary ? `Existing summary:\n${summary}` : "",
    `Messages to fold in:\n${formatConversationMessages(toSummarise)}`,
    "Reply with only the updated summary text.",
  ].filter(Boolean).join("\n\n")

  const summaryReply = await callAI(
    prefs.ai_provider,
    prefs.ai_api_key,
    "You maintain concise conversation summaries for story discussions.",
    [{ role: "user", content: summaryPrompt, timestamp: new Date().toISOString() }],
    { maxTokens: 300, temperature: 0.2 },
  )

  summary = summaryReply.trim()
  messages = recent

  const { data, error } = await serviceClient
    .from("ai_conversations")
    .upsert(
      { item_id: itemId, user_id: userId, messages, summary, updated_at: new Date().toISOString() },
      { onConflict: "item_id" },
    )
    .select("*")
    .single()

  if (error) throw error
  return data as LegacyConversationRow
}

async function handleLegacyChatMessage(
  serviceClient: any,
  userId: string,
  itemId: string,
  message: string,
  prefs: UserAIConfig,
  context: ItemContext,
): Promise<{ reply: string; thread: AIConversationThreadRow }> {
  const compacted = await compactLegacyConversationIfNeeded(
    serviceClient,
    userId,
    itemId,
    prefs,
    await loadLegacyConversation(serviceClient, userId, itemId),
  )
  const now = new Date().toISOString()
  const style = detectChatResponseStyle(message, context.item)
  const legacyThread = compacted
    ? mapLegacyConversationToThread(compacted, context)
    : {
        id: `legacy-${itemId}`,
        item_id: itemId,
        user_id: userId,
        title: "Discussion",
        title_source: "manual" as const,
        messages: [],
        summary: null,
        summary_message_count: 0,
        spoiler_scope: buildThreadSpoilerScope(context),
        created_at: now,
        updated_at: now,
      }

  const historyWithNew: AIMessage[] = [
    ...legacyThread.messages.slice(-RECENT_THREAD_MESSAGE_LIMIT),
    { role: "user", content: message, timestamp: now },
  ]

  const rawReply = await callAI(
    prefs.ai_provider!,
    prefs.ai_api_key!,
    buildDiscussionSystemPrompt(context, legacyThread, [], style),
    historyWithNew,
    {
      maxTokens: style.maxTokens,
      temperature: style.temperature,
    },
  )
  const reply = normalizeAssistantReply(rawReply, style, context)

  const updatedMessages: AIMessage[] = [
    ...legacyThread.messages,
    { role: "user", content: message, timestamp: now },
    { role: "assistant", content: reply, timestamp: now },
  ]

  const { data, error } = await serviceClient
    .from("ai_conversations")
    .upsert(
      {
        item_id: itemId,
        user_id: userId,
        messages: updatedMessages,
        summary: legacyThread.summary,
        updated_at: now,
      },
      { onConflict: "item_id" },
    )
    .select("*")
    .single()

  if (error) throw error

  return {
    reply,
    thread: mapLegacyConversationToThread(data as LegacyConversationRow, context),
  }
}

async function handleChatMessage(
  serviceClient: any,
  userId: string,
  itemId: string,
  threadId: string | undefined,
  message: string,
  prefs: UserAIConfig,
  context: ItemContext,
): Promise<{ reply: string; thread: AIConversationThreadRow }> {
  try {
    let thread = threadId
      ? await loadThread(serviceClient, userId, itemId, threadId)
      : null

    if (threadId && !thread) {
      throw new Error("Thread not found")
    }

    if (!thread) {
      thread = await createThread(serviceClient, userId, itemId, generateThreadTitle(message, context.item), context)
    }

    thread = await updateThreadSummaryIfNeeded(serviceClient, prefs, thread)

    const now = new Date().toISOString()
    const style = detectChatResponseStyle(message, context.item)
    const recentMessages = thread.messages.slice(-RECENT_THREAD_MESSAGE_LIMIT)
    const retrievedSnippets = retrieveRelevantOlderThreadSnippets(thread, message)

    const historyWithNew: AIMessage[] = [
      ...recentMessages,
      { role: "user", content: message, timestamp: now },
    ]

    const rawReply = await callAI(
      prefs.ai_provider!,
      prefs.ai_api_key!,
      buildDiscussionSystemPrompt(context, thread, retrievedSnippets, style),
      historyWithNew,
      {
        maxTokens: style.maxTokens,
        temperature: style.temperature,
      },
    )
    const reply = normalizeAssistantReply(rawReply, style, context)

    const updatedMessages: AIMessage[] = [
      ...thread.messages,
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: reply, timestamp: now },
    ]
    const nextThreadTitle = thread.title_source === "manual"
      ? thread.title
      : normalizeThreadTitle(thread.title === "New thread" ? generateThreadTitle(message, context.item) : thread.title)
    const spoilerScope = buildThreadSpoilerScope(context)

    const { data, error } = await serviceClient
      .from("ai_conversation_threads")
      .update({
        title: nextThreadTitle,
        title_source: thread.title_source,
        messages: updatedMessages,
        summary: thread.summary,
        summary_message_count: thread.summary_message_count,
        spoiler_scope: spoilerScope,
        updated_at: now,
      })
      .eq("id", thread.id)
      .eq("user_id", userId)
      .select("*")
      .single()

    if (error) throw error

    return {
      reply,
      thread: data as AIConversationThreadRow,
    }
  } catch (error) {
    if (isMissingRelationError(error, "ai_conversation_threads")) {
      return handleLegacyChatMessage(serviceClient, userId, itemId, message, prefs, context)
    }

    throw error
  }
}

async function readPromptSuggestionCache(
  serviceClient: any,
  userId: string,
  itemId: string,
  contextHash: string,
): Promise<string[] | null> {
  const { data, error } = await serviceClient
    .from("ai_prompt_suggestions")
    .select("prompts")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .eq("context_hash", contextHash)
    .maybeSingle()

  if (error) {
    console.error("prompt suggestion cache read error:", error)
    return null
  }

  return sanitizePromptList(Array.isArray(data?.prompts) ? data.prompts : [])
}

async function writePromptSuggestionCache(
  serviceClient: any,
  userId: string,
  itemId: string,
  contextHash: string,
  prompts: string[],
): Promise<void> {
  const { error } = await serviceClient
    .from("ai_prompt_suggestions")
    .upsert(
      {
        item_id: itemId,
        user_id: userId,
        context_hash: contextHash,
        prompts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id,context_hash" },
    )

  if (error) {
    console.error("prompt suggestion cache write error:", error)
  }
}

function buildPromptSuggestionPrompt(context: ItemContext, stablePrompts: string[]): string {
  const progressLabel = formatProgressLabel(context.progress) ?? "Unknown"

  return [
    "Generate exactly 2 additional suggested discussion prompts for this user.",
    `Title: ${context.item.title}`,
    `Type: ${context.item.media_type}`,
    `Status: ${context.item.status ?? "unknown"}`,
    `Progress: ${progressLabel}`,
    buildSpoilerLine(context),
    "",
    `Shared item memory:\n${buildSharedMemoryText(context)}`,
    "",
    `User notes:\n${buildNotesText(context.notes)}`,
    "",
    `Saved links:\n${buildBookmarksText(context.bookmarks)}`,
    "",
    `Stable prompts already covered:\n${stablePrompts.map((prompt) => `- ${prompt}`).join("\n")}`,
    "",
    "Requirements:",
    "- Return JSON only in the shape {\"prompts\":[\"...\",\"...\"]}.",
    "- Keep each prompt to one sentence.",
    "- Keep them short and clickable.",
    "- Avoid spoilers beyond the current progress unless the status is revisiting.",
    "- Prefer specific people, themes, places, or events already introduced.",
    "- Avoid repeating the stable prompts or recent discussion phrasing.",
  ].join("\n")
}

function parsePromptSuggestionResponse(reply: string): string[] {
  const cleaned = reply
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return sanitizePromptList(parsed)
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.prompts)) {
      return sanitizePromptList(parsed.prompts)
    }
  } catch {
    // Fall back to line parsing below.
  }

  return sanitizePromptList(cleaned.split("\n"))
}

async function generatePromptSuggestionsFromAI(
  prefs: UserAIConfig,
  context: ItemContext,
  stablePrompts: string[],
): Promise<string[]> {
  if (!prefs.ai_provider || !prefs.ai_api_key) {
    return []
  }

  const reply = await callAI(
    prefs.ai_provider,
    prefs.ai_api_key,
    "You generate spoiler-safe suggested prompts for story discussions.",
    [{
      role: "user",
      content: buildPromptSuggestionPrompt(context, stablePrompts),
      timestamp: new Date().toISOString(),
    }],
    { maxTokens: 220, temperature: 0.7 },
  )

  return parsePromptSuggestionResponse(reply).slice(0, 2)
}

async function handlePromptSuggestions(
  serviceClient: any,
  userId: string,
  itemId: string,
  forceRefresh: boolean,
): Promise<PromptSuggestionResult | null> {
  const context = await loadItemContext(serviceClient, userId, itemId)
  if (!context) return null

  const stablePrompts = buildStableSuggestionPrompts(context)
  const heuristicPrompts = buildHeuristicSuggestionPrompts(context)
  const contextHash = await hashContext(JSON.stringify({
    item: context.item,
    progress: context.progress,
    itemMemory: context.itemMemory,
    notes: context.notes,
    bookmarks: context.bookmarks,
  }))

  if (!forceRefresh) {
    const cachedPrompts = await readPromptSuggestionCache(serviceClient, userId, itemId, contextHash)
    if (cachedPrompts && cachedPrompts.length > 0) {
      return {
        prompts: mergeSuggestionPrompts(stablePrompts, [], cachedPrompts),
        cached: true,
      }
    }
  }

  const prefs = await getUserAIConfig(serviceClient, userId)
  let aiPrompts: string[] = []

  try {
    aiPrompts = await generatePromptSuggestionsFromAI(prefs ?? { ai_provider: null, ai_api_key: null }, context, stablePrompts)
  } catch (error) {
    console.error("prompt suggestion generation error:", error)
  }

  const prompts = mergeSuggestionPrompts(stablePrompts, aiPrompts, heuristicPrompts)
  await writePromptSuggestionCache(serviceClient, userId, itemId, contextHash, prompts)

  return {
    prompts,
    cached: false,
  }
}

async function callAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
  options: CallAIOptions = {},
): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, systemPrompt, messages, options)
    case "anthropic":
      return callAnthropic(apiKey, systemPrompt, messages, options)
    case "gemini":
      return callGemini(apiKey, systemPrompt, messages, options)
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
  options: CallAIOptions,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      max_tokens: options.maxTokens ?? 1024,
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
  options: CallAIOptions,
): Promise<string> {
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
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      max_tokens: options.maxTokens ?? 1024,
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
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

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: AIMessage[],
  options: CallAIOptions,
): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `${systemPrompt}\n\nBegin conversation.` }] },
    { role: "model", parts: [{ text: "Understood. I'm ready to help." }] },
    ...messages.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    })),
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 1024,
          ...(options.temperature != null ? { temperature: options.temperature } : {}),
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}
