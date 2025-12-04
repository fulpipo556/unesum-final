"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      // Log para depuración
      console.log("ProtectedRoute - Checking access:", {
        user,
        userRole: user?.rol, // La propiedad correcta es "rol" no "role"
        allowedRoles
      });

      if (!user) {
        router.push(redirectTo)
        return
      }

      // CORRECCIÓN AQUÍ: Cambiar user.role por user.rol
      if (allowedRoles && !allowedRoles.includes(user.rol as any)) {
        console.log("Acceso denegado, rol no permitido:", user.rol)
        router.push("/unauthorized")
        return
      }

      setIsChecking(false)
    }
  }, [user, isLoading, allowedRoles, redirectTo, router])

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
          {user && (
            <div className="text-sm text-gray-500 mt-2">
              <p>Usuario: {user.nombres}</p>
              <p>Rol: {user.rol}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // CORRECCIÓN AQUÍ TAMBIÉN: Cambiar user.role por user.rol
  if (allowedRoles && !allowedRoles.includes(user.rol as any)) {
    return null
  }

  return <>{children}</>
}