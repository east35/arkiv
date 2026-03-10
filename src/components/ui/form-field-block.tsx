import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldBlockProps {
  id?: string
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function FormFieldBlock({
  id,
  label,
  description,
  error,
  className,
  children,
}: FormFieldBlockProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
