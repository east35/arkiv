import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center text-muted-foreground", className)}>
      {icon && <div className="mb-4 opacity-20">{icon}</div>}
      <p className={cn("text-lg font-medium mb-1", titleClassName)}>{title}</p>
      {description && <p className={cn("text-sm", descriptionClassName)}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
