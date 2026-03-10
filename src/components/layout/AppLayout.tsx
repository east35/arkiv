import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { BottomNav } from "./BottomNav"
import { ScrollToTop } from "./ScrollToTop"
import { cn } from "@/lib/utils"

// Routes where the mobile bottom nav should be hidden
const hideNavPattern = /^\/(lists\/|item\/)/

export default function AppLayout() {
  const location = useLocation()
  const hideNav = hideNavPattern.test(location.pathname)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true"
  })

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
        <main className={cn("flex-1 overflow-y-auto pt-safe md:pb-0", hideNav ? "pb-0" : "pb-16")}>
          <Outlet />
        </main>

        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
