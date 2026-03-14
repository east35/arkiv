import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useShelfStore } from "@/store/useShelfStore"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const isDemoMode = useShelfStore((s) => s.isDemoMode)

  // Demo mode bypasses auth entirely
  if (isDemoMode) return children

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
