import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileFabProps {
  onClick: () => void
  icon: ReactNode
  label: string
  bottom?: string
  navVisible?: boolean
  hiddenClassName?: string
  containerClassName?: string
  buttonClassName?: string
}

export function MobileFab({
  onClick,
  icon,
  label,
  bottom = "5rem",
  navVisible,
  hiddenClassName = "md:hidden",
  containerClassName,
  buttonClassName,
}: MobileFabProps) {
  return (
    <div
      className={cn(
        hiddenClassName,
        "fixed right-4 z-50 transition-transform duration-200 ease-out",
        navVisible === false && "translate-y-16",
        containerClassName
      )}
      style={{ bottom }}
    >
      <Button
        size="icon"
        className={cn("h-14 w-14", buttonClassName)}
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        {icon}
      </Button>
    </div>
  )
}
