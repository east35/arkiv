import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
} from "@/components/ui/alert-dialog"
import {
  LayoutGrid,
  Gamepad2,
  BookOpen,
  List,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface NavItemProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link to={to} onClick={onClick}>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn("w-full justify-start", active && "bg-secondary")}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  )
}

export function AppSidebar({ className, onNavClick }: { className?: string, onNavClick?: () => void }) {
  const location = useLocation()
  const { signOut } = useAuth()

  const mainItems = [
    { to: "/", icon: LayoutGrid, label: "Home" },
    { to: "/books", icon: BookOpen, label: "Books" },
    { to: "/games", icon: Gamepad2, label: "Games" },
    { to: "/lists", icon: List, label: "Lists" },
    { to: "/statistics", icon: BarChart3, label: "Statistics" },
  ]

  return (
    <div className={cn("h-full border-r bg-background", className)}>
      <div className="space-y-4 py-4 h-full flex flex-col">
        <div className="px-3 py-2">
          <div className="mb-2 px-4">
            <img src="/logo/shelf-log_white.svg" alt="ShelfLog" className="h-8 hidden dark:block" />
            <img src="/logo/shelf-log_black.svg" alt="ShelfLog" className="h-8 dark:hidden" />
          </div>
          <div className="space-y-1">
            {mainItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
                onClick={onNavClick}
              />
            ))}
          </div>
        </div>
        <div className="mt-auto px-3 py-2 space-y-1">
          <NavItem
            to="/settings"
            icon={Settings}
            label="Settings"
            active={location.pathname === "/settings"}
            onClick={onNavClick}
          />
          <AlertDialog>
            <AlertDialogTrigger className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-muted-foreground hover:text-foreground")}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out of ShelfLog?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 hover:bg-accent hover:text-accent-foreground h-9 w-9">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <AppSidebar onNavClick={() => {}} />
      </SheetContent>
    </Sheet>
  )
}
