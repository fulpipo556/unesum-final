"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Plus, Loader2, Edit, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface ProgramaAnalitico {
  id: number
  nombre: string
  datos_tabla: {
    datos_generales?: {
      carrera?: string
      nivel?: string
      asignatura?: string
      periodo_academico?: string
      docente?: string
    }
    fecha_creacion?: string
    unidades_tematicas?: any[]
  }
  createdAt: string
  updatedAt: string
}

export default function DocenteProgramaAnaliticoPage() {
  const { token, getToken } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [programas, setProgramas] = useState<ProgramaAnalitico[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProgramas()
  }, [])

  const fetchProgramas = async () => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()

      console.log('🔍 Obteniendo programas analíticos...')
      console.log('Token:', currentToken ? 'Presente ✓' : 'No hay token ✗')
      
      const response = await fetch('http://localhost:4000/api/programa-analitico', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 Response status:', response.status)

      const data = await response.json()
      console.log('📦 Data recibida:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener programas analíticos')
      }

      setProgramas(data.data || [])
      console.log('✅ Programas cargados:', data.data?.length || 0)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      
      // Si es error de red, dar más información
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('❌ No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en http://localhost:4000')
      } else {
        setError(errorMessage)
      }
      
      console.error('❌ Error completo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este programa analítico?')) {
      return
    }

    try {
      const currentToken = token || getToken()
      
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar')
      }

      alert('✅ Programa analítico eliminado exitosamente')
      fetchProgramas()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar'
      alert(`❌ ${errorMessage}`)
      console.error('Error:', err)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["profesor", "docente"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/docente">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">Programas Analíticos</h1>
            <p className="text-gray-600">Gestiona tus programas analíticos</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Opciones disponibles */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Crear Nuevo Programa Analítico */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-emerald-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Crear Nuevo</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Crear un nuevo programa analítico desde cero usando el formulario
                </CardDescription>
                <Button 
                  onClick={() => router.push('/dashboard/docente/programa-analitico/dinamico')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nuevo Programa
                </Button>
              </CardContent>
            </Card>

            {/* Subir desde Excel */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Importar desde Excel</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Cargar un programa analítico desde un archivo Excel existente
                </CardDescription>
                <Button 
                  onClick={() => router.push('/dashboard/docente/programa-analitico/upload')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Subir Excel
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Programas Analíticos Existentes */}
          <Card>
            <CardHeader>
              <CardTitle>Programas Analíticos Guardados</CardTitle>
              <CardDescription>
                {programas.length === 0 
                  ? 'No hay programas analíticos guardados' 
                  : `${programas.length} programa(s) analítico(s) disponible(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programas.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">No hay programas analíticos</p>
                  <p className="text-gray-500 text-sm mt-2">Crea uno nuevo o importa desde Excel</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {programas.map((programa) => (
                    <div
                      key={programa.id}
                      className="p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-300 bg-white transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-2">
                            {programa.nombre}
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            {programa.datos_tabla?.datos_generales?.carrera && (
                              <p>
                                <span className="font-medium">Carrera:</span>{' '}
                                {programa.datos_tabla.datos_generales.carrera}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.nivel && (
                              <p>
                                <span className="font-medium">Nivel:</span>{' '}
                                {programa.datos_tabla.datos_generales.nivel}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.asignatura && (
                              <p>
                                <span className="font-medium">Asignatura:</span>{' '}
                                {programa.datos_tabla.datos_generales.asignatura}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.periodo_academico && (
                              <p>
                                <span className="font-medium">Periodo:</span>{' '}
                                {programa.datos_tabla.datos_generales.periodo_academico}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.docente && (
                              <p>
                                <span className="font-medium">Docente:</span>{' '}
                                {programa.datos_tabla.datos_generales.docente}
                              </p>
                            )}
                            {programa.datos_tabla?.unidades_tematicas && (
                              <p>
                                <span className="font-medium">Unidades:</span>{' '}
                                {programa.datos_tabla.unidades_tematicas.length}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Creado: {new Date(programa.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => router.push(`/dashboard/docente/programa-analitico/ver/${programa.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => router.push(`/dashboard/docente/programa-analitico/editar/${programa.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleDelete(programa.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
