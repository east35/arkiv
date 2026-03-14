import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { IconArrowLeft, IconEdit, IconFlag } from "@tabler/icons-react";
import { statusIcons } from "@/components/status-icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { FullItem, Status } from "@/types";

interface ItemDetailHeaderProps {
  backLabel: string | null;
  item?: FullItem;
  onStatusClick?: () => void;
  desktopAction?: ReactNode;
  activeTab?: "overview" | "notes";
  onTabChange?: (tab: "overview" | "notes") => void;
}

const statusBg: Record<Status, string> = {
  in_library: "bg-zinc-300 text-zinc-950",
  backlog: "bg-purple-500 text-purple-950",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-green-950",
  paused: "bg-yellow-400 text-yellow-950",
  dropped: "bg-red-500 text-red-950",
};

export function ItemDetailHeader({
  backLabel,
  item,
  onStatusClick,
  desktopAction,
  activeTab,
  onTabChange,
}: ItemDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className="sticky top-0 z-20 flex items-stretch bg-background"
      style={{ height: "55px" }}
    >
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-4 sm:px-6 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors shrink-0"
      >
        <IconArrowLeft className="h-5 w-5" />
        <span>{backLabel ? `Back to ${backLabel}` : "Back"}</span>
      </button>

      {/* Center: Overview / Notes tabs */}
      {activeTab && onTabChange && (
        <div className="hidden md:flex flex-1 items-center justify-end">
          <SegmentedControl
            value={activeTab}
            onValueChange={(v) => onTabChange(v as "overview" | "notes")}
            items={[
              { value: "overview", label: "Overview", ariaLabel: "Overview" },
              { value: "notes", label: "Notes", ariaLabel: "Notes" },
            ]}
          />
        </div>
      )}

      {/* Right: status button / custom action */}
      {desktopAction ??
        (item && onStatusClick ? (
          <button
            onClick={onStatusClick}
            className={cn(
              "hidden md:flex items-center self-stretch px-5 gap-3 text-sm font-semibold transition-opacity hover:opacity-90 shrink-0",
              statusBg[item.status],
            )}
          >
            {item.status === "completed" ? (
              <IconFlag className="h-4 w-4" />
            ) : (
              statusIcons[item.status]
            )}
            <span>
              {item.status
                .replace("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            <div className="h-5 w-px bg-white/30" />
            <IconEdit className="h-4 w-4" />
          </button>
        ) : null)}
    </div>
  );
}
