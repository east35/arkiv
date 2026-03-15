import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatAIResponse,
  type AIResponseMode,
  type AIResponseSection,
} from "@/lib/ai-response-format"

function renderInlineText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }

    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function getAnswerLabel(mode: AIResponseMode): string {
  switch (mode) {
    case "quick-clarification":
      return "Quick answer"
    case "strategy":
      return "Best answer"
    case "comparison":
      return "Quick comparison"
    case "lore":
      return "Story answer"
    default:
      return "Answer"
  }
}

function getFallbackFollowUps(mode: AIResponseMode): string[] {
  switch (mode) {
    case "strategy":
      return ["What should I do after that?", "Give me the spoiler-free hint version."]
    case "comparison":
      return ["Which is the safer pick?", "Give me the shortest version."]
    case "lore":
      return ["Go one layer deeper.", "Which detail matters most later?"]
    case "quick-clarification":
      return ["Say it even shorter.", "Give me one more detail."]
    default:
      return ["What matters next?", "Give me the quick version only."]
  }
}

export function ResponseTagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="h-6 border-border/70 bg-background/70 px-2.5 text-[11px] tracking-[0.02em] text-muted-foreground"
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export function AnswerCallout({
  label,
  children,
  spoilerLevel,
}: {
  label: string
  children: ReactNode
  spoilerLevel?: string | null
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
        <div className="text-sm leading-6 text-foreground">{children}</div>
      </div>
      {spoilerLevel && (
        <blockquote className="rounded-lg border-l-2 border-primary/45 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Spoiler level:</span>{" "}
          {renderInlineText(spoilerLevel)}
        </blockquote>
      )}
    </div>
  )
}

export function KeyPointsList({
  items,
  ordered = false,
}: {
  items: string[]
  ordered?: boolean
}) {
  const ListTag = ordered ? "ol" : "ul"

  return (
    <ListTag
      className={cn(
        "space-y-1.5 pl-4 text-sm leading-6 text-muted-foreground",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {items.map((item) => (
        <li key={item}>{renderInlineText(item)}</li>
      ))}
    </ListTag>
  )
}

function CalloutSection({
  title,
  content,
  tone = "default",
}: {
  title: string
  content: string
  tone?: AIResponseSection["tone"]
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-2 px-3 py-2 text-sm leading-6",
        tone === "warning"
          ? "border-destructive/45 bg-destructive/5 text-foreground"
          : "border-primary/45 bg-primary/5 text-foreground",
      )}
    >
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      <div>{renderInlineText(content)}</div>
    </div>
  )
}

export function ResponseSection({ section }: { section: AIResponseSection }) {
  if (section.kind === "callout") {
    return (
      <CalloutSection
        title={section.title}
        content={section.content ?? section.items?.join(" ") ?? ""}
        tone={section.tone}
      />
    )
  }

  return (
    <section className="space-y-2 border-t border-border/50 pt-3 first:border-t-0 first:pt-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {section.title}
      </div>
      {section.kind === "paragraph" && section.content && (
        <p className="text-sm leading-6 text-muted-foreground">
          {renderInlineText(section.content)}
        </p>
      )}
      {(section.kind === "bullets" || section.kind === "steps") && section.items && (
        <KeyPointsList items={section.items} ordered={section.kind === "steps"} />
      )}
    </section>
  )
}

export function ExpandableDetails({
  children,
  title = "More context",
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <details className="group rounded-lg border border-border/60 bg-background/60">
      <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground/80 group-open:hidden">Tap to expand</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        {children}
      </div>
    </details>
  )
}

export function AIResponseMessage({
  content,
  showFollowUps = false,
  onFollowUp,
}: {
  content: string
  showFollowUps?: boolean
  onFollowUp?: (message: string) => void
}) {
  const parsed = formatAIResponse(content)
  const followUps = parsed.followUps.length > 0 ? parsed.followUps : getFallbackFollowUps(parsed.mode)

  return (
    <div className="w-full max-w-[42rem] space-y-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
      <ResponseTagRow tags={parsed.tags} />

      <AnswerCallout
        label={getAnswerLabel(parsed.mode)}
        spoilerLevel={parsed.spoilerLevel}
      >
        {renderInlineText(parsed.answer)}
      </AnswerCallout>

      {parsed.primarySections.length > 0 && (
        <div className="space-y-3">
          {parsed.primarySections.map((section) => (
            <ResponseSection key={`${section.title}-${section.content ?? section.items?.join("|") ?? ""}`} section={section} />
          ))}
        </div>
      )}

      {parsed.detailSections.length > 0 && (
        <ExpandableDetails>
          {parsed.detailSections.map((section) => (
            <ResponseSection key={`${section.title}-${section.content ?? section.items?.join("|") ?? ""}`} section={section} />
          ))}
        </ExpandableDetails>
      )}

      {showFollowUps && onFollowUp && followUps.length > 0 && (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ask follow-up
          </div>
          <div className="flex flex-wrap gap-2">
            {followUps.slice(0, 2).map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="xs"
                className="h-auto min-h-8 rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onFollowUp(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
