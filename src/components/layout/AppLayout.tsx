import { Outlet } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { BottomNav } from "./BottomNav"
import { ScrollToTop } from "./ScrollToTop"

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ScrollToTop />
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:block flex-shrink-0">
        <AppSidebar />
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
