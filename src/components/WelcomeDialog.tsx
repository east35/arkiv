import { useState, useEffect } from "react";
import { IconBook, IconDeviceGamepad2, IconChartBar, IconSparkles, IconBrandSteam } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "arkiv-welcome-seen";

interface WelcomeDialogProps {
  userId: string;
}

export function WelcomeDialog({ userId }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
    if (!seen) setOpen(true);
  }, [userId]);

  function dismiss() {
    localStorage.setItem(`${STORAGE_KEY}-${userId}`, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Arkiv</DialogTitle>
          <DialogDescription>
            Your personal library for books and games.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Here's what's ready to use today:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <IconBook className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Books</p>
                <p className="text-xs text-muted-foreground">Track reading progress, scores, and notes. Metadata powered by Hardcover.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <IconDeviceGamepad2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Games</p>
                <p className="text-xs text-muted-foreground">Log playtime, statuses, and ratings. Metadata powered by IGDB.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <IconChartBar className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Activity & Stats</p>
                <p className="text-xs text-muted-foreground">See your reading and gaming history, top-rated titles, and taste profile.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <IconSparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Arkiv.AI</p>
                <p className="text-xs text-muted-foreground">Ask questions about your library, get recommendations, and more.</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Coming soon</p>
            <div className="flex items-start gap-3">
              <IconSparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Anthropic support</p>
                <p className="text-xs text-muted-foreground">Arkiv.AI is available today via OpenAI. Anthropic (Claude) support is coming soon.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <IconBrandSteam className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Steam Integration</p>
                <p className="text-xs text-muted-foreground">Import your library and playtime automatically from Steam.</p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={dismiss} className="w-full">
          Get started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
