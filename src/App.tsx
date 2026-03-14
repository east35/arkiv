import { Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import PublicLayout from "@/components/layout/PublicLayout"
import { RequireAuth } from "@/components/auth/RequireAuth"
import Home from "@/pages/Home"
import Search from "@/pages/Search"
import Games from "@/pages/Games"
import Books from "@/pages/Books"
import Collections from "@/pages/Collections"
import CollectionDetail from "@/pages/CollectionDetail"
import Settings from "@/pages/Settings"
import Import from "@/pages/Import"
import ItemDetail from "@/pages/ItemDetail"
import ExternalItemDetail from "@/pages/ExternalItemDetail"
import AuthPage from "@/pages/AuthPage"
import Marketing from "@/pages/Marketing"
import Privacy from "@/pages/Privacy"
import Legal from "@/pages/Legal"
import Contact from "@/pages/Contact"
import DemoEntry from "@/pages/DemoEntry"
import DesignSystem from "@/pages/DesignSystem"
import { useAuth } from "@/hooks/useAuth"
import { useShelfStore } from "@/store/useShelfStore"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

/** Root route: shows Marketing for guests, redirects authed/demo users to /home */
function RootRoute() {
  const { session } = useAuth()
  const isDemoMode = useShelfStore((s) => s.isDemoMode)
  if (session || isDemoMode) return <Navigate to="/home" replace />
  return <Marketing />
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        {/* Public routes — share PublicLayout for pixel transition animations */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<RootRoute />} />
          <Route path="/marketing" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/demo" element={<DemoEntry />} />
        </Route>

        <Route path="/design-system" element={<DesignSystem />} />

        <Route element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route path="/home" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/item/external/:mediaType/:externalId" element={<ExternalItemDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/books" element={<Books />} />
          <Route path="/statistics" element={<Navigate to="/settings?tab=statistics" replace />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<Import />} />
        </Route>
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
