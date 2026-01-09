# Importación Masiva de Docentes con Múltiples Asignaturas

## 📋 Descripción General

El sistema permite importar múltiples profesores desde un archivo CSV con soporte para:
- **Múltiples asignaturas** por docente (separadas por comas)
- **Múltiples niveles** por docente (separados por comas)
- **Múltiples paralelos** por nivel (agrupados con paréntesis o separados por comas)
- **Múltiples roles** por docente (separados por comas)

## 📁 Formato del Archivo CSV

### Columnas Requeridas

| Columna | Descripción | Ejemplo | Obligatorio |
|---------|-------------|---------|-------------|
| `Docente` | Nombre completo del profesor | "Fulco Pincay" | ✅ Sí |
| `Carrera` | Nombre de la carrera | "Tecnologías de la Información" | ✅ Sí |
| `Asinatura` | Una o más asignaturas (separadas por comas) | "Programación I, Programación III" | ❌ No |
| `Nivel` | Uno o más niveles (separados por comas) | "Segundo, Cuarto" | ❌ No |
| `Paralelo` | Uno o más paralelos (separados por comas o agrupados) | "(A,B,C), (A,B)" o "D,E" | ❌ No |
| `Rol` | Uno o más roles (separados por comas) | "Docente, Coordinador" | ❌ No |

### Ejemplo Completo

```csv
Docente,Carrera,Asinatura,Nivel,Paralelo,Rol
Fulco Pincay,Tecnologías de la Información,"Programación I, Programación III","Segundo, Cuarto","(A,B,C), (A,B)",Docente
Barcia Luis,Tecnologías de la Información,Programación I,Segundo,"D,E",Docente
María García,Tecnologías de la Información,"Bases de Datos, Redes","Tercero, Cuarto","(A,B), (C,D)","Docente, Coordinador"
Juan Pérez,Tecnologías de la Información,Matemáticas,Primero,"A,B,C",Docente
```

## 🔄 Lógica de Procesamiento

### 1. Parseo de Asignaturas Múltiples

Cuando se especifica:
```csv
Asinatura: "Programación I, Programación III"
```

El sistema:
1. Divide el texto por comas
2. Elimina espacios en blanco
3. Busca cada asignatura en la base de datos (búsqueda flexible por nombre)
4. Asocia la primera asignatura encontrada al profesor

**Ejemplo de búsqueda:**
- "Programación I" → Busca en BD asignaturas que contengan "programación i" (case-insensitive)
- Si existe "Programación I" → ✅ Match
- Si no existe → ⚠️ Se registra como fallido

### 2. Parseo de Niveles Múltiples

Cuando se especifica:
```csv
Nivel: "Segundo, Cuarto"
```

El sistema:
1. Divide por comas
2. Busca cada nivel en la BD
3. Asocia el primer nivel encontrado al profesor

### 3. Parseo de Paralelos

#### Formato con Paréntesis (Agrupados por Nivel)
```csv
Paralelo: "(A,B,C), (A,B)"
```

- `(A,B,C)` → Paralelos para el **primer nivel** (ej. Segundo)
- `(A,B)` → Paralelos para el **segundo nivel** (ej. Cuarto)

El sistema:
1. Detecta grupos entre paréntesis: `/\(([^)]+)\)/g`
2. Extrae las letras dentro de cada grupo
3. Asigna el primer paralelo encontrado al profesor

#### Formato Simple (Sin Paréntesis)
```csv
Paralelo: "D,E"
```

El sistema:
1. Divide por comas
2. Busca cada paralelo en la BD
3. Asocia el primer paralelo encontrado

### 4. Parseo de Roles

```csv
Rol: "Docente, Coordinador"
```

El sistema:
1. Divide por comas
2. Guarda todos los roles en un array
3. Los almacena en el campo `roles` (tipo TEXT[]) del profesor

## 🗄️ Estructura de la Base de Datos

### Tabla: `profesores`

```sql
CREATE TABLE profesores (
  id SERIAL PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  carrera_id INTEGER REFERENCES carreras(id),
  asignatura_id INTEGER REFERENCES asignaturas(id),
  nivel_id INTEGER REFERENCES niveles(id),
  paralelo_id INTEGER REFERENCES paralelos(id),
  roles TEXT[] DEFAULT '{}',  -- Array de roles
  activo BOOLEAN DEFAULT true,
  password VARCHAR(255) NOT NULL,
  passwordResetToken VARCHAR(255),
  passwordResetExpires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas eficientes en roles
CREATE INDEX idx_profesores_roles ON profesores USING GIN(roles);
```

### Campos Asociados

- **carrera_id**: Referencia a la tabla `carreras`
- **asignatura_id**: Primera asignatura del CSV (si hay múltiples)
- **nivel_id**: Primer nivel del CSV (si hay múltiples)
- **paralelo_id**: Primer paralelo del CSV (si hay múltiples)
- **roles**: Array de strings con todos los roles asignados

## 🔐 Proceso de Creación de Usuario

Para cada docente importado:

1. **Generación de Credenciales**
   ```javascript
   email = fila.email || `${nombres}.${apellidos}@unesum.edu.ec`
   password = crypto.randomBytes(8).toString('hex') // Temporal
   ```

2. **Token de Restablecimiento**
   ```javascript
   resetToken = crypto.randomBytes(32).toString('hex')
   hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
   expirationDate = Date.now() + 12 * 60 * 60 * 1000 // 12 horas
   ```

3. **Envío de Email de Bienvenida**
   - Se envía automáticamente un correo con el link de configuración
   - El docente debe establecer su contraseña segura en 12 horas
   - URL: `http://localhost:3000/configurar-password/${resetToken}`

