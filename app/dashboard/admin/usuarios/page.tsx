"use client"

import { useEffect, useState, useMemo } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainHeader } from '@/components/layout/main-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Save, FileDown } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface Rol { id: number; nombre: string; codigo: string }
interface Facultad { id: number; nombre: string }
interface Carrera { id: number; nombre: string; facultad_id: number }
interface Nivel { id: number; nombre: string; codigo: string }
interface Asignatura { id: number; nombre: string; codigo: string; carrera_id: number }

interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  username?: string;
  rol?: string;
  roles: Rol[];
  facultades: Facultad[];
  carreras: Carrera[];
  niveles: Nivel[];
  asignaturas: Asignatura[];
}

export default function GestionUsuariosPage() {
  const { token } = useAuth();
  const isAuth = !!token;
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);

  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    username: '',
    password: '',
    rolesIds: [] as number[],
    facultadIds: [] as number[],
    carreraIds: [] as number[],
    nivelIds: [] as number[],
    asignaturaIds: [] as number[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const [uRes, rRes, fRes, cRes, nRes, aRes] = await Promise.all([
          fetch('http://localhost:4000/api/usuarios', { headers }),
          fetch('http://localhost:4000/api/roles', { headers }),
          fetch('http://localhost:4000/api/facultades', { headers }),
          fetch('http://localhost:4000/api/carreras', { headers }),
          fetch('http://localhost:4000/api/niveles', { headers }),
          fetch('http://localhost:4000/api/asignaturas', { headers }),
        ]);
        const [uData, rData, fData, cData, nData, aData] = await Promise.all([
          uRes.json(), rRes.json(), fRes.json(), cRes.json(), nRes.json(), aRes.json()
        ]);
        setUsuarios(uData.data || uData || []);
        setRoles(rData.data || rData || []);
        setFacultades(fData.data || fData || []);
        setCarreras(cData.data || cData || []);
        setNiveles(nData.data || nData || []);
        setAsignaturas(aData.data || aData || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const carrerasPorFacultad = useMemo(() => {
    if (!form.facultadIds.length) return carreras;
    const setF = new Set(form.facultadIds);
    return carreras.filter(c => setF.has(c.facultad_id));
  }, [form.facultadIds, carreras]);

  const asignaturasPorCarrera = useMemo(() => {
    if (!form.carreraIds.length) return asignaturas;
    const setC = new Set(form.carreraIds);
    return asignaturas.filter(a => setC.has(a.carrera_id));
  }, [form.carreraIds, asignaturas]);

  async function handleCreate() {
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('http://localhost:4000/api/usuarios', {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Error al crear usuario');
      const data = await res.json();
      const nuevo = data.data || data;
      setUsuarios(prev => [...prev, nuevo]);
      setForm({ nombres: '', apellidos: '', correo_electronico: '', username: '', password: '', rolesIds: [], facultadIds: [], carreraIds: [], nivelIds: [], asignaturaIds: [] });
    } catch (e) {
      console.error(e);
      alert('No se pudo crear el usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('http://localhost:4000/api/usuarios/export', { headers });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'usuarios_export.xlsx'; a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('http://localhost:4000/api/usuarios/import', {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await res.json();
      
      if (res.ok) {
        alert(`✅ Importación exitosa!\n\n📊 Total: ${result.total}\n✅ Exitosos: ${result.exitosos}\n❌ Errores: ${result.errores}`);
        // Recargar la lista
        const uRes = await fetch('http://localhost:4000/api/usuarios', { headers });
        const uData = await uRes.json();
        setUsuarios(uData.data || uData || []);
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error al importar el archivo');
    } finally {
      setSaving(false);
      // Limpiar input
      e.target.value = '';
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h1 className="text-2xl font-bold">GESTIÓN DE USUARIOS</h1>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50" onClick={handleExport}>
                📥 Exportar Excel
              </Button>
              <label htmlFor="import-file">
                <Button variant="outline" size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50" asChild>
                  <span>📤 Importar CSV/Excel</span>
                </Button>
                <input id="import-file" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} disabled={saving} />
              </label>
            </div>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Registrar Nuevo Usuario</CardTitle>
                <CardDescription>Usuarios con múltiples roles, facultades, carreras, cursos y materias</CardDescription>
              </CardHeader>
              <CardContent className={`grid gap-6 ${!isAuth ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Datos básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2"><Label>Nombres</Label><Input value={form.nombres} onChange={e=>setForm({...form, nombres:e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Apellidos</Label><Input value={form.apellidos} onChange={e=>setForm({...form, apellidos:e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="grid gap-2"><Label>Correo</Label><Input type="email" value={form.correo_electronico} onChange={e=>setForm({...form, correo_electronico:e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Usuario</Label><Input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Clave</Label><Input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} /></div>
                </div>

                {/* Selectores múltiples - Fila 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Roles */}
                  <div className="grid gap-2">
                    <Label>Roles</Label>
                    <Select onValueChange={(val)=>{ const id = parseInt(val); setForm(p=>({ ...p, rolesIds: p.rolesIds.includes(id) ? p.rolesIds : [...p.rolesIds, id] })); }} disabled={!isAuth}>
                      <SelectTrigger><SelectValue placeholder="Seleccione rol" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r=> <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap text-sm text-blue-700">{form.rolesIds.map(id=>{ const r=roles.find(rr=>rr.id===id); return (<span key={id} className="px-2 py-1 bg-blue-50 border rounded cursor-pointer hover:bg-blue-100" onClick={()=>setForm(p=>({...p, rolesIds: p.rolesIds.filter(x=>x!==id)}))}>{r?.nombre} ×</span>)})}</div>
                  </div>

                  {/* Facultades */}
                  <div className="grid gap-2">
                    <Label>Facultades</Label>
                    <Select onValueChange={(val)=>{ const id = parseInt(val); setForm(p=>({ ...p, facultadIds: p.facultadIds.includes(id) ? p.facultadIds : [...p.facultadIds, id] })); }} disabled={!isAuth}>
                      <SelectTrigger><SelectValue placeholder="Seleccione facultad" /></SelectTrigger>
                      <SelectContent>
                        {facultades.map(f=> <SelectItem key={f.id} value={String(f.id)}>{f.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap text-sm text-emerald-700">{form.facultadIds.map(id=>{ const f=facultades.find(ff=>ff.id===id); return (<span key={id} className="px-2 py-1 bg-emerald-50 border rounded cursor-pointer hover:bg-emerald-100" onClick={()=>setForm(p=>({...p, facultadIds: p.facultadIds.filter(x=>x!==id)}))}>{f?.nombre} ×</span>)})}</div>
                  </div>

                  {/* Carreras */}
                  <div className="grid gap-2">
                    <Label>Carreras</Label>
                    <Select onValueChange={(val)=>{ const id = parseInt(val); setForm(p=>({ ...p, carreraIds: p.carreraIds.includes(id) ? p.carreraIds : [...p.carreraIds, id] })); }} disabled={!isAuth}>
                      <SelectTrigger><SelectValue placeholder="Seleccione carrera" /></SelectTrigger>
                      <SelectContent>
                        {carrerasPorFacultad.map(c=> <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap text-sm text-purple-700">{form.carreraIds.map(id=>{ const c=carreras.find(cc=>cc.id===id); return (<span key={id} className="px-2 py-1 bg-purple-50 border rounded cursor-pointer hover:bg-purple-100" onClick={()=>setForm(p=>({...p, carreraIds: p.carreraIds.filter(x=>x!==id)}))}>{c?.nombre} ×</span>)})}</div>
                  </div>
                </div>

                {/* Selectores múltiples - Fila 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Niveles/Cursos */}
                  <div className="grid gap-2">
                    <Label>Cursos (Niveles)</Label>
                    <Select onValueChange={(val)=>{ const id = parseInt(val); setForm(p=>({ ...p, nivelIds: p.nivelIds.includes(id) ? p.nivelIds : [...p.nivelIds, id] })); }} disabled={!isAuth}>
                      <SelectTrigger><SelectValue placeholder="Seleccione curso" /></SelectTrigger>
                      <SelectContent>
                        {niveles.map(n=> <SelectItem key={n.id} value={String(n.id)}>{n.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap text-sm text-orange-700">{form.nivelIds.map(id=>{ const n=niveles.find(nn=>nn.id===id); return (<span key={id} className="px-2 py-1 bg-orange-50 border rounded cursor-pointer hover:bg-orange-100" onClick={()=>setForm(p=>({...p, nivelIds: p.nivelIds.filter(x=>x!==id)}))}>{n?.nombre} ×</span>)})}</div>
                  </div>

                  {/* Asignaturas/Materias */}
                  <div className="grid gap-2">
                    <Label>Materias (Asignaturas)</Label>
                    <Select onValueChange={(val)=>{ const id = parseInt(val); setForm(p=>({ ...p, asignaturaIds: p.asignaturaIds.includes(id) ? p.asignaturaIds : [...p.asignaturaIds, id] })); }} disabled={!isAuth}>
                      <SelectTrigger><SelectValue placeholder="Seleccione materia" /></SelectTrigger>
                      <SelectContent>
                        {asignaturasPorCarrera.map(a=> <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap text-sm text-pink-700">{form.asignaturaIds.map(id=>{ const a=asignaturas.find(aa=>aa.id===id); return (<span key={id} className="px-2 py-1 bg-pink-50 border rounded cursor-pointer hover:bg-pink-100" onClick={()=>setForm(p=>({...p, asignaturaIds: p.asignaturaIds.filter(x=>x!==id)}))}>{a?.nombre} ×</span>)})}</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleCreate} disabled={saving || !isAuth} className="bg-emerald-600 hover:bg-emerald-700">{saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</>) : (<><Save className="mr-2 h-4 w-4"/>Guardar</>)}</Button>
                  <Button onClick={handleExport} disabled={!isAuth} variant="outline" className="border-blue-500 text-blue-600"><FileDown className="mr-2 h-4 w-4"/>Exportar Excel</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usuarios Registrados</CardTitle>
                <CardDescription>Listado completo con todas las asociaciones</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600"/></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Apellido</TableHead>
                          <TableHead>Correo</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Facultad(es)</TableHead>
                          <TableHead>Carrera(s)</TableHead>
                          <TableHead>Curso(s)</TableHead>
                          <TableHead>Materia(s)</TableHead>
                          <TableHead>Rol(es)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map(u => (
                          <TableRow key={u.id}>
                            <TableCell>{u.nombres}</TableCell>
                            <TableCell>{u.apellidos}</TableCell>
                            <TableCell>{u.correo_electronico}</TableCell>
                            <TableCell>{u.username || ''}</TableCell>
                            <TableCell>{(u.facultades||[]).map(f=>f.nombre).join(', ')}</TableCell>
                            <TableCell>{(u.carreras||[]).map(c=>c.nombre).join(', ')}</TableCell>
                            <TableCell>{(u.niveles||[]).map(n=>n.nombre).join(', ')}</TableCell>
                            <TableCell>{(u.asignaturas||[]).map(a=>a.nombre).join(', ')}</TableCell>
                            <TableCell>{(u.roles && u.roles.length > 0) ? u.roles.map(r=>r.nombre).join(', ') : (u.rol || '')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
