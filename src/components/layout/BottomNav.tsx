import { Link, useLocation } from "react-router-dom"
import {
  IconLayoutGrid, IconLayoutGridFilled,
  IconDeviceGamepad2, IconDeviceGamepad2Filled,
  IconBook, IconBookFilled,
  IconChartPie2, IconChartPie2Filled,
  IconSettings, IconSettingsFilled,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const items = [
  { to: "/",           icon: IconLayoutGrid,    iconFilled: IconLayoutGridFilled,    label: "Home" },
  { to: "/games",      icon: IconDeviceGamepad2, iconFilled: IconDeviceGamepad2Filled, label: "Games" },
  { to: "/books",      icon: IconBook,           iconFilled: IconBookFilled,           label: "Books" },
  { to: "/statistics", icon: IconChartPie2,      iconFilled: IconChartPie2Filled,      label: "Stats" },
  { to: "/settings",   icon: IconSettings,       iconFilled: IconSettingsFilled,       label: "Settings" },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.to
          const Icon = isActive ? item.iconFilled : item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
