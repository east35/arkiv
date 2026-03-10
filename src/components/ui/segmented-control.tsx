import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SegmentedControlSize = "default" | "sm"

interface SegmentedControlItem {
  value: string
  label?: ReactNode
  icon?: React.ComponentType<{ className?: string }>
  ariaLabel?: string
}

interface SegmentedControlProps {
  value: string
  onValueChange: (value: string) => void
  items: SegmentedControlItem[]
  size?: SegmentedControlSize
  fullWidth?: boolean
  className?: string
  listClassName?: string
  triggerClassName?: string
}

export function SegmentedControl({
  value,
  onValueChange,
  items,
  size = "default",
  fullWidth = false,
  className,
  listClassName,
  triggerClassName,
}: SegmentedControlProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className={cn(fullWidth && "w-full", size === "sm" ? "h-9" : "h-11", listClassName)}>
        {items.map(({ value: itemValue, label, icon: Icon, ariaLabel }) => {
          const iconOnly = Boolean(Icon) && !label

          return (
            <TabsTrigger
              key={itemValue}
              value={itemValue}
              aria-label={ariaLabel}
              title={typeof label === "string" ? label : ariaLabel}
              className={cn(
                size === "sm" ? "h-7 px-3 text-sm" : "h-9 text-sm",
                fullWidth ? "flex-1" : "flex-initial",
                iconOnly && "w-9 px-0",
                triggerClassName
              )}
            >
              {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
              {label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
