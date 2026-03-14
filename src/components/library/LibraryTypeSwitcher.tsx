import { useNavigate } from "react-router-dom";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { MediaType } from "@/types";

const libraryTabs: { type: MediaType; label: string; href: string }[] = [
  { type: "game", label: "Games", href: "/games" },
  { type: "book", label: "Books", href: "/books" },
];

interface LibraryTypeSwitcherProps {
  value: MediaType;
  className?: string;
  onValueChange?: (value: MediaType) => void;
}

export function LibraryTypeSwitcher({
  value,
  className,
  onValueChange,
}: LibraryTypeSwitcherProps) {
  const navigate = useNavigate();

  return (
    <SegmentedControl
      value={value}
      onValueChange={(nextValue) => {
        const nextType = nextValue as MediaType;
        if (onValueChange) {
          onValueChange(nextType);
          return;
        }
        const next = libraryTabs.find((tab) => tab.type === nextType);
        if (next) navigate(next.href);
      }}
      items={libraryTabs.map((tab) => ({
        value: tab.type,
        label: tab.label,
        ariaLabel: tab.label,
      }))}
      fullWidth
      className={className}
      listClassName="!p-0 !gap-0 !border-0 !h-[55px]"
      triggerClassName="!h-[55px] font-semibold text-sm"
    />
  );
}
