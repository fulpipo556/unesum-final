"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Save, Upload, Trash } from "lucide-react"
import type { ActividadExtracurricular, FuncionSustantiva } from "@/types"

export default function ActividadesPage() {
  const [actividades, setActividades] = useState<ActividadExtracurricular[]>([])
  const [funciones, setFunciones] = useState<FuncionSustantiva[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    funcionSustantivaId: "",
    codigo: "",
    nombre: "",
    descripcion: "",
    estado: "activo" as "activo" | "inactivo",
  })

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockFunciones: FuncionSustantiva[] = [
      {
        id: "1",
        codigo: "FS001",
        nombre: "Docencia",
        descripcion: "Actividades relacionadas con la enseñanza",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        codigo: "FS002",
        nombre: "Investigación",
        descripcion: "Proyectos de investigación científica",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        codigo: "FS003",
        nombre: "Vinculación con la Sociedad",
        descripcion: "Actividades de extensión universitaria",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setFunciones(mockFunciones)

    const mockActividades: ActividadExtracurricular[] = [
      {
        id: "1",
        codigo: "ACT001",
        nombre: "Taller de Programación Avanzada",
        funcionSustantivaId: "1",
        descripcion: "Taller especializado en técnicas avanzadas de programación",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        codigo: "ACT002",
        nombre: "Proyecto de Investigación en IA",
        funcionSustantivaId: "2",
        descripcion: "Investigación sobre inteligencia artificial aplicada",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        codigo: "ACT003",
        nombre: "Brigada de Salud Comunitaria",
        funcionSustantivaId: "3",
        descripcion: "Actividad de vinculación con la comunidad local",
        estado: "inactivo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setActividades(mockActividades)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingId) {
      // Update existing activity
      setActividades(
        actividades.map((actividad) =>
          actividad.id === editingId
            ? {
                ...actividad,
                ...formData,
                updatedAt: new Date(),
              }
            : actividad,
        ),
      )
    } else {
      // Create new activity
      const newActividad: ActividadExtracurricular = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setActividades([...actividades, newActividad])
    }

    handleNew()
  }

  const handleNew = () => {
    setFormData({
      funcionSustantivaId: "",
      codigo: "",
      nombre: "",
      descripcion: "",
      estado: "activo",
    })
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (actividad: ActividadExtracurricular) => {
    setFormData({
      funcionSustantivaId: actividad.funcionSustantivaId,
      codigo: actividad.codigo,
      nombre: actividad.nombre,
      descripcion: actividad.descripcion || "",
      estado: actividad.estado,
    })
    setIsEditing(true)
    setEditingId(actividad.id)
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      setActividades(actividades.filter((actividad) => actividad.id !== id))
    }
  }

  const handleDeleteAll = () => {
    if (confirm("¿Estás seguro de que deseas eliminar TODAS las actividades? Esta acción no se puede deshacer.")) {
      setActividades([])
    }
  }

  const handleImportExcel = () => {
    // This would open a file picker and handle Excel import
    alert("Funcionalidad de importación Excel será implementada próximamente")
  }

  const getFuncionNombre = (funcionId: string) => {
    const funcion = funciones.find((f) => f.id === funcionId)
    return funcion ? `${funcion.codigo} - ${funcion.nombre}` : "No asignada"
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header with green background like in the image */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">ACTIVIDADES EXTRACURRICULARES</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Form Section */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Function Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="funcionSustantiva" className="text-sm font-medium">
                      Funciones Sustantivas
                    </Label>
                    <Select
                      value={formData.funcionSustantivaId}
                      onValueChange={(value) => setFormData({ ...formData, funcionSustantivaId: value })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Seleccione una función sustantiva" />
                      </SelectTrigger>
                      <SelectContent>
                        {funciones.map((funcion) => (
                          <SelectItem key={funcion.id} value={funcion.id}>
                            {funcion.codigo} - {funcion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Code Field */}
                  <div className="space-y-2">
                    <Label htmlFor="codigo" className="text-sm font-medium">
                      Código *
                    </Label>
                    <Input
                      id="codigo"
                      placeholder="Ingrese el código de la actividad"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                      className="border-gray-300"
                    />
                  </div>

                  {/* Activities Field */}
                  <div className="space-y-2">
                    <Label htmlFor="actividades" className="text-sm font-medium">
                      Actividades *
                    </Label>
                    <Input
                      id="actividades"
                      placeholder="Ingrese el nombre de la actividad"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                      className="border-gray-300"
                    />
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-sm font-medium">
                      Descripción
                    </Label>
                    <Input
                      id="descripcion"
                      placeholder="Ingrese una descripción (opcional)"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Opción</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activado</SelectItem>
                        <SelectItem value="inactivo">Desactivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                      <Save className="h-4 w-4 mr-2" />
                      GUARDAR
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNew}
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      NUEVO
                    </Button>
                    <Button
                      type="button"
                      onClick={handleDeleteAll}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 bg-transparent"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      ELIMINAR TODO
                    </Button>
                    <Button
                      type="button"
                      onClick={handleImportExcel}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      IMPORTAR XLSX
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Actividades Extracurriculares Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">N.</TableHead>
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Actividad</TableHead>
                        <TableHead className="font-semibold">Función Sustantiva</TableHead>
                        <TableHead className="font-semibold">Descripción</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actividades.map((actividad, index) => (
                        <TableRow key={actividad.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{actividad.codigo}</TableCell>
                          <TableCell>{actividad.nombre}</TableCell>
                          <TableCell>{getFuncionNombre(actividad.funcionSustantivaId)}</TableCell>
                          <TableCell>{actividad.descripcion || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={actividad.estado === "activo" ? "default" : "secondary"}
                              className={
                                actividad.estado === "activo"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {actividad.estado === "activo" ? "Activado" : "Desactivado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(actividad)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(actividad.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {actividades.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No hay actividades extracurriculares registradas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
