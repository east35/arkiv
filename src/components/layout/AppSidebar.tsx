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
  IconDeviceGamepad,
  IconDeviceGamepadFilled,
  IconBook2,
  IconBookFilled,
  IconSettings2,
  IconListDetails,
  IconListDetailsFilled,
  IconPlus,
  IconLogout,
  IconMenu2,
  IconArrowBarToLeft,
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

const settings2OuterPath =
  "M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033";
const settings2InnerPath = "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0";

function IconSettings2Filled({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={`${settings2OuterPath} ${settings2InnerPath}`}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
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
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-12 items-center text-base font-medium transition-colors",
        collapsed ? "justify-center rounded-md" : "justify-start px-5",
        active
          ? "bg-black/6 text-black dark:bg-white/6 dark:text-white"
          : "text-black/85 hover:bg-black/10 hover:text-black dark:text-white/90 dark:hover:bg-white/12 dark:hover:text-white",
      )}
    >
      <IconComponent className={cn("h-5 w-5", !collapsed && "mr-4")} />
      {!collapsed && label}
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
  const isActiveRoute = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const mainItems = [
    {
      to: "/",
      icon: IconLayoutGrid,
      iconFilled: IconLayoutGridFilled,
      label: "Home",
    },
    {
      to: "/books",
      icon: IconBook2,
      iconFilled: IconBookFilled,
      label: "Books",
    },
    {
      to: "/games",
      icon: IconDeviceGamepad,
      iconFilled: IconDeviceGamepadFilled,
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
    <div
      className={cn(
        "h-full border-r border-black/10 bg-[#FBFBFB] text-[#0A0A0A] dark:border-white/10 dark:bg-[#050505] dark:text-white",
        className,
      )}
    >
      <div className="h-full flex flex-col">
        <div
          className={cn(
            "border-b border-black/10 bg-primary dark:border-white/10",
            collapsed ? "px-1 py-4 flex justify-center" : "px-5",
          )}
        >
          <Link to="/" onClick={onNavClick} aria-label="Go to Home">
            {collapsed ? (
              <img
                src="/logo/arkiv-icon-white.svg"
                alt="Arkiv"
                className="block h-7 w-auto max-w-none mb-4 mt-4"
              />
            ) : (
              <img
                src="/logo/arkiv-logo-white.svg"
                alt="Arkiv"
                className="block h-8 w-auto max-w-none mb-4 mt-4"
              />
            )}
          </Link>
          {!collapsed && (
            <Link
              to="/search"
              onClick={onNavClick}
              className="mt-4 mb-4 inline-flex items-center text-lg leading-none font-medium text-white hover:text-white/90 transition-colors"
            >
              <IconPlus className="h-5 w-5 mr-3" />
              <span>Add to Collection</span>
            </Link>
          )}
        </div>

        {collapsed && (
          <div>
            <Link
              to="/search"
              onClick={onNavClick}
              title="Add to Collection"
              className="flex h-12 items-center justify-center rounded-md text-black/85 hover:bg-black/6 hover:text-black dark:text-white/90 dark:hover:bg-white/6 dark:hover:text-white"
            >
              <IconPlus className="h-5 w-5" />
            </Link>
          </div>
        )}

        <div className="space-y-0">
          {mainItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              iconFilled={item.iconFilled}
              label={item.label}
              active={isActiveRoute(item.to)}
              collapsed={collapsed}
              onClick={onNavClick}
            />
          ))}
        </div>

        <div className="mt-auto">
          {onCollapse && (
            <div className="hidden md:block">
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-12 text-base font-medium gap-0 text-black/80 hover:text-black hover:bg-black/6 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/6",
                  collapsed ? "justify-center px-0" : "justify-start px-5",
                )}
                onClick={onCollapse}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <IconArrowBarToLeft className="h-5 w-5 rotate-180" />
                ) : (
                  <>
                    <IconArrowBarToLeft className="h-5 w-5 mr-4" />
                    Collapse
                  </>
                )}
              </Button>
            </div>
          )}

          <NavItem
            to="/settings"
            icon={IconSettings2}
            iconFilled={IconSettings2Filled}
            label="Settings"
            active={isActiveRoute("/settings")}
            collapsed={collapsed}
            onClick={onNavClick}
          />

          <div className="hidden md:block pb-2 border-t">
            <AlertDialog>
              <AlertDialogTrigger
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full text-black/80 hover:text-black hover:bg-black/6 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/6",
                  collapsed ? "justify-center px-0" : "justify-start px-5",
                )}
                title={collapsed ? "Sign Out" : undefined}
              >
                <IconLogout className={cn("h-5 w-5", !collapsed && "mr-4")} />
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
