import { useState, useRef, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./AppSidebar"
import { BottomNav } from "./BottomNav"
import { ScrollToTop } from "./ScrollToTop"
import { cn } from "@/lib/utils"

// Routes where the mobile bottom nav should be hidden entirely
const hideNavPattern = /^\/(lists\/|item\/)/
const collectionRoutes = ["/books", "/games"]
const AUTO_COLLAPSE_BREAKPOINT = 1100

export default function AppLayout() {
  const location = useLocation()
  const hideNav = hideNavPattern.test(location.pathname)
  const isCollectionRoute = collectionRoutes.includes(location.pathname)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true"
  })
  const [forceSidebarCollapsed, setForceSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < AUTO_COLLAPSE_BREAKPOINT
  })

  const [navVisible, setNavVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const mainRef = useRef<HTMLElement>(null)
  const effectiveSidebarCollapsed = sidebarCollapsed || forceSidebarCollapsed

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const handleScroll = () => {
      const current = el.scrollTop
      setScrolled(current > 0)
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
    setScrolled(false)
    lastScrollY.current = 0
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  // Auto-collapse desktop sidebar at narrower desktop widths so header controls keep enough room.
  useEffect(() => {
    const handleResize = () => {
      setForceSidebarCollapsed(window.innerWidth < AUTO_COLLAPSE_BREAKPOINT)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
        effectiveSidebarCollapsed ? "w-14" : "w-64"
      )}>
        <AppSidebar
          collapsed={effectiveSidebarCollapsed}
          onCollapse={forceSidebarCollapsed ? undefined : toggleSidebar}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main
          ref={mainRef}
          className={cn("flex-1 overflow-y-auto pt-safe md:pb-0", hideNav ? "pb-0" : isCollectionRoute ? "pb-[115px]" : "pb-16")}
        >
          <Outlet context={{ navVisible, scrolled }} />
        </main>

        {!hideNav && <BottomNav visible={navVisible} />}
      </div>
    </div>
  )
}
