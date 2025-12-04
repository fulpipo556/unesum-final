"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Save, Loader2, UserPlus } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"

// --- Tipos de Datos que vienen de la API ---
interface Facultad { id: number; nombre: string }
interface Carrera { id: number; nombre: string; facultad_id: number }
interface Nivel { id: number; nombre: string; codigo: string }
interface Asignatura { id: number; nombre: string; codigo: string; carrera_id: number }
interface Paralelo { id: number; nombre: string; codigo: string }
interface Profesor {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  activo: boolean;
  carrera_id: number;
  asignatura_id?: number;
  nivel_id?: number;
  paralelo_id?: number;
  // Sequelize incluye los datos asociados así:
  carrera?: {
    id: number;
    nombre: string;
    facultad?: {
        id: number;
        nombre: string;
    }
  };
  asignatura?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  nivel?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  paralelo?: {
    id: number;
    nombre: string;
    codigo: string;
  }
}

// Hook de toast simulado (igual al que ya usas)
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

export default function GestionDocentesPage() {
  const { token, getToken } = useAuth() 
  const { toast } = useToast()

  // --- Estados del Componente ---
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [paralelos, setParalelos] = useState<Paralelo[]>([])
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // <-- AÑADE ESTO
  const [uploading, setUploading] = useState(false); // <-- AÑADE ESTO
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    facultad: "", // Almacenará el ID de la facultad
    carrera: "",  // Almacenará el ID de la carrera
    asignatura: "", // Almacenará el ID de la asignatura
    nivel: "", // Almacenará el ID del nivel
    paralelo: "", // Almacenará el ID del paralelo
    activo: true,
  })

  // --- Lógica de API ---
  const apiRequest = async (url: string, options = {}) => {
    const BASE_URL = 'http://localhost:4000/api';
    const fullUrl = `${BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }
    return fetch(fullUrl, { ...options, headers });
  }
    // ... (después de tu función handleSubmit)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

    const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Por favor, seleccione un archivo CSV para subir.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile); // 'file' debe coincidir con el backend

    try {
      // --- USA FETCH DIRECTAMENTE AQUÍ ---
      const response = await fetch('https://backend-une.onrender.com/api/profesores/upload', {
        method: 'POST',
        headers: {
          // NO pongas 'Content-Type'. El navegador lo hará por ti.
          "Authorization": `Bearer ${token || getToken()}`
        },
        body: formData,
      });
      // --- FIN DEL CAMBIO ---
      
      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message + (result.errors ? `\nErrores: ${result.errors.join(', ')}` : '');
        throw new Error(errorMessage);
      }

      toast({ title: "Éxito", description: result.message || "Docentes importados correctamente." });
      fetchData();
      setSelectedFile(null);
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      const [profesoresRes, facultadesRes, carrerasRes, nivelesRes, asignaturasRes, paralelosRes] = await Promise.all([
        apiRequest('/profesores'),
        apiRequest('/datos-academicos/facultades'),
        apiRequest('/datos-academicos/carreras'),
        apiRequest('/datos-academicos/niveles'),
        apiRequest('/datos-academicos/asignaturas'),
        apiRequest('/datos-academicos/paralelos')
      ]);

      if (!profesoresRes.ok || !facultadesRes.ok || !carrerasRes.ok || !nivelesRes.ok || !asignaturasRes.ok || !paralelosRes.ok) {
        throw new Error("Error al cargar los datos iniciales.");
      }

      const [profesoresData, facultadesData, carrerasData, nivelesData, asignaturasData, paralelosData] = await Promise.all([
        profesoresRes.json(), facultadesRes.json(), carrerasRes.json(), nivelesRes.json(), asignaturasRes.json(), paralelosRes.json()
      ]);

      setProfesores(profesoresData.data || []);
      setFacultades(facultadesData.data || []);
      setCarreras(carrerasData.data || []);
      setNiveles(nivelesData.data || []);
      setAsignaturas(asignaturasData.data || []);
      setParalelos(paralelosData.data || []);

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const carrerasFiltradas = useMemo(() => {
    if (!formData.facultad) return [];
    return carreras.filter(c => c.facultad_id === parseInt(formData.facultad, 10));
  }, [formData.facultad, carreras]);

  const asignaturasFiltradas = useMemo(() => {
    if (!formData.carrera) return [];
    return asignaturas.filter(a => a.carrera_id === parseInt(formData.carrera, 10));
  }, [formData.carrera, asignaturas]);
  
  // --- Manejadores de Eventos ---
  const handleSelectChange = (name: 'facultad' | 'carrera' | 'asignatura' | 'nivel' | 'paralelo', value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      // Si el campo que cambia es la facultad, reseteamos la carrera y asignatura
      if (name === 'facultad') {
        newState.carrera = "";
        newState.asignatura = "";
      }
      // Si el campo que cambia es la carrera, reseteamos la asignatura
      if (name === 'carrera') {
        newState.asignatura = "";
      }
      return newState;
    });
  };

  const handleNew = () => {
    setFormData({ nombres: "", apellidos: "", email: "", facultad: "", carrera: "", asignatura: "", nivel: "", paralelo: "", activo: true });
    setEditingId(null);
  };

  const handleEdit = (profesor: Profesor) => {
    // Para encontrar la facultad, necesitamos la carrera
    const carreraDelProfesor = carreras.find(c => c.id === profesor.carrera_id);
    
    setEditingId(profesor.id);
    setFormData({
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      email: profesor.email,
      facultad: carreraDelProfesor ? carreraDelProfesor.facultad_id.toString() : "",
      carrera: profesor.carrera_id.toString(),
      asignatura: profesor.asignatura_id ? profesor.asignatura_id.toString() : "",
      nivel: profesor.nivel_id ? profesor.nivel_id.toString() : "",
      paralelo: profesor.paralelo_id ? profesor.paralelo_id.toString() : "",
      activo: profesor.activo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" }); // Sube al formulario para editar
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar a este docente? Esta acción no se puede deshacer.")) {
      try {
        const response = await apiRequest(`/profesores/${id}`, { method: "DELETE" });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "No se pudo eliminar al docente.");
        }
        toast({ title: "Éxito", description: "Docente eliminado correctamente." });
        fetchData(); // Recargar la lista
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      email: formData.email,
      activo: formData.activo,
      carrera: parseInt(formData.carrera, 10),
      asignatura_id: formData.asignatura ? parseInt(formData.asignatura, 10) : null,
      nivel_id: formData.nivel ? parseInt(formData.nivel, 10) : null,
      paralelo_id: formData.paralelo ? parseInt(formData.paralelo, 10) : null
    };
    
    const url = editingId ? `/profesores/${editingId}` : '/profesores';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await apiRequest(url, { method, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al guardar los datos.");
      
      // --- CAMBIO AQUÍ ---
      // Mensaje más descriptivo para la creación de un nuevo docente
      const successMessage = editingId 
        ? 'Docente actualizado correctamente.' 
        : 'Docente creado. Se ha enviado un email para que establezca su contraseña.';
        
      toast({ title: "Éxito", description: successMessage });
      // --- FIN DEL CAMBIO ---

      fetchData();
      handleNew();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">GESTIÓN DE DOCENTES</h1>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <Card className="mb-8">
               <CardHeader>
                <CardTitle>
                  {editingId ? "Editar Docente" : "Gestión de Docentes"}
                </CardTitle>
                <CardDescription>
                  {editingId 
                    ? "Actualice los datos del docente." 
                    : "Registre un nuevo docente individualmente o importe múltiples desde un archivo CSV."
                  }
                </CardDescription>
              </CardHeader>

              {/* =========== INICIO DE LA CORRECCIÓN =========== */}
              <CardContent>
                {/* --- SECCIÓN DE CARGA MASIVA (FUERA DEL OTRO FORMULARIO) --- */}
                <div className="mb-8 p-4 border rounded-lg">
                  <Label className="text-lg font-semibold">Carga Masiva desde CSV</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Las columnas deben ser: nombres, apellidos, email, carrera_nombre.
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                    </div>
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploading || !selectedFile} 
                      className="bg-blue-600 hover:bg-blue-700 self-start"
                    >
                      {uploading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> PROCESANDO...</>
                      ) : (
                        <><UserPlus className="mr-2 h-4 w-4" /> IMPORTAR</>
                      )}
                    </Button>
                  </div>
                   {selectedFile && <p className="text-sm text-muted-foreground mt-2">Archivo: {selectedFile.name}</p>}
                </div>

                <hr className="my-6" />

                {/* --- FORMULARIO DE REGISTRO INDIVIDUAL --- */}
                <Label className="text-lg font-semibold">
                  {editingId ? "Editar Docente" : "Registrar Nuevo Docente"}
                </Label>
                <form onSubmit={handleSubmit} className="grid gap-6 mt-4">
                    {/* El resto de tus inputs (Nombres, Apellidos, etc.) va aquí SIN CAMBIOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="nombres">Nombres</Label><Input id="nombres" name="nombres" placeholder="Ej: Juan Carlos" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} required /></div>
                        <div className="grid gap-2"><Label htmlFor="apellidos">Apellidos</Label><Input id="apellidos" name="apellidos" placeholder="Ej: Pérez González" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required /></div>
                    </div>
                    <div className="grid gap-2"><Label htmlFor="email">Correo Electrónico</Label><Input id="email" name="email" type="email" placeholder="juan.perez@universidad.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="facultad">Facultad</Label><Select name="facultad" value={formData.facultad} onValueChange={(v) => handleSelectChange('facultad', v)} required><SelectTrigger id="facultad"><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent>{facultades.map((f) => (<SelectItem key={f.id} value={f.id.toString()}>{f.nombre}</SelectItem>))}</SelectContent></Select></div>
                        <div className="grid gap-2"><Label htmlFor="carrera">Carrera Principal</Label><Select name="carrera" value={formData.carrera} onValueChange={(v) => handleSelectChange('carrera', v)} disabled={!formData.facultad} required><SelectTrigger id="carrera"><SelectValue placeholder="Seleccione una carrera" /></SelectTrigger><SelectContent>{carrerasFiltradas.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>))}</SelectContent></Select></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="grid gap-2"><Label htmlFor="asignatura">Asignatura</Label><Select name="asignatura" value={formData.asignatura} onValueChange={(v) => handleSelectChange('asignatura', v)} disabled={!formData.carrera}><SelectTrigger id="asignatura"><SelectValue placeholder="Seleccione asignatura" /></SelectTrigger><SelectContent>{asignaturasFiltradas.map((a) => (<SelectItem key={a.id} value={a.id.toString()}>{a.nombre} ({a.codigo})</SelectItem>))}</SelectContent></Select></div>
                        <div className="grid gap-2"><Label htmlFor="nivel">Nivel</Label><Select name="nivel" value={formData.nivel} onValueChange={(v) => handleSelectChange('nivel', v)}><SelectTrigger id="nivel"><SelectValue placeholder="Seleccione nivel" /></SelectTrigger><SelectContent>{niveles.map((n) => (<SelectItem key={n.id} value={n.id.toString()}>{n.nombre}</SelectItem>))}</SelectContent></Select></div>
                        <div className="grid gap-2"><Label htmlFor="paralelo">Paralelo</Label><Select name="paralelo" value={formData.paralelo} onValueChange={(v) => handleSelectChange('paralelo', v)}><SelectTrigger id="paralelo"><SelectValue placeholder="Seleccione paralelo" /></SelectTrigger><SelectContent>{paralelos.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>))}</SelectContent></Select></div>
                    </div>
                    <div className="flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1"><p className="text-sm font-medium">Estado</p><p className="text-sm text-muted-foreground">Define si el docente está activo.</p></div>
                        <div className="flex items-center space-x-2"><Label className={!formData.activo ? "text-red-600" : "text-gray-500"}>Inactivo</Label><Switch checked={formData.activo} onCheckedChange={(c) => setFormData(p => ({ ...p, activo: c }))} /><Label className={formData.activo ? "text-green-600" : "text-gray-500"}>Activo</Label></div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />GUARDANDO...</> : <><Save className="mr-2 h-4 w-4" />GUARDAR</>}</Button>
                        <Button type="button" onClick={handleNew} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={submitting}><Plus className="mr-2 h-4 w-4" />NUEVO</Button>
                    </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Docentes Registrados</CardTitle></CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  {loading ? (<div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>) : (
                    <Table>
                      <TableHeader><TableRow className="bg-gray-50"><TableHead>N.</TableHead><TableHead>Docente</TableHead><TableHead>Carrera</TableHead><TableHead>Asignatura</TableHead><TableHead>Nivel</TableHead><TableHead>Paralelo</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {profesores.map((profesor, index) => (
                          <TableRow key={profesor.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                                <div className="font-medium">{profesor.nombres} {profesor.apellidos}</div>
                                <div className="text-sm text-muted-foreground">{profesor.email}</div>
                            </TableCell>
                            <TableCell>{profesor.carrera?.nombre || "N/A"}</TableCell>
                            <TableCell>
                              {profesor.asignatura ? (
                                <div>
                                  <div className="font-medium">{profesor.asignatura.nombre}</div>
                                  <div className="text-xs text-muted-foreground">{profesor.asignatura.codigo}</div>
                                </div>
                              ) : <span className="text-muted-foreground">No asignado</span>}
                            </TableCell>
                            <TableCell>{profesor.nivel?.nombre || <span className="text-muted-foreground">No asignado</span>}</TableCell>
                            <TableCell>{profesor.paralelo?.nombre || <span className="text-muted-foreground">No asignado</span>}</TableCell>
                            <TableCell><Badge variant={profesor.activo ? "default" : "secondary"} className={profesor.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{profesor.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(profesor)} className="text-blue-600 border-blue-200 hover:bg-blue-50"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(profesor.id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {profesores.length === 0 && !loading && (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No hay docentes registrados.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}