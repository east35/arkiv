import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    // Basic loading spinner or skeleton could go here
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  if (!session) {
    if (location.pathname === "/") {
      return <Navigate to="/marketing" replace />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
