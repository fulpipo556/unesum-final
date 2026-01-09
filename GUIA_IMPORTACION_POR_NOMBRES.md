# 📋 GUÍA DE IMPORTACIÓN MASIVA CON NOMBRES

## ✅ FORMATO SIMPLIFICADO - USA NOMBRES EN VEZ DE IDs

Ya no necesitas buscar IDs! Usa los **nombres exactos** de tus roles, facultades, carreras, cursos y materias.

---

## 📝 Estructura del CSV/Excel

```csv
nombres,apellidos,correo_electronico,username,password,roles,facultades,carreras,cursos,materias
```

### Columnas:
1. **nombres** - Nombres del profesor/usuario
2. **apellidos** - Apellidos  
3. **correo_electronico** - Email institucional
4. **username** - Usuario (opcional)
5. **password** - Contraseña (opcional, default: temporal123)
6. **roles** - Nombres de roles separados por `;`
7. **facultades** - Nombres de facultades separados por `;`
8. **carreras** - Nombres de carreras separados por `;`
9. **cursos** - Nombres de niveles separados por `;`
10. **materias** - Nombres de asignaturas separados por `;`

---

## 🎯 NOMBRES VÁLIDOS

### ROLES:
```
administrador
docente
profesor
estudiante
comision
direccion
decano
subdecano
```

### FACULTADES (Usa los nombres EXACTOS de tu BD):
```
Facultad de Ciencias de la Salud
Facultad de Ingeniería
Facultad de Ciencias Económicas
Facultad de Ciencias Sociales
```

### CARRERAS (Usa los nombres EXACTOS de tu BD):
```
Enfermería
Medicina
Ingeniería en Sistemas
Ingeniería Civil
Economía
Contabilidad
Trabajo Social
Psicología
```

### CURSOS/NIVELES:
```
Primer Semestre
Segundo Semestre
Tercer Semestre
Cuarto Semestre
Quinto Semestre
Sexto Semestre
Séptimo Semestre
Octavo Semestre
Noveno Semestre
Décimo Semestre
```

### MATERIAS (Usa los nombres EXACTOS de tu BD):
```
Programación I
Programación II
Base de Datos
Anatomía Humana
Fisiología
Microeconomía
Macroeconomía
(etc, según tu base de datos)
```

---

## 📋 EJEMPLOS

### Ejemplo 1: Profesor con múltiples facultades y materias
```csv
Juan Carlos,Pérez García,jperez@unesum.edu.ec,jperez,Pass123,"docente;profesor","Facultad de Ciencias de la Salud;Facultad de Ingeniería","Enfermería;Ingeniería en Sistemas","Primer Semestre;Segundo Semestre","Programación I;Base de Datos;Anatomía Humana"
```

### Ejemplo 2: Profesor simple
```csv
María Elena,González López,mgonzalez@unesum.edu.ec,mgonzalez,Pass456,docente,Facultad de Ciencias de la Salud,Enfermería,"Primer Semestre;Segundo Semestre","Anatomía Humana;Fisiología"
```

### Ejemplo 3: Solo administrador
```csv
Pedro,Admin,padmin@unesum.edu.ec,padmin,Admin123,administrador,,,,
```

---

## ⚠️ REGLAS IMPORTANTES

### 1. Múltiples valores
✅ Usa punto y coma (;) SIN espacios:
```csv
"Programación I;Base de Datos;Redes de Computadoras"
```

❌ NO uses comas o espacios adicionales:
```csv
"Programación I, Base de Datos"  ← INCORRECTO
```

### 2. Nombres exactos
Los nombres deben coincidir EXACTAMENTE con los de tu base de datos:
- ✅ `"Programación I"` 
- ❌ `"programacion I"` (minúsculas)
- ❌ `"Programacion I"` (sin tilde)
- ❌ `"Programación 1"` (número en vez de romano)

### 3. Campos obligatorios
- `nombres` ✅ Obligatorio
- `apellidos` ✅ Obligatorio  
- `correo_electronico` ✅ Obligatorio
- Resto son opcionales

### 4. Codificación
Guarda el archivo como **UTF-8** para evitar problemas con acentos y tildes.

---

## 🚀 CÓMO USAR

### Paso 1: Obtén los nombres exactos de tu BD
Ejecuta este SQL en tu base de datos:
```sql
-- Ver roles disponibles
SELECT nombre FROM roles;

-- Ver facultades disponibles
SELECT nombre FROM facultades;

-- Ver carreras disponibles
SELECT nombre FROM carreras;

-- Ver niveles disponibles
SELECT nombre FROM nivel;

-- Ver asignaturas disponibles
SELECT nombre FROM asignaturas;
```

### Paso 2: Edita el archivo CSV
1. Abre [IMPORTAR_PROFESORES_POR_NOMBRE.csv](../IMPORTAR_PROFESORES_POR_NOMBRE.csv)
2. Reemplaza los nombres de ejemplo con los reales de tu BD
3. Guarda como UTF-8

### Paso 3: Importa desde la web
1. Ve a: http://localhost:3000/dashboard/admin/usuarios
2. Haz clic en "📤 Importar CSV/Excel"
3. Selecciona tu archivo
4. ¡Listo! Verás un resumen de la importación

---

## 📊 RESULTADO

La importación te mostrará:
```
✅ Importación exitosa!

📊 Total: 5
✅ Exitosos: 4
❌ Errores: 1
```

Si hay errores, revisa:
- Nombres escritos exactamente igual que en la BD
- Codificación UTF-8
- Formato de separadores (;)
- Comillas dobles para múltiples valores

---

## 💡 VENTAJAS DE ESTE FORMATO

✅ **No necesitas buscar IDs** - Usa nombres directamente
✅ **Más legible** - Es fácil ver qué estás importando
✅ **Menos errores** - No te equivocas con números
✅ **Reutilizable** - El mismo CSV funciona en diferentes ambientes

---

## 📄 ARCHIVOS DE EJEMPLO

- [IMPORTAR_PROFESORES_POR_NOMBRE.csv](../IMPORTAR_PROFESORES_POR_NOMBRE.csv) - 5 ejemplos listos para usar
- [EJEMPLO_IMPORTACION_USUARIOS_MASIVA.csv](../EJEMPLO_IMPORTACION_USUARIOS_MASIVA.csv) - Formato antiguo con IDs (también funciona)
