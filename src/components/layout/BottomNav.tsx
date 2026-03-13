import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconSettings,
  IconSettingsFilled,
  IconListDetails,
  IconListDetailsFilled,
  IconBooks,
  IconPlus,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { LibraryTypeSwitcher } from "@/components/library/LibraryTypeSwitcher";
import type { MediaType } from "@/types";

const collectionRoutes = ["/books", "/games"];
const LAST_COLLECTION_KEY = "arkiv:lastCollection";

interface BottomNavProps {
  visible?: boolean;
}

export function BottomNav({ visible = true }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

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
        "fixed bottom-0 left-0 right-0 z-50 bg-background md:hidden pb-safe transition-transform duration-200 ease-out",
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
          to="/"
          className={cn(
            "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1 py-2 ",
            location.pathname === "/"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {location.pathname === "/" ? (
            <IconLayoutGridFilled className="h-5 w-5" />
          ) : (
            <IconLayoutGrid className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Library — navigates to last visited, defaults to /games */}
        <button
          onClick={handleCollectionTap}
          className={cn(
            "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1",
            isCollectionActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <IconBooks className="h-5 w-5" />
          <span className="text-[10px] font-medium">Library</span>
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
            icon: IconSettings,
            iconFilled: IconSettingsFilled,
            label: "Settings",
          },
        ].map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = isActive ? item.iconFilled : item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center w-full min-h-[44px] space-y-1",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
