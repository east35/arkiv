import type { MediaType } from "@/types"

const PROMPTS: Record<MediaType, string[]> = {
  game: [
    "Tell me everything that's happened so far.",
    "Remind me who the main characters are.",
    "What strategies should I know about?",
    "Catch me up on the key lore details.",
  ],
  book: [
    "Summarize the story so far.",
    "Remind me who the main characters are.",
    "What themes are emerging in the story?",
    "What are the key plot points I should remember?",
  ],
}

interface AIPromptSuggestionsProps {
  mediaType: MediaType
  onSelect: (prompt: string) => void
}

export function AIPromptSuggestions({ mediaType, onSelect }: AIPromptSuggestionsProps) {
  const prompts = PROMPTS[mediaType].slice(0, 2)

  return (
    <div className="divide-y divide-border/60 border rounded-sm overflow-hidden">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left bg-background/50 hover:bg-accent/40 transition-colors cursor-pointer"
        >
          <img
            src="/logo/arkiv-icon-white.svg"
            alt=""
            className="h-4 w-4 shrink-0 opacity-40"
          />
          <span className="text-sm text-muted-foreground">{prompt}</span>
        </button>
      ))}
    </div>
  )
}
