# 📊 FORMATO DE IMPORTACIÓN MASIVA DE USUARIOS

## 📝 Estructura del CSV

### Columnas obligatorias:
1. **nombres** - Nombres del usuario
2. **apellidos** - Apellidos del usuario  
3. **correo_electronico** - Email institucional
4. **username** - Nombre de usuario único
5. **password** - Contraseña (se guardará encriptada)
6. **roles** - IDs de roles separados por punto y coma (;)
7. **facultades** - IDs de facultades separados por punto y coma (;)
8. **carreras** - IDs de carreras separados por punto y coma (;)
9. **cursos** - IDs de niveles/cursos separados por punto y coma (;)
10. **materias** - IDs de asignaturas/materias separados por punto y coma (;)

---

## 🔢 IDs DISPONIBLES EN TU BASE DE DATOS

### ROLES (según roles que tengas):
```
1 - administrador
2 - docente
3 - profesor
4 - estudiante
5 - comision
6 - direccion
7 - decano
8 - subdecano
```

### FACULTADES (según tu imagen):
```
Ver en tu base de datos tabla: facultades
Ejemplo:
1 - Facultad de Ciencias de la Salud
2 - Facultad de Ingeniería
etc.
```

### CARRERAS (según tu imagen, tienes IDs: 1, 3, 4, 5, 8):
```
Ver en tu base de datos tabla: carreras
Ejemplo:
1 - Enfermería
3 - Ingeniería en Sistemas
4 - Economía
5 - Tecnologías
8 - Otra carrera
```

### CURSOS/NIVELES (10 semestres):
```
1 - Primer Semestre
2 - Segundo Semestre
3 - Tercer Semestre
4 - Cuarto Semestre
5 - Quinto Semestre
6 - Sexto Semestre
7 - Séptimo Semestre
8 - Octavo Semestre
9 - Noveno Semestre
10 - Décimo Semestre
```

### MATERIAS/ASIGNATURAS:
```
Ver en tu base de datos tabla: asignaturas
Ejemplo:
1 - Anatomía Humana
2 - Fisiología
3 - Programación I
etc.
```

---

## 📋 EJEMPLOS DE USO

### Ejemplo 1: Profesor con múltiples facultades y carreras
```csv
Juan,Pérez,jperez@unesum.edu.ec,jperez,Pass123,"docente;profesor","1;2","1;3;4","1;2;3","1;2;3;4;5"
```
Este profesor tendrá:
- 2 roles: docente y profesor
- 2 facultades: ID 1 y 2
- 3 carreras: ID 1, 3 y 4
- 3 cursos: 1°, 2° y 3° semestre
- 5 materias: IDs 1, 2, 3, 4 y 5

### Ejemplo 2: Profesor con un solo rol pero varias materias
```csv
María,González,mgonzalez@unesum.edu.ec,mgonzalez,Pass456,docente,1,3,"2;3","6;7;8"
```
Este profesor tendrá:
- 1 rol: docente
- 1 facultad: ID 1
- 1 carrera: ID 3
- 2 cursos: 2° y 3° semestre
- 3 materias: IDs 6, 7 y 8

### Ejemplo 3: Administrador sin asignaciones académicas
```csv
Pedro,Admin,padmin@unesum.edu.ec,padmin,Admin123,administrador,,,,
```
Este usuario solo tiene rol de administrador sin facultades, carreras, cursos ni materias.

---

## ⚠️ REGLAS IMPORTANTES

1. **Separador de múltiples valores**: Usar punto y coma (;) sin espacios
   - ✅ Correcto: `"1;2;3"`
   - ❌ Incorrecto: `"1, 2, 3"` o `"1 ; 2 ; 3"`

2. **Comillas**: Usar comillas dobles cuando hay múltiples valores
   - ✅ Correcto: `"docente;profesor"`
   - ⚠️ Opcional para un solo valor: `docente` o `"docente"`

3. **Campos vacíos**: Si no hay valores, dejar vacío o poner comillas vacías
   - ✅ Correcto: `,,` o `"","",`

4. **Codificación**: Guardar el archivo como **UTF-8** para evitar problemas con acentos

5. **Extensión**: Puede ser .csv o .xlsx (Excel)

---

## 🚀 PASOS PARA IMPORTAR

1. **Obtener IDs reales**: Ejecuta en tu base de datos:
   ```sql
   SELECT * FROM roles;
   SELECT * FROM facultades;
   SELECT * FROM carreras;
   SELECT * FROM nivel;
   SELECT * FROM asignaturas;
   ```

2. **Editar el CSV**: Reemplaza los IDs de ejemplo con los reales

3. **Guardar como UTF-8**: 
   - En Excel: Archivo → Guardar como → CSV UTF-8 (delimitado por comas)
   - En Google Sheets: Archivo → Descargar → CSV

4. **Importar**: Usa el endpoint POST `/api/usuarios/import` con el archivo

---

## 📄 ARCHIVO DE EJEMPLO

Ver: EJEMPLO_IMPORTACION_USUARIOS_MASIVA.csv

Este archivo incluye 5 ejemplos de usuarios con diferentes combinaciones de roles, facultades, carreras, cursos y materias.
