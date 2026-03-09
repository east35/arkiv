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
  Search,
  Gamepad2,
  BookOpen,
  BarChart2,
  List,
  Upload,
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

  const items = [
    { to: "/", icon: LayoutGrid, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/games", icon: Gamepad2, label: "Games" },
    { to: "/books", icon: BookOpen, label: "Books" },
    { to: "/statistics", icon: BarChart2, label: "Statistics" },
    { to: "/lists", icon: List, label: "Lists" },
    { to: "/import", icon: Upload, label: "Import" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className={cn("pb-12 h-full border-r bg-background", className)}>
      <div className="space-y-4 py-4 h-full flex flex-col">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            ShelfLog
          </h2>
          <div className="space-y-1">
            {items.map((item) => (
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
        <div className="mt-auto px-3 py-2">
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
