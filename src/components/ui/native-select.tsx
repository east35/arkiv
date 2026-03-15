import * as React from "react"
import { cn } from "@/lib/utils"

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
  wrapperClassName?: string
  icon?: React.ReactNode
  variant?: "default" | "detail"
}

export function NativeSelect({
  onValueChange,
  onChange,
  className,
  wrapperClassName,
  icon,
  variant = "default",
  children,
  ...props
}: NativeSelectProps) {
  const baseClassName =
    "h-11 min-h-[44px] w-full appearance-none py-2 pr-8 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"

  const variantClassName = variant === "detail"
    ? "bg-[#F1F1F1] hover:bg-[#D5D5D5] dark:bg-[#262626] dark:hover:bg-[#262626]"
    : "bg-[#F1F1F1] hover:bg-[#D5D5D5] dark:bg-[#171717] dark:hover:bg-[#252525]"

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(e.target.value)
    onChange?.(e)
  }

  if (icon) {
    return (
      <div className={cn("relative flex items-center", wrapperClassName)}>
        <span className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <select
          onChange={handleChange}
          className={cn(
            baseClassName,
            variantClassName,
            "pl-9",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-2.5 flex items-center text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </div>
    )
  }

  return (
    <div className={cn("relative flex items-center", wrapperClassName)}>
      <select
        onChange={handleChange}
        className={cn(
          baseClassName,
          variantClassName,
          "pl-3",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 flex items-center text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </span>
    </div>
  )
}
