import { useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  IconLayoutGrid, IconLayoutGridFilled,
  IconSettings, IconSettingsFilled,
  IconListDetails, IconListDetailsFilled,
  IconBooks,
  IconPlus,
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

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-safe transition-transform duration-200 ease-out",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      )}
    >
      <div className="flex items-center justify-around h-16">

        {/* Home */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1",
            location.pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {location.pathname === "/" ? <IconLayoutGridFilled className="h-5 w-5" /> : <IconLayoutGrid className="h-5 w-5" />}
          <span className="text-[10px] font-medium">Home</span>
        </Link>

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

        <Link
          to="/search"
          className="flex flex-col items-center justify-center w-full h-full"
          aria-label="Add item"
          title="Add item"
        >
          <span className="grid place-items-center h-11 w-11 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <IconPlus className="h-5 w-5" />
          </span>
        </Link>

        {/* Lists, Settings */}
        {[
          { to: "/lists", icon: IconListDetails, iconFilled: IconListDetailsFilled, label: "Lists" },
          { to: "/settings", icon: IconSettings, iconFilled: IconSettingsFilled, label: "Settings" },
        ].map((item) => {
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
