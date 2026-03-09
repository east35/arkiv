import { Outlet } from "react-router-dom"
import { AppSidebar, MobileNav } from "./AppSidebar"

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
          <span className="ml-2 font-semibold">ShelfLog</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
