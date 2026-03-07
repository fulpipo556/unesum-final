"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Eraser, FileDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import { useSearchParams } from "next/navigation" 
// --- INTERFACES DE DATOS ---
interface TableCell { 
  id: string; 
  content: string; 
  isHeader: boolean; 
  rowSpan: number; 
  colSpan: number; 
  isEditable: boolean; 
  backgroundColor?: string; 
  textColor?: string; 
  fontSize?: string; 
  fontWeight?: string; 
  textAlign?: string;
  textOrientation?: 'horizontal' | 'vertical'; 
}

interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface ProgramaAnaliticoData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedProgramaAnaliticoRecord { id: number; nombre: string; periodo: string; materias: string; datos_tabla: ProgramaAnaliticoData; created_at: string; updated_at: string; }

export default function EditorProgramaAnaliticoPage() {
  const { token, getToken, user } = useAuth()
  
  // --- ESTADOS ---
  const [programas, setprogramas] = useState<ProgramaAnaliticoData[]>([])
  const [activeProgramaAnaliticoId, setActiveProgramaAnaliticoId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedprogramas, setSavedprogramas] = useState<SavedProgramaAnaliticoRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showProgramaAnaliticoSelector, setShowProgramaAnaliticoSelector] = useState(false)
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tempTabTitle, setTempTabTitle] = useState("")

  const [isListLoading, setIsListLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const searchParams = useSearchParams()
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const asignaturaIdParam = searchParams.get("asignatura")
  const periodoParam = searchParams.get("periodo")
  const programaIdParam = searchParams.get("id")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefSync = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeProgramaAnalitico = programas.find((s) => s.id === activeProgramaAnaliticoId);
  const activeTab = activeProgramaAnalitico?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];
  const [asignaturaInfo, setAsignaturaInfo] = useState<any>(null)

  // Cargar información de la materia seleccionada
  useEffect(() => {
    const cargarMateria = async () => {
      if (asignaturaIdParam) {
        try {
          const res = await apiRequest(`/api/asignaturas/${asignaturaIdParam}`)
          if (res && res.data) setAsignaturaInfo(res.data)
        } catch (err) {
          console.error("Error cargando materia:", err)
        }
      }
    }
    cargarMateria()
  }, [asignaturaIdParam])
  // --- CARGA INICIAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programasData, periodosData] = await Promise.all([
          apiRequest("/api/programa-analitico").catch(err => {
            console.error("Error en /api/programa-analitico:", err);
            return { data: [] };
          }),
          apiRequest("/api/periodo").catch(err => {
            console.error("Error en /api/periodo:", err);
            return { data: [] };
          })
        ]);
        
        const programasArray = Array.isArray(programasData?.data) ? programasData.data : (Array.isArray(programasData) ? programasData : []);
        const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
        
        setSavedprogramas(programasArray);
        setPeriodos(periodosArray);
        // Pre-seleccionar periodo desde URL o el actual
        // IMPORTANTE: El Select usa periodo.nombre como value, así que debemos setear el nombre
        if (periodoParam) {
          const periodoObj = periodosArray.find((p: any) => p.id?.toString() === periodoParam || p.nombre === periodoParam);
          setSelectedPeriod(periodoObj ? periodoObj.nombre : periodoParam);
        } else if (!selectedPeriod && periodosArray.length > 0) {
          const actual = periodosArray.find((p: any) => p.estado === 'actual');
          if (actual) setSelectedPeriod(actual.nombre);
          else setSelectedPeriod(periodosArray[0].nombre);
        }
        
        console.log('✅ Datos cargados:', {
          programas: programasArray.length,
          periodos: periodosArray.length,
          periodosData: periodosArray
        });
      } catch (error) { 
        console.error("❌ Error al cargar datos:", error); 
      }
      finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    if (activeProgramaAnalitico && activeProgramaAnalitico.tabs.length > 0) {
      if (!activeProgramaAnalitico.tabs.find(t => t.id === activeTabId)) {
        setActiveTabId(activeProgramaAnalitico.tabs[0].id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [activeProgramaAnalitico, activeTabId]);

  // Helper: compara periodo flexible (por ID o nombre)
  const matchPeriodo = (sPeriodo: string, selPeriodo: string) => {
    if (!sPeriodo || !selPeriodo) return !sPeriodo; // null periodo matches if nothing selected
    if (sPeriodo === selPeriodo) return true;
    const periodoObj = periodos.find((p: any) => p.id.toString() === selPeriodo);
    const periodoNombre = periodoObj?.nombre || '';
    return sPeriodo === periodoNombre || periodoNombre === sPeriodo;
  };

  // Cargar automáticamente el programa cuando se selecciona un periodo
  useEffect(() => {
    // Si venimos de "Ver Programa" con id, no auto-cargar de savedprogramas
    if (programaIdParam) return;
    if (!selectedPeriod) return;
    
    // 1. Buscar programas que coincidan por periodo + asignatura
    let programasDelPeriodo = savedprogramas.filter((s: any) => {
      if (!matchPeriodo(s.periodo, selectedPeriod)) return false;
      if (asignaturaIdParam) {
        return String(s.asignatura_id) === String(asignaturaIdParam);
      }
      return true;
    });
    
    // 2. Si no encontramos con asignatura específica, buscar sin asignatura (null) para ese periodo
    if (programasDelPeriodo.length === 0 && asignaturaIdParam) {
      programasDelPeriodo = savedprogramas.filter((s: any) => {
        return matchPeriodo(s.periodo, selectedPeriod) && (!s.asignatura_id || s.asignatura_id === null);
      });
      if (programasDelPeriodo.length > 0) {
        console.log(`📋 Encontrado programa sin asignatura asignada para el periodo`);
      }
    }
    
    // 3. Si aún no hay, buscar cualquier programa del periodo
    if (programasDelPeriodo.length === 0) {
      programasDelPeriodo = savedprogramas.filter((s: any) => matchPeriodo(s.periodo, selectedPeriod));
    }
    
    if (programasDelPeriodo.length > 0) {
      const primerPrograma = programasDelPeriodo[0];
      console.log(`📋 Cargando automáticamente programa del periodo "${selectedPeriod}":`, primerPrograma.nombre);
      handleLoadProgramaAnalitico(String(primerPrograma.id));
    } else {
      console.log(`⚠️ No hay programas guardados para el periodo "${selectedPeriod}"`);
      // Limpiar editor si no hay programa para este periodo
      setprogramas([]);
      setActiveProgramaAnaliticoId(null);
      setActiveTabId(null);
    }
  }, [selectedPeriod, savedprogramas.length, periodos.length]);

  // 🔄 Cargar programa específico cuando se viene de "Ver Programa" con ?id=X
  useEffect(() => {
    if (!programaIdParam) return;
    const cargarProgramaDirecto = async () => {
      try {
        const res = await apiRequest(`/api/programa-analitico/${programaIdParam}`);
        const programaData = res?.data;
        if (!programaData) return;
        console.log('✅ Programa cargado directo por ID:', programaData.id);
        
        let editorData = programaData.datos_tabla;
        if (typeof editorData === 'string') {
          try { editorData = JSON.parse(editorData); } catch(e) {}
        }
        if (!editorData) return;
        
        editorData.id = programaData.id;
        if (!editorData.name) editorData.name = programaData.nombre;
        
        // Normalizar estructura de tabs para el editor
        if (editorData.tabs) {
          editorData.tabs = editorData.tabs.map((t: any) => ({
            ...t,
            rows: (t.rows || []).map((r: any) => ({
              ...r,
              cells: (r.cells || []).map((c: any) => ({
                ...c,
                backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
                textColor: c.styles?.textColor || c.textColor,
                textAlign: c.styles?.textAlign || c.textAlign,
                textOrientation: c.styles?.textOrientation || c.textOrientation,
                isEditable: true
              }))
            }))
          }));
        } else if ((editorData as any).rows) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: (editorData as any).rows }];
        }
        
        setprogramas([editorData]);
        setActiveProgramaAnaliticoId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
        if (programaData.periodo) {
          const periodoObj = periodos.find((p: any) => p.id?.toString() === String(programaData.periodo));
          setSelectedPeriod(periodoObj ? periodoObj.nombre : programaData.periodo);
        }
        
        // También agregar a savedprogramas para que guardar lo detecte
        setSavedprogramas(prev => {
          const exists = prev.find((s: any) => s.id === programaData.id);
          return exists ? prev : [programaData, ...prev];
        });
      } catch (err) {
        console.error('Error cargando programa directo:', err);
      }
    };
    cargarProgramaDirecto();
  }, [programaIdParam]);

  // --- API ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvió JSON.");
    }

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición al API.")
    return data
  }
  // Sincronizacion Inteligente: soporta 2 metodos
  // 1) Word con etiquetas [NOMBRE] -> match directo (prioridad)
  // 2) Word con tablas -> extrae datos de tablas HTML con mammoth (frontend)

