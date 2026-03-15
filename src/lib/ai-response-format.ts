export type AIResponseMode =
  | "default"
  | "quick-clarification"
  | "strategy"
  | "lore"
  | "comparison"

export interface AIResponseSection {
  title: string
  kind: "paragraph" | "bullets" | "steps" | "callout"
  content?: string
  items?: string[]
  tone?: "default" | "accent" | "warning"
}

export interface ParsedAIResponse {
  answer: string
  mode: AIResponseMode
  tags: string[]
  spoilerLevel: string | null
  primarySections: AIResponseSection[]
  detailSections: AIResponseSection[]
  followUps: string[]
}

const INTRO_FLUFF_PATTERNS = [
  /^(sure|absolutely|of course|definitely|certainly)[,!.\s]+/i,
  /^(here'?s (?:the )?(?:quick|short) answer)[\s:,-]+/i,
  /^(the (?:quick|short) answer is)[\s:,-]+/i,
  /^(in short|briefly|basically|short version)[\s:,-]+/i,
]

const TITLE_ALIASES: Record<string, string> = {
  answer: "Answer",
  takeaway: "Answer",
  "quick answer": "Answer",
  "short answer": "Answer",
  summary: "Answer",
  "key points": "Key points",
  "key point": "Key points",
  points: "Key points",
  "best next step": "Best next step",
  why: "Why",
  "watch out for": "Watch out for",
  differences: "Differences",
  comparison: "Differences",
  "best fit": "Best fit",
  "more context": "More context",
  details: "More context",
  "optional details": "More context",
  "why this matters": "Why this matters",
  "deeper analysis": "More context",
  followups: "Follow-ups",
  "follow-ups": "Follow-ups",
  "follow up": "Follow-ups",
  "follow-up": "Follow-ups",
  important: "Important",
  "spoiler level": "Spoiler level",
  spoilers: "Spoiler level",
  "spoiler status": "Spoiler level",
}

const DETAIL_SECTION_TITLES = new Set(["More context", "Why this matters"])

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

function stripCodeFences(value: string): string {
  return value
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/, "")
}

function stripIntroFluff(value: string): string {
  let trimmed = value.trim()

  for (const pattern of INTRO_FLUFF_PATTERNS) {
    trimmed = trimmed.replace(pattern, "")
  }

  return trimmed.trim()
}

function splitIntoSentences(value: string): string[] {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (!cleaned) return []

  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function cleanListItem(value: string): string {
  return value
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^>\s+/, "")
    .trim()
}

function parseTags(value: string): string[] {
  return value
    .split(/,|\|/)
    .flatMap((part) => part.split(/\]\s*\[/))
    .map((part) => part.replace(/^\[|\]$/g, "").trim())
    .filter(Boolean)
}

function canonicalizeTitle(rawTitle: string): string {
  const normalized = rawTitle
    .trim()
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase()

  return TITLE_ALIASES[normalized] ?? rawTitle.trim().replace(/:$/, "")
}

function inferSectionTone(title: string): "default" | "accent" | "warning" {
  if (title === "Best next step") return "accent"
  if (title === "Watch out for" || title === "Important") return "warning"
  return "default"
}

function buildSection(title: string, rawLines: string[]): AIResponseSection | null {
  const lines = rawLines.map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const bulletLike = lines.every((line) => /^[-*•]\s+/.test(line))
  const stepLike = lines.every((line) => /^\d+\.\s+/.test(line))
  const calloutLike = lines.every((line) => /^>\s*/.test(line))

  if (calloutLike) {
    return {
      title,
      kind: "callout",
      content: lines.map((line) => cleanListItem(line)).join(" "),
      tone: inferSectionTone(title),
    }
  }

  if (bulletLike || stepLike) {
    return {
      title,
      kind: stepLike ? "steps" : "bullets",
      items: lines.map((line) => cleanListItem(line)),
      tone: inferSectionTone(title),
    }
  }

  if (lines.length > 1 && lines.some((line) => /^[-*•]\s+|^\d+\.\s+/.test(line))) {
    return {
      title,
      kind: "bullets",
      items: lines.map((line) => cleanListItem(line)),
      tone: inferSectionTone(title),
    }
  }

  return {
    title,
    kind: "paragraph",
    content: lines.join(" "),
    tone: inferSectionTone(title),
  }
}

