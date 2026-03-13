import { Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import { RequireAuth } from "@/components/auth/RequireAuth"
import Home from "@/pages/Home"
import Search from "@/pages/Search"
import Games from "@/pages/Games"
import Books from "@/pages/Books"
import Lists from "@/pages/Lists"
import ListDetail from "@/pages/ListDetail"
import Settings from "@/pages/Settings"
import Import from "@/pages/Import"
import ItemDetail from "@/pages/ItemDetail"
import ExternalItemDetail from "@/pages/ExternalItemDetail"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Marketing from "@/pages/Marketing"
import DesignSystem from "@/pages/DesignSystem"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/item/external/:mediaType/:externalId" element={<ExternalItemDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/books" element={<Books />} />
          <Route path="/statistics" element={<Navigate to="/settings?tab=statistics" replace />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<Import />} />
        </Route>
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
