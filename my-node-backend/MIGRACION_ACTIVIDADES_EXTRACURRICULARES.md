# Migración: Actividades Extracurriculares

## Descripción
Esta migración crea la tabla `actividades_extracurriculares` para almacenar la planificación de actividades extracurriculares por periodo académico y semana.

## Estructura de la Tabla

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | SERIAL | PRIMARY KEY | Identificador único autoincremental |
| periodo_id | INTEGER | NOT NULL, FK | Referencia al periodo académico |
| semana | VARCHAR(50) | NOT NULL | Número de semana (1-16) |
| fecha_inicio | DATE | NOT NULL | Fecha de inicio de la actividad |
| fecha_fin | DATE | NOT NULL | Fecha de fin de la actividad |
| actividades | TEXT | NOT NULL | Descripción de las actividades |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha de última actualización |

## Relaciones
- **periodo_id**: Foreign Key a la tabla `periodo` (ON DELETE CASCADE, ON UPDATE CASCADE)

## Índices
1. `idx_actividades_extracurriculares_periodo` en `periodo_id`
2. `idx_actividades_extracurriculares_semana` en `semana`
3. `idx_actividades_extracurriculares_fechas` en `(fecha_inicio, fecha_fin)`

## Pasos para Ejecutar la Migración

### Opción 1: Usando Sequelize CLI (Recomendado)
```bash
cd my-node-backend
npx sequelize-cli db:migrate
```

### Opción 2: Manualmente en Neon Console
1. Accede a [Neon Console](https://console.neon.tech/)
2. Selecciona tu proyecto y base de datos
3. Ve a la pestaña "SQL Editor"
4. Copia y pega el contenido del archivo `sql/create-actividades-extracurriculares.sql`
5. Ejecuta el script

### Opción 3: Usando psql
```bash
psql -h <tu-host-neon> -U <tu-usuario> -d <tu-database> -f sql/create-actividades-extracurriculares.sql
```

## Verificación
Después de ejecutar la migración, verifica que la tabla se creó correctamente:

```sql
-- Ver estructura de la tabla
\d actividades_extracurriculares

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'actividades_extracurriculares';

-- Verificar relaciones
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'actividades_extracurriculares'
    AND tc.constraint_type = 'FOREIGN KEY';
```

## API Endpoints
Una vez ejecutada la migración, estarán disponibles los siguientes endpoints:

### GET /api/actividades-extracurriculares
Obtiene todas las actividades extracurriculares

### GET /api/actividades-extracurriculares/periodo/:periodo_id
Obtiene actividades por periodo específico

### GET /api/actividades-extracurriculares/:id
Obtiene una actividad por ID

### POST /api/actividades-extracurriculares
Crea una nueva actividad
```json
{
  "periodo_id": 1,
  "semana": "1",
  "fecha_inicio": "2024-04-01",
  "fecha_fin": "2024-04-14",
  "actividades": "Vacaciones del personal académico"
}
```

### PUT /api/actividades-extracurriculares/:id
Actualiza una actividad existente

### DELETE /api/actividades-extracurriculares/:id
Elimina una actividad

## Rollback
Si necesitas revertir la migración:

```sql
DROP TABLE IF EXISTS actividades_extracurriculares CASCADE;
```

## Notas Importantes
- Asegúrate de que la tabla `periodo` existe antes de ejecutar esta migración
- Los registros se eliminarán automáticamente si se elimina el periodo relacionado (CASCADE)
- Las fechas deben estar en formato 'YYYY-MM-DD'
- La validación de fechas se realiza a nivel de aplicación (backend)

## Archivos Relacionados
- **Migración**: `src/migrations/20260102000000-create-actividades-extracurriculares.js`
- **Modelo**: `src/models/actividades_extracurriculares.js`
- **Controlador**: `src/controllers/actividadesExtracurricularesController.js`
- **Rutas**: `src/routes/actividadesExtracurriculares.js`
- **Frontend**: `app/dashboard/admin/planificacion-academica/page.tsx`