function parseStructuredBlocks(value: string): {
  sections: AIResponseSection[]
  tags: string[]
  spoilerLevel: string | null
} {
  const sections: AIResponseSection[] = []
  const tags: string[] = []
  let spoilerLevel: string | null = null

  const blocks = value.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd()).filter(Boolean)
    if (lines.length === 0) continue

    const firstLine = lines[0].trim()

    const tagsMatch = firstLine.match(/^tags:\s*(.+)$/i)
    if (tagsMatch) {
      tags.push(...parseTags(tagsMatch[1]))
      if (lines.length > 1) {
        const remainder = buildSection("Key points", lines.slice(1))
        if (remainder) sections.push(remainder)
      }
      continue
    }

    const spoilerMatch = firstLine.match(/^spoiler(?: level| status)?:\s*(.+)$/i)
    if (spoilerMatch) {
      spoilerLevel = spoilerMatch[1].trim()
      if (lines.length > 1) {
        const remainder = buildSection("Key points", lines.slice(1))
        if (remainder) sections.push(remainder)
      }
      continue
    }

    const inlineSectionMatch = firstLine.match(/^([A-Za-z][A-Za-z /-]{1,30}):\s*(.+)$/)
    if (inlineSectionMatch) {
      const title = canonicalizeTitle(inlineSectionMatch[1])
      const section = buildSection(title, [inlineSectionMatch[2], ...lines.slice(1)])
      if (section) sections.push(section)
      continue
    }

    const title = canonicalizeTitle(firstLine)
    if (title !== firstLine.replace(/:$/, "") && lines.length > 1) {
      const section = buildSection(title, lines.slice(1))
      if (section) sections.push(section)
      continue
    }

    if (/^[A-Za-z][A-Za-z /-]{1,30}:?$/.test(firstLine) && lines.length > 1 && TITLE_ALIASES[firstLine.toLowerCase().replace(/:$/, "")]) {
      const section = buildSection(canonicalizeTitle(firstLine), lines.slice(1))
      if (section) sections.push(section)
      continue
    }

    const bulletSection = buildSection("Key points", lines)
    if (bulletSection && (bulletSection.kind === "bullets" || bulletSection.kind === "steps" || bulletSection.kind === "callout")) {
      sections.push(bulletSection)
      continue
    }

    sections.push({
      title: sections.length === 0 ? "Answer" : "More context",
      kind: "paragraph",
      content: lines.join(" "),
      tone: sections.length === 0 ? "accent" : "default",
    })
  }

  return { sections, tags, spoilerLevel }
}

function mergeAdjacentSections(sections: AIResponseSection[]): AIResponseSection[] {
  const merged: AIResponseSection[] = []

  for (const section of sections) {
    const previous = merged.at(-1)

    if (
      previous
      && previous.title === section.title
      && (previous.kind === "bullets" || previous.kind === "steps")
      && (section.kind === "bullets" || section.kind === "steps")
    ) {
      previous.kind = previous.kind === section.kind ? previous.kind : "bullets"
      previous.items = dedupe([...(previous.items ?? []), ...(section.items ?? [])])
      continue
    }

    merged.push({
      ...section,
      items: section.items ? [...section.items] : undefined,
    })
  }

  return merged
}

