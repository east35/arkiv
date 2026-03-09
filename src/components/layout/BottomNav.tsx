import { Link, useLocation } from "react-router-dom"
import { LayoutGrid, Gamepad2, BookOpen, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const location = useLocation()

  const items = [
    { to: "/", icon: LayoutGrid, label: "Home" },
    { to: "/games", icon: Gamepad2, label: "Games" },
    { to: "/books", icon: BookOpen, label: "Books" },
    { to: "/statistics", icon: BarChart3, label: "Stats" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
