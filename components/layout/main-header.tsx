import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react' // Importa iconos si los usas

export function MainHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-emerald-700 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo y título */}
          <Link href="/dashboard">
            <h1 className="text-xl font-bold cursor-pointer">UNESUM</h1>
          </Link>
        </div>
        
        {/* Información de usuario y botón de logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-sm hidden md:block">
              <span className="opacity-80">Bienvenido,</span>{' '}
              <span className="font-medium">{user.nombres} {user.apellidos}</span>
              <span className="text-xs ml-2 bg-emerald-600 px-2 py-0.5 rounded-full">
                {user.rol}
              </span>
            </div>
            
            {/* BOTÓN DE CERRAR SESIÓN */}
            <Button 
              onClick={logout} 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-emerald-600 flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}