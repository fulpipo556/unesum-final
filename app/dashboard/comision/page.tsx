"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileCheck, Activity, BarChart3, Users } from "lucide-react"
import Link from "next/link"

export default function ComisionDashboard() {
  const comisionModules = [
    {
      title: "Revisar Funciones Sustantivas",
      description: "Evaluar y aprobar funciones sustantivas registradas",
      icon: FileCheck,
      href: "/dashboard/comision/funciones-revision",
      color: "bg-blue-500",
    },
    {
      title: "Actividades Extracurriculares",
      description: "Supervisar actividades extracurriculares",
      icon: Activity,
      href: "/dashboard/comision/actividades",
      color: "bg-emerald-500",
    },
    {
      title: "Reportes y Estadísticas",
      description: "Ver reportes de actividades académicas",
      icon: BarChart3,
      href: "/dashboard/comision/reportes",
      color: "bg-purple-500",
    },
    {
      title: "Gestión de Docentes",
      description: "Consultar información de docentes",
      icon: Users,
      href: "/dashboard/comision/docentes",
      color: "bg-orange-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["comision"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Comisión</h1>
            <p className="text-gray-600">Supervisión y evaluación de actividades académicas</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            {comisionModules.map((module) => {
              const IconComponent = module.icon
              return (
                <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.color} text-white`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{module.description}</CardDescription>
                    <Link href={module.href}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Acceder</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
