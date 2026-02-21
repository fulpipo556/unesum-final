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
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
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
interface SyllabusData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedSyllabusRecord { id: number; nombre: string; periodo: string; materias: string; datos_syllabus: SyllabusData; created_at: string; updated_at: string; }

export default function EditorSyllabusComisionPage() {
  const { token, getToken, user } = useAuth()
  
  // --- ESTADOS ---
  const [syllabi, setSyllabi] = useState<SyllabusData[]>([])
  const [activeSyllabusId, setActiveSyllabusId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedSyllabi, setSavedSyllabi] = useState<SavedSyllabusRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showSyllabusSelector, setShowSyllabusSelector] = useState(false)
  
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
  
  // Estados para mapeo manual
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [mappingData, setMappingData] = useState<{
    etiquetasSinMatch: Array<{texto: string, tabIdx: number, rowIdx: number, cellIdx: number}>,
    wordData: Record<string, string>,
    sugerencias: Record<string, Array<{clave: string, similitud: number}>>
  } | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({}) // etiqueta -> clave del Word
  
  // Estados para preview de tablas del Word
  const [showWordPreview, setShowWordPreview] = useState(false)
  const [wordRawTables, setWordRawTables] = useState<string[][][]>([])
  const [wordFlatHeaders, setWordFlatHeaders] = useState<string[][]>([])
  const [wordKeyValueData, setWordKeyValueData] = useState<Record<string, string>>({})
  const [selectedWordTable, setSelectedWordTable] = useState<number | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, number>>({}) // wordCol -> editorCol
  
  const asignaturaIdParam = searchParams.get("asignatura")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefSync = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeSyllabus = syllabi.find((s) => s.id === activeSyllabusId);
  const activeTab = activeSyllabus?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];
  const [asignaturaInfo, setAsignaturaInfo] = useState<any>(null)

  // Cargar informaci�n de la materia seleccionada
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
          apiRequest("/api/syllabi").catch(err => {
            console.error("Error en /api/syllabi:", err);
            return { data: [] };
          }),
          apiRequest("/api/periodo").catch(err => {
            console.error("Error en /api/periodo:", err);
            return { data: [] };
          })
        ]);
        
        const syllabiArray = Array.isArray(programasData?.data) ? programasData.data : (Array.isArray(programasData) ? programasData : []);
        const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
        
        setSavedSyllabi(syllabiArray);
        setPeriodos(periodosArray);
        
        console.log('📊 Datos cargados:', {
          syllabi: syllabiArray.length,
          periodos: periodosArray.length,
          syllabiData: syllabiArray,
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
    if (activeSyllabus && activeSyllabus.tabs.length > 0) {
      if (!activeSyllabus.tabs.find(t => t.id === activeTabId)) {
        setActiveTabId(activeSyllabus.tabs[0].id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [activeSyllabus, activeTabId]);

  // Cargar automáticamente el syllabus cuando se selecciona un periodo
  useEffect(() => {
    console.log('🔍 Auto-load useEffect disparado:', { selectedPeriod, savedSyllabi: savedSyllabi.length });
    
    if (selectedPeriod && savedSyllabi.length > 0) {
      console.log('📊 Buscando syllabi para periodo:', selectedPeriod);
      console.log('📚 Todos los syllabi:', savedSyllabi.map(s => ({ id: s.id, nombre: s.nombre, periodo: s.periodo })));
      
      const syllabiDelPeriodo = savedSyllabi.filter(s => s.periodo === selectedPeriod);
      console.log('✅ Syllabi encontrados para este periodo:', syllabiDelPeriodo.length);
      
      if (syllabiDelPeriodo.length > 0) {
        // Si hay un syllabus del periodo, cargarlo automáticamente
        const primerSyllabus = syllabiDelPeriodo[0];
        
        // Solo cargar si no está ya cargado (evitar loops)
        if (activeSyllabusId !== primerSyllabus.id) {
          console.log(`📋 Cargando automáticamente syllabus del periodo "${selectedPeriod}":`, primerSyllabus.nombre);
          handleLoadSyllabus(String(primerSyllabus.id));
        } else {
          console.log(`✅ Syllabus ya está cargado (ID: ${primerSyllabus.id})`);
        }
      } else {
        console.log(`⚠️ No hay syllabi guardados para el periodo "${selectedPeriod}"`);
      }
    }
  }, [selectedPeriod, savedSyllabi]);

  // Auto-pre-llenar mapeo de columnas cuando se selecciona una tabla del Word
  useEffect(() => {
    if (selectedWordTable === null || !activeTab || wordRawTables[selectedWordTable] === undefined) return;
    const wordTable = wordRawTables[selectedWordTable];
    const wordHeaders = (wordTable[0] || []).map(h =>
      h.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim()
    );
    const editorHeaders = activeTab.rows[0]?.cells || [];
    const autoMap: Record<number, number> = {};
    wordHeaders.forEach((wh, wIdx) => {
      if (wh.length < 2) return;
      let bestIdx = -1, bestScore = 0;
      editorHeaders.forEach((eCell, eIdx) => {
        const eh = (eCell.content || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
        if (eh.length < 2) return;
        let score = 0;
        if (eh === wh) score = 1;
        else if (eh.includes(wh) || wh.includes(eh)) score = 0.8;
        else {
          const wWords = wh.split(/\s+/).filter(w => w.length >= 3);
          const eWords = eh.split(/\s+/).filter(w => w.length >= 3);
          const common = wWords.filter(w => eWords.some(e => e.includes(w) || w.includes(e)));
          if (common.length > 0) score = common.length / Math.max(wWords.length, eWords.length) * 0.5;
        }
        if (score > bestScore) { bestScore = score; bestIdx = eIdx; }
      });
      if (bestIdx >= 0 && bestScore >= 0.3) autoMap[wIdx] = bestIdx;
    });
    if (Object.keys(autoMap).length > 0) {
      setColumnMapping(autoMap);
      console.log(`🎯 Auto-mapeo de columnas para tabla ${selectedWordTable}:`, autoMap);
    }
  }, [selectedWordTable, wordRawTables, activeTab]);

  // --- API ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvi� JSON.");
    }

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petici�n al API.")
    return data
  }
  // Sincronizacion Inteligente: soporta 3 metodos
  // 1) Word con etiquetas [NOMBRE] -> match directo (prioridad)
  // 2) Backend docx-tables -> extrae tablas nativas del .docx (servidor)
  // 3) Mammoth HTML fallback -> extrae tablas HTML (frontend, si falla backend)

const handleSmartSync = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !activeSyllabus) return;

  if (fileInputRefSync.current) fileInputRefSync.current.value = "";
  setIsLoading(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const mammothLib = (await import('mammoth')).default;

    // ====================================================
    // PASO 1: Recopilar SOLO las etiquetas VACÍAS del editor
    // (celdas que tienen texto corto y una celda vacía a la derecha)
    // ====================================================
    const etiquetasDelEditor: Array<{texto: string, tabIdx: number, rowIdx: number, cellIdx: number}> = [];
    activeSyllabus.tabs.forEach((tab, tabIdx) => {
      tab.rows.forEach((row, rowIdx) => {
        row.cells.forEach((cell, cellIdx) => {
          const texto = (cell.content || '').trim();
          
          // FILTRO 1: Debe ser texto corto (etiqueta) y no muy largo (contenido)
          if (texto.length < 2 || texto.length > 100) return;
          
          // FILTRO 2: Debe tener una celda a la derecha
          if (cellIdx + 1 >= row.cells.length) return;
          
          // FILTRO 3: La celda a la derecha debe estar VACÍA
          const celdaDerecha = row.cells[cellIdx + 1];
          if (celdaDerecha.content && celdaDerecha.content.trim().length > 0) return;
          
          // FILTRO 4: No debe ser un número puro (como "192", "70", etc.)
          if (/^\d+$/.test(texto)) return;
          
          // FILTRO 5: No debe ser una fecha sola
          if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(texto)) return;
          
          // Si pasa todos los filtros, es una etiqueta candidata
          etiquetasDelEditor.push({ texto: texto.toUpperCase(), tabIdx, rowIdx, cellIdx });
        });
      });
    });

    console.log("========== SINCRONIZACION INTELIGENTE (V2 docx-tables) ==========");
    console.log("📊 Total etiquetas del editor:", etiquetasDelEditor.length);
    console.log("📋 Etiquetas del editor:");
    etiquetasDelEditor.forEach((e, idx) => {
      console.log(`  ${idx + 1}. "${e.texto}" [Tab:${e.tabIdx}, Row:${e.rowIdx}, Cell:${e.cellIdx}]`);
    });

    // ====================================================
    // PASO 2: Extraer texto plano del Word (siempre con mammoth, para match por texto)
    // ====================================================
    const resultadoTexto = await mammothLib.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
    const textoCompleto = resultadoTexto.value;
    console.log("Texto del Word (primeros 1500 chars):");
    console.log(textoCompleto.substring(0, 1500));

    // ====================================================
    // PASO 3: Intentar extracción con backend docx-tables primero
    // Si falla, fallback a mammoth HTML
    // ====================================================
    let wordData: Record<string, string> = {};
    let metodo = "";
    let currentRawTables: string[][][] = []; // variable local para rastrear (estado React es asíncrono)

    // Primero intentar etiquetas [NOMBRE] en el texto plano
    const regexEtiquetas = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g;
    let matchResult;
    while ((matchResult = regexEtiquetas.exec(textoCompleto)) !== null) {
      const etiquetaEncontrada = matchResult[1].trim().toUpperCase();
      const contenido = matchResult[2].trim();
      if (contenido.length > 0) {
        wordData[etiquetaEncontrada] = contenido;
      }
    }

    if (Object.keys(wordData).length >= 3) {
      metodo = "etiquetas [NOMBRE]";
      console.log(">>> Método ETIQUETAS:", Object.keys(wordData));
    } else {
      // ====================================================
      // INTENTAR BACKEND docx-tables PRIMERO
      // ====================================================
      let backendOk = false;
      try {
        console.log("🔄 Intentando extracción con backend mammoth+cheerio...");
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const backendRes = await fetch('http://localhost:4000/api/syllabi/extract-word-tables', {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });

        if (backendRes.ok) {
          const backendData = await backendRes.json();
          console.log("📊 Backend response:", JSON.stringify(backendData.stats));
          
          // GUARDAR TABLAS CRUDAS para preview visual
          if (backendData.rawTables && Array.isArray(backendData.rawTables)) {
            setWordRawTables(backendData.rawTables);
            currentRawTables = backendData.rawTables;
            console.log("📊 Raw tables guardadas:", backendData.rawTables.length, "tablas");
          }
          
          // GUARDAR FLAT HEADERS
          if (backendData.flatHeaders && Array.isArray(backendData.flatHeaders)) {
            setWordFlatHeaders(backendData.flatHeaders);
            console.log("📊 Flat headers guardados:", backendData.flatHeaders.length, "tablas");
            backendData.flatHeaders.forEach((fh: string[], idx: number) => {
              console.log(`  Tabla ${idx}: [${fh.map((h: string) => '"' + h.substring(0, 20) + '"').join(', ')}]`);
            });
          }
          
          if (backendData.success && backendData.wordData && Object.keys(backendData.wordData).length > 0) {
            wordData = backendData.wordData;
            setWordKeyValueData(backendData.wordData);
            const statsMethod = backendData.stats?.metodo || 'backend';
            metodo = `${statsMethod} (${backendData.stats?.tablas || '?'} tablas, ${backendData.stats?.claves || '?'} claves)`;
            backendOk = true;
            console.log("✅ Backend mammoth+cheerio exitoso:", backendData.stats);
            console.log("📋 Claves recibidas del backend:", Object.keys(backendData.wordData).length);
            for (const [k, v] of Object.entries(backendData.wordData)) {
              console.log(`  ✓ [${k}] = ${String(v).substring(0, 80)}`);
            }
          } else {
            console.log("⚠️ Backend respondió pero sin datos suficientes:", backendData);
          }
        } else {
          const errorText = await backendRes.text();
          console.log("⚠️ Backend respondió con error:", backendRes.status, errorText);
        }
      } catch (backendError) {
        console.log("⚠️ Backend no disponible, usando fallback mammoth:", backendError);
      }

      // ====================================================
      // FALLBACK: mammoth HTML si backend no funcionó
      // ====================================================
      if (!backendOk) {
        console.log("🔄 Usando fallback mammoth HTML...");
        metodo = "mammoth HTML (fallback)";
      
      // Convertir a HTML tambien para leer tablas
      const resultadoHtml = await mammothLib.convertToHtml({ arrayBuffer: arrayBuffer.slice(0) });
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(resultadoHtml.value, "text/html");

      // ── EXTRAER rawTables (string[][][]) del HTML para el panel de mapeo ──
      const htmlTables = Array.from(htmlDoc.querySelectorAll("table"));
      const localRawTables: string[][][] = htmlTables.map(table => {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(tr => {
          const cells = Array.from(tr.querySelectorAll("td, th"));
          return cells.map(td => (td.textContent || "").replace(/\s+/g, " ").trim());
        }).filter(r => r.length > 0);
      }).filter(t => t.length > 0);

      if (localRawTables.length > 0) {
        setWordRawTables(localRawTables);
        setWordFlatHeaders(localRawTables.map(t => t[0] || []));
        currentRawTables = localRawTables;
        console.log("📊 [Fallback] rawTables extraídas:", localRawTables.length, "tablas");
      }
      
      // Extraer TODOS los pares clave-valor de las tablas HTML
      const todasLasFilas = Array.from(htmlDoc.querySelectorAll("tr"));
      console.log("📊 Filas HTML encontradas en Word:", todasLasFilas.length);

      todasLasFilas.forEach((tr, idx) => {
        const celdas = Array.from(tr.querySelectorAll("td, th"));
        const textos = celdas.map(td => (td.textContent || "").trim());
        
        if (textos.length >= 2) {
          console.log(`  📄 Fila ${idx}:`, textos.map(t => `"${t.substring(0, 50)}"`).join(" | "));
        }

        // CASO ESPECIAL: Fila con 4 celdas tipo | CLAVE1 | VALOR1 | CLAVE2 | VALOR2 |
        // Ejemplo: | ASIGNATURA | Tecnolog�as Emergentes | PERIODO ACAD�MICO | PI 2025 |
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
        }
        // Fila con 3 celdas: puede ser seccion | sub-header | valor
        // Ejemplo: BIBLIOGRAF�A - FUENTES DE CONSULTA | BIBLIOGRAF�A B�SICA | B.B.1 Nederr...
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
      } // cierre de if (!backendOk)

      // ====================================================
      // COMPLEMENTO: buscar en texto plano (siempre, después de tablas)
      // CUIDADO: Solo buscar etiquetas largas y significativas para evitar falsos positivos
      // NO buscar etiquetas cortas como "DESCRIPCI�N", "DOCENTE", "NIVEL" etc. que generan basura
      const etiquetasCortas = new Set([
        "DESCRIPCI�N", "DESCRIPCION", "UNIDADES TEM�TICAS", "UNIDADES TEMATICAS",
        "Syllabus DE ASIGNATURA", "PROGRAMA ANALITICO DE ASIGNATURA",
        "BIBLIOGRAF�A B�SICA", "BIBLIOGRAFIA BASICA", "BIBLIOGRAF�A COMPLEMENTARIA",
        "CONTENIDOS DE LA ASIGNATURA", "ASIGNATURA", "NIVEL", "DOCENTE", "PERIODO",
        "CARRERA", "CODIGO", "MATERIA", "CREDITOS", "HORAS", "SEMESTRE", "MODALIDAD",
        "DIRECTOR/A ACAD�MICO/A", "COORDINADOR/A DE CARRERA", "DECANO/A DE FACULTAD",
      ]);
      const etiquetasEditorSet = new Set(etiquetasDelEditor.map(e => e.texto));

      const lineas = textoCompleto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      for (const etq of etiquetasDelEditor) {
        // SKIP etiquetas que ya tienen dato de las tablas HTML
        if (wordData[etq.texto]) continue;
        // SKIP etiquetas cortas o estructurales que generan falsos positivos
        if (etiquetasCortas.has(etq.texto)) continue;
        if (etiquetasCortas.has(etq.texto.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) continue;

        // Buscar la etiqueta en las lineas del texto
        for (let li = 0; li < lineas.length; li++) {
          const lineaUpper = lineas[li].toUpperCase();
          
          // Si la linea contiene EXACTAMENTE la etiqueta (o la etiqueta es parte de la linea)
          if (lineaUpper === etq.texto || lineaUpper.startsWith(etq.texto)) {
            // El valor es lo que viene despues de la etiqueta en la misma linea
            let valor = lineas[li].substring(etq.texto.length).trim();
            // Si no hay valor en la misma linea, buscar en la siguiente
            if (valor.length < 2 && li + 1 < lineas.length) {
              valor = lineas[li + 1].trim();
            }
            // NO agregar si el valor es OTRA etiqueta del editor (es un sub-header, no un dato)
            if (valor.length > 0 && !etiquetasEditorSet.has(valor.toUpperCase()) && !wordData[etq.texto]) {
              wordData[etq.texto] = valor;
              console.log("  [texto-directo] " + etq.texto + " -> " + valor.substring(0, 60));
            }
          }
        }
      }
    }

    console.log("========== DATOS EXTRAIDOS DEL WORD ==========");
    console.log("📊 Total de claves extraídas:", Object.keys(wordData).length);
    console.log("📋 Listado completo:");
    for (const [k, v] of Object.entries(wordData)) {
      console.log(`  ✓ [${k}] = ${String(v).substring(0, 100)}`);
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

    const updatedTabs = activeSyllabus.tabs.map(tab => {
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
          if (!dato || (typeof dato === 'string' && dato.trim().length === 0)) {
            console.log(`❌ No match para: "${etiqueta}"`);
            continue;
          }
          console.log(`✅ Match encontrado: "${etiqueta}" -> "${String(dato).substring(0, 60)}..."`);

          // Limpiar TODOS los prefijos resultado-X: y ut-X-descripcion: del dato
          let datoLimpio = String(dato);
          // Limpiar ":" o ": |" al inicio (residuo de tablas 3-columnas)
          datoLimpio = datoLimpio.replace(/^[:\|]\s*/g, "").trim();
          datoLimpio = datoLimpio.replace(/^[:\|]\s*/g, "").trim(); // doble pasada por "| :"
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
            
            // Patron flexible: "resultado-X :" o "resultado-X:" o "resultado X:" (con/sin espacio y guion)
            const regResultadoSplit = /(?=resultado[\s\-]*\d+\s*:)/gi;
            const regResultadoClean = /^resultado[\s\-]*\d+\s*:/i;
            
            // METODO 1: Separar por "resultado-X:" / "resultado-X :" / "resultado X:"
            let partesResultados = datoOriginal.split(regResultadoSplit).filter(p => p.trim().length > 0);
            // Limpiar prefijos de cada parte
            partesResultados = partesResultados.map(p => p.replace(regResultadoClean, "").trim()).filter(p => p.length > 0);
            
            // METODO 2: Si solo hay 1 o 0, intentar separar por categor�as comunes
            if (partesResultados.length <= 1) {
              const porCategorias = datoOriginal.split(/(?=(?:Actitudinales|Procedimentales|Conceptuales|Cognitivos|Praxiol[o�]gicos)\s*:)/i).filter(p => p.trim().length > 0);
              // Limpiar prefijos resultado-X: de cada parte y descartar partes que son solo prefijo
              const limpias = porCategorias.map(p => p.replace(regResultadoClean, "").trim()).filter(p => p.length > 3);
              if (limpias.length >= 1) {
                partesResultados = limpias;
              }
            }

            // METODO 3: Si aun solo hay 1, intentar separar por saltos de linea simples
            if (partesResultados.length <= 1) {
              const textoLimpio = datoOriginal.replace(regResultadoClean, "").trim();
              const porLineas = textoLimpio.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
              if (porLineas.length > 1 && porLineas.length <= celda.rowSpan) {
                partesResultados = porLineas;
              }
            }
            
            console.log("RESULTADOS MULTIPLES: " + partesResultados.length + " encontrados (rowSpan=" + celda.rowSpan + ")");
            console.log("  DATO COMPLETO RESULTADOS (largo=" + datoOriginal.length + "):");
            // Mostrar el dato en chunks de 200 chars para ver TODO
            for (let ci = 0; ci < datoOriginal.length; ci += 200) {
              console.log("    [" + ci + "-" + Math.min(ci+200, datoOriginal.length) + "]: " + datoOriginal.substring(ci, ci + 200));
            }
            // Mostrar si contiene los patrones que buscamos (con espacio flexible)
            console.log("  Contiene 'resultado 1'? " + /resultado[\s\-]*1\s*:/i.test(datoOriginal));
            console.log("  Contiene 'resultado 2'? " + /resultado[\s\-]*2\s*:/i.test(datoOriginal));
            console.log("  Contiene 'resultado 3'? " + /resultado[\s\-]*3\s*:/i.test(datoOriginal));
            console.log("  Contiene 'Actitudinales'? " + /Actitudinales/i.test(datoOriginal));
            console.log("  Contiene 'Procedimentales'? " + /Procedimentales/i.test(datoOriginal));
            console.log("  Contiene 'Conceptuales'? " + /Conceptuales/i.test(datoOriginal));
            console.log("  Contiene newlines? " + datoOriginal.includes("\n"));
            if (partesResultados.length > 0) {
              partesResultados.forEach((p, pi) => console.log("  -> Parte " + (pi+1) + ": " + p.substring(0, 80)));
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
                // Buscar primera celda vac�a editable en esa fila
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

      // Buscar la fila que tiene "UNIDADES TEM�TICAS" (y opcionalmente "DESCRIPCI�N" en la MISMA fila)
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
        // Solo usar esta fila si tiene UNIDADES TEM�TICAS
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
          // Si la primera celda con contenido no es vac�a y no empieza con "UT", es otra secci�n
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
          // (la fila queda vac�a para que el usuario la llene manualmente)
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

    setSyllabi(prev => prev.map(p =>
      p.id === activeSyllabusId ? { ...p, tabs: updatedTabs } : p
    ));

    // Resumen
    console.log("=".repeat(80));
    console.log("📊 RESUMEN DE SINCRONIZACIÓN INTELIGENTE");
    console.log("=".repeat(80));
    console.log(`Método usado: ${metodo}`);
    console.log(`Etiquetas buscadas (vacías): ${etiquetasDelEditor.length}`);
    console.log(`Celdas llenadas: ${celdasLlenadas}`);
    console.log(`Datos encontrados en Word: ${Object.keys(wordData).length}`);
    console.log(`Matches exitosos: ${matchesOk.length}`);

    // === TABLA VISUAL DE MAPEO ===
    console.log("");
    console.log("┌" + "─".repeat(78) + "┐");
    console.log("│" + " TABLA DE MAPEO: Editor ↔ Word".padEnd(78) + "│");
    console.log("├" + "─".repeat(40) + "┬" + "─".repeat(37) + "┤");
    console.log("│" + " ETIQUETA DEL EDITOR".padEnd(40) + "│" + " VALOR DEL WORD".padEnd(37) + "│");
    console.log("├" + "─".repeat(40) + "┼" + "─".repeat(37) + "┤");
    
    // Mostrar todas las etiquetas del editor y qué les pasó
    activeSyllabus.tabs.forEach((tab) => {
      tab.rows.forEach((row, rowIdx) => {
        row.cells.forEach((cell, cellIdx) => {
          const texto = (cell.content || '').trim();
          if (texto.length < 2 || texto.length > 100) return;
          if (cellIdx + 1 >= row.cells.length) return;
          
          const celdaDerecha = row.cells[cellIdx + 1];
          const valorDerecha = (celdaDerecha.content || '').trim();
          const etqUpper = texto.toUpperCase();
          
          // Buscar en updatedTabs la fila correspondiente para ver si se llenó
          const tabActualizado = updatedTabs.find(t => t.id === tab.id);
          const filaActualizada = tabActualizado?.rows[rowIdx];
          const celdaActualizada = filaActualizada?.cells[cellIdx + 1];
          const valorNuevo = (celdaActualizada?.content || '').trim();
          
          let estado = "";
          let valor = "";
          if (valorDerecha.length > 0 && valorDerecha === valorNuevo) {
            estado = "🔒 BD";
            valor = valorDerecha.substring(0, 33);
          } else if (valorNuevo.length > 0 && valorDerecha.length === 0) {
            estado = "✅";
            valor = valorNuevo.substring(0, 33);
          } else if (valorDerecha.length === 0 && valorNuevo.length === 0) {
            estado = "❌ Sin match";
            valor = "";
          } else {
            estado = "⚠️";
            valor = valorNuevo.substring(0, 33);
          }
          
          const col1 = ` ${estado} ${texto.substring(0, 32)}`.padEnd(40);
          const col2 = ` ${valor}`.padEnd(37);
          console.log("│" + col1 + "│" + col2 + "│");
        });
      });
    });
    
    console.log("└" + "─".repeat(40) + "┴" + "─".repeat(37) + "┘");
    console.log("");
    console.log("Leyenda: ✅=Llenado del Word  🔒 BD=Ya tenía dato  ❌=Sin match");
    console.log("");
    
    if (matchesOk.length > 0) {
      console.log("✅ Etiquetas con match:");
      matchesOk.forEach(e => console.log(`  ✓ ${e}`));
    }
    
    // Mostrar etiquetas SIN match (las que quedaron vacías)
    const etiquetasSinMatch = etiquetasDelEditor
      .filter(e => !matchesOk.some(m => m.includes(e.texto)));
    
    const etiquetasTextoSinMatch = etiquetasSinMatch.map(e => e.texto);
    
    if (etiquetasTextoSinMatch.length > 0) {
      console.log("❌ Etiquetas SIN match (quedaron vacías):");
      etiquetasTextoSinMatch.slice(0, 15).forEach(e => console.log(`  ✗ ${e}`));
      if (etiquetasTextoSinMatch.length > 15) {
        console.log(`  ... y ${etiquetasTextoSinMatch.length - 15} más`);
      }
    }
    
    console.log("=".repeat(80));

    // === CLAVES DEL WORD QUE NO SE USARON ===
    const clavesUsadas = new Set(matchesOk.map(m => {
      // Buscar la clave que coincidió
      const etq = m.replace(/ \(resultado \d+\)/, "").replace(/ \(titulo\)/, "").replace(/ \(descripcion\)/, "");
      return etq;
    }));
    const clavesWordNoUsadas = Object.keys(wordData).filter(k => {
      const kNorm = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return !matchesOk.some(m => {
        const mNorm = m.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return mNorm.includes(kNorm) || kNorm.includes(mNorm);
      });
    });
    if (clavesWordNoUsadas.length > 0) {
      console.log("");
      console.log("📦 Claves del Word NO usadas (" + clavesWordNoUsadas.length + "):");
      clavesWordNoUsadas.slice(0, 20).forEach(k => {
        console.log(`  📄 [${k}] = ${String(wordData[k]).substring(0, 60)}`);
      });
      if (clavesWordNoUsadas.length > 20) {
        console.log(`  ... y ${clavesWordNoUsadas.length - 20} más`);
      }
    }
    console.log("=".repeat(80));

    let msg = "Sincronizacion completada (" + metodo + ")\n\n";
    msg += "Etiquetas buscadas: " + etiquetasDelEditor.length + "\n";
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
    } else if (etiquetasSinMatch.length > 0) {
      // Calcular sugerencias para todas las etiquetas sin match
      const clavesWord = Object.keys(wordData);
      const sugerenciasPorEtiqueta: Record<string, Array<{clave: string, similitud: number}>> = {};
      
      etiquetasSinMatch.forEach(etq => {
        const similares = clavesWord
          .map(clave => ({
            clave,
            similitud: calcularSimilitud(etq.texto, clave)
          }))
          .filter(s => s.similitud > 0.2)
          .sort((a, b) => b.similitud - a.similitud)
          .slice(0, 5); // Top 5 sugerencias
        
        sugerenciasPorEtiqueta[etq.texto] = similares;
      });
      
      // Guardar datos para el modal
      setMappingData({
        etiquetasSinMatch,
        wordData,
        sugerencias: sugerenciasPorEtiqueta
      });
      
      msg += "\n⚠️ Etiquetas sin match (" + etiquetasSinMatch.length + "):\n";
      etiquetasTextoSinMatch.slice(0, 10).forEach(e => { msg += "  - " + e + "\n"; });
      if (etiquetasSinMatch.length > 10) {
        msg += "  ... y " + (etiquetasSinMatch.length - 10) + " más.\n";
      }
      
      msg += "\n🎯 ¿Quieres hacer el mapeo manual?\n";
      msg += "Se abrirá una ventana para que selecciones manualmente\n";
      msg += "qué dato del Word corresponde a cada etiqueta.\n";
    }
    
    msg += "\n📖 Abra consola del navegador (F12) para mas detalles.\n";
    msg += "💡 Use el panel 'Ver Tablas del Word' para importar tablas columna por columna.";

    alert(msg);
    
    // Siempre mostrar el preview de tablas del Word si hay rawTables
    if (currentRawTables.length > 0) {
      setShowWordPreview(true);
      // Auto-seleccionar la tabla con más columnas (la más completa)
      const idxMejorTabla = currentRawTables.reduce((bestIdx, t, idx, arr) =>
        (t[0]?.length || 0) > (arr[bestIdx][0]?.length || 0) ? idx : bestIdx, 0
      );
      setSelectedWordTable(idxMejorTabla);
      setColumnMapping({});
      console.log(`🎯 Auto-seleccionada tabla ${idxMejorTabla} (${currentRawTables[idxMejorTabla][0]?.length || 0} columnas)`);
    }
    
    // Si hay etiquetas sin match, abrir modal de mapeo manual
    if (etiquetasSinMatch.length > 0 && Object.keys(wordData).length > 0) {
      setShowMappingModal(true);
    }

  } catch (error: any) {
    console.error("Error en sincronizacion:", error);
    alert("Error: " + error.message);
  } finally {
    setIsLoading(false);
  }
};

// Función auxiliar: calcular similitud entre dos strings (0-1)
function calcularSimilitud(a: string, b: string): number {
  const aNorm = a.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bNorm = b.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Si son iguales, 100%
  if (aNorm === bNorm) return 1;
  
  // Si uno contiene al otro
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    const menor = Math.min(aNorm.length, bNorm.length);
    const mayor = Math.max(aNorm.length, bNorm.length);
    return menor / mayor;
  }
  
  // Contar palabras en común
  const palabrasA = aNorm.split(/\s+/).filter(p => p.length >= 4);
  const palabrasB = bNorm.split(/\s+/).filter(p => p.length >= 4);
  
  if (palabrasA.length === 0 || palabrasB.length === 0) return 0;
  
  const coincidencias = palabrasA.filter(pa => 
    palabrasB.some(pb => pa === pb || pa.includes(pb) || pb.includes(pa))
  ).length;
  
  return coincidencias / Math.max(palabrasA.length, palabrasB.length);
}

// Función para aplicar el mapeo manual
const aplicarMapeoManual = () => {
  if (!mappingData || !activeSyllabus) return;
  
  let celdasLlenadas = 0;
  
  const updatedTabs = activeSyllabus.tabs.map((tab, tabIdx) => {
    const processedRows = tab.rows.map((row, rowIdx) => {
      const newCells = row.cells.map((cell, cellIdx) => {
        // Buscar si esta celda tiene un mapeo manual
        const etiquetaMatch = mappingData.etiquetasSinMatch.find(
          e => e.tabIdx === tabIdx && e.rowIdx === rowIdx && e.cellIdx === cellIdx
        );
        
        if (etiquetaMatch) {
          const claveWord = manualMappings[etiquetaMatch.texto];
          if (claveWord && claveWord !== "__UNMAPPED__" && mappingData.wordData[claveWord]) {
            // Buscar la celda vacía a la derecha
            if (cellIdx + 1 < row.cells.length) {
              const celdaDerecha = row.cells[cellIdx + 1];
              if (!celdaDerecha.content || celdaDerecha.content.trim().length === 0) {
                // Llenar en la siguiente iteración
                return cell;
              }
            }
          }
        }
        
        // Verificar si esta es la celda a la derecha de una etiqueta mapeada
        if (cellIdx > 0) {
          const celdaIzquierda = row.cells[cellIdx - 1];
          const etiquetaIzq = mappingData.etiquetasSinMatch.find(
            e => e.tabIdx === tabIdx && e.rowIdx === rowIdx && e.cellIdx === cellIdx - 1
          );
          
          if (etiquetaIzq) {
            const claveWord = manualMappings[etiquetaIzq.texto];
            // Ignorar si no tiene mapeo o si es el valor especial "__UNMAPPED__"
            if (claveWord && claveWord !== "__UNMAPPED__" && mappingData.wordData[claveWord]) {
              celdasLlenadas++;
              return { ...cell, content: String(mappingData.wordData[claveWord]) };
            }
          }
        }
        
        return cell;
      });
      return { ...row, cells: newCells };
    });
    return { ...tab, rows: processedRows };
  });
  
  setSyllabi(prev => prev.map(s => 
    s.id === activeSyllabus.id 
      ? { ...s, tabs: updatedTabs } 
      : s
  ));
  
  setShowMappingModal(false);
  setManualMappings({});
  alert(`✅ Mapeo manual completado!\n\nCeldas llenadas: ${celdasLlenadas}`);
};

// === IMPORTAR TABLA DEL WORD AL EDITOR (columna por columna) ===
const importarTablaWord = (wordTableIdx: number, startRowEditor: number, colMap: Record<number, number>) => {
  if (!activeSyllabus || !activeTab) return;
  
  const wordTable = wordRawTables[wordTableIdx];
  if (!wordTable) return;
  
  // colMap: { wordColIdx: editorColIdx } — mapea columna del Word a columna del editor
  const tabIdx = activeSyllabus.tabs.findIndex(t => t.id === activeTab.id);
  if (tabIdx < 0) return;
  
  let celdasLlenadas = 0;
  
  const updatedTabs = activeSyllabus.tabs.map((tab, tIdx) => {
    if (tIdx !== tabIdx) return tab;
    
    const processedRows = tab.rows.map((row, rIdx) => {
      // Solo procesar filas a partir de startRowEditor
      if (rIdx < startRowEditor) return row;
      
      const wordRowIdx = rIdx - startRowEditor;
      // Si ya no hay filas del Word, parar
      if (wordRowIdx >= wordTable.length) return row;
      
      const wordRow = wordTable[wordRowIdx];
      const newCells = row.cells.map((cell, cIdx) => {
        // Buscar si esta columna del editor tiene un mapeo
        const wordColIdx = Object.entries(colMap).find(([, editorCol]) => editorCol === cIdx);
        if (!wordColIdx) return cell;
        
        const wColIdx = parseInt(wordColIdx[0]);
        if (wColIdx >= wordRow.length) return cell;
        
        const wordValue = (wordRow[wColIdx] || '').trim();
        if (!wordValue) return cell;
        
        // Solo llenar si la celda está vacía o es editable
        if (cell.content && cell.content.trim().length > 0) return cell;
        
        celdasLlenadas++;
        return { ...cell, content: wordValue };
      });
      
      return { ...row, cells: newCells };
    });
    
    return { ...tab, rows: processedRows };
  });
  
  setSyllabi(prev => prev.map(s =>
    s.id === activeSyllabus.id ? { ...s, tabs: updatedTabs } : s
  ));
  
  alert(`✅ Tabla importada!\n\nCeldas llenadas: ${celdasLlenadas}`);
};

// === AUTO-DETECTAR mapeo de columnas entre tabla Word y editor ===
const autoDetectColumnMapping = (wordTableIdx: number): { colMap: Record<number, number>, startRowWord: number, startRowEditor: number } => {
  if (!activeTab || !wordRawTables[wordTableIdx]) return { colMap: {}, startRowWord: 0, startRowEditor: 0 };
  
  const wordTable = wordRawTables[wordTableIdx];
  const editorRows = activeTab.rows;
  
  // Buscar la fila header de la tabla del Word (primera fila con textos cortos)
  let wordHeaderRow = 0;
  for (let r = 0; r < Math.min(3, wordTable.length); r++) {
    const row = wordTable[r];
    const shortTexts = row.filter(c => c.trim().length > 0 && c.trim().length < 60);
    if (shortTexts.length >= 3) {
      wordHeaderRow = r;
      break;
    }
  }
  
  // Buscar la fila header del editor (fila con textos de header similares)
  let editorHeaderRow = -1;
  const wordHeaders = wordTable[wordHeaderRow].map(h => h.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  
  for (let r = 0; r < editorRows.length; r++) {
    const editorCells = editorRows[r].cells;
    let matchCount = 0;
    for (const cell of editorCells) {
      const cellText = (cell.content || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cellText.length < 2) continue;
      for (const wh of wordHeaders) {
        if (wh.length < 2) continue;
        if (cellText.includes(wh) || wh.includes(cellText) || 
            cellText.replace(/\s+/g, "").includes(wh.replace(/\s+/g, "")) ||
            wh.replace(/\s+/g, "").includes(cellText.replace(/\s+/g, ""))) {
          matchCount++;
          break;
        }
      }
    }
    // Si al menos 30% de los headers coinciden
    if (matchCount >= Math.max(2, wordHeaders.filter(h => h.length > 0).length * 0.3)) {
      editorHeaderRow = r;
      break;
    }
  }
  
  if (editorHeaderRow < 0) return { colMap: {}, startRowWord: wordHeaderRow + 1, startRowEditor: 0 };
  
  // Mapear columnas: para cada columna del Word, buscar la columna del editor con header similar
  const colMap: Record<number, number> = {};
  const editorHeaders = editorRows[editorHeaderRow].cells;
  
  wordHeaders.forEach((wh, wIdx) => {
    if (wh.length < 2) return;
    let bestMatch = -1;
    let bestScore = 0;
    
    editorHeaders.forEach((eCell, eIdx) => {
      const eh = (eCell.content || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (eh.length < 2) return;
      
      let score = 0;
      if (eh === wh) score = 1;
      else if (eh.includes(wh) || wh.includes(eh)) score = 0.8;
      else if (eh.replace(/\s+/g, "").includes(wh.replace(/\s+/g, "")) || wh.replace(/\s+/g, "").includes(eh.replace(/\s+/g, ""))) score = 0.6;
      else {
        // Palabras en común
        const wordsW = wh.split(/\s+/).filter(w => w.length >= 3);
        const wordsE = eh.split(/\s+/).filter(w => w.length >= 3);
        const common = wordsW.filter(w => wordsE.some(e => e.includes(w) || w.includes(e)));
        if (common.length > 0) score = common.length / Math.max(wordsW.length, wordsE.length) * 0.5;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = eIdx;
      }
    });
    
    if (bestMatch >= 0 && bestScore >= 0.3) {
      colMap[wIdx] = bestMatch;
    }
  });
  
  return { colMap, startRowWord: wordHeaderRow + 1, startRowEditor: editorHeaderRow + 1 };
};

// === IMPORTAR CON AUTO-DETECCION ===
const importarTablaAutoDetect = (wordTableIdx: number) => {
  const { colMap, startRowWord, startRowEditor } = autoDetectColumnMapping(wordTableIdx);
  
  if (Object.keys(colMap).length === 0) {
    alert("No se pudo detectar automáticamente el mapeo de columnas.\nUse el mapeo manual en el panel de preview.");
    return;
  }
  
  const wordTable = wordRawTables[wordTableIdx];
  if (!wordTable || !activeSyllabus || !activeTab) return;
  
  // Crear una versión de la tabla Word sin la fila header
  const dataRows = wordTable.slice(startRowWord);
  
  const tabIdx = activeSyllabus.tabs.findIndex(t => t.id === activeTab.id);
  if (tabIdx < 0) return;
  
  let celdasLlenadas = 0;
  
  const updatedTabs = activeSyllabus.tabs.map((tab, tIdx) => {
    if (tIdx !== tabIdx) return tab;
    
    const processedRows = tab.rows.map((row, rIdx) => {
      if (rIdx < startRowEditor) return row;
      
      const dataRowIdx = rIdx - startRowEditor;
      if (dataRowIdx >= dataRows.length) return row;
      
      const wordRow = dataRows[dataRowIdx];
      const newCells = row.cells.map((cell, cIdx) => {
        // Buscar si esta columna del editor tiene un mapeo
        const wordColEntry = Object.entries(colMap).find(([, editorCol]) => editorCol === cIdx);
        if (!wordColEntry) return cell;
        
        const wColIdx = parseInt(wordColEntry[0]);
        if (wColIdx >= wordRow.length) return cell;
        
        const wordValue = (wordRow[wColIdx] || '').trim();
        if (!wordValue) return cell;
        
        // Solo llenar si la celda está vacía
        if (cell.content && cell.content.trim().length > 0) return cell;
        
        celdasLlenadas++;
        return { ...cell, content: wordValue };
      });
      
      return { ...row, cells: newCells };
    });
    
    return { ...tab, rows: processedRows };
  });
  
  setSyllabi(prev => prev.map(s =>
    s.id === activeSyllabus.id ? { ...s, tabs: updatedTabs } : s
  ));
  
  const mappedCols = Object.entries(colMap).map(([wc, ec]) => {
    const wordH = wordRawTables[wordTableIdx]?.[0]?.[parseInt(wc)] || `Col ${wc}`;
    const editorH = activeTab?.rows[startRowEditor - 1]?.cells[ec]?.content || `Col ${ec}`;
    return `  ${wordH.substring(0, 25)} → ${editorH.substring(0, 25)}`;
  }).join('\n');
  
  alert(`✅ Tabla importada columna por columna!\n\nCeldas llenadas: ${celdasLlenadas}\nColumnas mapeadas:\n${mappedCols}`);
};

// Función auxiliar: busca datos en wordData usando match flexible
function buscarEnWordData(wordData: Record<string, any>, etiqueta: string): any {
  // Normalizar: quitar acentos, espacios multiples, para comparacion mas flexible
  const normalizar = (s: string) => {
    return s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/\s+/g, " ") // Espacios múltiples -> uno solo
      .trim();
  };
  
  // Normalizar quitando también números, puntuación, paréntesis, barras
  const normalizarExtra = (s: string) => {
    return normalizar(s)
      .replace(/^[\d\.\-\)\(:\s]+/, "") // Quitar números, puntos, guiones al inicio
      .replace(/[\d\.\-\)\(:\s]+$/, "") // Quitar al final
      .trim();
  };

  // Normalizar agresivo: quitar TODO lo que no sea letras y espacios
  const normalizarAgresivo = (s: string) => {
    return normalizar(s)
      .replace(/[^A-Z\s]/g, "") // Solo letras y espacios
      .replace(/\s+/g, " ")
      .trim();
  };
  
  const etqNorm = normalizar(etiqueta);
  const etqNormExtra = normalizarExtra(etiqueta);

  console.log(`🔍 Buscando match para: "${etiqueta}"`);
  console.log(`   Normalizado: "${etqNorm}"`);
  console.log(`   Sin números/puntos: "${etqNormExtra}"`);

  // 1. Match exacto (case-insensitive + sin acentos)
  for (const [clave, valor] of Object.entries(wordData)) {
    const claveNorm = normalizar(clave);
    const claveNormExtra = normalizarExtra(clave);
    
    // Match exacto normal
    if (claveNorm === etqNorm) {
      console.log(`  ✓ Match EXACTO con clave: "${clave}"`);
      return valor;
    }
    
    // Match exacto sin números/puntuación
    if (claveNormExtra === etqNormExtra && etqNormExtra.length >= 4) {
      console.log(`  ✓ Match EXACTO (sin números) con clave: "${clave}"`);
      return valor;
    }
  }
  console.log(`  ⊘ No hay match exacto`);

  // 1.5. Match agresivo: quitar TODO excepto letras y espacios (maneja /, (), -, etc.)
  const etqAgresivo = normalizarAgresivo(etiqueta);
  if (etqAgresivo.length >= 6) {
    for (const [clave, valor] of Object.entries(wordData)) {
      const claveAgresivo = normalizarAgresivo(clave);
      if (claveAgresivo === etqAgresivo) {
        console.log(`  ✓ Match AGRESIVO (solo letras) con clave: "${clave}"`);
        return valor;
      }
    }
  }

  // 2. Match parcial: una contiene a la otra, con guardia de longitud 70%
  //    Priorizar el match mas largo (mas especifico)
  //    También probar versión sin números/puntuación
  let mejorMatch: { valor: any; longitud: number } | null = null;
  for (const [clave, valor] of Object.entries(wordData)) {
    const claveNorm = normalizar(clave);
    const claveNormExtra = normalizarExtra(clave);
    
    if (claveNorm.length < 4 || etqNorm.length < 4) continue;
    
    // Probar con versión normal
    const menor = Math.min(claveNorm.length, etqNorm.length);
    const mayor = Math.max(claveNorm.length, etqNorm.length);
    if (menor / mayor >= 0.7) {
      if (etqNorm.includes(claveNorm) || claveNorm.includes(etqNorm)) {
        console.log(`  ≈ Match PARCIAL con clave: "${clave}" (ratio: ${(menor/mayor*100).toFixed(0)}%)`);
        // Preferir el match mas largo/especifico
        if (!mejorMatch || claveNorm.length > mejorMatch.longitud) {
          mejorMatch = { valor, longitud: claveNorm.length };
        }
      }
    }
    
    // Probar con versión sin números
    if (claveNormExtra.length >= 4 && etqNormExtra.length >= 4) {
      const menorExtra = Math.min(claveNormExtra.length, etqNormExtra.length);
      const mayorExtra = Math.max(claveNormExtra.length, etqNormExtra.length);
      if (menorExtra / mayorExtra >= 0.6) { // 60% para versión sin números
        if (etqNormExtra.includes(claveNormExtra) || claveNormExtra.includes(etqNormExtra)) {
          console.log(`  ≈ Match PARCIAL (sin números) con clave: "${clave}" (ratio: ${(menorExtra/mayorExtra*100).toFixed(0)}%)`);
          if (!mejorMatch || claveNormExtra.length > mejorMatch.longitud) {
            mejorMatch = { valor, longitud: claveNormExtra.length };
          }
        }
      }
    }
  }
  if (mejorMatch) {
    console.log(`  ✓ Usando mejor match parcial`);
    return mejorMatch.valor;
  }
  console.log(`  ⊘ No hay match parcial`);

  // 3. Match por sinónimos conocidos (editor -> posibles claves del Word)
  const sinonimos: Record<string, string[]> = {
    // Datos generales de la asignatura
    "PERIODO ACADEMICO ORDINARIO (PAO)": ["PERIODO ACADEMICO ORDINARIO (PAO)", "PAO", "PERIODO ACADEMICO", "PERIODO ACADEMICO ORDINARIO"],
    "CODIGO DE ASIGNATURA": ["CODIGO DE ASIGNATURA", "CODIGO", "CODIGO DE LA ASIGNATURA"],
    "NOMBRE DE LA ASIGNATURA": ["NOMBRE DE LA ASIGNATURA", "ASIGNATURA", "NOMBRE DE ASIGNATURA", "NOMBRE ASIGNATURA"],
    "PROFESOR QUE IMPARTE LA ASIGNATURA": ["PROFESOR QUE IMPARTE LA ASIGNATURA", "PROFESOR", "DOCENTE", "PROFESOR QUE IMPARTE"],
    "PERFIL DEL PROFESOR": ["PERFIL DEL PROFESOR", "PERFIL PROFESIONAL", "PERFIL DOCENTE", "PERFIL DEL DOCENTE"],
    "TOTAL DE HORAS /CREDITOS": ["TOTAL DE HORAS /CREDITOS", "TOTAL DE HORAS/CREDITOS", "TOTAL HORAS/CREDITOS", "TOTAL DE HORAS / CREDITOS", "TOTAL HORAS"],
    "HORAS DE DOCENCIA PRESENCIAL/ SINCRONICA": ["HORAS DE DOCENCIA PRESENCIAL/ SINCRONICA", "HORAS DE DOCENCIA PRESENCIAL/SINCRONICA", "HORAS DE DOCENCIA", "HORAS DOCENCIA"],
    "HORAS PARA PRACTICAS FORMATIVAS DE APLICACION Y EXPERIMENTACION (PFAE)": ["HORAS PARA PRACTICAS FORMATIVAS DE APLICACION Y EXPERIMENTACION (PFAE)", "PFAE", "HORAS PFAE", "PRACTICAS FORMATIVAS"],
    "HORAS DE TRABAJO AUTONOMO (TA)": ["HORAS DE TRABAJO AUTONOMO (TA)", "HORAS DE TRABAJO AUTONOMO", "TRABAJO AUTONOMO", "HORAS TA"],
    "HORAS DE PRACTICAS PREPROFESIONALES (PPP)": ["HORAS DE PRACTICAS PREPROFESIONALES (PPP)", "HORAS DE PRACTICAS PREPROFESIONALES", "PRACTICAS PREPROFESIONALES", "HORAS PPP"],
    "HORAS DE VINCULACION CON LA SOCIEDAD (HVS)": ["HORAS DE VINCULACION CON LA SOCIEDAD (HVS)", "HORAS DE VINCULACION CON LA SOCIEDAD", "HORAS DE VINCULACION", "VINCULACION CON LA SOCIEDAD", "HORAS HVS"],
    "UNIDAD CURRICULAR /EJE DE FORMACION": ["UNIDAD CURRICULAR /EJE DE FORMACION", "UNIDAD CURRICULAR/EJE DE FORMACION", "UNIDAD CURRICULAR", "EJE DE FORMACION"],
    "CAMPO DE FORMACION": ["CAMPO DE FORMACION", "CAMPO FORMACION"],
    "HORARIO DE CLASES": ["HORARIO DE CLASES", "HORARIO", "HORARIO CLASES"],
    "HORARIO PARA TUTORIAS": ["HORARIO PARA TUTORIAS", "HORARIO TUTORIAS", "TUTORIAS"],
    "PARALELO/S": ["PARALELO/S", "PARALELOS", "PARALELO"],
    // Resultados, bibliografía, evaluación
    "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA": ["RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA", "RESULTADOS DE APRENDIZAJE", "RESULTADOS", "RESULTADO DE APRENDIZAJE"],
    "RESULTADOS D E APRENDIZAJE DE LA ASIGNATURA": ["RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA", "RESULTADOS DE APRENDIZAJE"],
    "BIBLIOGRAFIA - FUENTES DE CONSULTA": ["BIBLIOGRAFIA - FUENTES DE CONSULTA", "BIBLIOGRAFIA/FUENTES DE CONSULTA", "BIBLIOGRAFIA BASICA", "BIBLIOGRAFIA"],
    "BIBLIOGRAFIA BASICA": ["BIBLIOGRAFIA BASICA", "BIBLIOGRAFIA"],
    "BIBLIOGRAFIA COMPLEMENTARIA": ["BIBLIOGRAFIA COMPLEMENTARIA"],
    "CONTENIDOS DE LA ASIGNATURA": ["CONTENIDOS DE LA ASIGNATURA", "CONTENIDOS"],
    "PROCEDIMIENTOS DE EVALUACION": ["PROCEDIMIENTOS DE EVALUACION", "EVALUACION"],
    "OBJETIVOS DE LA ASIGNATURA": ["OBJETIVOS DE LA ASIGNATURA", "OBJETIVOS", "OBJETIVO GENERAL"],
    "CARACTERIZACION DE LA ASIGNATURA": ["CARACTERIZACION DE LA ASIGNATURA", "CARACTERIZACION", "DESCRIPCION DE LA ASIGNATURA"],
    "DESCRIPCION DE LA ASIGNATURA": ["DESCRIPCION DE LA ASIGNATURA", "CARACTERIZACION DE LA ASIGNATURA", "CARACTERIZACION"],
    "TOTAL HORAS POR COMPONENTE": ["TOTAL HORAS POR COMPONENTE", "TOTAL HORAS COMPONENTE"],
    "TOTAL HORAS DE LA ASIGNATURA": ["TOTAL HORAS DE LA ASIGNATURA", "TOTAL HORAS ASIGNATURA", "TOTAL DE HORAS"],
    "EVALUACION DEL PRIMER PARCIAL": ["EVALUACION DEL PRIMER PARCIAL", "PRIMER PARCIAL"],
    "EVALUACION DEL SEGUNDO PARCIAL": ["EVALUACION DEL SEGUNDO PARCIAL", "SEGUNDO PARCIAL"],
    "EVALUACION DE RECUPERACION": ["EVALUACION DE RECUPERACION", "RECUPERACION"],
    // Autoridades
    "DECANO/A DE FACULTAD": ["DECANO/A DE FACULTAD", "DECANO DE FACULTAD", "DECANO", "DECANA"],
    "DIRECTOR/A ACADEMICO/A": ["DIRECTOR/A ACADEMICO/A", "DIRECTOR ACADEMICO", "DIRECTORA ACADEMICA"],
    "COORDINADOR/A DE CARRERA": ["COORDINADOR/A DE CARRERA", "COORDINADOR DE CARRERA", "COORDINADORA DE CARRERA"],
    // Genéricos
    "COMPETENCIAS": ["COMPETENCIAS", "COMPETENCIA"],
    "METODOLOGIA": ["METODOLOGIA", "METODOLOGIAS"],
    "ASIGNATURA": ["ASIGNATURA"],
    "NIVEL": ["NIVEL"],
    "CODIGO": ["CODIGO"],
    "CARRERA": ["CARRERA"],
    "FACULTAD": ["FACULTAD"],
    "MODALIDAD": ["MODALIDAD"],
    "PRERREQUISITO": ["PRERREQUISITO", "PREREQUISITO", "PRE-REQUISITO"],
    "CORREQUISITO": ["CORREQUISITO", "CO-REQUISITO"],
  };

  const aliasDirecto = sinonimos[etqNorm];
  if (aliasDirecto) {
    console.log(`  🔄 Probando sinónimos: ${aliasDirecto.join(', ')}`);
    for (const a of aliasDirecto) {
      const aNorm = normalizar(a);
      for (const [clave, valor] of Object.entries(wordData)) {
        if (normalizar(clave) === aNorm) {
          console.log(`  ✓ Match por SINONIMO: "${a}" = "${clave}"`);
          return valor;
        }
      }
    }
  }

  // Tambien buscar al reves: si la etiqueta del editor coincide con algun alias
  for (const [key, aliases] of Object.entries(sinonimos)) {
    if (aliases.some(a => normalizar(a) === etqNorm || key === etqNorm)) {
      console.log(`  🔄 Probando sinónimos inversos de "${key}"`);
      // Buscar CUALQUIERA de los alias en wordData
      for (const a of [key, ...aliases]) {
        const aNorm = normalizar(a);
        for (const [clave, valor] of Object.entries(wordData)) {
          if (normalizar(clave) === aNorm) {
            console.log(`  ✓ Match por SINONIMO INVERSO: "${a}" = "${clave}"`);
            return valor;
          }
        }
      }
    }
  }
  console.log(`  ⊘ No hay match por sinónimos`);

  // 4. Match por palabras significativas: al menos 2 palabras >= 4 chars deben coincidir
  const palabrasEtq = etqNorm.split(/\s+/).filter(p => p.length >= 4);
  if (palabrasEtq.length >= 2) {
    console.log(`  🔤 Probando match por palabras significativas: [${palabrasEtq.join(', ')}]`);
    for (const [clave, valor] of Object.entries(wordData)) {
      const claveNorm = normalizar(clave);
      const palabrasClave = claveNorm.split(/\s+/).filter(p => p.length >= 4);
      // Contar cuantas palabras significativas coinciden
      const coincidencias = palabrasEtq.filter(p => palabrasClave.some(pc => pc === p || pc.includes(p) || p.includes(pc)));
      // Al menos 2 palabras deben coincidir, o si la etiqueta solo tiene 2 palabras, ambas
      const minCoincidencias = Math.min(2, palabrasEtq.length);
      if (coincidencias.length >= minCoincidencias) {
        console.log(`  ✓ Match por PALABRAS: "${clave}" (coincidencias: ${coincidencias.length}/${palabrasEtq.length})`);
        return valor;
      }
    }
  }
  
  console.log(`  ⊘ No hay match por palabras significativas`);
  console.log(`  ❌ SIN MATCH FINAL para "${etiqueta}"`);
  return null;
}
  const handleSaveToDB = async () => {
    if (!activeSyllabus) return alert("No hay un ProgramaAnalitico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activeSyllabus.metadata,
        tabs: activeSyllabus.tabs.map(tab => ({
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

      const payload = {
        nombre: activeSyllabus.name || 'ProgramaAnalitico',
        periodo: selectedPeriod,
        materias: activeSyllabus.name || 'ProgramaAnalitico',
        datos_syllabus: datosParaGuardar
      }
      
      const isUpdate = typeof activeSyllabus.id === "number"
      const endpoint = isUpdate ? `/api/syllabus/${activeSyllabus.id}` : "/api/syllabus"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedSyllabusRecord;
      
      const savedUIData = savedRecord.datos_syllabus;
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

      setSyllabi((prev) => prev.map((s) => (s.id === activeSyllabusId ? savedUIData : s)))
      setActiveSyllabusId(savedUIData.id)
      
      if (isUpdate) {
        setSavedSyllabi(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setSavedSyllabi(prev => [savedRecord, ...prev]);
      }
      
      alert("�ProgramaAnalitico guardado exitosamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<SyllabusData>) => {
    setSyllabi(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activeSyllabus) return;
    const updatedMetadata = { ...activeSyllabus.metadata, [field]: value };
    updateProgramaAnalitico(activeSyllabus.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadSyllabus = (syllabusId: string) => {
    console.log("📋 handleLoadSyllabus - ID recibido:", syllabusId);
    console.log("📋 savedSyllabi disponibles:", savedSyllabi.length);
    
    if (!syllabusId) {
      console.error("❌ No se proporcionó syllabusId");
      return;
    }
    
    const id = parseInt(syllabusId, 10);
    console.log("🔍 ID parseado:", id);
    
    // Comparar convirtiendo ambos a número
    const syllabusToLoad = savedSyllabi.find(s => Number(s.id) === id);
    console.log("🔍 Syllabus encontrado:", syllabusToLoad ? "SÍ" : "NO");
    
    if (syllabusToLoad) {
      console.log("✅ Cargando Syllabus:", syllabusToLoad.nombre);
      console.log("📊 Estructura datos_syllabus:", JSON.stringify(syllabusToLoad.datos_syllabus, null, 2));
      
      let editorData = syllabusToLoad.datos_syllabus;
      
      // ⚠️ VALIDACIÓN: Verificar que datos_syllabus existe
      if (!editorData) {
        console.error("❌ datos_syllabus es null o undefined para el syllabus:", syllabusToLoad.id);
        alert("Error: El syllabus no tiene datos válidos. Por favor, créalo de nuevo.");
        return;
      }
      
      // 🔄 FIX CRÍTICO: Convertir formato de validación a formato de editor
      if ((editorData as any).tipo === 'Syllabus_validado' && (editorData as any).titulos && !editorData.tabs) {
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
          name: syllabusToLoad.nombre,
          metadata: {
            ...editorData.metadata,
            subject: syllabusToLoad.nombre,
            period: syllabusToLoad.periodo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          tabs: [{
            id: `tab-${Date.now()}`,
            title: "Syllabus Importado",
            rows: rows
          }]
        } as any;
        
        console.log("✅ Conversión completada - Filas creadas:", rows.length);
      }
      
      editorData.id = syllabusToLoad.id;
      
      // 🔍 VALIDACIÓN Y NORMALIZACIÓN DE LA ESTRUCTURA
      if (!editorData.tabs || editorData.tabs.length === 0) {
        console.log("🔄 No hay tabs, creando estructura desde rows...");
        
        // Si tiene rows directamente (formato antiguo)
        if ((editorData as any).rows && Array.isArray((editorData as any).rows)) {
          console.log("🔍 Encontradas", (editorData as any).rows.length, "filas directas");
          editorData.tabs = [{ 
            id: `tab-${Date.now()}`, 
            title: "General", 
            rows: (editorData as any).rows 
          }];
        } else {
          // Crear estructura vacía
          console.log("🔍 No hay rows, creando estructura vacía");
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
        editorData.name = syllabusToLoad.nombre;
      }
      
      setSyllabi([editorData]);
      setActiveSyllabusId(editorData.id);
      setActiveTabId(editorData.tabs[0]?.id || null);
      
      // Establecer el periodo seleccionado
      setSelectedPeriod(syllabusToLoad.periodo);
      console.log("✅ Syllabus cargado exitosamente");
      console.log("   - ID:", editorData.id);
      console.log("   - Nombre:", editorData.name);
      console.log("   - Periodo:", syllabusToLoad.periodo);
      console.log("   - Tabs:", editorData.tabs.length);
      console.log("   - Filas en tab activo:", editorData.tabs[0]?.rows?.length || 0);
    } else {
      console.error("❌ No se encontró el Syllabus con ID:", id);
      console.log("🔍 IDs disponibles:", savedSyllabi.map(s => s.id));
    }
  };

  // --- NUEVA FUNCI�N: Upload con validaci�n para comisi�n acad�mica ---
  const handleUploadConValidacion = async (file: File) => {
    try {
      // Verificar que haya un periodo seleccionado
      if (!selectedPeriod) {
        alert("? Por favor seleccione un periodo acad�mico antes de subir el documento");
        setIsLoading(false);
        return;
      }

      const periodoNombre = periodos.find(p => p.id.toString() === selectedPeriod)?.nombre || selectedPeriod;

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', file.name.replace(/\.docx?$/i, ''));
      formData.append('periodo', periodoNombre);
      formData.append('materias', activeSyllabus?.metadata?.subject || 'Sin especificar');

      console.log(`?? Enviando ProgramaAnalitico para validaci�n - Periodo: ${periodoNombre}`);

      // Enviar al endpoint de validaci�n
      const currentToken = token || getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${API_URL}/syllabi/upload-validado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ? VALIDACI�N EXITOSA
        const validacion = result.data?.validacion || {};
        alert(
          `? ProgramaAnalitico validado y guardado exitosamente\n\n` +
          `Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
          `M�nimo requerido: 95%\n` +
          `Campos requeridos: ${validacion.total_requeridos || 0}\n` +
          `Campos encontrados: ${validacion.encontrados || 0}`
        );
        
        // Recargar la lista de syllabi guardados
        try {
          const programasData = await apiRequest("/api/syllabus");
          const syllabiArray = Array.isArray(programasData?.data) ? programasData.data : [];
          setSavedSyllabi(syllabiArray);
          
          // Cargar el ProgramaAnalitico reci�n guardado
          if (result.data?.id) {
            handleLoadSyllabus(result.data.id.toString());
          }
        } catch (err) {
          console.error("Error recargando lista:", err);
        }
      } else {
        // ? VALIDACI�N FALLIDA
        const detalles = result.detalles || {};
        const faltantes = detalles.faltantes || [];
        const extras = detalles.extras || [];
        
        let mensaje = `? El ProgramaAnalitico NO cumple con la estructura requerida\n\n`;
        mensaje += `?? Coincidencia: ${detalles.porcentaje_coincidencia || 0}% (m�nimo requerido: 95%)\n`;
        mensaje += `?? Total requeridos: ${detalles.total_requeridos || 0}\n`;
        mensaje += `? Encontrados: ${detalles.encontrados || 0}\n\n`;
        
        if (faltantes.length > 0) {
          mensaje += `? Campos Faltantes (${faltantes.length}):\n`;
          faltantes.slice(0, 10).forEach((campo: string) => {
            mensaje += `   � ${campo}\n`;
          });
          if (faltantes.length > 10) {
            mensaje += `   ... y ${faltantes.length - 10} m�s\n`;
          }
        }
        
        if (extras.length > 0) {
          mensaje += `\n?? Campos Extra (${extras.length}):\n`;
          extras.slice(0, 5).forEach((campo: string) => {
            mensaje += `   � ${campo}\n`;
          });
        }
        
        mensaje += `\n?? Por favor, revise el documento y aseg�rese de que contenga todos los campos requeridos seg�n la plantilla del administrador.`;
        
        alert(mensaje);
      }
    } catch (error: any) {
      console.error('? Error en validaci�n:', error);
      alert(`? Error al validar el ProgramaAnalitico:\n${error.message || 'Error desconocido'}\n\nPor favor, verifique que existe una plantilla de referencia para este periodo.`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMPORTACI�N MAESTRA V8: HEUR�STICA DE ESTRUCTURA Y VERTICALIDAD ---
  // --- IMPORTACI�N MAESTRA V9: CORREGIDA PARA FUSI�N DE SUBTABLAS ---
  // --- IMPORTACI�N V10: ESTRATEGIA DE BLOQUEO POR SECCIONES (SOLUCI�N DEFINITIVA) ---
  // --- IMPORTACI�N MAESTRA V11: ESTRATEGIA "REBANADORA" (MEGA TABLA) ---
  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    // Validaci�n para comisi�n acad�mica
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
      
      // Intentar sacar metadata b�sica
      const findMeta = (k: string) => Array.from(doc.querySelectorAll("p, td"))
        .find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim() || "";
      
      const meta = { 
        subject: findMeta("Nombre de la asignatura") || findMeta("Materia") || "Sin Nombre", 
        period: findMeta("Periodo") || "", 
        level: findMeta("Nivel") || "" 
      };

      console.log("--- MODO: REBANADO DE MEGA-TABLA ---");

      // 2. PALABRAS CLAVE QUE INDICAN EL INICIO DE UNA NUEVA PESTA�A
      // Estas son las palabras que aparecen en la columna izquierda de tu imagen
      const SECTION_TRIGGERS = [
        "DATOS GENERALES", "INFORMACI�N GENERAL",
        "OBJETIVOS", "OBJETIVO",
        "RESULTADOS DE APRENDIZAJE", "RESULTADOS",
        "CONTENIDOS", "CONTENIDOS DE LA ASIGNATURA", "UNIDADES TEM�TICAS",
        "METODOLOG�A", "ESTRATEGIAS METODOL�GICAS",
        "EVALUACI�N", "SISTEMA DE EVALUACI�N",
        "BIBLIOGRAF�A", "FUENTES DE CONSULTA",
        "VISADO", "LEGALIZACI�N"
      ];

      const newTabs: TabData[] = [];
      let currentRows: TableRow[] = [];
      let currentSectionTitle = "Informaci�n General"; // T�tulo por defecto

      // Funci�n para guardar el acumulado actual como una pesta�a
      const pushCurrentSection = () => {
        if (currentRows.length > 0) {
            newTabs.push({
                id: `tab-${newTabs.length}-${Date.now()}`,
                title: currentSectionTitle,
                rows: [...currentRows] // Copia de las filas
            });
            currentRows = []; // Limpiar para la siguiente secci�n
        }
      };

      // 3. OBTENER TODAS LAS FILAS DEL DOCUMENTO (IGNORANDO SI EST�N EN DIFERENTES TABLAS)
      // Esto aplana el documento: no importa si es 1 tabla gigante o 5 peque�as
      const allRows = Array.from(doc.querySelectorAll("tr"));

      allRows.forEach((tr, rIdx) => {
        // Analizar celdas de esta fila
        const cells = Array.from(tr.querySelectorAll("td, th"));
        if (cells.length === 0) return;

        // Obtener texto de la PRIMERA celda (donde suelen estar los t�tulos laterales)
        const firstCellText = cells[0].textContent?.replace(/\n/g, " ").trim().toUpperCase() || "";
        
        // Verificar si esta fila es un "ROMPE-SECCI�N"
        // (Es decir, si la primera celda contiene una palabra clave)
        const matchedTrigger = SECTION_TRIGGERS.find(trigger => firstCellText.includes(trigger));

        // CASO ESPECIAL: Si detectamos "CONTENIDOS", activamos la l�gica de agrupaci�n
        // Si encontramos un trigger NUEVO, cerramos la secci�n anterior e iniciamos una nueva
        if (matchedTrigger && firstCellText.length < 50) { // < 50 para evitar falsos positivos en p�rrafos largos
            pushCurrentSection(); // Guardar lo anterior
            
            // Limpiar t�tulo (ej: "CONTENIDOS DE LA ASIGNATURA" -> "Contenidos")
            let cleanTitle = matchedTrigger;
            if (cleanTitle.includes("CONTENIDOS")) cleanTitle = "Contenidos y Unidades";
            if (cleanTitle.includes("RESULTADOS")) cleanTitle = "Resultados de Aprendizaje";
            if (cleanTitle.includes("BIBLIOGRAF�A")) cleanTitle = "Bibliograf�a";
            
            currentSectionTitle = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase(); // Capitalize
        }

        // --- CONVERTIR HTML TR A OBJETO FILA ---
        const rowData: TableRow = {
            id: `row-${Date.now()}-${rIdx}`,
            cells: cells.map((td, cIdx) => {
                const content = td.textContent?.trim() || "";
                
                // Detecci�n heur�stica de headers y orientaci�n
                const isBold = !!td.querySelector("strong, b") || td.tagName === "TH";
                const isVertical = ["PRESENCIAL", "AUT�NOMO", "PRACTICO"].some(k => content.toUpperCase().includes(k));
                
                // Si estamos en la secci�n de Contenidos, y la celda dice "UNIDADES TEM�TICAS", es un header importante
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

      // Al final del loop, empujar la �ltima secci�n pendiente
      pushCurrentSection();

      // --- VALIDACI�N FINAL ---
      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se pudo detectar ninguna estructura v�lida en el documento.");
      }

      const newData: SyllabusData = {
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.subject || file.name.replace(".docx",""),
        description: "Importado (Mega-Tabla Split)",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setSyllabi([newData]);
      setActiveSyllabusId(newData.id);
      
      // Intentar ir a la pesta�a de contenidos primero
      const tabContenidos = newTabs.find(t => t.title.toLowerCase().includes("contenidos"));
      setActiveTabId(tabContenidos ? tabContenidos.id : newTabs[0].id);

      console.log(`? Importaci�n exitosa: ${newTabs.length} secciones detectadas.`);

    } catch (e) { 
        console.error(e); 
        alert("Error al procesar el archivo. Verifica que no est� corrupto."); 
    } finally { 
        setIsLoading(false); 
    }
  };
  // --- M�TODOS DE EDICI�N ---
  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activeSyllabus || !activeTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activeSyllabus || !editingTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin T�tulo" } : tab);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeSyllabus) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: `Nueva Secci�n`,
      rows: [
        { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}] },
      ]
    };
    const updatedTabs = [...activeSyllabus.tabs, newTab];
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeSyllabus) return;
    if (activeSyllabus.tabs.length <= 1) return alert("Debe quedar al menos una secci�n.");
    if (!window.confirm("�Est�s seguro de eliminar esta secci�n?")) return;
    const updatedTabs = activeSyllabus.tabs.filter(t => t.id !== tabIdToRemove);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
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
  
  // ?? Funci�n para inicializar tabla vac�a
  const initializeEmptyTable = (rows: number = 5, cols: number = 3) => {
    console.log(`?? Inicializando tabla vac�a: ${rows} filas x ${cols} columnas`);
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
    console.log("? Tabla inicializada con �xito");
  };
  
  const addRowAt=(idx:number)=>{
    // Si la tabla est� vac�a, inicializar primero
    if(!tableData.length) {
      console.log("?? Tabla vac�a, inicializando...");
      initializeEmptyTable(3, 3);
      return;
    }
    const rId=`r-${Date.now()}`,nCols=tableData[0].cells.reduce((a,c)=>a+c.colSpan,0);
    const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0}))};
    const nRows=[...tableData];nRows.splice(idx,0,nR);handleUpdateActiveTabRows(nRows)
  }
  const addColumnAt=(idx:number)=>{
    // Si la tabla est� vac�a, inicializar primero
    if(!tableData.length) {
      console.log("?? Tabla vac�a, inicializando...");
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
    if(!activeSyllabus || !activeTab) return;

    // Usar orientaci�n landscape para m�s espacio horizontal
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cargar el logo de la universidad
    let logoLoaded = false;
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error('No se pudo cargar el logo'));
        logoImg.src = '/images/unesum-logo-official.png';
      });
      
      // Dibujar logo a la izquierda del encabezado
      const logoWidth = 20;
      const logoHeight = 20;
      doc.addImage(logoImg, 'PNG', 12, 3, logoWidth, logoHeight);
      logoLoaded = true;
    } catch (e) {
      console.warn('?? No se pudo cargar el logo para el PDF:', e);
    }

    // Encabezado del documento (centrado, con espacio para el logo)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSIDAD ESTATAL DEL SUR DE MANAB�", pageWidth / 2, 8, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text("Syllabus DE ASIGNATURA", pageWidth / 2, 14, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(activeSyllabus.name, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`${activeTab.title}`, pageWidth / 2, 25, { align: 'center' });

    // Construir body respetando rowSpan y colSpan
    // IMPORTANTE: Aplicar auto-llenado de ASIGNATURA, NIVEL y PERIODO como se ve en pantalla
    const body: any[][] = [];

    for (let r = 0; r < activeTab.rows.length; r++) {
      const row = activeTab.rows[r];
      const pdfRow: any[] = [];

      for (let c = 0; c < row.cells.length; c++) {
        const cell = row.cells[c];

        // Saltar celdas con rowSpan=0 o colSpan=0 (ocultas por merge)
        if (cell.rowSpan === 0 || cell.colSpan === 0) continue;

        // Obtener contenido: usar auto-llenado para las primeras filas (ASIGNATURA, NIVEL, PERIODO)
        let content = cell.content || '';
        
        if (r <= 5 && asignaturaInfo && c > 0) {
          const cellIzquierda = row.cells[c - 1];
          const etiqueta = (cellIzquierda?.content || '').toUpperCase().trim();
          
          if (etiqueta === "ASIGNATURA" && !content) {
            content = `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
          } else if ((etiqueta === "PERIODO ACAD�MICO ORDINARIO (PAO)" || etiqueta === "PAO" || etiqueta === "PERIODO") && !content) {
            const periodoNombre = periodos.find(p => p.id?.toString() === selectedPeriod)?.nombre || selectedPeriod;
            content = formatPeriodoSimple(periodoNombre) || '';
          } else if (etiqueta === "NIVEL" && !content) {
            content = asignaturaInfo.nivel?.nombre || '';
          }
        }

        if (cell.textOrientation === 'vertical' && content) {
          content = content.split('').join('\n');
        }

        pdfRow.push({
          content: content,
          rowSpan: cell.rowSpan || 1,
          colSpan: cell.colSpan || 1,
          styles: {
            fontStyle: cell.isHeader ? 'bold' : 'normal',
            fillColor: cell.backgroundColor || (cell.isHeader ? '#E5E7EB' : '#FFFFFF'),
            textColor: cell.textColor || '#1F2937',
            fontSize: cell.textOrientation === 'vertical' ? 6 : 8,
            cellPadding: 2,
            halign: cell.isHeader ? 'center' : (cell.textAlign as any || 'left'),
            valign: 'middle',
            minCellHeight: cell.textOrientation === 'vertical' ? 30 : 8,
            cellWidth: cell.textOrientation === 'vertical' ? 10 : 'auto',
            overflow: 'linebreak',
          }
        });
      }

      if (pdfRow.length > 0) {
        body.push(pdfRow);
      }
    }

    autoTable(doc, {
      body: body as any,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: '#9CA3AF',
        lineWidth: 0.3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: '#E5E7EB',
        textColor: '#1F2937',
        fontStyle: 'bold',
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
    });

    // ==============================
    // SECCI�N DE FIRMAS (4 columnas)
    // ==============================
    // Buscar nombres de las autoridades en TODAS las pesta�as del Syllabus
    const cargos: { cargo: string; nombre: string; patrones: string[] }[] = [
      { cargo: "DECANO/A DE FACULTAD", nombre: "", patrones: ["DECANO/A DE FACULTAD", "DECANO DE FACULTAD", "DECANA DE FACULTAD", "DECANO/A"] },
      { cargo: "DIRECTOR/A ACAD�MICO/A", nombre: "", patrones: ["DIRECTOR/A ACADEMICO", "DIRECTOR/A ACAD�MICO", "DIRECTOR ACADEMICO", "DIRECTORA ACADEMICA"] },
      { cargo: "COORDINADOR/A DE CARRERA", nombre: "", patrones: ["COORDINADOR/A DE CARRERA", "COORDINADOR DE CARRERA", "COORDINADORA DE CARRERA"] },
      { cargo: "DOCENTE", nombre: "", patrones: ["DOCENTE"] },
    ];

    // Recorrer todas las pesta�as buscando los nombres asociados a cada cargo
    // Priorizar pesta�a VISADO si existe
    const tabsOrdenadas = [...activeSyllabus.tabs].sort((a, b) => {
      const aVisado = a.title.toUpperCase().includes("VISADO") ? 0 : 1;
      const bVisado = b.title.toUpperCase().includes("VISADO") ? 0 : 1;
      return aVisado - bVisado;
    });

    for (const tab of tabsOrdenadas) {
      for (let r = 0; r < tab.rows.length; r++) {
        const row = tab.rows[r];
        for (let c = 0; c < row.cells.length; c++) {
          const cell = row.cells[c];
          const textoRaw = (cell.content || '').trim();
          if (!textoRaw || textoRaw.length < 4) continue;
          const textoNorm = textoRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          // Verificar si esta celda contiene un cargo
          for (const cargoObj of cargos) {
            if (cargoObj.nombre) continue; // Ya encontramos un nombre para este cargo
            
            const matched = cargoObj.patrones.some(p => {
              const pNorm = p.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return textoNorm.includes(pNorm);
            });
            
            if (!matched) continue;

            // Buscar el nombre de la persona asociada
            // Caso especial: si la celda contiene "CARGO\nNombre" (cargo y nombre en la misma celda)
            const lineas = textoRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lineas.length >= 2) {
              // La primera l�nea es el cargo, la segunda puede ser el nombre
              const posibleNombre = lineas.find(l => {
                const lu = l.toUpperCase();
                return !lu.includes("DECANO") && !lu.includes("DIRECTOR") && 
                       !lu.includes("COORDINADOR") && !lu.includes("DOCENTE") &&
                       !lu.includes("FACULTAD") && !lu.includes("CARRERA") &&
                       !lu.includes("ACAD�MICO") && !lu.includes("ACADEMICO") &&
                       l.length > 5;
              });
              if (posibleNombre) {
                cargoObj.nombre = posibleNombre;
                continue;
              }
            }
            
            // Opci�n 1: celda siguiente en la misma fila
            if (c + 1 < row.cells.length) {
              const nextCell = row.cells[c + 1];
              const nextContent = (nextCell.content || '').trim();
              if (nextContent && nextContent.length > 3) {
                const nu = nextContent.toUpperCase();
                if (!nu.includes("DECANO") && !nu.includes("DIRECTOR") &&
                    !nu.includes("COORDINADOR") && !nu.includes("ACAD�MICO") &&
                    !nu.includes("CARRERA") && !nu.includes("FACULTAD")) {
                  cargoObj.nombre = nextContent;
                  continue;
                }
              }
            }
            
            // Opci�n 2: fila siguiente, misma columna
            if (r + 1 < tab.rows.length) {
              const nextRow = tab.rows[r + 1];
              if (c < nextRow.cells.length) {
                const belowCell = nextRow.cells[c];
                const belowContent = (belowCell.content || '').trim();
                if (belowContent && belowContent.length > 3) {
                  const bu = belowContent.toUpperCase();
                  if (!bu.includes("DECANO") && !bu.includes("DIRECTOR") &&
                      !bu.includes("COORDINADOR") && !bu.includes("ACAD�MICO") &&
                      !bu.includes("CARRERA") && !bu.includes("FACULTAD")) {
                    cargoObj.nombre = belowContent;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Calcular posici�n Y despu�s de la tabla (compatible con jspdf-autotable v3/v5)
    const finalY = (doc as any).lastAutoTable?.finalY 
      || (doc as any).previousAutoTable?.finalY 
      || 25;
    let firmaY = finalY + 20;

    // Si no cabe en la p�gina actual, agregar nueva p�gina
    if (firmaY + 45 > pageHeight) {
      doc.addPage();
      firmaY = 30;
    }

    // Dibujar secci�n de firmas
    const marginLeft = 15;
    const marginRight = 15;
    const usableWidth = pageWidth - marginLeft - marginRight;
    const colWidth = usableWidth / 4;
    const lineLength = colWidth - 15;

    // T�tulo de secci�n
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMAS DE RESPONSABILIDAD", pageWidth / 2, firmaY, { align: 'center' });
    firmaY += 15;

    for (let i = 0; i < cargos.length; i++) {
      const x = marginLeft + (colWidth * i) + (colWidth / 2);
      
      // L�nea de firma
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(x - lineLength / 2, firmaY, x + lineLength / 2, firmaY);

      // Nombre de la persona (debajo de la l�nea)
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const nombre = cargos[i].nombre || "________________________";
      doc.text(nombre, x, firmaY + 5, { align: 'center', maxWidth: lineLength });

      // Cargo (debajo del nombre)
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(cargos[i].cargo, x, firmaY + 12, { align: 'center', maxWidth: lineLength });
    }

    doc.save(`${activeSyllabus.name}_${activeTab.title}.pdf`);
  }

  // ==============================
  // LIMPIAR: Borrar celdas editables (dejar solo etiquetas/headers y datos de BD)
  // ==============================
  const handleClearSync = () => {
    if (!activeSyllabus || !activeTab) return;
    if (!globalThis.confirm("�Est� seguro de limpiar todas las celdas editables? Se borrar�n los datos sincronizados del Word pero se mantendr�n las etiquetas del editor.")) return;

    // Etiquetas que NO se deben borrar (son estructura del editor, no datos sincronizados)
    const etiquetasProtegidas = new Set([
      "Syllabus DE ASIGNATURA", "PROGRAMA ANALITICO DE ASIGNATURA",
      "ASIGNATURA", "NIVEL", "PERIODO ACAD�MICO ORDINARIO (PAO)", "PERIODO",
      "CARACTERIZACI�N", "CARACTERIZACION", "OBJETIVOS DE LA ASIGNATURA",
      "COMPETENCIAS", "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA",
      "CONTENIDOS DE LA ASIGNATURA", "UNIDADES TEM�TICAS", "UNIDADES TEMATICAS", 
      "DESCRIPCI�N", "DESCRIPCION",
      "METODOLOG�A", "METODOLOGIA", "PROCEDIMIENTOS DE EVALUACI�N", "PROCEDIMIENTOS DE EVALUACION",
      "BIBLIOGRAF�A - FUENTES DE CONSULTA", "BIBLIOGRAFIA - FUENTES DE CONSULTA",
      "BIBLIOGRAF�A B�SICA", "BIBLIOGRAFIA BASICA",
      "BIBLIOGRAF�A COMPLEMENTARIA", "BIBLIOGRAFIA COMPLEMENTARIA",
      "DECANO/A DE FACULTAD", "DIRECTOR/A ACAD�MICO/A", "DIRECTOR/A ACADEMICO/A",
      "COORDINADOR/A DE CARRERA", "DOCENTE",
    ]);

    const updatedTabs = activeSyllabus.tabs.map(tab => {
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

    setSyllabi(prev => prev.map(p =>
      p.id === activeSyllabusId ? { ...p, tabs: updatedTabs } : p
    ));

    alert("? Celdas limpiadas correctamente. Las etiquetas del editor se mantienen.");
  }

  // --- FUNCIONES ADICIONALES ---
  const handleDuplicateProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    const ProgramaAnaliticoToClone = savedSyllabi.find(s => s.id === ProgramaAnaliticoId);
    if (!ProgramaAnaliticoToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(ProgramaAnaliticoToClone.datos_syllabus));
      clonedData.id = `ProgramaAnalitico-${Date.now()}`;
      clonedData.name = `${ProgramaAnaliticoToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      // Guardar automáticamente en el backend
      const payload = {
        nombre: clonedData.name,
        periodo: ProgramaAnaliticoToClone.periodo,
        materias: ProgramaAnaliticoToClone.materias,
        datos_syllabus: clonedData
      };
      
      const result = await apiRequest('/api/syllabus', { method: 'POST', body: JSON.stringify(payload) });
      
      // Recargar la lista de syllabi
      const programasData = await apiRequest("/api/syllabus").catch(() => ({ data: [] }));
      const syllabiArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedSyllabi(syllabiArray);
      
      alert("ProgramaAnalitico duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeleteProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    if (!window.confirm("�Est� seguro de eliminar este ProgramaAnalitico? Esta acci�n no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/syllabus/${ProgramaAnaliticoId}`, { method: 'DELETE' });
      
      // Recargar la lista de syllabi
      const programasData = await apiRequest("/api/syllabus").catch(() => ({ data: [] }));
      const syllabiArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedSyllabi(syllabiArray);
      
      alert("ProgramaAnalitico eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProgramaAnalitico = (ProgramaAnaliticoId: number) => {
    console.log("Editando ProgramaAnalitico ID:", ProgramaAnaliticoId);
    handleLoadSyllabus(ProgramaAnaliticoId.toString());
    setShowSyllabusSelector(false);
  };

  const handleNewProgramaAnalitico = () => {
    setShowSyllabusSelector(true);
  };

  const programasFiltered = selectedPeriod 
    ? savedSyllabi.filter(s => s.periodo === selectedPeriod)
    : savedSyllabi;
  // --- L�GICA DE INTELIGENCIA Y ESCALABILIDAD ---

  // 1. Limpia el nombre del periodo (Ej: "Primer Periodo PII 2026" -> "PII 2026")
  const formatPeriodoSimple = (nombre: string) => {
    if (!nombre) return "";
    const match = nombre.match(/(P[IVX]+\s\d{4})/i);
    return match ? match[0].toUpperCase() : nombre;
  };

  // 2. Determina qu� texto debe ir en la celda (Llenado Horizontal)
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    // Si no hay materia seleccionada o pasamos la fila 5, NO HACER NADA (Protege Unidades Tem�ticas)
    if (!asignaturaInfo || rowIndex > 5) return cell.content || "";

    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const cellIzquierda = currentRow.cells[cellIndex - 1];
      const etiqueta = cellIzquierda?.content?.toUpperCase().trim() || "";

      // Si la celda de la IZQUIERDA es el t�tulo, esta celda es el VALOR
      if (etiqueta === "ASIGNATURA") {
        return `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
      }
      if (etiqueta === "PERIODO ACAD�MICO ORDINARIO (PAO)" || etiqueta === "PAO") {
        return formatPeriodoSimple(selectedPeriod) || cell.content || "";
      }
      if (etiqueta === "NIVEL") {
        return asignaturaInfo.nivel?.nombre || "";
      }
    }
    return cell.content || "";
  };

  // 3. Bloquea la edici�n de las celdas autom�ticas
  const isCellReadOnly = (cell: TableCell, rowIndex: number, cellIndex: number): boolean => {
    if (rowIndex > 5) return false;
    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const etiqueta = currentRow.cells[cellIndex - 1]?.content?.toUpperCase().trim() || "";
      return ["ASIGNATURA", "NIVEL", "PAO", "PERIODO ACAD�MICO ORDINARIO (PAO)"].includes(etiqueta);
    }
    return false;
  };
  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeSyllabus ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Syllabus - Comisión Académica</span>
                    <div className="flex gap-2">
                      <Button onClick={handleNewProgramaAnalitico} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activeSyllabus} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" /> Guardar
                      </Button>
                      <Button onClick={handlePrintToPdf} disabled={!activeSyllabus} variant="outline">
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
              {showSyllabusSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar ProgramaAnalitico</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowSyllabusSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleSyllabusUpload(e); setShowSyllabusSelector(false); }} className="hidden" />
                      
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
                                <Button onClick={() => { handleLoadSyllabus(s.id.toString()); setShowSyllabusSelector(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                                  Seleccionar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay Syllabus disponibles para este periodo</p>
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
                      <p className="text-gray-500">No hay Syllabus creados aún</p>
                      <Button onClick={handleNewProgramaAnalitico} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer Syllabus
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
                    <span className="truncate">{activeSyllabus.name}</span>
                    <div className="flex-shrink-0 flex items-center gap-2">
                       <Button onClick={() => { setActiveSyllabusId(null); setSyllabi([]); }} variant="outline" size="sm"> <Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</Button>
                       <Button onClick={handleClearSync} variant="outline" size="sm" disabled={!activeTab} className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"><Eraser className="h-4 w-4 mr-2" /> Limpiar</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Periodo Acad�mico</Label>
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

                  {/* Bloque de Sincronizaci�n Inteligente */}
                  {activeSyllabus && selectedPeriod && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div>
                        <h4 className="text-amber-800 font-bold flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Sincronizaci�n Inteligente
                        </h4>
                        <p className="text-amber-700 text-sm">
                          Sube el mismo Word del Syllabus lleno y se autocompletar�n las celdas vac�as usando las etiquetas que defini� el administrador.
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
                      {wordRawTables.length > 0 && (
                        <Button
                          onClick={() => setShowWordPreview(!showWordPreview)}
                          variant="outline"
                          className="text-blue-700 border-blue-300 ml-2"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {showWordPreview ? "Ocultar Tablas" : `Ver Tablas (${wordRawTables.length})`}
                        </Button>
                      )}
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
                  {activeSyllabus.tabs.map(tab => (
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
                  <Button onClick={addTab} variant="outline" size="sm" className="h-10 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4 mr-1" /> Nueva Secci�n</Button>
                </div>
                <p className="text-xs text-gray-400 mt-1 italic pl-1">* Doble clic en una pesta�a para renombrarla.</p>
              </div>

              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4 p-2 border rounded-md bg-emerald-50/50">
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ?</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ?</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col ?</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col ?</Button>
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
            <p className="text-lg font-medium text-gray-600">La tabla est� vac�a</p>
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
            
            // Verificamos si esta celda espec�fica es autom�tica/bloqueada
            const isReadOnly = isCellReadOnly(cell, rowIndex, cellIndex);
            // Obtenemos el contenido (ya sea del word o auto-llenado)
            const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex);

            // --- L�GICA DE ANCHOS ---
            let widthStyle = 'auto';
            let minWidthStyle = isVertical ? '40px' : (cell.content.length > 5 || isHeader ? '120px' : '40px');
            if (isFormRow) {
              if (cellIndex === 0) widthStyle = '20%';
              else if (cellIndex === 1) widthStyle = '1%';
            }

            // --- ALINEACI�N ---
            let justifyContent = (isHeader || isSeparator || isVertical) ? 'justify-center' : 'justify-start';

            return (
              <td
                key={cell.id}
                className={`
                  border border-gray-200 relative transition-all duration-75
                  ${isHeader ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"}
                  ${isSelected ? "ring-2 ring-inset ring-emerald-500 z-10" : ""}
                  ${isReadOnly ? "bg-gray-100/50 cursor-not-allowed" : "cursor-pointer"}
                `}
                style={{
                  backgroundColor: cell.backgroundColor || (isHeader ? '#f9fafb' : '#ffffff'),
                  color: cell.textColor,
                  width: widthStyle,
                  minWidth: minWidthStyle,
                  padding: 0,
                  height: '1px'
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
                    minHeight: isVertical ? '120px' : 'auto',
                    textAlign: isHeader ? 'center' : 'left'
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

              {/* ============ PANEL PREVIEW TABLAS DEL WORD ============ */}
              {showWordPreview && wordRawTables.length > 0 && (
                <Card className="mt-6 border-t-4 border-t-blue-600">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-blue-800">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        📋 Tablas extraídas del Word ({wordRawTables.length} tablas)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowWordPreview(false)}
                          className="text-gray-500"
                        >
                          <X className="h-4 w-4 mr-1" /> Cerrar
                        </Button>
                      </div>
                    </CardTitle>
                    <p className="text-sm text-blue-600">
                      Seleccione una tabla y haga clic en &quot;Importar a Editor&quot; para llenar las columnas automáticamente.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Selector de tabla */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {wordRawTables.map((table, tIdx) => (
                        <Button
                          key={tIdx}
                          size="sm"
                          variant={selectedWordTable === tIdx ? "default" : "outline"}
                          className={selectedWordTable === tIdx ? "bg-blue-600" : ""}
                          onClick={() => {
                            setSelectedWordTable(tIdx);
                            setColumnMapping({});
                          }}
                        >
                          Tabla {tIdx + 1} ({table.length} filas, {table[0]?.length || 0} cols)
                        </Button>
                      ))}
                    </div>

                    {/* Vista de la tabla seleccionada */}
                    {selectedWordTable !== null && wordRawTables[selectedWordTable] && (
                      <div>
                        {/* Botones de acción */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => importarTablaAutoDetect(selectedWordTable)}
                          >
                            🔄 Importar Automático (detectar columnas)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-300"
                            onClick={() => {
                              // Importar tabla directo: columna por columna (1:1)
                              if (!activeTab) return;
                              const wordTable = wordRawTables[selectedWordTable];
                              const maxCols = Math.min(wordTable[0]?.length || 0, activeTab.rows[0]?.cells.length || 0);
                              const directMap: Record<number, number> = {};
                              for (let c = 0; c < maxCols; c++) {
                                directMap[c] = c;
                              }
                              importarTablaWord(selectedWordTable, 0, directMap);
                            }}
                          >
                            📥 Importar Directo (col 1→1)
                          </Button>
                        </div>

                        {/* Mapeo manual de columnas */}
                        {activeTab && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">🎯 Mapeo Manual de Columnas</h4>
                            <p className="text-xs text-blue-600 mb-2">
                              Para cada columna del Word, elija a qué columna del editor va:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {(wordRawTables[selectedWordTable][0] || []).map((headerText, wColIdx) => (
                                <div key={wColIdx} className="flex items-center gap-1 text-xs">
                                  <span className="font-medium text-blue-900 truncate max-w-[100px]" title={headerText}>
                                    W{wColIdx}: {headerText.substring(0, 15) || "(vacío)"}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <select
                                    className="border rounded px-1 py-0.5 text-xs flex-1 max-w-[120px]"
                                    value={columnMapping[wColIdx] ?? "__NONE__"}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setColumnMapping(prev => {
                                        const next = { ...prev };
                                        if (val === "__NONE__") {
                                          delete next[wColIdx];
                                        } else {
                                          next[wColIdx] = parseInt(val);
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <option value="__NONE__">— No mapear —</option>
                                    {activeTab.rows[0]?.cells.map((cell, eColIdx) => (
                                      <option key={eColIdx} value={eColIdx}>
                                        E{eColIdx}: {(cell.content || '').substring(0, 20) || "(vacío)"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                            {Object.keys(columnMapping).length > 0 && (
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                  onClick={() => {
                                    importarTablaWord(selectedWordTable, 1, columnMapping);
                                  }}
                                >
                                  ✅ Importar con este mapeo (sin fila header)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => setColumnMapping({})}
                                >
                                  Limpiar mapeo
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Preview de la tabla */}
                        <div className="overflow-x-auto border rounded-lg max-h-[400px] overflow-y-auto">
                          <table className="w-full border-collapse text-xs">
                            <tbody>
                              {wordRawTables[selectedWordTable].map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx === 0 ? "bg-blue-100 font-bold" : rIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                  <td className="border px-1 py-0.5 text-gray-400 text-center w-8 bg-gray-100">
                                    {rIdx}
                                  </td>
                                  {row.map((cellText, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className={`border px-2 py-1 max-w-[200px] truncate ${
                                        columnMapping[cIdx] !== undefined ? 'bg-green-100 ring-1 ring-green-400' : ''
                                      }`}
                                      title={cellText}
                                    >
                                      {cellText.substring(0, 80) || <span className="text-gray-300">—</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Fila 0 = headers. Columnas resaltadas en verde = mapeadas al editor.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Botón para abrir preview si hay datos */}
              {!showWordPreview && wordRawTables.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                    onClick={() => setShowWordPreview(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    📋 Ver Tablas del Word ({wordRawTables.length} tablas)
                  </Button>
                </div>
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
                  placeholder="Escriba el contenido aqu�..."
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

      {/* Modal de Mapeo Manual */}
      {showMappingModal && mappingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Merge className="h-6 w-6" />
                    Mapeo Manual de Datos
                  </h2>
                  <p className="text-blue-100 mt-1 text-sm">
                    Selecciona manualmente qué dato del Word corresponde a cada etiqueta
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMappingModal(false);
                    setManualMappings({});
                  }}
                  className="text-white hover:bg-blue-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📋 Instrucciones:</strong> Para cada etiqueta que no tuvo match automático, 
                  selecciona de la lista desplegable el dato correspondiente del Word que subiste.
                </p>
              </div>

              <div className="space-y-4">
                {mappingData.etiquetasSinMatch.map((etq, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Etiqueta del Editor */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Etiqueta del Editor:
                        </Label>
                        <div className="p-3 bg-gray-50 rounded border border-gray-300 font-mono text-sm">
                          {etq.texto}
                        </div>
                        
                        {/* Sugerencias */}
                        {mappingData.sugerencias[etq.texto] && mappingData.sugerencias[etq.texto].length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">💡 Sugerencias (por similitud):</p>
                            <div className="space-y-1">
                              {mappingData.sugerencias[etq.texto].slice(0, 3).map((sug, sidx) => (
                                <button
                                  key={sidx}
                                  onClick={() => setManualMappings(prev => ({ ...prev, [etq.texto]: sug.clave }))}
                                  className="w-full text-left px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                >
                                  {sug.clave} <span className="text-blue-600">({(sug.similitud * 100).toFixed(0)}%)</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selector de Dato del Word */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Dato del Word:
                        </Label>
                        <Select
                          value={manualMappings[etq.texto] || "__UNMAPPED__"}
                          onValueChange={(value) => {
                            if (value === "__UNMAPPED__") {
                              // Remover el mapeo
                              setManualMappings(prev => {
                                const newMappings = { ...prev };
                                delete newMappings[etq.texto];
                                return newMappings;
                              });
                            } else {
                              setManualMappings(prev => ({ ...prev, [etq.texto]: value }));
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar dato..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="__UNMAPPED__">-- Sin mapear --</SelectItem>
                            {Object.keys(mappingData.wordData).map((clave) => (
                              <SelectItem key={clave} value={clave}>
                                <div className="flex flex-col">
                                  <span className="font-semibold">{clave}</span>
                                  <span className="text-xs text-gray-500 truncate max-w-xs">
                                    {String(mappingData.wordData[clave]).substring(0, 60)}...
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Preview del dato seleccionado */}
                        {manualMappings[etq.texto] && 
                         manualMappings[etq.texto] !== "__UNMAPPED__" && 
                         mappingData.wordData[manualMappings[etq.texto]] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                            <p className="text-green-700 font-semibold mb-1">Vista previa:</p>
                            <p className="text-gray-700 line-clamp-3">
                              {String(mappingData.wordData[manualMappings[etq.texto]])}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <strong>{Object.keys(manualMappings).filter(k => manualMappings[k] && manualMappings[k] !== "__UNMAPPED__").length}</strong> de{" "}
                <strong>{mappingData.etiquetasSinMatch.length}</strong> etiquetas mapeadas
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMappingModal(false);
                    setManualMappings({});
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={aplicarMapeoManual}
                  disabled={Object.keys(manualMappings).filter(k => manualMappings[k] && manualMappings[k] !== "__UNMAPPED__").length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Mapeo ({Object.keys(manualMappings).filter(k => manualMappings[k] && manualMappings[k] !== "__UNMAPPED__").length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </ProtectedRoute>
  )
}