import { IconLoader2 } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  className?: string
  spinnerClassName?: string
  routeBlocking?: boolean
}

export function LoadingState({
  className,
  spinnerClassName,
  routeBlocking = true,
}: LoadingStateProps) {
  return (
    <div
      className={cn("flex items-center justify-center h-64", className)}
      data-route-loading={routeBlocking ? "true" : undefined}
    >
      <IconLoader2 className={cn("h-8 w-8 animate-spin text-muted-foreground", spinnerClassName)} />
    </div>
  )
}
