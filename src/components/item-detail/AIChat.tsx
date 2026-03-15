import { useEffect, useRef, useState } from "react";
import { IconSend, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AIConversation, AIMessage } from "@/types";

interface AIChatProps {
  conversation: AIConversation | null;
  loading: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void>;
  onRetry: () => void;
  fillHeight?: boolean;
  title?: string;
}

export function AIChat({
  conversation,
  loading,
  error,
  onSend,
  onRetry,
  fillHeight = false,
  title,
}: AIChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages: AIMessage[] = conversation?.messages ?? [];
  const userSentRef = useRef(false);

  useEffect(() => {
    if (!userSentRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    userSentRef.current = true;
    setInput("");
    await onSend(text);
  };

  return (
    <div className={fillHeight ? "flex flex-col flex-1 min-h-0" : "flex flex-col"}>
      {/* Message thread */}
      <div className={cn("space-y-2 overflow-y-auto p-4", fillHeight ? "flex-1 min-h-0" : "max-h-[400px]")}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <img src="/logo/arkiv-icon-black.svg" alt="" className="h-10 w-10 opacity-30 dark:hidden" />
            <img src="/logo/arkiv-icon-white.svg" alt="" className="h-10 w-10 opacity-30 hidden dark:block" />
            <p className="text-sm leading-relaxed max-w-[220px]">
              {title ? `Ready to discuss ${title} when you are…` : "Ready to discuss when you are…"}
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
      <div className="flex items-end gap-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this title…"
          className="min-h-[88px] flex-1 resize-none text-sm"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={loading || !input.trim()}
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
  );
}