## 📡 Endpoint de Importación

### POST `/api/profesores/upload`

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
```

**Body (FormData):**
- `file`: Archivo CSV

**Response Exitosa:**
```json
{
  "success": true,
  "message": "Importación completada: 3 exitosos, 1 fallido",
  "data": {
    "total": 4,
    "exitosos": [
      {
        "nombre": "Fulco Pincay",
        "email": "fulco.pincay@unesum.edu.ec",
        "asignaturas": ["Programación I", "Programación III"],
        "niveles": ["Segundo", "Cuarto"],
        "paralelos": ["A", "B", "C"],
        "roles": ["Docente"]
      }
    ],
    "fallidos": [
      {
        "fila": { "Docente": "Juan Pérez", ... },
        "error": "Carrera 'Ingeniería Mecánica' no encontrada"
      }
    ]
  }
}
```

## 🎯 Ejemplo de Uso en el Frontend

```tsx
const handleUpload = async () => {
  const formData = new FormData();
  formData.append('file', selectedFile);

  const response = await fetch('http://localhost:4000/api/profesores/upload', {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Exitosos:', result.data.exitosos.length);
    console.log('Fallidos:', result.data.fallidos.length);
  }
};
```

## ⚠️ Manejo de Errores

El sistema valida:

1. **Archivo vacío** → `"El archivo CSV está vacío"`
2. **Formato incorrecto** → `"Solo se permiten archivos CSV"`
3. **Campos obligatorios faltantes** → `"Docente y Carrera son campos obligatorios"`
4. **Carrera no encontrada** → `"Carrera 'XXX' no encontrada"`
5. **Email duplicado** → `"Ya existe un profesor con el email XXX"`
6. **Asignatura no encontrada** → Se registra en `fallidos` con el nombre exacto
7. **Error al enviar email** → Se registra pero no impide la creación del profesor

## 🔍 Búsqueda Flexible

El sistema utiliza búsquedas **case-insensitive** y **parciales**:

```javascript
// Ejemplo: Buscar "Programación I"
const asignatura = todasAsignaturas.find(asig => 
  asig.nombre.toLowerCase().includes("programación i".toLowerCase()) ||
  "programación i".toLowerCase().includes(asig.nombre.toLowerCase())
);
```

Esto permite que funcione con variaciones como:
- "programación I" ✅
- "Programacion I" ✅
- "PROGRAMACIÓN I" ✅
- "Proramación I" (con typo) → ⚠️ Podría no encontrarse

## 📊 Resultados de Importación

El sistema devuelve un resumen detallado:

```javascript
{
  total: 4,           // Total de filas procesadas
  exitosos: [         // Profesores creados exitosamente
    {
      nombre: "Fulco Pincay",
      email: "fulco.pincay@unesum.edu.ec",
      asignaturas: ["Programación I", "Programación III"],
      niveles: ["Segundo", "Cuarto"],
      paralelos: ["A", "B", "C"],
      roles: ["Docente"]
    }
  ],
  fallidos: [         // Registros que fallaron
    {
      fila: { Docente: "Juan Pérez", ... },
      error: "Asignatura 'Matemáticas Aplicadas' no encontrada"
    }
  ]
}
```

## 🔧 Archivos Modificados

### Backend

1. **`my-node-backend/src/routes/profesor.routes.js`**
   - Configuración de Multer para archivos CSV
   - Ruta POST `/upload` con autorización de administrador

2. **`my-node-backend/src/controllers/profesor.controller.js`**
   - Método `uploadCSV` con lógica de parseo
   - Búsqueda flexible de asignaturas, niveles, paralelos
   - Generación automática de credenciales
   - Envío de emails de bienvenida

### Frontend

3. **`app/dashboard/admin/docentes/page.tsx`**
   - Función `handleUpload` actualizada
   - Muestra resultados detallados de la importación
   - Manejo de errores con toast notifications

## 📝 Notas Importantes

1. **Solo la primera asignatura/nivel/paralelo se guardan**: Aunque el CSV acepta múltiples valores, por ahora solo se almacena el primero encontrado en las columnas `asignatura_id`, `nivel_id`, `paralelo_id`.

2. **Los roles SÍ se guardan todos**: El campo `roles` es un array que almacena todos los roles especificados.

3. **Emails automáticos**: Si no se especifica un email en el CSV, se genera automáticamente con el formato `nombres.apellidos@unesum.edu.ec`.

4. **Contraseñas temporales**: Todos los profesores importados reciben un email para configurar su contraseña. La contraseña temporal hasheada nunca se comparte directamente.

5. **Expiración de tokens**: Los tokens de restablecimiento expiran en 12 horas.

## 🚀 Pasos para Probar

1. Preparar archivo CSV con el formato especificado
2. Ir a la página de administración de docentes
3. Hacer clic en el botón de importación (ícono de upload)
4. Seleccionar el archivo CSV
5. Hacer clic en "Subir"
6. Revisar los resultados en el toast notification
7. Verificar en la tabla que los profesores se crearon correctamente
8. Revisar la columna "Roles" para ver los badges de roles asignados

## 📧 Configuración de Email

Asegurarse de tener configuradas las variables de entorno en `.env`:

```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_de_aplicacion
EMAIL_FROM=noreply@unesum.edu.ec
```

Para Gmail, usar una **contraseña de aplicación** (App Password), no la contraseña normal.

---

**Última actualización:** Diciembre 2024  
**Autor:** Sistema UNESUM  
**Versión:** 2.0
