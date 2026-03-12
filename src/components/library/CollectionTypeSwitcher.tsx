import { useNavigate } from "react-router-dom"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { MediaType } from "@/types"

const collectionTabs: { type: MediaType; label: string; href: string }[] = [
  { type: "game", label: "Games", href: "/games" },
  { type: "book", label: "Books", href: "/books" },
]

interface CollectionTypeSwitcherProps {
  value: MediaType
  className?: string
  onValueChange?: (value: MediaType) => void
}

export function CollectionTypeSwitcher({ value, className, onValueChange }: CollectionTypeSwitcherProps) {
  const navigate = useNavigate()

  return (
    <SegmentedControl
      value={value}
      onValueChange={(nextValue) => {
        const nextType = nextValue as MediaType
        if (onValueChange) {
          onValueChange(nextType)
          return
        }
        const next = collectionTabs.find((tab) => tab.type === nextType)
        if (next) navigate(next.href)
      }}
      items={collectionTabs.map((tab) => ({
        value: tab.type,
        label: tab.label,
        ariaLabel: tab.label,
      }))}
      fullWidth
      className={className}
      listClassName="!p-0 !gap-0 !border-0 !h-[55px]"
      triggerClassName="!h-[55px] font-semibold text-sm"
    />
  )
}
