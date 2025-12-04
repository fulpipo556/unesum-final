"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

interface User {
  id: number
  nombres: string
  apellidos: string
  correo_electronico: string
  rol: string
  email: string;     // <-- ¡CAMBIO AQUÍ! (de correo_electronico a email)
  cedula_identidad: string
  telefono?: string
  fecha_nacimiento?: Date
  direccion?: string
  facultad?: string
  carrera?: string
  estado: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  token: string | null
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  clearError: () => void
  getToken: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const savedUser = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('user_data') || 'null') : null;
    const savedToken = typeof window !== 'undefined' ? 
    localStorage.getItem('token') : null;  
  const [state, setState] = useState<AuthState>({
    user: savedUser, // Usar usuario guardado como valor inicial
    isLoading: !savedUser, // Si hay usuario, no mostrar loading
    error: null ,
    token: savedToken
  })

  // Configurar interceptor global para axios
  useEffect(() => {
    // Interceptor para solicitudes - añade token automáticamente
    const requestInterceptor = axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    const responseInterceptor = axios.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        // MODIFICAR SOLO ESTA LÍNEA: Eliminar la condición de 404
        if (error.response?.status === 401) {
          // Mantén el resto igual
          // Limpiar la sesión
          localStorage.removeItem('token');
          localStorage.removeItem('token_time');
          delete axios.defaults.headers.common['Authorization'];
          setState(prev => ({ ...prev, user: null, token: null, isLoading: false, error: null }));
          // Redireccionar a login
          if (typeof window !== 'undefined' && 
              !window.location.pathname.includes('/login')) {
            window.location.replace('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // Limpiar interceptores al desmontar
      axios.interceptors.request.eject(requestInterceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [])

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth()
    
    // Verificar cada minuto si el token ha expirado
    const sessionCheckTimer = setInterval(() => {
      const token = localStorage.getItem('token')
      const tokenTime = localStorage.getItem('token_time')
      
      if (token && tokenTime) {
        const elapsed = Date.now() - parseInt(tokenTime)
        const oneHour = 60 * 60 * 1000 // 1 hora en ms
        
        if (elapsed > oneHour) {
          console.log('Sesión expirada por tiempo (verificación periódica)')
          logout()
        }
      }
    }, 60000) // Verificar cada minuto

    return () => clearInterval(sessionCheckTimer)
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    const tokenTime = localStorage.getItem('token_time')
    const savedUser = localStorage.getItem('user_data')
    if (token && state.token !== token) {
      setState(prev => ({ ...prev, token }))
    }
    
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false, token: null }))
      return
    }
    // Verificar si el token está próximo a expirar basado en el timestamp guardado
    if (tokenTime) {
      const elapsed = Date.now() - parseInt(tokenTime)
      const oneHour = 60 * 60 * 1000 // 1 hora en ms
      
      if (elapsed > oneHour) {
        console.log('Token expirado por tiempo (verificación inicial)')
        logout()
        return
      }
    } else {
      // Si no hay tokenTime, establecerlo ahora
      localStorage.setItem('token_time', Date.now().toString())
    }
    if (savedUser && !state.user) {
      setState(prev => ({ 
        ...prev, 
        user: JSON.parse(savedUser),
        isLoading: false 
      }))
    }
    try {
      // El token se añade automáticamente por el interceptor
      const response = await axios.get(`${API_URL}/auth/me`)
      
      if (response.data.success) {
        setState(prev => ({ 
          ...prev, 
          user: response.data.user,
          isLoading: false 
        }))
        localStorage.setItem('user_data', JSON.stringify(response.data.user))
      } else if (savedUser) {
        // Si la petición falla pero hay datos guardados, no hacer logout
        console.log('Respuesta sin éxito, usando datos guardados')
      } else {
        logout()
      }
    } catch (error) {
      console.log('Error al verificar autenticación', error)
      if (!savedUser) {
        logout()
      }
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      // La URL '/auth/login' ya es la correcta para nuestro backend unificado.
      const response = await axios.post(`${API_URL}/auth/login`, {
        // --- ¡CAMBIO CRÍTICO AQUÍ! ---
        // Cambia los nombres de las propiedades para que coincidan con el backend.
        email: email,
        password: password
      })
      
      if (response.data.success) {
        // El backend devuelve 'user', lo cual ya coincide con tu código. ¡Perfecto!
        const { token, user } = response.data
        
        localStorage.setItem('token', token)
        localStorage.setItem('token_time', Date.now().toString())
        localStorage.setItem('user_data', JSON.stringify(user))
        
        setState(prev => ({ ...prev, user, token, isLoading: false }))
        return true
      } else {
        setState(prev => ({ 
          ...prev, 
          error: response.data.message || 'Error de inicio de sesión',
          isLoading: false 
        }))
        return false
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      setState(prev => ({ 
        ...prev, 
        error: axiosError.response?.data?.message || 'Error de inicio de sesión',
        isLoading: false 
      }))
      return false
    }
  }
  const register = async (userData: Omit<User, 'id'>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData)
      return { success: true, data: response.data }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      return {
        success: false,
        error: axiosError.response?.data?.message || 'Error en el registro'
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const logout = () => {
    try {
      // 1. Eliminar token del localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('token_time');
      localStorage.removeItem('user_data');
      // 2. Eliminar token de las cabeceras de axios
      delete axios.defaults.headers.common['Authorization'];
      
       // 3. Limpiar estado de usuario y token
       setState({ user: null, token: null, isLoading: false, error: null });
      
      // 4. Redirección forzada al login (CAMBIADO)
      if (typeof window !== 'undefined') {
        console.log('Redirigiendo a login...');
        window.location.href = '/login'; // CAMBIO: /auth/signin → /login
      }
    } catch (error) {
      console.error('Error durante logout:', error);
      
      // Si hay error, intentar redirección directa (CAMBIADO)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'; // CAMBIO: /auth/signin → /login
      }
    }
  };

  const clearError = () => setState(prev => ({ ...prev, error: null }))
  const getToken = (): string => {
    // Si está en el estado, devolverlo
    if (state.token) return state.token
    
    // Si no, intentar obtenerlo del localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) return token
    }
    
    return ''
  }
  return (
    <AuthContext.Provider value={{ 
      ...state, 
      login, 
      register, 
      logout,
      clearError,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}