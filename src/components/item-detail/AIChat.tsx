import { useEffect, useRef, useState } from "react"
import { IconLoader2, IconRefresh, IconSend } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AIConversationThread, AIMessage } from "@/types"
import { AIResponseMessage } from "./AIResponseMessage"
import { AIThreadList } from "./AIThreadList"

interface AIChatProps {
  threads: AIConversationThread[]
  activeThread: AIConversationThread | null
  supportsThreading?: boolean
  loading: boolean
  threadLoading?: boolean
  error: string | null
  onSend: (message: string) => Promise<void>
  onRetry: () => void
  onCreateThread: () => Promise<void>
  onSelectThread: (threadId: string) => void
  onRenameThread: (threadId: string, title: string) => Promise<void>
  onDeleteThread: (threadId: string) => Promise<void>
  fillHeight?: boolean
  title?: string
}

export function AIChat({
  threads,
  activeThread,
  supportsThreading = true,
  loading,
  threadLoading = false,
  error,
  onSend,
  onRetry,
  onCreateThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
  fillHeight = false,
  title,
}: AIChatProps) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages: AIMessage[] = activeThread?.messages ?? []
  const userSentRef = useRef(false)

  useEffect(() => {
    if (!userSentRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, loading])

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    userSentRef.current = true
    if (!overrideText) {
      setInput("")
    }
    await onSend(text)
  }

  return (
    <div className={fillHeight ? "flex flex-1 min-h-0 flex-col" : "flex flex-col"}>
      {supportsThreading && (
        <AIThreadList
          threads={threads}
          activeThreadId={activeThread?.id ?? null}
          disabled={loading || threadLoading}
          onCreateThread={onCreateThread}
          onSelectThread={onSelectThread}
          onRenameThread={onRenameThread}
          onDeleteThread={onDeleteThread}
        />
      )}

      <div
        className={cn(
          "space-y-2 overflow-y-auto p-4",
          fillHeight ? "flex flex-1 min-h-0 flex-col" : "max-h-[400px]",
        )}
      >
        {messages.length === 0 && !loading && (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 text-center text-muted-foreground",
              fillHeight ? "flex-1 min-h-0" : "py-16",
            )}
          >
            <img src="/logo/arkiv-icon-black.svg" alt="" className="h-10 w-10 opacity-30 dark:hidden" />
            <img src="/logo/arkiv-icon-white.svg" alt="" className="hidden h-10 w-10 opacity-30 dark:block" />
            <p className="text-sm leading-relaxed max-w-[220px]">
              {activeThread
                ? `This thread is ready when you are${activeThread.title ? `: ${activeThread.title}` : ""}.`
                : title
                ? `Ready to discuss ${title} when you are…`
                : "Ready to discuss when you are…"}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end pt-6" : "justify-start",
            )}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed bg-primary text-primary-foreground">
                {msg.content}
              </div>
            ) : (
              <AIResponseMessage
                content={msg.content}
                showFollowUps={i === messages.length - 1 && !loading}
                onFollowUp={(followUp) => {
                  void handleSend(followUp)
                }}
              />
            )}
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
      <div className="flex items-end gap-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this title…"
          className="min-h-[88px] flex-1 resize-none text-sm bg-[#f5f5f5] dark:bg-[#262626]"
          disabled={loading || threadLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSend()
            }
          }}
        />
        <Button
          size="icon"
          onClick={() => {
            void handleSend()
          }}
          disabled={loading || threadLoading || !input.trim()}
          className="max-md:self-stretch max-md:h-auto md:w-[52px] md:h-[52px] shrink-0 border-0 rounded-none flex items-center justify-center"
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
