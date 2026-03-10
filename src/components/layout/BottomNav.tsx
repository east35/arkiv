import { useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  IconLayoutGrid, IconLayoutGridFilled,
  IconChartPie2, IconChartPie2Filled,
  IconSettings, IconSettingsFilled,
  IconListDetails, IconListDetailsFilled,
  IconBooks,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const collectionRoutes = ["/books", "/games"]
const LAST_COLLECTION_KEY = "arkiv:lastCollection"

interface BottomNavProps {
  visible?: boolean
}

export function BottomNav({ visible = true }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const isCollectionActive = collectionRoutes.includes(location.pathname)

  // Persist the last visited collection route
  useEffect(() => {
    if (isCollectionActive) {
      localStorage.setItem(LAST_COLLECTION_KEY, location.pathname)
    }
  }, [location.pathname, isCollectionActive])

  const handleCollectionTap = () => {
    const last = localStorage.getItem(LAST_COLLECTION_KEY) ?? "/games"
    navigate(last)
  }

  const navItems = [
    { to: "/",           icon: IconLayoutGrid,    iconFilled: IconLayoutGridFilled,   label: "Home" },
    { to: "/lists",      icon: IconListDetails,   iconFilled: IconListDetailsFilled,  label: "Lists" },
    { to: "/statistics", icon: IconChartPie2,     iconFilled: IconChartPie2Filled,    label: "Stats" },
    { to: "/settings",   icon: IconSettings,      iconFilled: IconSettingsFilled,     label: "Settings" },
  ]

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-safe transition-transform duration-200 ease-out",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      )}
    >
      <div className="flex items-center justify-around h-16">

        {/* Home */}
        {navItems.slice(0, 1).map((item) => {
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

        {/* Collection — navigates to last visited, defaults to /games */}
        <button
          onClick={handleCollectionTap}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1",
            isCollectionActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconBooks className="h-5 w-5" />
          <span className="text-[10px] font-medium">Collection</span>
        </button>

        {/* Lists, Stats, Settings */}
        {navItems.slice(1).map((item) => {
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
