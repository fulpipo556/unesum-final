"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { MainHeader } from "@/components/layout/main-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { login } = useAuth()
  const router = useRouter()

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
  
    try {
      // 1. Llama a la función de login.
      const success = await login(email, password);
      
      if (success) {
        // --- ¡LA LÓGICA DE REDIRECCIÓN SEPARADA! ---

        // 2. Después de un login exitoso, el AuthContext ha guardado
        //    los datos del usuario. Los leemos directamente del localStorage
        //    para obtener la información más actualizada.
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

        // 3. Comparamos el rol y redirigimos a la ruta SEPARADA.
        if (userData.rol === 'administrador') {
          router.push('/dashboard/admin'); // <-- RUTA PARA EL DASHBOARD DEL ADMIN

        } else if (userData.rol === 'profesor' || userData.rol === 'docente') {
          router.push('/dashboard/docente'); // <-- RUTA PARA EL DASHBOARD DEL PROFESOR

        } else {
          // Si hay otros roles o un caso inesperado, puedes enviarlos a una página por defecto.
          setError("Rol de usuario no reconocido. Contacte al soporte.");
          setIsLoading(false); // Detener la carga
          return; // Salir de la función
        }
        
      } else {
        // Si login() devuelve false, las credenciales son incorrectas.
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
      }
    } catch (error) {
      setError("Error al iniciar sesión. Intente nuevamente.");
    } finally {
      // Solo detén la carga si hubo un error. Si hay éxito, la redirección se encargará.
      // setIsLoading(false) se maneja en el bloque if/else.
    }
  };
  const demoUsers = [
    { email: "admin@unesum.edu.ec", password: "admin123", role: "Administrador" },
    { email: "docente@unesum.edu.ec", password: "docente123", role: "Docente" },
    { email: "decano@unesum.edu.ec", password: "decano123", role: "Decano" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      <MainHeader />

      <main className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Login Form */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-700">Iniciar Sesión</CardTitle>
              <CardDescription>Accede al sistema de gestión académica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@unesum.edu.ec"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios de Demostración</CardTitle>
              <CardDescription>Utiliza estas credenciales para probar el sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoUsers.map((user, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">{user.role}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail(user.email)
                        setPassword(user.password)
                      }}
                    >
                      Usar
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                      <strong>Contraseña:</strong> {user.password}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
