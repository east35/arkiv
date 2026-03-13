import { useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface AccordionSectionProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}

function AccordionSection({ title, icon: Icon, children, defaultOpen = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b last:border-0 px-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-base font-medium transition-all hover:underline text-left"
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
          isOpen ? "max-h-[1000px] opacity-100 mb-4" : "max-h-0 opacity-0"
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
  return <div className="border-t mt-6">{children}</div>
}

export { AccordionSection }
