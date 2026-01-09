# 📊 Formato de Importación CSV con Tuplas

## ✨ Sistema Implementado

El sistema ahora crea **múltiples registros automáticamente** desde una sola fila CSV cuando se usan tuplas.

### 🎯 Ejemplo de Tu Excel

```csv
Docente,Carrera,Asinatura,Nivel,Paralelo,Rol
Fulco Pincay,Tecnologías de la Información,"Programación I, Programación III","Segundo, Cuarto","(A,B,C), (A,B)",Docente
Barcia Luis,Tecnologías de la Información,Programación I,Segundo,"D,E",Docente
```

## 🔄 Resultado de la Importación

### Fila 1: Fulco Pincay

**Una fila CSV** → **5 registros** en la base de datos:

| Registro | Docente | Asignatura | Nivel | Paralelo | Rol |
|----------|---------|------------|-------|----------|-----|
| 1 | Fulco Pincay | Programación I | Segundo | A | Docente |
| 2 | Fulco Pincay | Programación I | Segundo | B | Docente |
| 3 | Fulco Pincay | Programación I | Segundo | C | Docente |
| 4 | Fulco Pincay | Programación III | Cuarto | A | Docente |
| 5 | Fulco Pincay | Programación III | Cuarto | B | Docente |

### Fila 2: Barcia Luis

**Una fila CSV** → **2 registros** en la base de datos:

| Registro | Docente | Asignatura | Nivel | Paralelo | Rol |
|----------|---------|------------|-------|----------|-----|
| 1 | Barcia Luis | Programación I | Segundo | D | Docente |
| 2 | Barcia Luis | Programación I | Segundo | E | Docente |

## 📝 Reglas del Formato

### 1. Tuplas con Paréntesis (Recomendado)

Formato: `"(A,B,C), (A,B)"`

- **Primera tupla** `(A,B,C)` → Paralelos para la **primera asignatura + primer nivel**
- **Segunda tupla** `(A,B)` → Paralelos para la **segunda asignatura + segundo nivel**

**Ejemplo completo:**
```csv
Docente,Carrera,Asinatura,Nivel,Paralelo,Rol
María García,TI,"Bases de Datos, Redes","Tercero, Cuarto","(A,B), (C,D)","Docente, Coordinador"
```

**Resultado:** 4 registros
- María García | Bases de Datos | Tercero | A | Docente, Coordinador
- María García | Bases de Datos | Tercero | B | Docente, Coordinador
- María García | Redes | Cuarto | C | Docente, Coordinador
- María García | Redes | Cuarto | D | Docente, Coordinador

### 2. Sin Paréntesis (Todos los paralelos para una materia)

Formato: `"D,E"`

- Crea un registro por cada paralelo con la **primera asignatura y nivel**

**Ejemplo:**
```csv
Barcia Luis,TI,Programación I,Segundo,"D,E",Docente
```

**Resultado:** 2 registros
- Barcia Luis | Programación I | Segundo | D | Docente
- Barcia Luis | Programación I | Segundo | E | Docente

## ⚖️ Validaciones del Sistema

### ✅ Validación de Cantidad

```
Asignaturas = Niveles = Grupos de Paralelos
```

**Ejemplo válido:**
- Asignaturas: `"Prog I, Prog III"` → 2 asignaturas
- Niveles: `"Segundo, Cuarto"` → 2 niveles
- Paralelos: `"(A,B,C), (A,B)"` → 2 grupos
- ✅ **2 = 2 = 2** → Válido

**Ejemplo inválido:**
- Asignaturas: `"Prog I, Prog III"` → 2 asignaturas
- Niveles: `"Segundo"` → 1 nivel
- Paralelos: `"(A,B,C)"` → 1 grupo
- ❌ **2 ≠ 1 ≠ 1** → Error: "Cantidad no coincide"

### ✅ Campos Obligatorios

- **Docente**: Sí (obligatorio)
- **Carrera**: Sí (obligatorio)
- **Asinatura**: Sí (al menos una)
- **Nivel**: Sí (al menos uno)
- **Paralelo**: No (opcional)
- **Rol**: No (opcional)

### ✅ Manejo de Emails

- Si el CSV no tiene email, se genera automáticamente:
  ```
  nombres.apellidos@unesum.edu.ec
  ```

- Si hay múltiples registros, se agregan sufijos:
  ```
  fulco.pincay1@unesum.edu.ec
  fulco.pincay2@unesum.edu.ec
  fulco.pincay3@unesum.edu.ec
  ```

### ✅ Búsqueda Flexible

El sistema busca datos de forma **case-insensitive** y **parcial**:

- `"Programación I"` encuentra `"PROGRAMACIÓN I"` ✅
- `"programacion i"` encuentra `"Programación I"` ✅
- `"Prog I"` puede encontrar `"Programación I"` ✅ (si contiene)
- `"Segundo"` encuentra `"SEGUNDO"` ✅