function buildFallbackResponse(value: string): ParsedAIResponse {
  const cleaned = stripIntroFluff(value)
  const sentences = splitIntoSentences(cleaned)

  if (sentences.length === 0) {
    return {
      answer: cleaned,
      mode: "default",
      tags: ["Quick answer"],
      spoilerLevel: null,
      primarySections: [],
      detailSections: [],
      followUps: [],
    }
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

  const primarySections: AIResponseSection[] = []
  const detailSections: AIResponseSection[] = []

  if (remaining.length > 0) {
    primarySections.push({
      title: "Key points",
      kind: "bullets",
      items: remaining.slice(0, 3),
    })
  }

  if (remaining.length > 3) {
    detailSections.push({
      title: "More context",
      kind: "bullets",
      items: remaining.slice(3, 6),
    })
  }

  return {
    answer,
    mode: remaining.length <= 1 ? "quick-clarification" : "default",
    tags: [remaining.length <= 1 ? "Quick answer" : "Summary"],
    spoilerLevel: null,
    primarySections,
    detailSections,
    followUps: [],
  }
}

function inferMode(sections: AIResponseSection[], tags: string[], answer: string): AIResponseMode {
  const loweredTags = tags.map((tag) => tag.toLowerCase())
  const titles = sections.map((section) => section.title)

  if (loweredTags.some((tag) => tag.includes("strategy") || tag === "hint") || titles.includes("Best next step")) {
    return "strategy"
  }

  if (loweredTags.some((tag) => tag.includes("comparison")) || titles.includes("Differences") || titles.includes("Best fit")) {
    return "comparison"
  }

  if (loweredTags.some((tag) => tag.includes("lore") || tag.includes("theory"))) {
    return "lore"
  }

  if (answer.length <= 160 && titles.length <= 1) {
    return "quick-clarification"
  }

  return "default"
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(normalized)
  }

  return result
}

function defaultTagsForMode(mode: AIResponseMode): string[] {
  switch (mode) {
    case "quick-clarification":
      return ["Quick answer"]
    case "strategy":
      return ["Strategy", "Hint"]
    case "comparison":
      return ["Comparison"]
    case "lore":
      return ["Lore"]
    default:
      return ["Summary"]
  }
}

export function formatAIResponse(raw: string): ParsedAIResponse {
  const normalized = normalizeText(stripIntroFluff(stripCodeFences(raw)))
  if (!normalized) {
    return {
      answer: "",
      mode: "default",
      tags: [],
      spoilerLevel: null,
      primarySections: [],
      detailSections: [],
      followUps: [],
    }
  }

  const hasExplicitStructure = /(^|\n)(tags:|spoiler(?: level| status)?:|answer:?|key points:?|best next step:?|watch out for:?|differences:?|follow-?ups?:)/im.test(normalized)
    || /^[-*•]\s+/m.test(normalized)
    || /^\d+\.\s+/m.test(normalized)
    || normalized.includes("\n\n")

  if (!hasExplicitStructure && normalized.length > 240) {
    return buildFallbackResponse(normalized)
  }

  const parsed = parseStructuredBlocks(normalized)
  parsed.sections = mergeAdjacentSections(parsed.sections)

  let answer = ""
  const primarySections: AIResponseSection[] = []
  const detailSections: AIResponseSection[] = []
  let followUps: string[] = []

  for (const section of parsed.sections) {
    if (!answer && section.title === "Answer") {
      answer = section.content ?? section.items?.join(" ") ?? ""
      continue
    }

    if (section.title === "Follow-ups") {
      followUps = section.items ?? splitIntoSentences(section.content ?? "")
      continue
    }

    if (section.title === "Spoiler level" && !parsed.spoilerLevel) {
      parsed.spoilerLevel = section.content ?? section.items?.[0] ?? null
      continue
    }

    if (DETAIL_SECTION_TITLES.has(section.title)) {
      detailSections.push(section)
      continue
    }

    primarySections.push(section)
  }

  if (!answer) {
    const firstSection = primarySections.shift()
    if (firstSection) {
      if (firstSection.title === "Key points" || firstSection.title === "Follow-ups") {
        return buildFallbackResponse(normalized)
      }

      answer = firstSection.content ?? firstSection.items?.join(" ") ?? ""
      if (firstSection.title !== "Answer" && firstSection.title !== "Key points") {
        primarySections.unshift(firstSection)
      }
    }
  }

  if (!answer) {
    return buildFallbackResponse(normalized)
  }

  const fallback = buildFallbackResponse(normalized)
  const mode = inferMode([...primarySections, ...detailSections], parsed.tags, answer)
  const tags = dedupe(
    parsed.tags.length > 0
      ? parsed.tags
      : fallback.tags.length > 0
      ? fallback.tags
      : defaultTagsForMode(mode),
  )

  return {
    answer,
    mode,
    tags,
    spoilerLevel: parsed.spoilerLevel,
    primarySections: primarySections.length > 0 ? primarySections : fallback.primarySections,
    detailSections: detailSections.length > 0 ? detailSections : fallback.detailSections,
    followUps: dedupe(followUps).slice(0, 2),
  }
}
