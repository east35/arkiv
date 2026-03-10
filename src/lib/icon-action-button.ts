import { cva } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const iconActionButtonVariants = cva(buttonVariants({ variant: "ghost", size: "icon" }), {
  variants: {
    size: {
      sm: "h-7 w-7",
      md: "h-8 w-8",
      lg: "h-9 w-9",
    },
    tone: {
      default: "",
      subtle: "bg-background/50 backdrop-blur-sm hover:bg-background/80",
      inverse: "bg-black/60 text-white hover:bg-black/80 hover:text-white border-0",
    },
    shape: {
      default: "",
      circle: "rounded-full",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "default",
    shape: "default",
  },
})

type IconActionOptions = {
  size?: "sm" | "md" | "lg"
  tone?: "default" | "subtle" | "inverse"
  shape?: "default" | "circle"
  className?: string
}

export function iconActionButtonClassName(options?: IconActionOptions) {
  const { className, ...variants } = options ?? {}
  return cn(iconActionButtonVariants(variants), className)
}
