import { useState } from "react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { BottomNav } from "./BottomNav"
import { ScrollToTop } from "./ScrollToTop"
import { cn } from "@/lib/utils"

export default function AppLayout() {
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
{/* Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 pt-safe">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  )
}
