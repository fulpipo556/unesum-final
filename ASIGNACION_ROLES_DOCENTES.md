# Sistema de Asignación de Múltiples Roles a Docentes

## 📋 Resumen de Implementación

Se ha implementado exitosamente la funcionalidad para asignar múltiples roles a los docentes desde el panel de administración.

## ✅ Cambios Realizados

### 1. **Base de Datos**
- ✅ Agregada columna `roles` tipo `TEXT[]` (array de strings) a la tabla `profesores`
- ✅ Creado índice GIN para búsquedas eficientes: `idx_profesores_roles`
- ✅ Script SQL ejecutado exitosamente: `add-roles-to-profesores.sql`

### 2. **Backend (Node.js/Sequelize)**

#### Modelo: `profesores.js`
```javascript
roles: {
  type: DataTypes.ARRAY(DataTypes.STRING),
  allowNull: true,
  defaultValue: []
}
```

#### Controlador: `profesor.controller.js`
- **exports.create**: Ahora acepta y guarda el array de roles
- **exports.update**: Permite actualizar los roles asignados
- Validación: Convierte roles a array si viene en otro formato

### 3. **Frontend (Next.js/React)**

#### Componente: `app/dashboard/admin/docentes/page.tsx`

**Estado agregado:**
```typescript
const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([])
```

**FormData actualizado:**
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  roles: [] as string[], // Nuevo campo
})
```

**Funcionalidades agregadas:**
1. **Selector de Roles Múltiples**: 
   - Checkboxes para cada rol disponible
   - Diseño en grid responsive (2-3 columnas)
   - Fondo azul claro para destacar la sección
   - Vista previa de roles seleccionados con badges
   - Botón "×" para quitar roles individuales

2. **Tabla Actualizada**:
   - Nueva columna "Roles" después del nombre del docente
   - Muestra badges azules para cada rol asignado
   - Mensaje "Sin roles asignados" si no tiene roles
   - Ajustado colspan de 8 a 9 en mensaje vacío

3. **Integración con API**:
   - Carga automática de roles activos desde `/api/roles`
   - Envío de roles en payload de creación y actualización
   - Recepción y visualización de roles existentes al editar

## 🎨 Interfaz de Usuario

### Formulario de Docente:
```
┌─────────────────────────────────────────────────────┐
│  Roles del Docente                                  │
│  Seleccione uno o más roles para este docente      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │☑ docente │  │☐ profesor│  │☐ comision│         │
│  │  ROL-0002│  │  ROL-0003│  │  ROL-0005│         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  Roles seleccionados:                              │
│  [docente ×] [comision ×]                          │
└─────────────────────────────────────────────────────┘
```

### Tabla de Docentes:
```
N. | Docente           | Roles                    | Carrera | ...
1  | Juan Pérez        | [docente] [profesor]    | ...     | ...
2  | María González    | [comision] [decano]     | ...     | ...
```

## 🔧 Cómo Usar

### Para Asignar Roles a un Docente:

1. Ir a **Admin > Docentes**
2. Crear nuevo docente o editar existente
3. En la sección "Roles del Docente":
   - Marcar los checkboxes de los roles deseados
   - Los roles seleccionados aparecen abajo con badges
   - Hacer clic en "×" para quitar un rol específico
4. Guardar cambios

### Roles Disponibles:
- Administrador (ROL-0001)
- Docente (ROL-0002)
- Profesor (ROL-0003)
- Estudiante (ROL-0004)
- Comisión (ROL-0005)
- Dirección (ROL-0006)
- Decano (ROL-0007)
- Subdecano (ROL-0008)

## 📁 Archivos Modificados

### Backend:
- `my-node-backend/src/models/profesores.js`
- `my-node-backend/src/controllers/profesor.controller.js`
- `my-node-backend/sql/add-roles-to-profesores.sql` (nuevo)
- `my-node-backend/scripts/add-roles-to-profesores.js` (nuevo)

### Frontend:
- `app/dashboard/admin/docentes/page.tsx`

## 🔄 Flujo de Datos

1. **Carga inicial**: Frontend solicita roles activos de `/api/roles`
2. **Selección**: Usuario marca/desmarca checkboxes
3. **Estado local**: Array de nombres de roles se actualiza en `formData.roles`
4. **Envío**: POST/PUT a `/api/profesores` con campo `roles: ["docente", "profesor"]`
5. **Backend**: Valida y guarda array en columna `roles` de PostgreSQL
6. **Respuesta**: Devuelve profesor con roles asignados
7. **Visualización**: Tabla muestra badges con los roles

## 🎯 Características Clave

✅ Selección múltiple intuitiva con checkboxes
✅ Vista previa en tiempo real de roles seleccionados
✅ Interfaz responsive (mobile-friendly)
✅ Validación en backend (convierte a array si es necesario)
✅ Índice optimizado en base de datos para búsquedas
✅ Compatibilidad con roles existentes y nuevos
✅ Diseño consistente con el resto del sistema

## 🚀 Próximos Pasos Sugeridos

1. Implementar filtro por roles en la tabla de docentes
2. Agregar estadísticas de roles asignados
3. Crear reportes de docentes por rol
4. Implementar permisos basados en roles múltiples
5. Agregar validación de roles requeridos según tipo de docente

## 🐛 Notas de Debugging

- Si no aparecen roles: Verificar que existan roles activos en `/api/roles`
- Si no se guardan: Revisar logs del backend para errores SQL
- Si aparece "undefined": Verificar que `rolesDisponibles` esté cargado
- Para resetear: Ejecutar `UPDATE profesores SET roles = '{}' WHERE id = X`
