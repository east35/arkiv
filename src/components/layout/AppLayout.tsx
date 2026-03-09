import { Outlet } from "react-router-dom"
import { AppSidebar, MobileNav } from "./AppSidebar"
import { BottomNav } from "./BottomNav"

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:block flex-shrink-0">
        <AppSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center border-b px-4 py-2 md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <MobileNav />
          <div className="ml-2">
            <img src="/logo/shelf-log_white.svg" alt="ShelfLog" className="h-6 hidden dark:block" />
            <img src="/logo/shelf-log_black.svg" alt="ShelfLog" className="h-6 dark:hidden" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  )
}
