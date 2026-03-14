import { useEffect, useRef, useState } from "react"
import { IconSend, IconLoader2, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AIConversation, AIMessage } from "@/types"

interface AIChatProps {
  conversation: AIConversation | null
  loading: boolean
  error: string | null
  onSend: (message: string) => Promise<void>
  onRetry: () => void
}

export function AIChat({ conversation, loading, error, onSend, onRetry }: AIChatProps) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages: AIMessage[] = conversation?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    await onSend(text)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">AI Discussion</h3>

      {/* Message thread */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Ask anything about this title — the AI respects your progress boundary and won't spoil what's ahead.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
              <IconLoader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button size="icon-sm" variant="ghost" onClick={onRetry}>
              <IconRefresh className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this title…"
          className="resize-none min-h-[60px] text-sm flex-1"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="self-end shrink-0"
        >
          {loading ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconSend className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
