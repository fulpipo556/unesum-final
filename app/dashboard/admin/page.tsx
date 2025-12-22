"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// --- 1. IMPORTA EL NUEVO ICONO ---
import { Users, BookOpen, Activity, Calendar, FileSpreadsheet, Settings, Edit3, FileText, Library, LucideCamera, LucideAlarmClock, LucideActivity, LucideActivitySquare, LucideAirVent, LucideArchiveRestore,GraduationCap,
  Grid3x3,
  ClipboardList,
  LucideAccessibility,
  LucideAirplay,
  LucideArchive,
  Upload,
  Sparkles } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const adminModules = [
    {
      title: "Gestión de Usuarios",
      description: "Administrar usuarios del sistema y roles",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "bg-cyan-500",
    },
    {
      title: "Paralelo",
      description: "Crear Paralelos",
      icon: LucideCamera,
      href: "/dashboard/admin/paralelo",
      color: "bg-purple-500",
    },
    {
      title: "Periodo",
      description: "Crear Periodo",
      icon: LucideArchive,
      href: "/dashboard/admin/periodo",
      color: "bg-orange-500",
    },
    {
      title: "Organización",
      description: "Crear Unidad de organización curricular ",
      icon: LucideAccessibility,
      href: "/dashboard/admin/organizacion",
      color: "bg-cyan-500",
    },
    {
      title: "Campo de Formación",
      description: "Crear los campos de formación de carrera ",
      icon: LucideAirplay,
      href: "/dashboard/admin/campo-formacion",
      color: "bg-purple-500",
    },
    {
      title: "Syllabus de Asignaturas",
      description: "Crear, editar y gestionar syllabus de asignaturas",
      icon: FileText,
      href: "/dashboard/admin/syllabus",
      color: "bg-orange-500",
    },
    {
      title: "🔥 Extraer Títulos Syllabus",
      description: "Extrae automáticamente títulos de archivos Excel/Word",
      icon: Sparkles,
      href: "/dashboard/admin/syllabus/extraer-titulos",
      color: "bg-purple-500",
    },
    {
      title: "Funciones Sustantivas",
      description: "Registrar y gestionar funciones sustantivas",
      icon: BookOpen,
      href: "/dashboard/admin/funciones-sustantivas",
      color: "bg-cyan-500",
    },
    {
      title: "Gestión de Docentes",
      description: "Administrar información de docentes",
      icon: Users,
      href: "/dashboard/admin/docentes",
      color: "bg-purple-500",
    },
    {
      title: "Actividades Extracurriculares",
      description: "Gestionar actividades y seguimiento",
      icon: Activity,
      href: "/dashboard/admin/actividades",
      color: "bg-orange-500",
    },
   
    /*{
      title: "Malla Curricular",
      description: "Malla Curricular",
      icon: FileSpreadsheet,
      href: "/dashboard/admin/import",
      color: "bg-green-500",
    },*/
    {
      title: "Programa Analítico",
      description: "Gestionar programas analíticos y plantillas",
      icon: ClipboardList,
      href: "/dashboard/admin/programa-analitico",
      color: "bg-cyan-500",
    },
    {
      title: "Editor de Tablas",
      description: "Crear y editar programas analíticos con tablas",
      icon: Edit3,
      href: "/dashboard/admin/editor-tablas",
      color: "bg-green-500",
    },
    // --- 2. AÑADE EL NUEVO MÓDULO AQUÍ ---
    {
      title: "Configuración del Syllabus",
      description: "Cargar y editar syllabus desde documentos Word",
      icon: FileText,
      href: "/dashboard/admin/editor-syllabus",
      color: "bg-purple-500",
    },
    /*{
      title: "Configuración",
      description: "Configuración general del sistema",
      icon: LucideAirVent,
      href: "/dashboard/admin/settings",
      color: "bg-purple-500",
    },*/
     {
      title: "Facultades y Carreras",
      description: "Ingresa facultades y carreras académicas",
      icon: Library,
      href: "/dashboard/admin/gestion-academica",
      color: "bg-orange-500",
    },
     {
      title: "Niveles",
      description: "Ingresa Niveles",
      icon: LucideAlarmClock,
      href: "/dashboard/admin/niveles",
      color: "bg-cyan-500",
    },
    {
      title: "Asignaturas - Malla Curricular",
      description: "Registro de asignaturas para la malla curricular",
      icon: GraduationCap,
      href: "/dashboard/admin/asignaturas/registro",
      color: "bg-purple-500",
    },
    {
      title: "Malla Curricular",
      description: "Visualiza la malla curricular",
      icon: Grid3x3,
      href: "/dashboard/admin/malla-curricular",
      color: "bg-orange-500",
    },
    {
      title: "Planificación Académica",
      description: "Gestionar planificación Académica ",
      icon: ClipboardList,
      href: "/dashboard/admin/planificacion-academica",
      color: "bg-cyan-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">Gestiona todos los aspectos del sistema académico</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminModules.map((module) => {
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