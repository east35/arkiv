import { useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface AccordionSectionProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  contentClassName?: string
}

function AccordionSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  contentClassName,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border/60 px-4 last:border-0 bg-muted">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold tracking-[-0.01em] transition-colors hover:text-foreground/80"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
          {title}
        </span>
        <IconChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] pb-4 opacity-100" : "max-h-0 opacity-0",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface MobileAccordionProps {
  children: React.ReactNode
}

export function MobileAccordion({ children }: MobileAccordionProps) {
  return <div className="mt-6 border-t border-border/60 bg-muted pb-28">{children}</div>
}

export { AccordionSection }