const handleSmartSync = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !activeProgramaAnalitico) return;

  if (fileInputRefSync.current) fileInputRefSync.current.value = "";
  setIsLoading(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const mammothLib = (await import('mammoth')).default;

    // ====================================================
    // PASO 1: Recopilar TODAS las etiquetas del editor
    // (celdas que tienen texto = son las etiquetas del admin)
    // ====================================================
    const etiquetasDelEditor: Array<{texto: string, tabIdx: number, rowIdx: number, cellIdx: number}> = [];
    activeProgramaAnalitico.tabs.forEach((tab, tabIdx) => {
      tab.rows.forEach((row, rowIdx) => {
        row.cells.forEach((cell, cellIdx) => {
          const texto = (cell.content || '').trim();
          if (texto.length >= 2 && texto.length < 100) {
            etiquetasDelEditor.push({ texto: texto.toUpperCase(), tabIdx, rowIdx, cellIdx });
          }
        });
      });
    });

    console.log("========== SINCRONIZACION INTELIGENTE ==========");
    console.log("Etiquetas del editor:", etiquetasDelEditor.map(e => e.texto));

    // ====================================================
    // PASO 2: Extraer texto plano del Word
    // ====================================================
    const resultadoTexto = await mammothLib.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
    const textoCompleto = resultadoTexto.value;
    console.log("Texto del Word (primeros 1500 chars):");
    console.log(textoCompleto.substring(0, 1500));

    // ====================================================
    // PASO 3: Buscar cada etiqueta del editor en el texto del Word
    // Para cada etiqueta, buscar si aparece en el texto y extraer
    // lo que viene DESPUES (hasta la siguiente etiqueta o fin de linea)
    // ====================================================
    const wordData: Record<string, string> = {};
    
    // Primero intentar etiquetas [NOMBRE]
    const regexEtiquetas = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g;
    let matchResult;
    while ((matchResult = regexEtiquetas.exec(textoCompleto)) !== null) {
      const etiquetaEncontrada = matchResult[1].trim().toUpperCase();
      const contenido = matchResult[2].trim();
      if (contenido.length > 0) {
        wordData[etiquetaEncontrada] = contenido;
      }
    }

    let metodo = "";
    if (Object.keys(wordData).length >= 3) {
      metodo = "etiquetas [NOMBRE]";
      console.log(">>> Metodo ETIQUETAS:", Object.keys(wordData));
    } else {
      // Si no hay etiquetas [NOMBRE], buscar cada etiqueta del editor en el texto
      metodo = "busqueda directa en texto";
      
      // Convertir a HTML tambien para leer tablas
      const resultadoHtml = await mammothLib.convertToHtml({ arrayBuffer: arrayBuffer.slice(0) });
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(resultadoHtml.value, "text/html");
      
      // Extraer TODOS los pares clave-valor de las tablas HTML
      const todasLasFilas = Array.from(htmlDoc.querySelectorAll("tr"));
      console.log("Filas HTML encontradas:", todasLasFilas.length);

      // Track rowSpan groups: when a cell has rowSpan > 1, subsequent rows with fewer cells
      // are continuation rows whose content should be appended to the same key
      let rowSpanTracker: { clave: string; remaining: number } | null = null;

      todasLasFilas.forEach((tr, idx) => {
        const celdas = Array.from(tr.querySelectorAll("td, th"));
        const textos = celdas.map(td => {
          const pElements = Array.from(td.querySelectorAll('p'));
          return pElements.length > 0 
            ? pElements.map(p => (p.textContent || '').trim()).filter(t => t).join('\n')
            : (td.textContent || '').trim();
        });
        
        // Check for rowSpan on first cell
        const firstCellRowSpan = celdas.length > 0 ? parseInt(celdas[0].getAttribute('rowspan') || '1', 10) : 1;
        
        if (textos.length >= 1) {
          console.log("  Fila " + idx + " (" + textos.length + " celdas)" + (rowSpanTracker ? " [rowSpan cont. de " + rowSpanTracker.clave.substring(0,30) + "]" : "") + ":", textos.map(t => '"' + t.substring(0, 50) + '"').join(" | "));
        }

        // ROWSPAN CONTINUATION: If we're tracking a rowSpan group and this row has fewer cells
        // (e.g., 1 cell instead of 2), this is a continuation row - append content to the tracked key
        if (rowSpanTracker && rowSpanTracker.remaining > 0 && textos.length === 1 && textos[0].length > 0) {
          const valorExistente = wordData[rowSpanTracker.clave] || '';
          wordData[rowSpanTracker.clave] = valorExistente + (valorExistente ? '\n' : '') + textos[0];
          rowSpanTracker.remaining--;
          console.log("  >>> ROWSPAN CONTINUACION para [" + rowSpanTracker.clave + "] += '" + textos[0].substring(0, 60) + "'");
          if (rowSpanTracker.remaining <= 0) rowSpanTracker = null;
          return; // Don't process this row further
        }

        // Decrement rowSpan counter even if we don't append
        if (rowSpanTracker) {
          rowSpanTracker.remaining--;
          if (rowSpanTracker.remaining <= 0) rowSpanTracker = null;
        }

        // CASO ESPECIAL: Fila con 4 celdas tipo | CLAVE1 | VALOR1 | CLAVE2 | VALOR2 |
        // Ejemplo: | ASIGNATURA | Tecnologías Emergentes | PERIODO ACADÉMICO | PI 2025 |
        if (textos.length === 4) {
          const c0 = textos[0].toUpperCase();
          const c2 = textos[2].toUpperCase();
          if (c0.length >= 2 && c0.length < 80 && textos[1].length > 0) {
            if (!wordData[c0]) wordData[c0] = textos[1];
          }
          if (c2.length >= 2 && c2.length < 80 && textos[3].length > 0) {
            if (!wordData[c2]) wordData[c2] = textos[3];
          }
        }
        // Fila con 2 celdas: clave | valor
        else if (textos.length === 2 && textos[0].length >= 2 && textos[0].length < 80) {
          const clave = textos[0].toUpperCase();
          if (textos[1].length > 0 && !wordData[clave]) {
            wordData[clave] = textos[1];
          }
          // Start rowSpan tracking if first cell has rowspan > 1
          if (firstCellRowSpan > 1) {
            rowSpanTracker = { clave, remaining: firstCellRowSpan - 1 };
            console.log("  >>> ROWSPAN detectado: [" + clave + "] rowSpan=" + firstCellRowSpan);
          }
        }
        // Fila con 3 celdas: puede ser seccion | sub-header | valor
        // Ejemplo: BIBLIOGRAFÍA - FUENTES DE CONSULTA | BIBLIOGRAFÍA BÁSICA | B.B.1 Nederr...
        // Guardar: la seccion principal con todo, PERO TAMBIEN cada sub-clave por separado
        else if (textos.length === 3) {
          const c0 = textos[0].toUpperCase();
          const c1 = textos[1].toUpperCase();
          if (c0.length >= 2 && c0.length < 80 && !wordData[c0]) {
            wordData[c0] = textos.slice(1).filter(t => t.length > 0).join(" | ");
          }
          // Si la segunda celda parece un sub-header (texto corto, < 60 chars) y la tercera es contenido
          // guardar tambien la sub-clave con su valor directo
          if (c1.length >= 2 && c1.length < 60 && textos[2].length > 0) {
            if (!wordData[c1]) {
              wordData[c1] = textos[2]; // Solo el valor, SIN el sub-header
            }
          }
          // Start rowSpan tracking for 3-cell rows too
          if (firstCellRowSpan > 1) {
            rowSpanTracker = { clave: textos[0].toUpperCase(), remaining: firstCellRowSpan - 1 };
          }
        }

        // Detectar UTs
        for (let ci = 0; ci < textos.length; ci++) {
          const celda = textos[ci].trim();
          const utReg = /^UT\s*(\d+)\s*[:\-.]?\s*([\s\S]*)/i;
          const utMatch = utReg.exec(celda);
          if (utMatch) {
            const utNum = utMatch[1];
            const utTitulo = utMatch[2] || "";
            const descripcion = ci + 1 < textos.length ? textos[ci + 1] : "";

            wordData["UT " + utNum] = utTitulo + (descripcion ? " | " + descripcion : "");
            if (descripcion) {
              wordData["UT-" + utNum + "-DESCRIPCION"] = descripcion;
              wordData["UNIDAD " + utNum] = descripcion;
            }
            console.log("  >>> UT " + utNum + " detectada");
          }
        }
      });

      // Tambien buscar en el texto plano, linea por linea
      // CUIDADO: Solo buscar etiquetas largas y significativas para evitar falsos positivos
      // NO buscar etiquetas cortas como "DESCRIPCIÓN", "DOCENTE", "NIVEL" etc. que generan basura
      const etiquetasCortas = new Set([
        "DESCRIPCIÓN", "DESCRIPCION", "UNIDADES TEMÁTICAS", "UNIDADES TEMATICAS",
        "PROGRAMA ANALÍTICO DE ASIGNATURA", "PROGRAMA ANALITICO DE ASIGNATURA",
        "BIBLIOGRAFÍA BÁSICA", "BIBLIOGRAFIA BASICA", "BIBLIOGRAFÍA COMPLEMENTARIA",
        "CONTENIDOS DE LA ASIGNATURA", "ASIGNATURA", "NIVEL", "DOCENTE", "PERIODO",
        "CARRERA", "CODIGO", "MATERIA", "CREDITOS", "HORAS", "SEMESTRE", "MODALIDAD",
        "DIRECTOR/A ACADÉMICO/A", "COORDINADOR/A DE CARRERA", "DECANO/A DE FACULTAD",
        "COMPETENCIAS", "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA",
        "RESULTADOS DE APRENDIZAJE", "CONTENIDOS GENERALES",
        "OBJETIVOS DE LA ASIGNATURA", "CARACTERIZACIÓN DE LA ASIGNATURA",
        "CARACTERIZACION DE LA ASIGNATURA", "METODOLOGÍA", "METODOLOGIA",
        "PROCEDIMIENTOS DE EVALUACIÓN", "PROCEDIMIENTOS DE EVALUACION",
        "BIBLIOGRAFÍA - FUENTES DE CONSULTA", "BIBLIOGRAFIA - FUENTES DE CONSULTA",
      ]);
      const etiquetasEditorSet = new Set(etiquetasDelEditor.map(e => e.texto));

      const lineas = textoCompleto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      for (const etq of etiquetasDelEditor) {
        // SKIP etiquetas cortas o estructurales que generan falsos positivos
        if (etiquetasCortas.has(etq.texto)) continue;
        if (etiquetasCortas.has(etq.texto.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) continue;

        // Buscar la etiqueta en las lineas del texto
        for (let li = 0; li < lineas.length; li++) {
          const lineaUpper = lineas[li].toUpperCase();
          
          // Si la linea contiene EXACTAMENTE la etiqueta (o la etiqueta es parte de la linea)
          if (lineaUpper === etq.texto || lineaUpper.startsWith(etq.texto)) {
            // Recolectar TODO el contenido debajo de esta etiqueta hasta la siguiente etiqueta conocida
            let valorLineas: string[] = [];
            // Valor en la misma linea (despues de la etiqueta)
            const restoLinea = lineas[li].substring(etq.texto.length).trim();
            if (restoLinea.length > 0) valorLineas.push(restoLinea);
            
            // Recolectar lineas siguientes hasta encontrar otra etiqueta del editor
            // O encontrar un encabezado de seccion conocido
            const seccionesConocidas = [
              'RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA', 'RESULTADOS DE APRENDIZAJE',
              'CONTENIDOS GENERALES', 'CONTENIDOS DE LA ASIGNATURA',
              'OBJETIVOS DE LA ASIGNATURA', 'CARACTERIZACIÓN DE LA ASIGNATURA',
              'CARACTERIZACION DE LA ASIGNATURA', 'COMPETENCIAS',
              'METODOLOGÍA', 'METODOLOGIA', 'BIBLIOGRAFÍA', 'BIBLIOGRAFIA',
              'PROCEDIMIENTOS DE EVALUACIÓN', 'PROCEDIMIENTOS DE EVALUACION',
              'UNIDADES TEMÁTICAS', 'UNIDADES TEMATICAS',
              'PROGRAMA ANALÍTICO DE ASIGNATURA', 'PROGRAMA ANALITICO DE ASIGNATURA',
            ];
            for (let lj = li + 1; lj < lineas.length; lj++) {
              const ljUpper = lineas[lj].toUpperCase().trim();
              // Verificar si esta linea es el inicio de OTRA etiqueta del editor
              const esOtraEtiqueta = etiquetasDelEditor.some(e => 
                ljUpper === e.texto || (ljUpper.startsWith(e.texto) && e.texto.length >= 6)
              );
              if (esOtraEtiqueta) break;
              // Verificar si es una seccion conocida (que no sea la misma etiqueta que estamos buscando)
              const esSeccionConocida = seccionesConocidas.some(s => ljUpper === s && s !== etq.texto);
              if (esSeccionConocida) break;
              valorLineas.push(lineas[lj]);
            }
            
            const valor = valorLineas.join('\n').trim();
            // NO agregar si el valor es OTRA etiqueta del editor (es un sub-header, no un dato)
            if (valor.length > 0 && !etiquetasEditorSet.has(valor.toUpperCase())) {
              // Si ya existe valor del HTML pero es mas corto, REEMPLAZAR con el mas completo
              const existente = wordData[etq.texto];
              // Override si: no existe, O es significativamente mas largo, O tiene mas lineas (mas resultados separados)
              const valorTieneMasLineas = existente && valor.split('\n').length > existente.split('\n').length;
              const valorEsMasLargo = existente && valor.length > existente.length * 1.3 && valor.length > 60;
              if (!existente || valorEsMasLargo || valorTieneMasLineas) {
                wordData[etq.texto] = valor;
                console.log("  [texto-directo" + (existente ? " OVERRIDE" : "") + "] " + etq.texto + " -> " + valor.substring(0, 80));
              }
            }
            break; // Solo el primer match
          }
        }
      }
    }

    console.log("========== DATOS EXTRAIDOS ==========");
    console.log("Total:", Object.keys(wordData).length);
    for (const [k, v] of Object.entries(wordData)) {
      console.log("  [" + k + "] = " + String(v).substring(0, 100));
    }

    if (Object.keys(wordData).length === 0) {
      alert(
        "No se encontraron datos en el Word.\n\n" +
        "Opcion 1: Use etiquetas [NOMBRE] en el Word:\n\n" +
        etiquetasDelEditor.slice(0, 8).map(e => "  [" + e.texto + "] texto aqui...").join("\n") +
        "\n\nOpcion 2: El Word debe tener tablas con los datos.\n\n" +
        "Abra la consola del navegador (F12) para ver mas detalles."
      );
      return;
    }

    // ====================================================
    // PASO FINAL: Llenar celdas vacias del editor
    // ====================================================
    let celdasLlenadas = 0;
    const matchesOk: string[] = [];

    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => {
      const processedRows = tab.rows.map((row, rowIdx) => {
        const newCells = row.cells.map(c => ({ ...c }));
        return { ...row, cells: newCells };
      });

      // ====================================================
      // LLENADO GENERAL: Para celdas con etiquetas del editor
      // REGLA CLAVE: Solo llenar si la celda destino esta REALMENTE vacia.
      // NO sobrescribir datos que ya vienen de la base de datos.
      // Solo buscar a la derecha en la MISMA fila. NO buscar en filas de abajo
      // para evitar desorden y sobrescritura de otras secciones.
      // ====================================================
      
      // Etiquetas que NO se deben tocar (ya tienen valor de la BD o son estructurales)
      const etiquetasProtegidas = new Set([
        "ASIGNATURA", "NIVEL", "CODIGO", "CARRERA", "PERIODO", "PERIODO ACADEMICO",
        "PERIODO ACADEMICO ORDINARIO", "PERIODO ACADEMICO ORDINARIO (PAO)", "PAO",
        "MATERIA", "CREDITOS", "HORAS", "DOCENTE", "PROFESOR", "SEMESTRE",
        "MODALIDAD", "PREREQUISITOS", "CORREQUISITOS", "CLAVE", "PARALELO",
        "CICLO", "SEDE", "FACULTAD", "DEPARTAMENTO", "ESCUELA"
      ]);

      for (let rowIdx = 0; rowIdx < processedRows.length; rowIdx++) {
        const fila = processedRows[rowIdx];
        for (let i = 0; i < fila.cells.length; i++) {
          const celda = fila.cells[i];
          const etiqueta = (celda.content || '').trim().toUpperCase();
          if (!etiqueta || etiqueta.length < 2) continue;
          // SKIP: Si el texto es muy largo NO es una etiqueta, es contenido ya llenado
          if (etiqueta.length > 80) continue;

          // Normalizar para comparar con protegidas
          const etqNorm = etiqueta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          
          // SKIP: Si la etiqueta es protegida (datos de BD), NO tocar nada
          if (etiquetasProtegidas.has(etqNorm)) {
            console.log("PROTEGIDA (no tocar): [" + etiqueta + "]");
            continue;
          }
          // SKIP: Si alguna etiqueta protegida es parte de esta etiqueta
          let esProtegida = false;
          for (const prot of etiquetasProtegidas) {
            if (etqNorm.includes(prot) && etqNorm.length <= prot.length + 15) {
              // Ejemplo: "PERIODO ACADEMICO ORDINARIO (PAO)" contiene "PERIODO"
              console.log("PROTEGIDA (contiene '" + prot + "'): [" + etiqueta + "]");
              esProtegida = true;
              break;
            }
          }
          if (esProtegida) continue;
          
          // Verificar si la celda a la derecha YA tiene contenido (viene de la BD)
          if (i + 1 < fila.cells.length) {
            const celdaDerecha = fila.cells[i + 1];
            if (celdaDerecha.content && celdaDerecha.content.trim().length > 0) {
              console.log("SKIP (celda derecha ya llena): [" + etiqueta + "] = '" + celdaDerecha.content.substring(0, 40) + "'");
              continue; // Ya tiene dato, NO sobrescribir
            }
          }

          const dato = buscarEnWordData(wordData, etiqueta);
          if (!dato || (typeof dato === 'string' && dato.trim().length === 0)) continue;

          // Limpiar TODOS los prefijos resultado-X: y ut-X-descripcion: del dato
          let datoLimpio = String(dato);
          // Limpiar todos los prefijos resultado-X : / resultado-X: (con/sin espacio y guion)
          datoLimpio = datoLimpio.replace(/resultado[\s\-]*\d+\s*:/gi, "").trim();
          datoLimpio = datoLimpio.replace(/^ut-?\d+-?\w*:/i, "").trim();
          if (!datoLimpio) continue;

          // =============================================
          // CASO ESPECIAL: RESULTADOS DE APRENDIZAJE con rowSpan > 1
          // Si la celda tiene rowSpan > 1, el dato puede tener MULTIPLES resultados
          // separados por patrones como "resultado-2:", "Actitudinales:", "Procedimentales:", etc.
          // Separar y llenar la celda actual + las filas de abajo
          // =============================================
          const esResultados = etqNorm.includes("RESULTADO") && etqNorm.includes("APRENDIZAJE");
          if (esResultados && celda.rowSpan > 1) {
            // Separar resultados individuales del texto original (antes de limpiar)
            const datoOriginal = String(dato);
            
            const regResultadoSplit = /(?=resultado[\s\-]*\d+\s*:)/gi;
            const regResultadoClean = /^resultado[\s\-]*\d+\s*:/i;
            
            // METODO 1: Separar por "resultado-X:"
            let partesResultados = datoOriginal.split(regResultadoSplit).filter(p => p.trim().length > 0);
            partesResultados = partesResultados.map(p => p.replace(regResultadoClean, "").trim()).filter(p => p.length > 0);
            
            // METODO 2: Separar por categorías tipo "Actitudinales:", "Procedimentales:", etc.
            if (partesResultados.length <= 1) {
              const porCategorias = datoOriginal.split(/(?=(?:Actitudinales|Procedimentales|Conceptuales|Cognitivos|Praxiol[oó]gicos|Axiológicos|Axiologicos)\s*:)/i).filter(p => p.trim().length > 0);
              const limpias = porCategorias.map(p => p.replace(regResultadoClean, "").trim()).filter(p => p.length > 3);
              if (limpias.length > 1) {
                partesResultados = limpias;
              }
            }

            // METODO 3: Separar por saltos de línea
            if (partesResultados.length <= 1) {
              const textoLimpio = datoOriginal.replace(regResultadoClean, "").trim();
              const porLineas = textoLimpio.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
              if (porLineas.length > 1 && porLineas.length <= celda.rowSpan) {
                partesResultados = porLineas;
              }
            }

            // METODO 4: Separar por puntos seguidos de mayúscula (patrones de oración)
            if (partesResultados.length <= 1) {
              const textoLimpio = datoOriginal.replace(regResultadoClean, "").trim();
              const porOraciones = textoLimpio.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/).map(l => l.trim()).filter(l => l.length > 20);
              if (porOraciones.length > 1 && porOraciones.length <= celda.rowSpan * 2) {
                // Distribuir oraciones entre las celdas disponibles
                const maxSlots = celda.rowSpan;
                if (porOraciones.length <= maxSlots) {
                  partesResultados = porOraciones.map((o, i) => i < porOraciones.length - 1 ? o + '.' : o);
                } else {
                  // Más oraciones que slots: agrupar
                  const perSlot = Math.ceil(porOraciones.length / maxSlots);
                  partesResultados = [];
                  for (let si = 0; si < maxSlots; si++) {
                    const start = si * perSlot;
                    const end = Math.min(start + perSlot, porOraciones.length);
                    const chunk = porOraciones.slice(start, end).join('. ');
                    if (chunk.trim()) partesResultados.push(chunk.trim() + (end < porOraciones.length ? '.' : ''));
                  }
                }
              }
            }

            // METODO 5: Si todo falla y el texto es largo, dividir equitativamente por tamaño
            if (partesResultados.length <= 1 && datoOriginal.length > 100) {
              const textoLimpio = datoOriginal.replace(regResultadoClean, "").trim();
              const maxSlots = celda.rowSpan;
              // Intentar dividir en puntos naturales (punto, punto y coma, coma antes de "y")
              const fragmentos = textoLimpio.split(/(?<=\.)\s+|(?<=;)\s+/).map(f => f.trim()).filter(f => f.length > 5);
              if (fragmentos.length >= maxSlots) {
                const perSlot = Math.ceil(fragmentos.length / maxSlots);
                partesResultados = [];
                for (let si = 0; si < maxSlots; si++) {
                  const start = si * perSlot;
                  const end = Math.min(start + perSlot, fragmentos.length);
                  const chunk = fragmentos.slice(start, end).join(' ');
                  if (chunk.trim()) partesResultados.push(chunk.trim());
                }
              } else if (fragmentos.length > 1) {
                partesResultados = fragmentos;
              }
            }

            // METODO 6: Último recurso - poner TODO el texto en la primera celda
            if (partesResultados.length === 0) {
              const textoLimpio = datoOriginal.replace(regResultadoClean, "").trim();
              if (textoLimpio.length > 0) {
                partesResultados = [textoLimpio];
              }
            }
            
            console.log("RESULTADOS MULTIPLES: " + partesResultados.length + " encontrados (rowSpan=" + celda.rowSpan + ")");
            console.log("  DATO COMPLETO RESULTADOS (largo=" + datoOriginal.length + "):");
            for (let ci = 0; ci < datoOriginal.length; ci += 200) {
              console.log("    [" + ci + "-" + Math.min(ci+200, datoOriginal.length) + "]: " + datoOriginal.substring(ci, ci + 200));
            }
            if (partesResultados.length > 0) {
              partesResultados.forEach((p, pi) => console.log("  -> Parte " + (pi+1) + ": " + p.substring(0, 100)));
            }
            
            if (partesResultados.length > 0) {
              // Llenar la primera celda a la derecha con resultado 1
              for (let j = i + 1; j < fila.cells.length; j++) {
                const celdaDest = fila.cells[j];
                if (celdaDest.isEditable && (!celdaDest.content || celdaDest.content.trim().length === 0) && celdaDest.rowSpan !== 0) {
                  processedRows[rowIdx].cells[j] = { ...celdaDest, content: partesResultados[0].trim() };
                  celdasLlenadas++;
                  matchesOk.push(etiqueta + " (resultado 1)");
                  console.log("LLENADO RESULTADO 1: [" + etiqueta + "] -> fila " + rowIdx + " celda " + j + " = '" + partesResultados[0].trim().substring(0, 60) + "'");
                  break;
                }
              }
              
              // Llenar resultados 2, 3, etc. en las filas de abajo (las que son parte del rowSpan)
              for (let ri = 1; ri < partesResultados.length && ri < celda.rowSpan; ri++) {
                const filaAbajo = processedRows[rowIdx + ri];
                if (!filaAbajo) break;
                // Buscar primera celda vacía editable en esa fila
                for (let j = 0; j < filaAbajo.cells.length; j++) {
                  const celdaDest = filaAbajo.cells[j];
                  if (celdaDest.isEditable && (!celdaDest.content || celdaDest.content.trim().length === 0) && celdaDest.rowSpan !== 0) {
                    processedRows[rowIdx + ri].cells[j] = { ...celdaDest, content: partesResultados[ri].trim() };
                    celdasLlenadas++;
                    matchesOk.push(etiqueta + " (resultado " + (ri + 1) + ")");
                    console.log("LLENADO RESULTADO " + (ri + 1) + ": fila " + (rowIdx + ri) + " celda " + j + " = '" + partesResultados[ri].trim().substring(0, 60) + "'");
                    break;
                  }
                }
              }
            }
            continue; // Ya procesamos los resultados, pasar a la siguiente etiqueta
          }

          // Buscar celda vacia a la DERECHA en la misma fila SOLAMENTE
          let llenada = false;
          for (let j = i + 1; j < fila.cells.length; j++) {
            const celdaDest = fila.cells[j];
            if (celdaDest.isEditable && (!celdaDest.content || celdaDest.content.trim().length === 0) && celdaDest.rowSpan !== 0) {
              processedRows[rowIdx].cells[j] = { ...celdaDest, content: datoLimpio };
              celdasLlenadas++;
              matchesOk.push(etiqueta);
              console.log("LLENADO: [" + etiqueta + "] -> celda " + j + " = '" + datoLimpio.substring(0, 80) + "'");
              llenada = true;
              break;
            }
          }

          if (!llenada) {
            console.log("NO LLENADO: [" + etiqueta + "] dato='" + String(dato).substring(0, 50) + "' (sin celda vacia a la derecha)");
          }
        }
      }

      // ====================================================
      // LLENADO ESPECIAL: Unidades Tematicas (UT 1, UT 2, etc.)
      // Las filas de UTs estan VACIAS en el editor, no tienen texto para match.
      // Buscamos la fila header (UNIDADES TEMATICAS | DESCRIPCION)
      // y llenamos las filas vacias debajo con UT 1, UT 2, etc. del Word.
      // ====================================================
      let headerRowIdx = -1;
      let utColIdx = -1;    // Columna de "UNIDADES TEMATICAS"
      let descColIdx = -1;  // Columna de "DESCRIPCION"

      // Buscar la fila que tiene "UNIDADES TEMÁTICAS" (y opcionalmente "DESCRIPCIÓN" en la MISMA fila)
      // IMPORTANTE: Solo aceptar la fila si contiene "UNIDADES" Y "TEM" en alguna celda
      // La celda debe ser corta (etiqueta/header), NO contenido largo que menciona las palabras
      for (let r = 0; r < processedRows.length; r++) {
        const celdas = processedRows[r].cells;
        let tieneUnidades = false;
        let utColTemp = -1;
        let descColTemp = -1;
        for (let c = 0; c < celdas.length; c++) {
          const txt = (celdas[c].content || '').trim().toUpperCase();
          // Solo considerar celdas cortas como headers (< 40 chars)
          // Celdas con contenido largo son datos, NO headers
          if (txt.length < 40 && txt.includes("UNIDADES") && txt.includes("TEM")) {
            tieneUnidades = true;
            utColTemp = c;
          }
          if (txt.length < 40 && txt.includes("DESCRIPCI")) {
            descColTemp = c;
          }
        }
        // Solo usar esta fila si tiene UNIDADES TEMÁTICAS
        if (tieneUnidades) {
          headerRowIdx = r;
          utColIdx = utColTemp;
          descColIdx = descColTemp; // puede ser -1 si no hay DESCRIPCION en esta fila
          break; // Encontrado, salir
        }
      }

      // Si no encontramos DESCRIPCION en la misma fila, buscar la columna siguiente a UNIDADES
      if (headerRowIdx >= 0 && descColIdx < 0 && utColIdx >= 0) {
        descColIdx = utColIdx + 1;
        console.log("  descCol no encontrado, usando columna " + descColIdx + " (siguiente a utCol)");
      }

      if (headerRowIdx >= 0) {
        console.log("--- LLENADO UTs: header en fila " + headerRowIdx + ", utCol=" + utColIdx + ", descCol=" + descColIdx + " ---");

        // DEBUG: Mostrar estructura de TODAS las filas del editor
        console.log("  === ESTRUCTURA COMPLETA DEL EDITOR ===");
        for (let r = 0; r < processedRows.length; r++) {
          const fila = processedRows[r];
          const celdasInfo = fila.cells.map((c, ci) => 
            "c" + ci + ":[" + (c.content || "").substring(0, 25) + "] ed=" + c.isEditable + " rs=" + (c.rowSpan ?? "?")
          ).join(" | ");
          console.log("  Fila " + r + " (" + fila.cells.length + " celdas): " + celdasInfo + (r === headerRowIdx ? " <<< UT HEADER" : ""));
        }
        console.log("  === FIN ESTRUCTURA ===");

        // Contar cuantas filas vacias hay despues del header
        // DETENERSE si encontramos una fila que pertenece a OTRA seccion (tiene etiqueta conocida)
        let utNum = 1;
        for (let r = headerRowIdx + 1; r < processedRows.length; r++) {
          const fila = processedRows[r];

          // VERIFICAR si esta fila es de OTRA seccion (tiene una celda con texto largo que NO es UT)
          // Si la primera celda con contenido no es vacía y no empieza con "UT", es otra sección
          const primeraCeldaConTexto = fila.cells.find(c => c.content && c.content.trim().length > 2);
          if (primeraCeldaConTexto) {
            const textoUpper = primeraCeldaConTexto.content!.trim().toUpperCase();
            // Si NO es una celda que ya llenamos (UT X:) y tiene texto de etiqueta conocida, PARAR
            if (!textoUpper.startsWith("UT ") && !textoUpper.startsWith("UNIDAD") &&
                (textoUpper.includes("METODOLOG") || textoUpper.includes("EVALUACI") || 
                 textoUpper.includes("BIBLIOGRAF") || textoUpper.includes("RESULTADOS") ||
                 textoUpper.includes("COMPETENCIA") || textoUpper.includes("OBJETIVO") ||
                 textoUpper.includes("DECANO") || textoUpper.includes("DIRECTOR") ||
                 textoUpper.includes("COORDINADOR") || textoUpper.includes("DOCENTE") ||
                 textoUpper.includes("FECHA"))) {
              console.log("  DETENIDO en fila " + r + ": encontrada seccion '" + textoUpper.substring(0, 40) + "'");
              break;
            }
          }

          // Buscar celdas vacias editables en esta fila (independiente de columna)
          // porque la estructura puede variar (rowspan, merge, etc.)
          // IMPORTANTE: rowSpan === 0 significa celda oculta por merge, EXCLUIRLA
          const celdasVacias = fila.cells
            .map((c, idx) => ({ celda: c, idx }))
            .filter(x => {
              if (!x.celda.isEditable) return false;
              if (x.celda.content && x.celda.content.trim().length > 0) return false;
              // Excluir celdas con rowSpan=0 (ocultas por merge de otra celda)
              if (x.celda.rowSpan === 0) return false;
              return true;
            });

          if (celdasVacias.length === 0) continue; // No hay celdas vacias, saltar

          // DEBUG: mostrar que celdas vacias se encontraron
          console.log("  Fila " + r + ": " + celdasVacias.length + " celdas vacias -> indices: [" + celdasVacias.map(x => "c" + x.idx + "(rs=" + (x.celda.rowSpan ?? "undef") + ")").join(", ") + "]");
          // Tambien mostrar celdas excluidas por rowSpan=0
          const excluidas = fila.cells.filter((c, idx) => c.rowSpan === 0);
          if (excluidas.length > 0) {
            console.log("    (excluidas " + excluidas.length + " celdas con rowSpan=0)");
          }

          // Buscar datos de esta UT en el wordData
          // Construir un mapa case-insensitive de wordData
          const wordDataUpper: Record<string, string> = {};
          for (const [k, v] of Object.entries(wordData)) {
            wordDataUpper[k.toUpperCase().trim()] = String(v);
          }

          let tituloUT = "";
          let descripcionUT = "";

          // 1. Buscar clave principal "UT X" que puede tener "titulo | descripcion"
          const claveUTPrincipal = "UT " + utNum;
          const valPrincipal = wordDataUpper[claveUTPrincipal];
          if (valPrincipal) {
            let valStr = valPrincipal.replace(/^ut-?\d+-?\w*:/i, "").trim();
            if (valStr.includes(" | ")) {
              const partes = valStr.split(" | ");
              tituloUT = partes[0].trim();
              // La segunda parte puede tener prefijo "ut-1-descripcion:"
              descripcionUT = partes.slice(1).join(" | ").replace(/^ut-?\d+-?\w*:/i, "").trim();
            } else {
              tituloUT = valStr;
            }
          }

          // 2. Buscar clave de descripcion especifica "UT-X-DESCRIPCION" o "UT X DESCRIPCION"
          for (const [claveUpper, valor] of Object.entries(wordDataUpper)) {
            if (
              (claveUpper === "UT-" + utNum + "-DESCRIPCION" ||
               claveUpper === "UT " + utNum + " DESCRIPCION" ||
               claveUpper === "UT" + utNum + "-DESCRIPCION" ||
               claveUpper === "UT" + utNum + " DESCRIPCION")
            ) {
              let valStr = valor.replace(/^ut-?\d+-?\w*:/i, "").trim();
              if (valStr) descripcionUT = valStr;
            }
          }

          // 3. Si no hay titulo, buscar "UNIDAD X" como titulo (NO como descripcion)
          if (!tituloUT) {
            const valUnidad = wordDataUpper["UNIDAD " + utNum];
            if (valUnidad) {
              let valStr = valUnidad.replace(/^ut-?\d+-?\w*:/i, "").trim();
              if (valStr.includes(" | ")) {
                const partes = valStr.split(" | ");
                tituloUT = partes[0].trim();
                if (!descripcionUT) descripcionUT = partes.slice(1).join(" | ").replace(/^ut-?\d+-?\w*:/i, "").trim();
              } else {
                tituloUT = valStr;
              }
            }
          }

          // 4. Buscar cualquier otra clave que empiece con "UT" + utNum
          if (!tituloUT || !descripcionUT) {
            for (const [claveUpper, valor] of Object.entries(wordDataUpper)) {
              if (claveUpper.startsWith("UT " + utNum) || claveUpper.startsWith("UT" + utNum)) {
                // Ya procesamos las claves principales, saltar duplicados
                if (claveUpper === claveUTPrincipal) continue;
                let valStr = valor.replace(/^ut-?\d+-?\w*:/i, "").trim();
                if (claveUpper.includes("DESCRIPCION")) {
                  if (!descripcionUT && valStr) descripcionUT = valStr;
                } else {
                  if (!tituloUT && valStr) tituloUT = valStr;
                }
              }
            }
          }

          console.log("  UT " + utNum + ": titulo=[" + tituloUT.substring(0, 50) + "] desc=[" + descripcionUT.substring(0, 50) + "] celdasVacias=" + celdasVacias.length);

          // Si NO hay titulo NI descripcion para esta UT, no llenar y no incrementar
          // (la fila queda vacía para que el usuario la llene manualmente)
          if (!tituloUT && !descripcionUT) {
            console.log("  UT " + utNum + ": sin datos en Word, saltando fila (quedan " + celdasVacias.length + " celdas vacias)");
            utNum++;
            continue;
          }

          // Llenar las celdas vacias en orden:
          // Primera celda vacia = titulo de la UT
          // Segunda celda vacia = descripcion de la UT
          if (celdasVacias.length >= 1 && tituloUT) {
            const { idx } = celdasVacias[0];
            processedRows[r].cells[idx] = { ...fila.cells[idx], content: "UT " + utNum + ": " + tituloUT };
            celdasLlenadas++;
            matchesOk.push("UT " + utNum + " (titulo)");
            console.log("  LLENADO UT " + utNum + " titulo en celda " + idx);
          }

          if (celdasVacias.length >= 2 && descripcionUT) {
            const { idx } = celdasVacias[1];
            processedRows[r].cells[idx] = { ...fila.cells[idx], content: descripcionUT };
            celdasLlenadas++;
            matchesOk.push("UT " + utNum + " (descripcion)");
            console.log("  LLENADO UT " + utNum + " descripcion en celda " + idx);
          } else if (celdasVacias.length === 1 && descripcionUT && !tituloUT) {
            // Solo hay 1 celda vacia y solo tenemos descripcion
            const { idx } = celdasVacias[0];
            processedRows[r].cells[idx] = { ...fila.cells[idx], content: descripcionUT };
            celdasLlenadas++;
            matchesOk.push("UT " + utNum + " (descripcion)");
            console.log("  LLENADO UT " + utNum + " descripcion (unica celda) en celda " + idx);
          }

          utNum++;
        }
      }

      return { ...tab, rows: processedRows };
    });

    setprogramas(prev => prev.map(p =>
      p.id === activeProgramaAnaliticoId ? { ...p, tabs: updatedTabs } : p
    ));

    // Resumen
    let msg = "Sincronizacion completada (" + metodo + ")\n\n";
    msg += "Celdas llenadas: " + celdasLlenadas + "\n";
    msg += "Datos encontrados en Word: " + Object.keys(wordData).length + "\n\n";

    if (matchesOk.length > 0) {
      msg += "Matches exitosos:\n";
      matchesOk.forEach(e => { msg += "  + " + e + "\n"; });
    }

    if (celdasLlenadas === 0) {
      msg += "\nNo se lleno ninguna celda.\n\n";
      msg += "Claves del Word:\n";
      Object.keys(wordData).slice(0, 15).forEach(k => { msg += "  - " + k + "\n"; });
      msg += "\nEtiquetas del editor:\n";
      etiquetasDelEditor.slice(0, 15).forEach(e => { msg += "  - " + e.texto + "\n"; });
      msg += "\nAbra consola del navegador (F12) para mas detalles.\n";
      msg += "O use etiquetas [NOMBRE] en el Word para match directo.";
    }

    alert(msg);

  } catch (error: any) {
    console.error("Error en sincronizacion:", error);
    alert("Error: " + error.message);
  } finally {
    setIsLoading(false);
  }
};

