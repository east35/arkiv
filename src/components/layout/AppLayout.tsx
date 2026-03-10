import { useState, useRef, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { BottomNav } from "./BottomNav"
import { ScrollToTop } from "./ScrollToTop"
import { cn } from "@/lib/utils"

// Routes where the mobile bottom nav should be hidden entirely
const hideNavPattern = /^\/(lists\/|item\/)/

export default function AppLayout() {
  const location = useLocation()
  const hideNav = hideNavPattern.test(location.pathname)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true"
  })

  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const handleScroll = () => {
      const current = el.scrollTop
      if (current < 80 || current < lastScrollY.current) {
        setNavVisible(true)
      } else if (current > lastScrollY.current + 6) {
        setNavVisible(false)
      }
      lastScrollY.current = current
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  // Reset on route change
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNavVisible(true))
    lastScrollY.current = 0
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ScrollToTop />
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:block flex-shrink-0 transition-all duration-300",
        sidebarCollapsed ? "w-14" : "w-64"
      )}>
        <AppSidebar collapsed={sidebarCollapsed} onCollapse={toggleSidebar} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main
          ref={mainRef}
          className={cn("flex-1 overflow-y-auto pt-safe md:pb-0", hideNav ? "pb-0" : "pb-16")}
        >
          <Outlet context={{ navVisible }} />
        </main>

        {!hideNav && <BottomNav visible={navVisible} />}
      </div>
    </div>
  )
}
