import { useState } from "react"
import { Outlet } from "react-router-dom"
import { AppSidebar, MobileNav } from "./AppSidebar"
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
        {/* Mobile Header */}
        <header className="flex items-center border-b px-4 py-2 md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <MobileNav />
          <div className="ml-2">
            <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-6 hidden dark:block" />
            <img src="/logo/arkiv-logo-black.svg" alt="Arkiv" className="h-6 dark:hidden" />
          </div>
        </header>

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
