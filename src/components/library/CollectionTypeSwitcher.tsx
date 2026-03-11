import type { ComponentType } from "react"
import { IconBook, IconDeviceGamepad2 } from "@tabler/icons-react"
import { useNavigate } from "react-router-dom"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { MediaType } from "@/types"

const collectionTabs: {
  type: MediaType
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { type: "game", label: "Games", href: "/games", icon: IconDeviceGamepad2 },
  { type: "book", label: "Books", href: "/books", icon: IconBook },
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
        icon: tab.icon,
        ariaLabel: tab.label,
      }))}
      fullWidth
      className={className}
      listClassName="rounded-full bg-card shadow-lg !h-[38px] !p-0.5 !gap-0.5"
      triggerClassName="!h-[34px] !rounded-full !px-4 !py-0 !leading-none"
    />
  )
}
