import { Routes, Route } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import { RequireAuth } from "@/components/auth/RequireAuth"
import Home from "@/pages/Home"
import Search from "@/pages/Search"
import Games from "@/pages/Games"
import Books from "@/pages/Books"
import Statistics from "@/pages/Statistics"
import ListDetail from "@/pages/ListDetail"
import Settings from "@/pages/Settings"
import Import from "@/pages/Import"
import ItemDetail from "@/pages/ItemDetail"
import Login from "@/pages/Login"
import Register from "@/pages/Register"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
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
          <Route path="/games" element={<Games />} />
          <Route path="/books" element={<Books />} />
          <Route path="/statistics" element={<Statistics />} />
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
