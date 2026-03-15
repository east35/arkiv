import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconSettings2,
  IconListDetails,
  IconListDetailsFilled,
  IconBooks,
  IconPlus,
} from "@tabler/icons-react";

const settings2OuterPath =
  "M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033";
const settings2InnerPath = "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0";

function IconSettings2Filled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="none" className={className} aria-hidden="true">
      <path
        d={`${settings2OuterPath} ${settings2InnerPath}`}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
import { cn } from "@/lib/utils";
import { LibraryTypeSwitcher } from "@/components/library/LibraryTypeSwitcher";
import { useShelfStore } from "@/store/useShelfStore";
import type { MediaType } from "@/types";

const collectionRoutes = ["/books", "/games"];
const LAST_COLLECTION_KEY = "arkiv:lastCollection";

interface BottomNavProps {
  visible?: boolean;
}

export function BottomNav({ visible = true }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemoMode = useShelfStore((s) => s.isDemoMode);

  const isCollectionActive = collectionRoutes.includes(location.pathname);

  // Persist the last visited library route
  useEffect(() => {
    if (isCollectionActive) {
      localStorage.setItem(LAST_COLLECTION_KEY, location.pathname);
    }
  }, [location.pathname, isCollectionActive]);

  const handleCollectionTap = () => {
    const last = localStorage.getItem(LAST_COLLECTION_KEY) ?? "/games";
    navigate(last);
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background md:hidden transition-transform duration-200 ease-out",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
    >
      {isCollectionActive && (
        <LibraryTypeSwitcher
          value={location.pathname === "/books" ? "book" : "game" as MediaType}
        />
      )}
      <div className="flex items-stretch justify-around min-h-[44px]">
        {/* Home */}
        <Link
          to="/home"
          className={cn(
            "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 py-2 ",
            location.pathname === "/home"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {location.pathname === "/home" ? (
            <IconLayoutGridFilled className="h-5 w-5" />
          ) : (
            <IconLayoutGrid className="h-5 w-5" />
          )}
          <span className={cn("text-[10px] font-medium", location.pathname !== "/home" && "text-muted-foreground")}>Home</span>
        </Link>

        {/* Library — navigates to last visited, defaults to /games */}
        <button
          onClick={handleCollectionTap}
          className={cn(
            "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 cursor-pointer",
            isCollectionActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <IconBooks className="h-5 w-5" />
          <span className={cn("text-[10px] font-medium", !isCollectionActive && "text-muted-foreground")}>Library</span>
        </button>

        <Link
          to="/search"
          className="flex items-center justify-center w-full bg-primary text-primary-foreground"
          aria-label="Add item"
          title="Add item"
        >
          <IconPlus className="h-5 w-5" />
        </Link>

        {/* Collections, Settings */}
        {[
          {
            to: "/collections",
            icon: IconListDetails,
            iconFilled: IconListDetailsFilled,
            label: "Collections",
          },
          {
            to: "/settings",
            icon: IconSettings2,
            iconFilled: IconSettings2Filled,
            label: "Settings",
          },
        ].map((item) => {
          const isDisabled = isDemoMode && item.to === "/settings";
          const isActive = location.pathname === item.to;
          const Icon = isActive ? item.iconFilled : item.icon;
          if (isDisabled) {
            return (
              <div
                key={item.to}
                className="flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 text-muted-foreground/40"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 cursor-pointer",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn("text-[10px] font-medium", !isActive && "text-muted-foreground")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