// Función auxiliar: busca datos en wordData usando match flexible
function buscarEnWordData(wordData: Record<string, any>, etiqueta: string): any {
  // Normalizar: quitar acentos, espacios multiples, para comparacion mas flexible
  const normalizar = (s: string) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const etqNorm = normalizar(etiqueta);

  // 1. Match exacto (case-insensitive + sin acentos)
  for (const [clave, valor] of Object.entries(wordData)) {
    if (normalizar(clave) === etqNorm) return valor;
  }

  // 2. Match parcial: una contiene a la otra, con guardia de longitud 70%
  //    Priorizar el match mas largo (mas especifico)
  let mejorMatch: { valor: any; longitud: number } | null = null;
  for (const [clave, valor] of Object.entries(wordData)) {
    const claveNorm = normalizar(clave);
    if (claveNorm.length < 4 || etqNorm.length < 4) continue;
    
    const menor = Math.min(claveNorm.length, etqNorm.length);
    const mayor = Math.max(claveNorm.length, etqNorm.length);
    if (menor / mayor >= 0.7) {
      if (etqNorm.includes(claveNorm) || claveNorm.includes(etqNorm)) {
        // Preferir el match mas largo/especifico
        if (!mejorMatch || claveNorm.length > mejorMatch.longitud) {
          mejorMatch = { valor, longitud: claveNorm.length };
        }
      }
    }
  }
  if (mejorMatch) return mejorMatch.valor;

  // 3. Match por sinónimos conocidos (editor -> posibles claves del Word)
  const sinonimos: Record<string, string[]> = {
    "PERIODO ACADEMICO ORDINARIO (PAO)": ["PERIODO ACADEMICO ORDINARIO (PAO)", "PAO", "PERIODO ACADEMICO", "PERIODO ACADEMICO ORDINARIO"],
    "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA": ["RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA", "RESULTADOS DE APRENDIZAJE", "RESULTADOS"],
    "RESULTADOS D E APRENDIZAJE DE LA ASIGNATURA": ["RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA", "RESULTADOS DE APRENDIZAJE"],
    "BIBLIOGRAFIA - FUENTES DE CONSULTA": ["BIBLIOGRAFIA - FUENTES DE CONSULTA", "BIBLIOGRAFIA BASICA", "BIBLIOGRAFIA"],
    "BIBLIOGRAFIA BASICA": ["BIBLIOGRAFIA BASICA", "BIBLIOGRAFIA"],
    "BIBLIOGRAFIA COMPLEMENTARIA": ["BIBLIOGRAFIA COMPLEMENTARIA"],
    "CONTENIDOS DE LA ASIGNATURA": ["CONTENIDOS DE LA ASIGNATURA", "CONTENIDOS"],
    "PROCEDIMIENTOS DE EVALUACION": ["PROCEDIMIENTOS DE EVALUACION", "EVALUACION"],
    "OBJETIVOS DE LA ASIGNATURA": ["OBJETIVOS DE LA ASIGNATURA", "OBJETIVOS"],
    "CARACTERIZACION DE LA ASIGNATURA": ["CARACTERIZACION DE LA ASIGNATURA", "CARACTERIZACION"],
    "CARACTERIZACION": ["CARACTERIZACION"],
    "COMPETENCIAS": ["COMPETENCIAS"],
    "METODOLOGIA": ["METODOLOGIA"],
    "ASIGNATURA": ["ASIGNATURA"],
    "NIVEL": ["NIVEL"],
    "CODIGO": ["CODIGO"],
    "CARRERA": ["CARRERA"],
  };

  const aliasDirecto = sinonimos[etqNorm];
  if (aliasDirecto) {
    for (const a of aliasDirecto) {
      const aNorm = normalizar(a);
      for (const [clave, valor] of Object.entries(wordData)) {
        if (normalizar(clave) === aNorm) return valor;
      }
    }
  }

  // Tambien buscar al reves: si la etiqueta del editor coincide con algun alias
  for (const [key, aliases] of Object.entries(sinonimos)) {
    if (aliases.some(a => normalizar(a) === etqNorm || key === etqNorm)) {
      // Buscar CUALQUIERA de los alias en wordData
      for (const a of [key, ...aliases]) {
        const aNorm = normalizar(a);
        for (const [clave, valor] of Object.entries(wordData)) {
          if (normalizar(clave) === aNorm) return valor;
        }
      }
    }
  }

  // 4. Match por palabras significativas: al menos 2 palabras >= 4 chars deben coincidir
  const palabrasEtq = etqNorm.split(/\s+/).filter(p => p.length >= 4);
  if (palabrasEtq.length >= 2) {
    for (const [clave, valor] of Object.entries(wordData)) {
      const claveNorm = normalizar(clave);
      const palabrasClave = claveNorm.split(/\s+/).filter(p => p.length >= 4);
      // Contar cuantas palabras significativas coinciden
      const coincidencias = palabrasEtq.filter(p => palabrasClave.some(pc => pc === p || pc.includes(p) || p.includes(pc)));
      // Al menos 2 palabras deben coincidir, o si la etiqueta solo tiene 2 palabras, ambas
      const minCoincidencias = Math.min(2, palabrasEtq.length);
      if (coincidencias.length >= minCoincidencias) {
        return valor;
      }
    }
  }

  return null;
}
  const handleSaveToDB = async () => {
    if (!activeProgramaAnalitico) return alert("No hay un ProgramaAnalitico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activeProgramaAnalitico.metadata,
        tabs: activeProgramaAnalitico.tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id,
            cells: row.cells.map(cell => ({
              ...cell,
              styles: {
                ...(cell.backgroundColor ? { backgroundColor: cell.backgroundColor } : {}),
                ...(cell.textColor ? { textColor: cell.textColor } : {}),
                ...(cell.textAlign ? { textAlign: cell.textAlign } : {}),
                ...(cell.textOrientation ? { textOrientation: cell.textOrientation } : {})
              }
            }))
          }))
        }))
      };

      const payload: any = {
        nombre: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        periodo: selectedPeriod,
        materias: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        datos_tabla: datosParaGuardar
      }
      // Incluir asignatura_id si viene de la URL
      if (asignaturaIdParam) payload.asignatura_id = parseInt(asignaturaIdParam, 10);
      
      const isUpdate = typeof activeProgramaAnalitico.id === "number"
      const endpoint = isUpdate ? `/api/programa-analitico/${activeProgramaAnalitico.id}` : "/api/programa-analitico"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedProgramaAnaliticoRecord;
      
      const savedUIData = savedRecord.datos_tabla;
      savedUIData.id = savedRecord.id;
      
      if (savedUIData.tabs) {
          savedUIData.tabs = savedUIData.tabs.map((t: any) => ({
              ...t,
              rows: t.rows.map((r: any) => ({
                  ...r,
                  cells: r.cells.map((c: any) => ({
                      ...c,
                      backgroundColor: c.styles?.backgroundColor,
                      textColor: c.styles?.textColor,
                      textAlign: c.styles?.textAlign,
                      textOrientation: c.styles?.textOrientation,
                      isEditable: true
                  }))
              }))
          }));
      }

      setprogramas((prev) => prev.map((s) => (s.id === activeProgramaAnaliticoId ? savedUIData : s)))
      setActiveProgramaAnaliticoId(savedUIData.id)
      
      if (isUpdate) {
        setSavedprogramas(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setSavedprogramas(prev => [savedRecord, ...prev]);
      }
      
      alert("¡ProgramaAnalitico guardado exitosamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<ProgramaAnaliticoData>) => {
    setprogramas(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activeProgramaAnalitico) return;
    const updatedMetadata = { ...activeProgramaAnalitico.metadata, [field]: value };
    updateProgramaAnalitico(activeProgramaAnalitico.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadProgramaAnalitico = (ProgramaAnaliticoId: string) => {
    console.log("🔍 handleLoadProgramaAnalitico - ID recibido:", ProgramaAnaliticoId);
    console.log("📚 savedprogramas disponibles:", savedprogramas.length);
    
    if (!ProgramaAnaliticoId) {
      console.error("❌ No se proporcionó ProgramaAnaliticoId");
      return;
    }
    
    const id = parseInt(ProgramaAnaliticoId, 10);
    console.log("🔢 ID parseado:", id);
    
    // Comparar convirtiendo ambos a número
    const ProgramaAnaliticoToLoad = savedprogramas.find(s => Number(s.id) === id);
    console.log("📖 ProgramaAnalitico encontrado:", ProgramaAnaliticoToLoad ? "SÍ" : "NO");
    
    if (ProgramaAnaliticoToLoad) {
      console.log("✅ Cargando ProgramaAnalitico:", ProgramaAnaliticoToLoad.nombre);
      
      let rawData = (ProgramaAnaliticoToLoad as any).datos_tabla || (ProgramaAnaliticoToLoad as any).datos_programa;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch(e) { console.error("Error parsing datos_tabla:", e); }
      }
      if (!rawData || typeof rawData !== 'object') {
        console.error("❌ datos_tabla está vacío o no es un objeto");
        alert("El programa seleccionado no tiene datos válidos.");
        return;
      }
      
      let editorData = rawData;
      
      // 🔧 FIX CRÍTICO: Convertir formato de validación a formato de editor
      if ((editorData as any).tipo === 'ProgramaAnalitico_validado' && (editorData as any).titulos && !editorData.tabs) {
        console.log("🔄 Convirtiendo formato de validación a formato de editor...");
        console.log("   Títulos encontrados:", (editorData as any).titulos.length);
        
        // Crear una tabla con los títulos encontrados
        const rows = (editorData as any).titulos.map((titulo: string, index: number) => ({
          id: `row-${Date.now()}-${index}`,
          cells: [
            {
              id: `cell-${Date.now()}-${index}-0`,
              content: titulo,
              colSpan: 1,
              rowSpan: 1,
              isEditable: true
            },
            {
              id: `cell-${Date.now()}-${index}-1`,
              content: "",
              colSpan: 1,
              rowSpan: 1,
              isEditable: true
            }
          ]
        }));
        
        editorData = {
          version: "2.0",
          name: ProgramaAnaliticoToLoad.nombre,
          metadata: {
            ...editorData.metadata,
            subject: ProgramaAnaliticoToLoad.nombre,
            period: ProgramaAnaliticoToLoad.periodo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          tabs: [{
            id: `tab-${Date.now()}`,
            title: "ProgramaAnalitico Importado",
            rows: rows
          }]
        } as any;
        
        console.log("✅ Conversión completada - Filas creadas:", rows.length);
      }
      
      editorData.id = ProgramaAnaliticoToLoad.id;
      
      // ✅ VALIDACIÓN Y NORMALIZACIÓN DE LA ESTRUCTURA
      if (!editorData.tabs || editorData.tabs.length === 0) {
        console.log("⚠️ No hay tabs, creando estructura desde datos...");
        
        // Si tiene secciones (formato antiguo de Excel upload)
        if ((editorData as any).secciones && Array.isArray((editorData as any).secciones)) {
          console.log("🔄 Convirtiendo formato secciones a tabs...", (editorData as any).secciones.length, "secciones");
          editorData.tabs = (editorData as any).secciones.map((sec: any, idx: number) => ({
            id: `tab-sec-${idx}-${Date.now()}`,
            title: sec.titulo || sec.nombre || `Sección ${idx + 1}`,
            rows: Array.isArray(sec.datos) ? sec.datos.map((fila: any, rIdx: number) => ({
              id: `row-${idx}-${rIdx}-${Date.now()}`,
              cells: (Array.isArray(fila) ? fila : [fila]).map((celda: any, cIdx: number) => ({
                id: `cell-${idx}-${rIdx}-${cIdx}-${Date.now()}`,
                content: typeof celda === 'string' ? celda : (celda?.contenido || celda?.content || JSON.stringify(celda) || ''),
                isHeader: rIdx === 0,
                rowSpan: 1,
                colSpan: 1,
                isEditable: true,
                textOrientation: 'horizontal' as const
              }))
            })) : []
          }));
        }
        // Si tiene rows directamente (formato antiguo)
        else if ((editorData as any).rows && Array.isArray((editorData as any).rows)) {
          console.log("📋 Encontradas", (editorData as any).rows.length, "filas directas");
          editorData.tabs = [{ 
            id: `tab-${Date.now()}`, 
            title: "General", 
            rows: (editorData as any).rows 
          }];
        } else {
          // Crear estructura vacía
          console.log("⚠️ No hay rows, creando estructura vacía");
          editorData.tabs = [{ 
            id: `tab-${Date.now()}`, 
            title: "General", 
            rows: [] 
          }];
        }
      } else {
        console.log(`✅ Estructura con ${editorData.tabs.length} tabs encontrada`);
        editorData.tabs.forEach((tab: any, idx: number) => {
          console.log(`   Tab ${idx + 1}: "${tab.title}" - ${tab.rows?.length || 0} filas`);
        });
      }
      
      // Asegurar que el nombre esté presente
      if (!editorData.name) {
        editorData.name = ProgramaAnaliticoToLoad.nombre;
      }
      
      setprogramas([editorData]);
      setActiveProgramaAnaliticoId(editorData.id);
      setActiveTabId(editorData.tabs[0]?.id || null);
      
      // Establecer el periodo seleccionado (solo si tiene valor)
      if (ProgramaAnaliticoToLoad.periodo) {
        // Resolver: si es un ID numérico, buscar el nombre correspondiente
        const periodoVal = ProgramaAnaliticoToLoad.periodo;
        const periodoObj = periodos.find((p: any) => p.id?.toString() === String(periodoVal));
        setSelectedPeriod(periodoObj ? periodoObj.nombre : periodoVal);
      }
      console.log("✅ ProgramaAnalitico cargado exitosamente");
      console.log("   - ID:", editorData.id);
      console.log("   - Nombre:", editorData.name);
      console.log("   - Periodo:", ProgramaAnaliticoToLoad.periodo);
      console.log("   - Tabs:", editorData.tabs.length);
      console.log("   - Filas en tab activo:", editorData.tabs[0]?.rows?.length || 0);
    } else {
      console.error("❌ No se encontró el ProgramaAnalitico con ID:", id);
      console.log("📋 IDs disponibles:", savedprogramas.map(s => s.id));
    }
  };

  // --- NUEVA FUNCIÓN: Upload con validación para comisión académica ---
  const handleUploadConValidacion = async (file: File) => {
    try {
      // Verificar que haya un periodo seleccionado
      if (!selectedPeriod) {
        alert("❌ Por favor seleccione un periodo académico antes de subir el documento");
        setIsLoading(false);
        return;
      }

      const periodoNombre = periodos.find(p => p.id.toString() === selectedPeriod)?.nombre || selectedPeriod;

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', file.name.replace(/\.docx?$/i, ''));
      formData.append('periodo', periodoNombre);
      formData.append('materias', activeProgramaAnalitico?.metadata?.subject || 'Sin especificar');

      console.log(`📤 Enviando ProgramaAnalitico para validación - Periodo: ${periodoNombre}`);

      // Enviar al endpoint de validación
      const currentToken = token || getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${API_URL}/programas/upload-validado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ✅ VALIDACIÓN EXITOSA
        const validacion = result.data?.validacion || {};
        alert(
          `✅ ProgramaAnalitico validado y guardado exitosamente\n\n` +
          `Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
          `Mínimo requerido: 95%\n` +
          `Campos requeridos: ${validacion.total_requeridos || 0}\n` +
          `Campos encontrados: ${validacion.encontrados || 0}`
        );
        
        // Recargar la lista de programas guardados
        try {
          const programasData = await apiRequest("/api/programa-analitico");
          const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
          setSavedprogramas(programasArray);
          
          // Cargar el ProgramaAnalitico recién guardado
          if (result.data?.id) {
            handleLoadProgramaAnalitico(result.data.id.toString());
          }
        } catch (err) {
          console.error("Error recargando lista:", err);
        }
      } else {
        // ❌ VALIDACIÓN FALLIDA
        const detalles = result.detalles || {};
        const faltantes = detalles.faltantes || [];
        const extras = detalles.extras || [];
        
        let mensaje = `❌ El ProgramaAnalitico NO cumple con la estructura requerida\n\n`;
        mensaje += `📊 Coincidencia: ${detalles.porcentaje_coincidencia || 0}% (mínimo requerido: 95%)\n`;
        mensaje += `📋 Total requeridos: ${detalles.total_requeridos || 0}\n`;
        mensaje += `✅ Encontrados: ${detalles.encontrados || 0}\n\n`;
        
        if (faltantes.length > 0) {
          mensaje += `❌ Campos Faltantes (${faltantes.length}):\n`;
          faltantes.slice(0, 10).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
          if (faltantes.length > 10) {
            mensaje += `   ... y ${faltantes.length - 10} más\n`;
          }
        }
        
        if (extras.length > 0) {
          mensaje += `\n⚠️ Campos Extra (${extras.length}):\n`;
          extras.slice(0, 5).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
        }
        
        mensaje += `\n💡 Por favor, revise el documento y asegúrese de que contenga todos los campos requeridos según la plantilla del administrador.`;
        
        alert(mensaje);
      }
    } catch (error: any) {
      console.error('❌ Error en validación:', error);
      alert(`❌ Error al validar el ProgramaAnalitico:\n${error.message || 'Error desconocido'}\n\nPor favor, verifique que existe una plantilla de referencia para este periodo.`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMPORTACIÓN MAESTRA V8: HEURÍSTICA DE ESTRUCTURA Y VERTICALIDAD ---
  // --- IMPORTACIÓN MAESTRA V9: CORREGIDA PARA FUSIÓN DE SUBTABLAS ---
  // --- IMPORTACIÓN V10: ESTRATEGIA DE BLOQUEO POR SECCIONES (SOLUCIÓN DEFINITIVA) ---
  // --- IMPORTACIÓN MAESTRA V11: ESTRATEGIA "REBANADORA" (MEGA TABLA) ---
  const handleProgramaAnaliticoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    // Validación para comisión académica
    if (user?.rol === 'comision_academica') {
      await handleUploadConValidacion(file);
      return;
    }

    try {
      // 1. Convertir a HTML preservando la estructura de tabla
      const { value: html } = await mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        { 
          styleMap: [
            "b => strong",
            "table.header => thead" 
          ]
        }
      );

      const doc = new DOMParser().parseFromString(html, "text/html");
      
      // Intentar sacar metadata básica
      const findMeta = (k: string) => Array.from(doc.querySelectorAll("p, td"))
        .find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim() || "";
      
      const meta = { 
        subject: findMeta("Nombre de la asignatura") || findMeta("Materia") || "Sin Nombre", 
        period: findMeta("Periodo") || "", 
        level: findMeta("Nivel") || "" 
      };

      console.log("--- MODO: REBANADO DE MEGA-TABLA ---");

      // 2. PALABRAS CLAVE QUE INDICAN EL INICIO DE UNA NUEVA PESTAÑA
      // Estas son las palabras que aparecen en la columna izquierda de tu imagen
      const SECTION_TRIGGERS = [
        "DATOS GENERALES", "INFORMACIÓN GENERAL",
        "OBJETIVOS", "OBJETIVO",
        "RESULTADOS DE APRENDIZAJE", "RESULTADOS",
        "CONTENIDOS", "CONTENIDOS DE LA ASIGNATURA", "UNIDADES TEMÁTICAS",
        "METODOLOGÍA", "ESTRATEGIAS METODOLÓGICAS",
        "EVALUACIÓN", "SISTEMA DE EVALUACIÓN",
        "BIBLIOGRAFÍA", "FUENTES DE CONSULTA",
        "VISADO", "LEGALIZACIÓN"
      ];

      const newTabs: TabData[] = [];
      let currentRows: TableRow[] = [];
      let currentSectionTitle = "Información General"; // Título por defecto

      // Función para guardar el acumulado actual como una pestaña
      const pushCurrentSection = () => {
        if (currentRows.length > 0) {
            newTabs.push({
                id: `tab-${newTabs.length}-${Date.now()}`,
                title: currentSectionTitle,
                rows: [...currentRows] // Copia de las filas
            });
            currentRows = []; // Limpiar para la siguiente sección
        }
      };

      // 3. OBTENER TODAS LAS FILAS DEL DOCUMENTO (IGNORANDO SI ESTÁN EN DIFERENTES TABLAS)
      // Esto aplana el documento: no importa si es 1 tabla gigante o 5 pequeñas
      const allRows = Array.from(doc.querySelectorAll("tr"));

      allRows.forEach((tr, rIdx) => {
        // Analizar celdas de esta fila
        const cells = Array.from(tr.querySelectorAll("td, th"));
        if (cells.length === 0) return;

        // Obtener texto de la PRIMERA celda (donde suelen estar los títulos laterales)
        const firstCellText = cells[0].textContent?.replace(/\n/g, " ").trim().toUpperCase() || "";
        
        // Verificar si esta fila es un "ROMPE-SECCIÓN"
        // (Es decir, si la primera celda contiene una palabra clave)
        const matchedTrigger = SECTION_TRIGGERS.find(trigger => firstCellText.includes(trigger));

        // CASO ESPECIAL: Si detectamos "CONTENIDOS", activamos la lógica de agrupación
        // Si encontramos un trigger NUEVO, cerramos la sección anterior e iniciamos una nueva
        if (matchedTrigger && firstCellText.length < 50) { // < 50 para evitar falsos positivos en párrafos largos
            pushCurrentSection(); // Guardar lo anterior
            
            // Limpiar título (ej: "CONTENIDOS DE LA ASIGNATURA" -> "Contenidos")
            let cleanTitle = matchedTrigger;
            if (cleanTitle.includes("CONTENIDOS")) cleanTitle = "Contenidos y Unidades";
            if (cleanTitle.includes("RESULTADOS")) cleanTitle = "Resultados de Aprendizaje";
            if (cleanTitle.includes("BIBLIOGRAFÍA")) cleanTitle = "Bibliografía";
            
            currentSectionTitle = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase(); // Capitalize
        }

        // --- CONVERTIR HTML TR A OBJETO FILA ---
        const rowData: TableRow = {
            id: `row-${Date.now()}-${rIdx}`,
            cells: cells.map((td, cIdx) => {
                const pEls = Array.from(td.querySelectorAll('p'));
                const content = pEls.length > 0 
                  ? pEls.map(p => (p.textContent || '').trim()).filter(t => t).join('\n')
                  : (td.textContent?.trim() || '');
                
                // Detección heurística de headers y orientación
                const isBold = !!td.querySelector("strong, b") || td.tagName === "TH";
                const isVertical = ["PRESENCIAL", "AUTÓNOMO", "PRACTICO"].some(k => content.toUpperCase().includes(k));
                
                // Si estamos en la sección de Contenidos, y la celda dice "UNIDADES TEMÁTICAS", es un header importante
                const isUnitHeader = currentSectionTitle.includes("Contenidos") && content.toUpperCase().includes("UNIDADES");

                return {
                    id: `cell-${Date.now()}-${rIdx}-${cIdx}`,
                    content: content,
                    isHeader: isBold || isUnitHeader,
                    rowSpan: parseInt(td.getAttribute("rowspan") || "1"),
                    colSpan: parseInt(td.getAttribute("colspan") || "1"),
                    isEditable: true,
                    textOrientation: isVertical ? 'vertical' : 'horizontal',
                    // Si es header de unidad, le ponemos un colorcito de fondo suave
                    backgroundColor: isUnitHeader ? '#f0fdf4' : undefined 
                };
            })
        };

        currentRows.push(rowData);
      });

      // Al final del loop, empujar la última sección pendiente
      pushCurrentSection();

      // --- VALIDACIÓN FINAL ---
      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se pudo detectar ninguna estructura válida en el documento.");
      }

      const newData: ProgramaAnaliticoData = {
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.subject || file.name.replace(".docx",""),
        description: "Importado (Mega-Tabla Split)",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setprogramas([newData]);
      setActiveProgramaAnaliticoId(newData.id);
      
      // Intentar ir a la pestaña de contenidos primero
      const tabContenidos = newTabs.find(t => t.title.toLowerCase().includes("contenidos"));
      setActiveTabId(tabContenidos ? tabContenidos.id : newTabs[0].id);

      console.log(`✅ Importación exitosa: ${newTabs.length} secciones detectadas.`);

    } catch (e) { 
        console.error(e); 
        alert("Error al procesar el archivo. Verifica que no esté corrupto."); 
    } finally { 
        setIsLoading(false); 
    }
  };
  // --- MÉTODOS DE EDICIÓN ---
  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activeProgramaAnalitico || !activeTabId) return;
    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activeProgramaAnalitico || !editingTabId) return;
    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeProgramaAnalitico) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: `Nueva Sección`,
      rows: [
        { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}] },
      ]
    };
    const updatedTabs = [...activeProgramaAnalitico.tabs, newTab];
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeProgramaAnalitico) return;
    if (activeProgramaAnalitico.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activeProgramaAnalitico.tabs.filter(t => t.id !== tabIdToRemove);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    if (activeTabId === tabIdToRemove) setActiveTabId(updatedTabs[0]?.id || null);
  };

  const findCellPosition = (id: string): {rowIndex: number, colIndex: number} | null => { if (!tableData) return null; for(let r=0;r<tableData.length;r++){ const c=tableData[r].cells.findIndex(cell=>cell.id===id); if(c!==-1)return{rowIndex: r, colIndex: c}} return null }
  const startEditing = (id: string, content: string) => { setEditingCell(id); setEditContent(content) }
  const saveEdit = () => { if(editingCell){ const updated=tableData.map(row=>({...row,cells:row.cells.map(c=>(c.id===editingCell?{...c,content:editContent}:c))})); handleUpdateActiveTabRows(updated); setEditingCell(null);setEditContent("")}}
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }
  const saveModalEdit = () => {
    if (!modalCell) return;
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(c => (c.id === modalCell.id ? { ...c, content: editContent } : c))
    }));
    handleUpdateActiveTabRows(updated);
    setModalCell(null);
    setEditContent("");
  }
  const handleCellClick = (id: string, e: React.MouseEvent) => { e.ctrlKey||e.metaKey ? setSelectedCells(p => p.includes(id)?p.filter(i=>i!==id):[...p,id]) : setSelectedCells([id]) }
  
  // 🆕 Función para inicializar tabla vacía
  const initializeEmptyTable = (rows: number = 5, cols: number = 3) => {
    console.log(`🎨 Inicializando tabla vacía: ${rows} filas x ${cols} columnas`);
    const newRows: TableRow[] = [];
    for (let r = 0; r < rows; r++) {
      const rowId = `r-${Date.now()}-${r}`;
      const cells: TableCell[] = [];
      for (let c = 0; c < cols; c++) {
        cells.push({
          id: `c-${rowId}-${c}`,
          content: "",
          isHeader: r === 0, // Primera fila como headers
          rowSpan: 1,
          colSpan: 1,
          isEditable: true
        });
      }
      newRows.push({ id: rowId, cells });
    }
    handleUpdateActiveTabRows(newRows);
    console.log("✅ Tabla inicializada con éxito");
  };
  
  const addRowAt=(idx:number)=>{
    // Si la tabla está vacía, inicializar primero
    if(!tableData.length) {
      console.log("⚠️ Tabla vacía, inicializando...");
      initializeEmptyTable(3, 3);
      return;
    }
    const rId=`r-${Date.now()}`,nCols=tableData[0].cells.reduce((a,c)=>a+c.colSpan,0);
    const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0}))};
    const nRows=[...tableData];nRows.splice(idx,0,nR);handleUpdateActiveTabRows(nRows)
  }
  const addColumnAt=(idx:number)=>{
    // Si la tabla está vacía, inicializar primero
    if(!tableData.length) {
      console.log("⚠️ Tabla vacía, inicializando...");
      initializeEmptyTable(3, 3);
      return;
    }
    const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});
    handleUpdateActiveTabRows(updated)
  }
  
  const handleInsertRow = (direction: "above" | "below") => { const pos = findCellPosition(selectedCells[0]); if(pos) addRowAt(direction === 'above' ? pos.rowIndex : pos.rowIndex + 1); }
  const handleInsertColumn = (direction: "left" | "right") => { const pos = findCellPosition(selectedCells[0]); if(pos) addColumnAt(direction === 'left' ? pos.colIndex : pos.colIndex + 1); }
  const removeSelectedRow = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.filter((_, i) => i !== pos.rowIndex); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const removeSelectedColumn = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== pos.colIndex) })); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const clearSelectedCells=()=>{ const updated=tableData.map(r=>({...r,cells:r.cells.map(c=>selectedCells.includes(c.id)?{...c,content:""}:c)})); handleUpdateActiveTabRows(updated); setSelectedCells([]) }
  
  const toggleVerticalText = () => {
    if (selectedCells.length === 0) return;
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(cell => {
        if (selectedCells.includes(cell.id)) {
          const newOrientation: 'horizontal' | 'vertical' = cell.textOrientation === 'vertical' ? 'horizontal' : 'vertical';
          return { ...cell, textOrientation: newOrientation }
        }
        return cell;
      })
    }));
    handleUpdateActiveTabRows(updated);
  };

  const mergeCells = () => {
    if (selectedCells.length < 2 || !activeTab) return alert("Selecciona 2+ celdas.");
    let posFirst=null, minR=Infinity, maxR=-1, minC=Infinity, maxC=-1, content=[];
    for(let r=0;r<tableData.length;r++){
      for(let c=0;c<tableData[r].cells.length;c++){
        const cell=tableData[r].cells[c];
        if(selectedCells.includes(cell.id)){
          if(!posFirst) posFirst={rowIndex:r, colIndex:c};
          minR=Math.min(minR,r); maxR=Math.max(maxR,r+cell.rowSpan-1);
          minC=Math.min(minC,c); maxC=Math.max(maxC,c+cell.colSpan-1);
          if(cell.content) content.push(cell.content);
        }
      }
    }
    if(posFirst){
      const {rowIndex, colIndex}=posFirst; const firstId=tableData[rowIndex].cells[colIndex].id;
      const updated=tableData.map(row=>({...row,cells:row.cells.map(cell=>{
        if(cell.id===firstId) return {...cell, rowSpan:maxR-minR+1, colSpan:maxC-minC+1, content:content.join("\n")};
        if(selectedCells.includes(cell.id)) return {...cell, rowSpan:0, colSpan:0};
        return cell;
      })}));
      handleUpdateActiveTabRows(updated); setSelectedCells([firstId]);
    }
  };

  const handlePrintToPdf = async () => { 
    if(!activeProgramaAnalitico) return;

    // Helper local para formatear periodo
    const fmtPeriodo = (periodoIdOrName: string) => {
      if (!periodoIdOrName) return "";
      const periodoObj = periodos.find((p: any) => p.id?.toString() === periodoIdOrName);
      const nombre = periodoObj?.nombre || periodoIdOrName;
      const match = nombre.match(/(P[IVX]+\s\d{4})/i);
      return match ? match[0].toUpperCase() : nombre;
    };

    // =================================================================
    // GENERAR PDF VÍA HTML NATIVO — preserva la estructura EXACTA
    // de rowSpan/colSpan de todas las tablas sin alterar nada
    // =================================================================
    const allTabs = activeProgramaAnalitico.tabs;
    let tablesHtml = '';

    for (let tabIdx = 0; tabIdx < allTabs.length; tabIdx++) {
      const tab = allTabs[tabIdx];
      if (!tab || !tab.rows || tab.rows.length === 0) continue;

      // Título de sección
      const isVisado = tab.title.toUpperCase().includes('VISADO') || tab.title.toUpperCase().includes('LEGALIZACIÓN');
      // Renombrar "SECCIÓN 1" → "DATOS GENERALES"
      let displayTitle = tab.title.toUpperCase();
      if (/SECCI[OÓ]N\s*1/i.test(displayTitle)) displayTitle = 'DATOS GENERALES';
      if (allTabs.length > 1) {
        tablesHtml += `<h3 style="margin-top:14px;margin-bottom:4px;font-size:10pt;color:#000;border-bottom:1.5pt solid #000;padding-bottom:2px;font-weight:bold;text-align:center;">${displayTitle}</h3>`;
      }

      // Contar columnas para escalar fuente en tablas anchas
      let firstRowCols = 0;
      for (const c of tab.rows[0]?.cells || []) {
        if (c.rowSpan !== 0 && c.colSpan !== 0) firstRowCols += (c.colSpan || 1);
      }
      const isWideTable = firstRowCols > 6;
      const baseFontSize = isWideTable ? '7.5pt' : '9pt';
      const vertFontSize = isWideTable ? '6.5pt' : '7pt';

      // Construir tabla HTML fiel a la estructura original
      tablesHtml += `<table style="${isWideTable ? 'font-size:' + baseFontSize + ';' : ''}">`;
      for (let rowIdx = 0; rowIdx < tab.rows.length; rowIdx++) {
        const row = tab.rows[rowIdx];
        tablesHtml += '<tr>';
        for (let cellIdx = 0; cellIdx < row.cells.length; cellIdx++) {
          const cell = row.cells[cellIdx];
          if (cell.rowSpan === 0 || cell.colSpan === 0) continue;

          const isHeader = cell.isHeader;
          const isVertical = cell.textOrientation === 'vertical';
          const isSep = cell.content.trim() === ':';

          // === AUTO-LLENADO: misma lógica que getAutoFilledContent ===
          let rawContent = cell.content || '';
          if (asignaturaInfo && rowIdx <= 5 && cellIdx > 0) {
            const cellIzquierda = row.cells[cellIdx - 1];
            const etiqueta = (cellIzquierda?.content || '').toUpperCase().trim();
            if (etiqueta === 'ASIGNATURA' && !rawContent.trim()) {
              rawContent = `${asignaturaInfo.codigo || ''} - ${asignaturaInfo.nombre || ''}`;
            } else if ((etiqueta === 'PERIODO ACADÉMICO ORDINARIO (PAO)' || etiqueta === 'PAO') && !rawContent.trim()) {
              rawContent = fmtPeriodo(selectedPeriod) || rawContent;
            } else if (etiqueta === 'NIVEL' && !rawContent.trim()) {
              rawContent = asignaturaInfo.nivel?.nombre || '';
            }
          }

          // Contenido — preservar saltos de línea
          // Limpiar encabezados de sección que se hayan filtrado por error
          const seccionesLeaked = [
            'RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA',
            'RESULTADOS DE APRENDIZAJE',
            'CONTENIDOS GENERALES',
            'CONTENIDOS DE LA ASIGNATURA',
            'OBJETIVOS DE LA ASIGNATURA',
            'COMPETENCIAS',
            'CARACTERIZACIÓN DE LA ASIGNATURA',
            'PROGRAMA ANALÍTICO DE ASIGNATURA',
          ];
          // Detectar si la celda de la izquierda es una etiqueta de sección
          const leftLabel = (cellIdx > 0 ? (row.cells[cellIdx - 1]?.content || '') : '').toUpperCase().trim();
          if (leftLabel && seccionesLeaked.some(s => leftLabel.includes(s.substring(0, 10)))) {
            // Limpiar líneas que sean exactamente otro encabezado de sección
            const lineasRaw = rawContent.split('\n');
            const lineasLimpias = lineasRaw.filter(l => {
              const lu = l.trim().toUpperCase();
              return !seccionesLeaked.some(s => lu === s);
            });
            rawContent = lineasLimpias.join('\n').trim();
          }
          const content = rawContent.replace(/\n/g, '<br/>');

          // Estilos fieles al documento Word original
          const bg = cell.backgroundColor || (isHeader ? '#D9E2EC' : '#fff');
          const color = cell.textColor || '#000';
          const fw = isHeader ? 'bold' : 'normal';
          const ta = isSep || isHeader || isVertical ? 'center' : (cell.textAlign || 'left');
          const fs = isVertical ? vertFontSize : baseFontSize;
          const defaultPad = isVisado ? '40px 6px 6px 6px' : (isWideTable ? '2px 4px' : '4px 6px');
          const pad = isVertical ? '2px 1px' : (isSep ? '1px 2px' : defaultPad);

          let extraCss = '';
          if (isVertical) {
            extraCss = 'writing-mode:vertical-rl;transform:rotate(180deg);min-height:80px;max-width:30px;white-space:nowrap;';
          }
          if (isSep) {
            extraCss += 'max-width:14px;white-space:nowrap;';
          }

          // Ancho inteligente según tipo de contenido
          const contentText = (rawContent || '').trim();
          const contentLen = contentText.length;
          const isNumericOnly = /^\d{1,4}$/.test(contentText);
          let widthCss = '';
          if (isVertical) {
            widthCss = 'width:28px;max-width:32px;';
          } else if (isSep) {
            widthCss = 'width:14px;max-width:16px;';
          } else if (isNumericOnly && contentLen <= 3) {
            widthCss = 'width:35px;white-space:nowrap;text-align:center;';
          } else if (isHeader && contentLen <= 4 && cell.colSpan === 1 && !isVertical) {
            widthCss = 'width:40px;white-space:nowrap;text-align:center;';
          } else if (cellIdx === 0 && !isVertical && !isSep && cell.colSpan === 1) {
            widthCss = isWideTable ? 'width:10%;min-width:70px;' : 'width:18%;min-width:100px;';
          }

          tablesHtml += `<td rowspan="${cell.rowSpan||1}" colspan="${cell.colSpan||1}" style="border:1pt solid #000;padding:${pad};background:${bg};color:${color};font-weight:${fw};text-align:${ta};vertical-align:middle;font-size:${fs};line-height:1.3;word-break:break-word;${widthCss}${extraCss}">${content || '&nbsp;'}</td>`;
        }
        tablesHtml += '</tr>';
      }
      tablesHtml += '</table>';
    }

    const programaName = activeProgramaAnalitico.name || 'Programa Analítico';

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title> </title>
<style>
  @page { size: A4 landscape; margin: 0; }
  @media print {
    html, body { margin:0; padding: 10mm 12mm; }
    body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    table { page-break-inside:auto; }
    tr { page-break-inside:avoid; page-break-after:auto; }
    h3 { page-break-after:avoid; }
  }
  * { box-sizing:border-box; }
  body {
    font-family: Calibri, 'Segoe UI', Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 0 14px;
    color: #000;
    font-size: 9pt;
    line-height: 1.3;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
    table-layout: auto;
  }
  td {
    border: 1pt solid #000;
    padding: 3px 5px;
    vertical-align: middle;
    font-size: 8pt;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
  .hdr {
    text-align: center;
    padding: 6px 0 10px 0;
    border-bottom: 2pt solid #000;
    margin-bottom: 8px;
  }
  .hdr img { height: 55px; vertical-align: middle; margin-right: 10px; }
  .hdr-text { display: inline-block; vertical-align: middle; text-align: center; }
  .hdr-text h1 { font-size: 14pt; margin: 0; font-weight: bold; color: #000; }
  .hdr-text h2 { font-size: 12pt; margin: 2px 0 0 0; font-weight: bold; color: #000; }
  .hdr-text p  { font-size: 10pt; margin: 2px 0 0 0; font-weight: bold; color: #000; }
</style>
</head>
<body>
  <div class="hdr">
    <img src="/images/unesum-logo-official.png" onerror="this.style.display='none'" />
    <div class="hdr-text">
      <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</h1>
      <h2>PROGRAMA ANALÍTICO DE ASIGNATURA</h2>
      <p>${programaName}</p>
    </div>
  </div>
  ${tablesHtml}
</body>
</html>`;

    // Abrir ventana y lanzar impresión (Guardar como PDF)
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) { alert('Permite ventanas emergentes para generar el PDF.'); return; }
    w.document.write(htmlDoc);
    w.document.close();
    const triggerPrint = () => { try { w.focus(); w.print(); } catch(_){} };
    w.onload = () => setTimeout(triggerPrint, 400);
    setTimeout(triggerPrint, 1500);
  }

  // ==============================
  // LIMPIAR: Borrar celdas editables (dejar solo etiquetas/headers y datos de BD)
  // ==============================
  const handleClearSync = () => {
    if (!activeProgramaAnalitico || !activeTab) return;
    if (!globalThis.confirm("¿Está seguro de limpiar todas las celdas editables? Se borrarán los datos sincronizados del Word pero se mantendrán las etiquetas del editor.")) return;

    // Etiquetas que NO se deben borrar (son estructura del editor, no datos sincronizados)
    const etiquetasProtegidas = new Set([
      "PROGRAMA ANALÍTICO DE ASIGNATURA", "PROGRAMA ANALITICO DE ASIGNATURA",
      "ASIGNATURA", "NIVEL", "PERIODO ACADÉMICO ORDINARIO (PAO)", "PERIODO",
      "CARACTERIZACIÓN", "CARACTERIZACION", "OBJETIVOS DE LA ASIGNATURA",
      "COMPETENCIAS", "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA",
      "CONTENIDOS DE LA ASIGNATURA", "UNIDADES TEMÁTICAS", "UNIDADES TEMATICAS", 
      "DESCRIPCIÓN", "DESCRIPCION",
      "METODOLOGÍA", "METODOLOGIA", "PROCEDIMIENTOS DE EVALUACIÓN", "PROCEDIMIENTOS DE EVALUACION",
      "BIBLIOGRAFÍA - FUENTES DE CONSULTA", "BIBLIOGRAFIA - FUENTES DE CONSULTA",
      "BIBLIOGRAFÍA BÁSICA", "BIBLIOGRAFIA BASICA",
      "BIBLIOGRAFÍA COMPLEMENTARIA", "BIBLIOGRAFIA COMPLEMENTARIA",
      "DECANO/A DE FACULTAD", "DIRECTOR/A ACADÉMICO/A", "DIRECTOR/A ACADEMICO/A",
      "COORDINADOR/A DE CARRERA", "DOCENTE",
    ]);

    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => {
      if (tab.id !== activeTabId) return tab;

      const cleanedRows = tab.rows.map(row => ({
        ...row,
        cells: row.cells.map(cell => {
          const textoUpper = (cell.content || '').trim().toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          // Si es header del editor (etiqueta definida por admin), mantener
          if (cell.isHeader) return cell;
          
          // Si es una etiqueta protegida, mantener
          if (etiquetasProtegidas.has(textoUpper)) return cell;
          
          // Si tiene backgroundColor especial, es estructura - mantener el texto
          if (cell.backgroundColor && cell.backgroundColor !== '#ffffff' && cell.backgroundColor !== '#FFFFFF') return cell;
          
          // Si es editable, limpiar el contenido
          if (cell.isEditable) {
            return { ...cell, content: '' };
          }
          
          return cell;
        })
      }));

      return { ...tab, rows: cleanedRows };
    });

    setprogramas(prev => prev.map(p =>
      p.id === activeProgramaAnaliticoId ? { ...p, tabs: updatedTabs } : p
    ));

    alert("✅ Celdas limpiadas correctamente. Las etiquetas del editor se mantienen.");
  }

  // --- FUNCIONES ADICIONALES ---
  const handleDuplicateProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    const ProgramaAnaliticoToClone = savedprogramas.find(s => s.id === ProgramaAnaliticoId);
    if (!ProgramaAnaliticoToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(ProgramaAnaliticoToClone.datos_tabla));
      clonedData.id = `ProgramaAnalitico-${Date.now()}`;
      clonedData.name = `${ProgramaAnaliticoToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      // Guardar automáticamente en el backend
      const payload = {
        nombre: clonedData.name,
        periodo: ProgramaAnaliticoToClone.periodo,
        materias: ProgramaAnaliticoToClone.materias,
        datos_tabla: clonedData
      };
      
      const result = await apiRequest('/api/programa-analitico', { method: 'POST', body: JSON.stringify(payload) });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedprogramas(programasArray);
      
      alert("ProgramaAnalitico duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeleteProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    if (!window.confirm("¿Está seguro de eliminar este ProgramaAnalitico? Esta acción no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/programa-analitico/${ProgramaAnaliticoId}`, { method: 'DELETE' });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedprogramas(programasArray);
      
      alert("ProgramaAnalitico eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProgramaAnalitico = (ProgramaAnaliticoId: number) => {
    console.log("Editando ProgramaAnalitico ID:", ProgramaAnaliticoId);
    handleLoadProgramaAnalitico(ProgramaAnaliticoId.toString());
    setShowProgramaAnaliticoSelector(false);
  };

  const handleNewProgramaAnalitico = () => {
    setShowProgramaAnaliticoSelector(true);
  };

  const programasFiltered = selectedPeriod 
    ? savedprogramas.filter(s => matchPeriodo(s.periodo, selectedPeriod) || !s.periodo)
    : savedprogramas;
  // --- LÓGICA DE INTELIGENCIA Y ESCALABILIDAD ---

  // 1. Limpia el nombre del periodo (Ej: "Primer Periodo PII 2026" -> "PII 2026")
  const formatPeriodoSimple = (periodoIdOrName: string) => {
    if (!periodoIdOrName) return "";
    const periodoObj = periodos.find((p: any) => p.id?.toString() === periodoIdOrName);
    const nombre = periodoObj?.nombre || periodoIdOrName;
    const match = nombre.match(/(P[IVX]+\s\d{4})/i);
    return match ? match[0].toUpperCase() : nombre;
  };

  // 2. Determina qué texto debe ir en la celda (Llenado Horizontal)
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    // Si no hay materia seleccionada o pasamos la fila 5, NO HACER NADA (Protege Unidades Temáticas)
    if (!asignaturaInfo || rowIndex > 5) return cell.content || "";

    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const cellIzquierda = currentRow.cells[cellIndex - 1];
      const etiqueta = cellIzquierda?.content?.toUpperCase().trim() || "";

      // Si la celda de la IZQUIERDA es el título, esta celda es el VALOR
      if (etiqueta === "ASIGNATURA") {
        return `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
      }
      if (etiqueta === "PERIODO ACADÉMICO ORDINARIO (PAO)" || etiqueta === "PAO") {
        return formatPeriodoSimple(selectedPeriod) || cell.content || "";
      }
      if (etiqueta === "NIVEL") {
        return asignaturaInfo.nivel?.nombre || "";
      }
    }
    return cell.content || "";
  };

  // 3. Bloquea la edición de las celdas automáticas
  const isCellReadOnly = (cell: TableCell, rowIndex: number, cellIndex: number): boolean => {
    if (rowIndex > 5) return false;
    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const etiqueta = currentRow.cells[cellIndex - 1]?.content?.toUpperCase().trim() || "";
      return ["ASIGNATURA", "NIVEL", "PAO", "PERIODO ACADÉMICO ORDINARIO (PAO)"].includes(etiqueta);
    }
    return false;
  };
  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeProgramaAnalitico ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Programa AnalÃ­tico</span>
                    <div className="flex gap-2">
                      <Button onClick={handleNewProgramaAnalitico} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activeProgramaAnalitico} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" /> Guardar
                      </Button>
                      <Button onClick={handlePrintToPdf} disabled={!activeProgramaAnalitico} variant="outline">
                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                    <div className="space-y-2">
                      <Label>Periodo</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodos.map((periodo) => (
                            <SelectItem key={periodo.id} value={periodo.nombre}>
                              {periodo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modal Selector de ProgramaAnalitico */}
              {showProgramaAnaliticoSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar ProgramaAnalitico</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowProgramaAnaliticoSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleProgramaAnaliticoUpload(e); setShowProgramaAnaliticoSelector(false); }} className="hidden" />
                      
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">O seleccione uno existente:</h3>
                        {isListLoading ? (
                          <p className="text-center py-4">Cargando...</p>
                        ) : programasFiltered.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {programasFiltered.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <p className="font-medium">{s.nombre}</p>
                                  <p className="text-sm text-gray-500">{s.periodo} - {s.materias}</p>
                                </div>
                                <Button onClick={() => { handleLoadProgramaAnalitico(s.id.toString()); setShowProgramaAnaliticoSelector(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                                  Seleccionar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay ProgramaAnalitico disponibles</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de ProgramaAnalitico Creados */}
              <Card>
                <CardHeader>
                  <CardTitle>ProgramaAnalitico Creados</CardTitle>
                </CardHeader>
                <CardContent>
                  {isListLoading ? (
                    <p className="text-center py-8">Cargando...</p>
                  ) : programasFiltered.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Periodo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Materia</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {programasFiltered.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-emerald-600" />
                                  <span className="font-medium">{s.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">{s.periodo}</td>
                              <td className="px-4 py-3">{s.materias}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(s.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditProgramaAnalitico(s.id)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" /> Modificar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDuplicateProgramaAnalitico(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Copy className="h-4 w-4 mr-1" /> Duplicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteProgramaAnalitico(s.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay ProgramaAnalitico creados aún</p>
                      <Button onClick={handleNewProgramaAnalitico} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer ProgramaAnalitico
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-emerald-800">
                    <span className="truncate">{activeProgramaAnalitico.name}</span>
                    <div className="flex-shrink-0 flex items-center gap-2">
                       <Button onClick={() => { setActiveProgramaAnaliticoId(null); setprogramas([]); }} variant="outline" size="sm"> <Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</Button>
                       <Button onClick={handleClearSync} variant="outline" size="sm" disabled={!activeTab} className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"><Eraser className="h-4 w-4 mr-2" /> Limpiar</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Periodo Académico</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodos.map((periodo) => (
                            <SelectItem key={periodo.id} value={periodo.nombre}>
                              {periodo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bloque de Sincronización Inteligente */}
                  {activeProgramaAnalitico && selectedPeriod && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div>
                        <h4 className="text-amber-800 font-bold flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Sincronización Inteligente
                        </h4>
                        <p className="text-amber-700 text-sm">
                          Sube el mismo Word del programa analítico lleno y se autocompletarán las celdas vacías usando las etiquetas que definió el administrador.
                        </p>
                      </div>
                      <Button 
                        onClick={() => fileInputRefSync.current?.click()}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={isLoading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isLoading ? "Procesando..." : "Subir Word Lleno"}
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRefSync} 
                        className="hidden" 
                        accept=".docx" 
                        onChange={handleSmartSync} 
                      />
                    </div>
                  )}

                </CardContent>
              </Card>

              <div className="mb-6 select-none">
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-emerald-100">
                  {activeProgramaAnalitico.tabs.map(tab => (
                    <div key={tab.id} className="relative group">
                      {editingTabId === tab.id ? (
                        <div className="flex items-center bg-white border border-emerald-500 rounded px-1 shadow-sm h-10">
                          <Input value={tempTabTitle} onChange={(e) => setTempTabTitle(e.target.value)} className="h-8 w-40 border-none focus-visible:ring-0 px-1" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTabRename()} onBlur={saveTabRename} />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={saveTabRename}><Check className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div onClick={() => setActiveTabId(tab.id)} onDoubleClick={() => startRenamingTab(tab)} className={`flex items-center h-10 px-4 rounded-md border cursor-pointer transition-all duration-200 ${activeTabId === tab.id ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-medium' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'}`}>
                          <span className="max-w-[150px] truncate mr-2" title={tab.title}>{tab.title}</span>
                          <div className={`flex items-center gap-1 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                             <Pencil className={`h-3 w-3 cursor-pointer ${activeTabId === tab.id ? 'text-emerald-200 hover:text-white' : 'text-emerald-400 hover:text-emerald-700'}`} onClick={(e) => { e.stopPropagation(); startRenamingTab(tab); }} />
                             <X className={`h-4 w-4 cursor-pointer rounded-full p-0.5 ${activeTabId === tab.id ? 'text-red-200 hover:bg-red-500 hover:text-white' : 'text-red-400 hover:bg-red-100 hover:text-red-600'}`} onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={addTab} variant="outline" size="sm" className="h-10 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4 mr-1" /> Nueva Sección</Button>
                </div>
                <p className="text-xs text-gray-400 mt-1 italic pl-1">* Doble clic en una pestaña para renombrarla.</p>
              </div>

              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4 p-2 border rounded-md bg-emerald-50/50">
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ↑</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ↓</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col ←</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col →</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={removeSelectedRow} className="bg-red-50 text-red-600 border-red-200" disabled={!selectedCells.length}><Minus className="h-3 w-3 mr-1"/>Fila</Button>
                       <Button size="sm" onClick={removeSelectedColumn} className="bg-red-50 text-red-600 border-red-200" disabled={!selectedCells.length}><Minus className="h-3 w-3 mr-1"/>Col</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={toggleVerticalText} className="bg-white text-emerald-700 border-emerald-200" disabled={!selectedCells.length} title="Rotar Texto Verticalmente"><ArrowUpFromLine className="h-4 w-4 mr-1" /> Vertical</Button>
                       <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2} variant="outline"><Merge className="h-4 w-4 mr-1" />Unir</Button>
                       <Button size="sm" onClick={clearSelectedCells} disabled={!selectedCells.length} variant="outline"><Trash2 className="h-4 w-4 mr-1" />Limpiar</Button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                      <table className="w-full border-collapse text-sm text-left"> 
                        <tbody className="divide-y divide-gray-200">
  {tableData.length === 0 ? (
    <tr>
      <td className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-600">La tabla está vacía</p>
          </div>
          <Button onClick={() => initializeEmptyTable(5, 3)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Crear Tabla Inicial
          </Button>
        </div>
      </td>
    </tr>
  ) : (
    tableData.map((row, rowIndex) => {
      const isFormRow = row.cells.length === 3 && row.cells[1].content.trim() === ':';

      return (
        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
          {row.cells.map((cell, cellIndex) => {
            if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

            const isSelected = selectedCells.includes(cell.id);
            const isHeader = cell.isHeader;
            const isSeparator = cell.content.trim() === ':';
            const isVertical = cell.textOrientation === 'vertical';
            
            // Verificamos si esta celda específica es automática/bloqueada
            const isReadOnly = isCellReadOnly(cell, rowIndex, cellIndex);
            // Obtenemos el contenido (ya sea del word o auto-llenado)
            const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex);

            // --- LÓGICA DE ANCHOS INTELIGENTE ---
            const cellText = (cell.content || '').trim();
            const cellLen = cellText.length;
            const isNumericCell = /^\d{1,4}$/.test(cellText);
            const isShortHeader = isHeader && cellLen <= 5 && cell.colSpan === 1 && !isVertical;
            
            let widthStyle: string = 'auto';
            let minWidthStyle: string = '40px';
            let maxWidthStyle: string | undefined = undefined;

            if (isVertical) {
              minWidthStyle = '30px';
              maxWidthStyle = '36px';
            } else if (isSeparator) {
              minWidthStyle = '14px';
              maxWidthStyle = '18px';
            } else if (isNumericCell && cellLen <= 3) {
              minWidthStyle = '30px';
              maxWidthStyle = '50px';
            } else if (isShortHeader) {
              minWidthStyle = '35px';
              maxWidthStyle = '55px';
            } else if (isFormRow) {
              if (cellIndex === 0) { widthStyle = '20%'; minWidthStyle = '100px'; }
              else if (cellIndex === 1) { widthStyle = '1%'; minWidthStyle = '14px'; }
            } else if (cellLen > 5 || isHeader) {
              minWidthStyle = '80px';
            }

            // --- ALINEACIÓN ---
            let justifyContent = (isHeader || isSeparator || isVertical) ? 'justify-center' : 'justify-start';

            return (
              <td
                key={cell.id}
                className={`
                  border border-gray-200 relative transition-all duration-75
                  ${isHeader ? "bg-gray-50 font-bold text-black" : "bg-white text-gray-700"}
                  ${isSelected ? "ring-2 ring-inset ring-emerald-500 z-10" : ""}
                  ${isReadOnly ? "bg-gray-100/50 cursor-not-allowed" : "cursor-pointer"}
                `}
                style={{
                  backgroundColor: cell.backgroundColor || (isHeader ? '#f9fafb' : '#ffffff'),
                  color: cell.textColor,
                  width: widthStyle,
                  minWidth: minWidthStyle,
                  maxWidth: maxWidthStyle,
                  padding: 0,
                  height: '1px',
                  verticalAlign: 'middle',
                }}
                rowSpan={cell.rowSpan || 1}
                colSpan={cell.colSpan || 1}
                onClick={(e) => handleCellClick(cell.id, e)}
                onDoubleClick={() => {
                  // Abrir modal grande para ver/editar contenido
                  setModalCell({ id: cell.id, content: displayContent, isEditable: cell.isEditable && !isReadOnly });
                  setEditContent(displayContent);
                }}
              >
                <div
                  className={`w-full h-full flex items-center ${justifyContent} p-2`}
                  style={{
                    writingMode: isVertical ? 'vertical-rl' : undefined,
                    transform: isVertical ? 'rotate(180deg)' : undefined,
                    minHeight: isVertical ? '120px' : '32px',
                    textAlign: isHeader ? 'center' : 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  {editingCell === cell.id ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                      onBlur={saveEdit}
                      className="w-full min-h-[60px] p-1 bg-white border-emerald-400 text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === "Escape") { cancelEdit(); }
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-normal break-words">
                      {displayContent || <span className="opacity-0">.</span>}
                    </div>
                  )}
                </div>
              </td>
            );
          })}
        </tr>
      );
    })
  )}
</tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      {/* ============ MODAL PARA VER/EDITAR CONTENIDO DE CELDA ============ */}
      {modalCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalCell(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b bg-emerald-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-emerald-800">
                {modalCell.isEditable ? "Ver / Editar Contenido" : "Contenido de la Celda"}
              </h3>
              <button onClick={() => setModalCell(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4">
              {modalCell.isEditable ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Escriba el contenido aquí..."
                  autoFocus
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-700 p-3 bg-gray-50 rounded-lg min-h-[200px] border">
                  {modalCell.content || <span className="text-gray-400 italic">Sin contenido</span>}
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setModalCell(null)}>
                Cerrar
              </Button>
              {modalCell.isEditable && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveModalEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </ProtectedRoute>
  )
}
