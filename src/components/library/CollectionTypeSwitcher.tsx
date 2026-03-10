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
}

export function CollectionTypeSwitcher({ value, className }: CollectionTypeSwitcherProps) {
  const navigate = useNavigate()

  return (
    <SegmentedControl
      value={value}
      onValueChange={(nextValue) => {
        const next = collectionTabs.find((tab) => tab.type === nextValue)
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
      listClassName="rounded-full bg-card shadow-lg"
      triggerClassName="rounded-full py-2.5"
    />
  )
}
