import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { PageTransitionReveal } from "./PageTransitionReveal";
import { useShelfStore } from "@/store/useShelfStore";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { WelcomeDialog } from "@/components/WelcomeDialog";

// Routes where the mobile bottom nav should be hidden entirely
const hideNavPattern = /^\/(collections\/|item\/)/;
const collectionRoutes = ["/books", "/games"];
const AUTO_COLLAPSE_BREAKPOINT = 1100;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { session } = useAuth();
  const { fetchPreferences } = usePreferences();
  const isDemoMode = useShelfStore((s) => s.isDemoMode);
  const userId = session?.user.id ?? null;
  const hideNav = hideNavPattern.test(location.pathname);
  const isCollectionRoute = collectionRoutes.includes(location.pathname);
  const isHomeRoute = location.pathname === "/home";
  const isSearchRoute = location.pathname === "/search";
  const isCollectionsRoute = location.pathname === "/collections";
  const isSettingsRoute = location.pathname === "/settings";
  const isSurfaceRoute =
    isCollectionRoute || isHomeRoute || isSearchRoute || isCollectionsRoute || isSettingsRoute;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [forceSidebarCollapsed, setForceSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < AUTO_COLLAPSE_BREAKPOINT;
  });

  const [navVisible, setNavVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [sidebarFading, setSidebarFading] = useState(false);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const sidebarFadeTimeoutRef = useRef<number | null>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const targetScrollRef = useRef<number | null>(null);
  const prevLocationKeyRef = useRef<string>(location.key);

  // Save scroll position when leaving a route; restore when returning
  useLayoutEffect(() => {
    const prevKey = prevLocationKeyRef.current;
    const newKey = location.key;
    if (prevKey === newKey) return;

    // Use lastScrollY.current (updated by scroll listener) — the DOM's scrollTop gets
    // auto-adjusted by the browser when shorter content replaces the old page.
    scrollPositions.current.set(prevKey, lastScrollY.current);
    const saved = scrollPositions.current.get(newKey);
    prevLocationKeyRef.current = newKey;

    if (navigationType === "POP" && saved && mainRef.current) {
      // Restore scroll synchronously before paint — no animation on back navigation
      mainRef.current.scrollTo({ top: saved, behavior: "instant" });
      targetScrollRef.current = null;
    } else {
      targetScrollRef.current = saved ?? null;
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveSidebarCollapsed = sidebarCollapsed || forceSidebarCollapsed;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handleScroll = () => {
      const current = el.scrollTop;
      setScrolled(current > 0);
      if (current < 80 || current < lastScrollY.current) {
        setNavVisible(true);
      } else if (current > lastScrollY.current + 6) {
        setNavVisible(false);
      }
      lastScrollY.current = current;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isDemoMode || !userId) return;

    void fetchPreferences().catch((error) => {
      console.error("Failed to hydrate user preferences", error);
    });
  }, [fetchPreferences, isDemoMode, userId]);

  // Reset on route change
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNavVisible(true));
    setScrolled(false);
    lastScrollY.current = 0;
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  // Auto-collapse desktop sidebar at narrower desktop widths so header controls keep enough room.
  useEffect(() => {
    const handleResize = () => {
      setForceSidebarCollapsed(window.innerWidth < AUTO_COLLAPSE_BREAKPOINT);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (sidebarFadeTimeoutRef.current !== null) {
        window.clearTimeout(sidebarFadeTimeoutRef.current);
      }
    };
  }, []);

  const toggleSidebar = () => {
    if (sidebarFading) return;
    setSidebarFading(true);
    sidebarFadeTimeoutRef.current = window.setTimeout(() => {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar-collapsed", String(next));
        return next;
      });
      requestAnimationFrame(() => setSidebarFading(false));
      sidebarFadeTimeoutRef.current = null;
    }, 90);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block flex-shrink-0 relative z-10 transition-opacity duration-150",
          sidebarFading ? "opacity-0" : "opacity-100",
          effectiveSidebarCollapsed ? "w-14" : "w-64",
        )}
      >
        <AppSidebar
          collapsed={effectiveSidebarCollapsed}
          onCollapse={forceSidebarCollapsed ? undefined : toggleSidebar}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {isDemoMode && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-yellow-400 text-yellow-950 text-xs font-medium shrink-0 z-30">
            <span>Demo mode — changes are not saved</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="underline underline-offset-2 hover:no-underline"
                onClick={() => navigate("/register")}
              >
                Sign Up Free
              </button>
              <span className="opacity-40">·</span>
              <button
                type="button"
                className="underline underline-offset-2 hover:no-underline"
                onClick={() => navigate("/")}
              >
                Exit
              </button>
            </div>
          </div>
        )}
        <main
          ref={mainRef}
          className={cn(
            "app-scroll-area relative flex-1 overflow-y-auto overflow-x-hidden md:pb-0",
            isSurfaceRoute && "bg-[#f5f5f5] dark:bg-[#171717]",
            hideNav
              ? "pb-0"
              : isCollectionRoute
                ? "pb-[115px]"
                : isHomeRoute
                  ? "pb-0"
                  : "pb-16",
          )}
        >
          <PageTransitionReveal targetScrollRef={targetScrollRef} />
          <Outlet context={{ navVisible, scrolled }} />
          {!isDemoMode && userId && <WelcomeDialog userId={userId} />}
        </main>

        {!hideNav && <BottomNav visible={navVisible} />}
      </div>
    </div>
  );
}