## 📤 Exportación de Datos

### Botón de Exportación

El sistema ahora incluye un botón **"EXPORTAR CSV"** que:

1. Agrupa todos los registros de un mismo docente
2. Detecta qué asignaturas-niveles están juntas
3. Agrupa los paralelos con tuplas: `(A,B,C), (D,E)`
4. Genera el CSV con el mismo formato de importación

### Ejemplo de Exportación

**Base de datos:**
| Docente | Asignatura | Nivel | Paralelo |
|---------|------------|-------|----------|
| Fulco Pincay | Programación I | Segundo | A |
| Fulco Pincay | Programación I | Segundo | B |
| Fulco Pincay | Programación I | Segundo | C |
| Fulco Pincay | Programación III | Cuarto | A |
| Fulco Pincay | Programación III | Cuarto | B |

**CSV Exportado:**
```csv
Docente,Carrera,Asinatura,Nivel,Paralelo,Rol
Fulco Pincay,Tecnologías de la Información,"Programación I, Programación III","Segundo, Cuarto","(A,B,C), (A,B)",Docente
```

## 🚀 Uso del Sistema

### Importación

1. Ir a **Admin → Docentes**
2. En la sección "Importación y Exportación Masiva"
3. Hacer clic en **"EXPORTAR CSV"** para descargar la plantilla actual
4. Editar el archivo con tus datos
5. Hacer clic en **"Seleccionar archivo"**
6. Hacer clic en **"IMPORTAR"**
7. Revisar los resultados

### Exportación

1. Ir a **Admin → Docentes**
2. Hacer clic en **"EXPORTAR CSV"**
3. El archivo se descargará automáticamente
4. Abrir en Excel o Google Sheets
5. Editar y reimportar si es necesario

## 📊 Ejemplo Completo de CSV

```csv
Docente,Carrera,Asinatura,Nivel,Paralelo,Rol
Fulco Pincay,Tecnologías de la Información,"Programación I, Programación III","Segundo, Cuarto","(A,B,C), (A,B)",Docente
Barcia Luis,Tecnologías de la Información,Programación I,Segundo,"D,E",Docente
María García,Tecnologías de la Información,"Bases de Datos, Redes","Tercero, Cuarto","(A,B), (C,D)","Docente, Coordinador"
Juan Pérez,Tecnologías de la Información,Matemáticas,Primero,"A,B,C",Docente
Ana López,Tecnologías de la Información,"Algoritmos, Estructura de Datos","Primero, Segundo","(A), (B,C)","Docente, Tutor"
```

### Resultado de la Importación:

- **Total de filas CSV:** 5
- **Total de registros creados:** 5 + 2 + 4 + 3 + 3 = **17 registros**
- **Emails enviados:** 5 (uno por docente único)

## 🎯 Ventajas del Formato de Tuplas

✅ **Compacto**: Una fila en lugar de múltiples  
✅ **Claro**: Las tuplas muestran qué paralelos van con cada nivel  
✅ **Exportable**: Puedes exportar y reimportar sin perder información  
✅ **Flexible**: Soporta tanto tuplas como listas simples  
✅ **Validado**: El sistema verifica que las cantidades coincidan  

## 🔧 Archivos Modificados

1. **Backend:**
   - `my-node-backend/src/controllers/profesor.controller.js`
     - Método `uploadCSV`: Lógica de parseo de tuplas
     - Método `exportCSV`: Generación de CSV con tuplas
   
2. **Routes:**
   - `my-node-backend/src/routes/profesor.routes.js`
     - GET `/api/profesores/export`: Endpoint de exportación

3. **Frontend:**
   - `app/dashboard/admin/docentes/page.tsx`
     - Función `handleExport`: Descarga del CSV
     - Botón de exportación en la UI
     - Actualización del mensaje de importación con conteo de registros

## 📧 Email de Bienvenida

- Se envía **1 email** por docente único (no por cada registro)
- El email incluye un token válido por **12 horas**
- El docente debe configurar su contraseña en: `http://localhost:3000/configurar-password/{token}`

## 🐛 Manejo de Errores

### Error: "Cantidad no coincide"
```
Asignaturas (2) ≠ Niveles (1) ≠ Grupos de paralelos (2)
```
**Solución:** Asegurar que haya la misma cantidad de asignaturas, niveles y grupos de paralelos.

### Error: "Asignatura 'XXX' no encontrada"
**Solución:** Verificar que la asignatura exista en la base de datos con ese nombre exacto o similar.

### Error: "Carrera 'XXX' no encontrada"
**Solución:** Usar el nombre exacto de la carrera que está en la base de datos.

---

**Última actualización:** 4 de enero de 2026  
**Autor:** Sistema UNESUM  
**Versión:** 3.0 - Con soporte completo de tuplas
