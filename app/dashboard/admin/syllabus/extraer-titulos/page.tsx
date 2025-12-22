"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export default function ExtraerTitulosSyllabusPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar formato
      const validFormats = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]
      
      if (validFormats.includes(file.type) || /\.(xlsx|xls|docx|doc)$/i.test(file.name)) {
        setArchivo(file)
        setError(null)
      } else {
        setError('Formato de archivo inválido. Use Excel (.xlsx, .xls) o Word (.docx, .doc)')
        setArchivo(null)
      }
    }
  }

  const extraerTitulos = async () => {
    if (!archivo) {
      setError('Por favor seleccione un archivo')
      return
    }

    setCargando(true)
    setError(null)
    setResultado(null)

    try {
      const formData = new FormData()
      formData.append('archivo', archivo)

      const response = await axios.post(
        `${API_URL}/syllabus-extraction/extraer-titulos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (response.data.success) {
        setResultado(response.data.data)
        console.log('✅ Títulos extraídos:', response.data.data)
      } else {
        setError(response.data.message || 'Error extrayendo títulos')
      }
    } catch (err: any) {
      console.error('❌ Error:', err)
      setError(err.response?.data?.message || 'Error al procesar el archivo')
    } finally {
      setCargando(false)
    }
  }

  const irAOrganizar = () => {
    if (resultado?.sessionId) {
      router.push(`/dashboard/admin/syllabus/organizar-pestanas?sessionId=${resultado.sessionId}`)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Extraer Títulos de Syllabus</h1>
        <p className="text-muted-foreground">
          Suba un archivo Excel o Word para extraer automáticamente los títulos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subir Archivo Syllabus
          </CardTitle>
          <CardDescription>
            El sistema detectará automáticamente los títulos del documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input de archivo */}
          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo Syllabus (Excel o Word)</Label>
            <Input
              id="archivo"
              type="file"
              accept=".xlsx,.xls,.docx,.doc,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={manejarCambioArchivo}
              disabled={cargando}
            />
            {archivo && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: <span className="font-medium">{archivo.name}</span>
              </p>
            )}
          </div>

          {/* Errores */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botón de extracción */}
          <Button 
            onClick={extraerTitulos} 
            disabled={!archivo || cargando}
            className="w-full"
          >
            {cargando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extrayendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Extraer Títulos
              </>
            )}
          </Button>

          {/* Resultado exitoso */}
          {resultado && (
            <div className="space-y-4">
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  ✅ Se extrajeron <strong>{resultado.totalTitulos} títulos</strong> exitosamente del archivo
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Archivo:</strong> {resultado.nombreArchivo}</p>
                <p><strong>Tipo:</strong> {resultado.tipoArchivo}</p>
                <p><strong>Session ID:</strong> <code className="text-xs">{resultado.sessionId}</code></p>
              </div>

              {/* Lista de títulos */}
              <div className="space-y-2">
                <h3 className="font-semibold">Títulos detectados:</h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Título</th>
                        <th className="px-4 py-2 text-left">Ubicación</th>
                        <th className="px-4 py-2 text-left">Puntuación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.titulos.map((titulo: any, idx: number) => (
                        <tr key={titulo.id} className="border-t hover:bg-muted/50">
                          <td className="px-4 py-2">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium">{titulo.titulo}</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Fila {titulo.fila}, Col {titulo.columna_letra}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              titulo.puntuacion > 50 ? 'bg-green-100 text-green-800' :
                              titulo.puntuacion > 30 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {titulo.puntuacion} pts
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botón para organizar */}
              <Button 
                onClick={irAOrganizar} 
                className="w-full"
                size="lg"
              >
                Continuar a Organizar Pestañas →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
