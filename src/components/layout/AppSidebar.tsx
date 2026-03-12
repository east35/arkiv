import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconDeviceGamepad2,
  IconDeviceGamepad2Filled,
  IconBook,
  IconBookFilled,
  IconSettings,
  IconSettingsFilled,
  IconListDetails,
  IconListDetailsFilled,
  IconPlus,
  IconLogout,
  IconMenu2,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconFilled: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({
  to,
  icon: Icon,
  iconFilled: IconFilled,
  label,
  active,
  collapsed,
  onClick,
}: NavItemProps) {
  const IconComponent = active ? IconFilled : Icon;
  return (
    <Link to={to} onClick={onClick} title={collapsed ? label : undefined}>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full",
          collapsed ? "justify-center px-0" : "justify-start",
          active && "bg-secondary",
        )}
      >
        <IconComponent className={cn("h-4 w-4", !collapsed && "mr-2")} />
        {!collapsed && label}
      </Button>
    </Link>
  );
}

interface AppSidebarProps {
  className?: string;
  onNavClick?: () => void;
  collapsed?: boolean;
  onCollapse?: () => void;
}

export function AppSidebar({
  className,
  onNavClick,
  collapsed = false,
  onCollapse,
}: AppSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const mainItems = [
    {
      to: "/",
      icon: IconLayoutGrid,
      iconFilled: IconLayoutGridFilled,
      label: "Home",
    },
    {
      to: "/books",
      icon: IconBook,
      iconFilled: IconBookFilled,
      label: "Books",
    },
    {
      to: "/games",
      icon: IconDeviceGamepad2,
      iconFilled: IconDeviceGamepad2Filled,
      label: "Games",
    },
    {
      to: "/lists",
      icon: IconListDetails,
      iconFilled: IconListDetailsFilled,
      label: "Lists",
    },
  ];

  return (
    <div className={cn("h-full border-r bg-background", className)}>
      <div className="pt-4 pb-2 h-full flex flex-col">
        {/* Logo area */}
        <div
          className={cn(
            "mb-4",
            collapsed ? "px-1 flex justify-center" : "px-7",
          )}
        >
          <Link to="/" onClick={onNavClick} aria-label="Go to Home">
            {collapsed ? (
              <>
                <img
                  src="/logo/arkiv-icon-white.svg"
                  alt="Arkiv"
                  className="h-7 hidden dark:block"
                />
                <img
                  src="/logo/arkiv-icon-black.svg"
                  alt="Arkiv"
                  className="h-7 dark:hidden"
                />
              </>
            ) : (
              <>
                <img
                  src="/logo/arkiv-logo-white.svg"
                  alt="Arkiv"
                  className="h-8 hidden dark:block"
                />
                <img
                  src="/logo/arkiv-logo-black.svg"
                  alt="Arkiv"
                  className="h-8 dark:hidden"
                />
              </>
            )}
          </Link>
        </div>

        <div className={cn("mt-1", "px-1")}>
          <Link
            to="/search"
            onClick={onNavClick}
            title={collapsed ? "Add Item" : undefined}
          >
            <Button
              className={cn(
                "w-full",
                collapsed ? "justify-center px-0" : "justify-start",
              )}
            >
              <IconPlus className={cn("h-4 w-4", !collapsed && "mr-2")} />
              {!collapsed && "Add to Collection"}
            </Button>
          </Link>
        </div>

        {/* Main nav */}
        <div className={cn("space-y-1", "px-1")}>
          {mainItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              iconFilled={item.iconFilled}
              label={item.label}
              active={location.pathname === item.to}
              collapsed={collapsed}
              onClick={onNavClick}
            />
          ))}
        </div>

        {/* Bottom: collapse + settings + sign out */}
        <div className={cn("mt-auto space-y-1", "px-1")}>
          {/* Collapse toggle — above Settings */}
          {onCollapse && (
            <div className="hidden md:block">
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center px-0" : "justify-start",
                )}
                onClick={onCollapse}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <IconChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <IconChevronLeft className="h-4 w-4 mr-2" />
                    Collapse
                  </>
                )}
              </Button>
            </div>
          )}

          <NavItem
            to="/settings"
            icon={IconSettings}
            iconFilled={IconSettingsFilled}
            label="Settings"
            active={location.pathname === "/settings"}
            collapsed={collapsed}
            onClick={onNavClick}
          />

          {/* Border between Settings and Sign Out */}
          <div className="border-t my-1" />

          <div className="hidden md:block">
            <AlertDialog>
              <AlertDialogTrigger
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center px-0" : "justify-start",
                )}
                title={collapsed ? "Sign Out" : undefined}
              >
                <IconLogout className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && "Sign Out"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out of Arkiv?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => signOut()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "md:hidden",
        )}
      >
        <IconMenu2 className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <AppSidebar onNavClick={() => {}} />
      </SheetContent>
    </Sheet>
  );
}
