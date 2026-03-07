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
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Eraser, FileDown, BookOpen, GraduationCap, Calendar, Columns, Rows3, Type, Sparkles, ChevronRight, Eye, PenLine } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import JSZip from "jszip" 
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
interface SavedSyllabusRecord { id: number; nombre: string; periodo: string; materias: string; datos_syllabus: SyllabusData; datos_tabla?: any; created_at: string; updated_at: string; }

interface ExtractedCell {
  text: string;
  rowSpan: number;
  colSpan: number;
  isHidden: boolean;
  vMerge: string;
}

// 🚀 EXTRACTOR NATIVO DE TABLAS (SE MANTIENE INTACTO, FUNCIONA PERFECTO)
const extraerTablasNativasWord = async (file: File): Promise<ExtractedCell[][][]> => {
  try {
    const zip = new JSZip();
    await zip.loadAsync(file);
    const xmlString = await zip.file("word/document.xml")?.async("string");
    if (!xmlString) return [];

    const cleanXmlString = xmlString.replace(/<w:/g, '<').replace(/<\/w:/g, '</');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanXmlString, "text/xml");
    
    const allTables = Array.from(xmlDoc.getElementsByTagName("tbl"));
    const topLevelTables = allTables.filter(t => {
      let parent = t.parentNode;
      while(parent) {
        if (parent.nodeName === "tbl") return false;
        parent = parent.parentNode;
      }
      return true;
    });

    const rawTables: ExtractedCell[][][] = [];

    topLevelTables.forEach(tbl => {
        const rows = Array.from(tbl.childNodes).filter(n => n.nodeName === "tr");
        if (rows.length === 0) return;

        let maxCols = 0;
        const tblGrid = Array.from(tbl.childNodes).find(n => n.nodeName === "tblGrid");
        if (tblGrid) {
            maxCols = Array.from(tblGrid.childNodes).filter(n => n.nodeName === "gridCol").length;
        } else {
            rows.forEach(tr => {
                let cols = 0;
                Array.from(tr.childNodes).filter(n => n.nodeName === "tc").forEach(tc => {
                    const gs = (tc as Element).getElementsByTagName("gridSpan")[0];
                    const val = gs ? (gs.getAttribute("w:val") || gs.getAttribute("val")) : null;
                    cols += val ? parseInt(val, 10) : 1;
                });
                if (cols > maxCols) maxCols = cols;
            });
        }

        if (maxCols === 0) return;

        const grid: ExtractedCell[][] = Array.from({ length: rows.length }, () => new Array(maxCols).fill(null));

        rows.forEach((tr, rIdx) => {
            const tcs = Array.from(tr.childNodes).filter(n => n.nodeName === "tc") as Element[];
            let cIdx = 0;

            tcs.forEach(tc => {
                while (cIdx < maxCols && grid[rIdx][cIdx] !== null) cIdx++;
                if (cIdx >= maxCols) return;

                // Extract text preserving paragraph breaks (each <p> = one line)
                const paragraphs = Array.from(tc.childNodes).filter(n => n.nodeName === "p");
                let text: string;
                if (paragraphs.length > 0) {
                  const paraTexts = paragraphs.map(p => {
                    const runs = Array.from(p.childNodes).filter(n => n.nodeName === "r");
                    return runs.map(r => {
                      const tNodes = Array.from(r.childNodes).filter(n => n.nodeName === "t");
                      return tNodes.map(t => t.textContent || "").join("");
                    }).join("").replace(/\s+/g, " ").trim();
                  });
                  // Join paragraphs with newline, collapse consecutive empty paragraphs
                  text = paraTexts.filter((p, i) => p !== "" || (i > 0 && paraTexts[i - 1] !== "")).join("\n").trim();
                } else {
                  // Fallback: grab all <t> if no <p> found
                  const texts = Array.from(tc.getElementsByTagName("t")).map(t => t.textContent || "");
                  text = texts.join(" ").replace(/\s+/g, " ").trim();
                }

                const gsNode = tc.getElementsByTagName("gridSpan")[0];
                const gsVal = gsNode ? (gsNode.getAttribute("w:val") || gsNode.getAttribute("val")) : null;
                const gs = gsVal ? parseInt(gsVal, 10) : 1;

                const vmNode = tc.getElementsByTagName("vMerge")[0];
                let vm = 'none';
                if (vmNode) {
                    vm = vmNode.getAttribute("w:val") || vmNode.getAttribute("val") || 'continue';
                }

                for (let i = 0; i < gs; i++) {
                    if (cIdx + i < maxCols) {
                        grid[rIdx][cIdx + i] = { 
                            text: i === 0 ? text : "", 
                            rowSpan: 1, colSpan: gs, isHidden: i > 0, vMerge: vm 
                        };
                    }
                }
                cIdx += gs;
            });
        });

        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < maxCols; c++) {
                if (grid[r][c] === null) {
                    grid[r][c] = { text: "", rowSpan: 1, colSpan: 1, isHidden: false, vMerge: 'none' };
                }
            }
        }

        for (let c = 0; c < maxCols; c++) {
            let masterRow = -1;
            for (let r = 0; r < grid.length; r++) {
                const cell = grid[r][c];
                
                if (cell.vMerge === 'restart' || (cell.vMerge === 'none' && !cell.isHidden)) {
                    masterRow = r;
                } else if (cell.vMerge === 'continue') {
                    if (masterRow !== -1 && grid[masterRow][c]) {
                        grid[masterRow][c].rowSpan++;
                        cell.isHidden = true;
                        cell.rowSpan = 0;
                        cell.colSpan = 0;
                    } else {
                        cell.vMerge = 'none';
                        masterRow = r;
                    }
                } else {
                    masterRow = r; 
                }
            }
        }

        rawTables.push(grid);
    });

    return rawTables;
  } catch (error) {
      console.error("❌ Error extrayendo el Word con JSZip:", error);
      return [];
  }
};

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
  
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [mappingData, setMappingData] = useState<{ etiquetasSinMatch: any[], wordData: Record<string, string>, sugerencias: any } | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({}) 
  
  const [showWordPreview, setShowWordPreview] = useState(false)
  const [wordRawTables, setWordRawTables] = useState<ExtractedCell[][][]>([])
  const [selectedWordTable, setSelectedWordTable] = useState<number | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, number>>({}) 
  
  const asignaturaIdParam = searchParams.get("asignatura")
  const periodoParam = searchParams.get("periodo")
  const syllabusIdParam = searchParams.get("id")
  const sourceParam = searchParams.get("source")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefSync = useRef<HTMLInputElement>(null)

  const activeSyllabus = syllabi.find((s) => s.id === activeSyllabusId);
  const activeTab = activeSyllabus?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];
  const [asignaturaInfo, setAsignaturaInfo] = useState<any>(null)

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programasData, comisionData, periodosData] = await Promise.all([
          apiRequest("/api/syllabi").catch(() => ({ data: [] })),
          apiRequest("/api/comision-academica/syllabus").catch(() => ({ data: [] })),
          apiRequest("/api/periodo").catch(() => ({ data: [] }))
        ]);
        
        const generales = Array.isArray(programasData?.data) ? programasData.data.map((s: any) => ({ ...s, _source: 'general' })) : [];
        const comision = Array.isArray(comisionData?.data) ? comisionData.data.map((s: any) => ({ ...s, _source: 'comision' })) : [];
        // Mergeamos ambas listas, comisión primero para dar prioridad
        setSavedSyllabi([...comision, ...generales]);
        
        const periodosArr = Array.isArray(periodosData?.data) ? periodosData.data : [];
        setPeriodos(periodosArr);
        // Pre-seleccionar periodo desde URL o el actual
        if (periodoParam) {
          setSelectedPeriod(periodoParam);
        } else if (!selectedPeriod && periodosArr.length > 0) {
          const actual = periodosArr.find((p: any) => p.estado === 'actual');
          if (actual) setSelectedPeriod(actual.id.toString());
        }
      } catch (error) { 
        console.error("Error al cargar datos:", error); 
      } finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    if (activeSyllabus && activeSyllabus.tabs.length > 0) {
      if (!activeSyllabus.tabs.find(t => t.id === activeTabId)) setActiveTabId(activeSyllabus.tabs[0].id);
    } else {
      setActiveTabId(null);
    }
  }, [activeSyllabus, activeTabId]);

  useEffect(() => {
    // Si venimos de "Ver Syllabus" con id, no auto-cargar de savedSyllabi
    if (syllabusIdParam) return;
    if (!selectedPeriod) return;
    
    // Buscar el nombre del periodo para match flexible (registros viejos guardan nombre, nuevos guardan ID)
    const periodoObj = periodos.find((p: any) => p.id.toString() === selectedPeriod);
    const periodoNombre = periodoObj?.nombre || '';
    
    // Filtrar por periodo (ID o nombre) y opcionalmente por asignatura
    const nombreAsignatura = asignaturaInfo?.nombre || '';
    let syllabiDelPeriodo = savedSyllabi.filter((s: any) => {
      const sPeriodo = String(s.periodo || '').trim();
      const matchPeriodo = sPeriodo === selectedPeriod || sPeriodo === periodoNombre;
      if (!matchPeriodo) return false;
      // Si tenemos asignatura, filtrar por asignatura_id O por nombre de materia
      if (asignaturaIdParam) {
        if (s.asignatura_id && String(s.asignatura_id) === String(asignaturaIdParam)) return true;
        // El admin puede haber subido sin asignatura_id, buscar por nombre de materia
        if (nombreAsignatura && s.materias) {
          const materiasLower = s.materias.toLowerCase();
          const nombreLower = nombreAsignatura.toLowerCase();
          if (materiasLower.includes(nombreLower) || nombreLower.includes(materiasLower)) return true;
        }
        // El admin subió sin asignatura_id ni materia → aceptar si coincide periodo
        if (!s.asignatura_id) return true;
        return false;
      }
      return true;
    });
    
    // Fallback: buscar cualquier syllabus del periodo (admin subió sin materia ni asignatura)
    if (syllabiDelPeriodo.length === 0 && asignaturaIdParam) {
      syllabiDelPeriodo = savedSyllabi.filter((s: any) => {
        const sPeriodo = String(s.periodo || '').trim();
        return sPeriodo === selectedPeriod || sPeriodo === periodoNombre;
      });
    }
    
    // Último fallback: si solo hay un syllabus en toda la lista, usarlo (generic del admin)
    if (syllabiDelPeriodo.length === 0 && savedSyllabi.length > 0 && asignaturaIdParam) {
      console.log('🔄 Fallback final: usando primer syllabus disponible de savedSyllabi');
      syllabiDelPeriodo = [savedSyllabi[0]];
    }
    
    if (syllabiDelPeriodo.length > 0) {
      const primerSyllabus = syllabiDelPeriodo[0];
      if (activeSyllabusId !== primerSyllabus.id) handleLoadSyllabus(String(primerSyllabus.id));
    } else if (asignaturaIdParam && selectedPeriod) {
      // No encontrado en savedSyllabi, intentar buscar directamente en el backend
      const buscarEnBackend = async () => {
        let syllabusData: any = null;
        let source = 'comision';
        
        // 1) Intentar en tabla comisión por asignatura_id
        try {
          const res = await apiRequest(`/api/comision-academica/syllabus/buscar?asignatura_id=${asignaturaIdParam}&periodo=${selectedPeriod}`);
          if (res?.data) syllabusData = res.data;
        } catch(e) { /* no existe en comisión */ }
        
        // 2) Si no hay en comisión, buscar en tabla general (admin)
        // El admin puede haber subido sin asignatura_id, así que pasamos también el nombre de materia
        if (!syllabusData) {
          const materiaName = nombreAsignatura ? encodeURIComponent(nombreAsignatura) : '';
          const periodoObj2 = periodos.find((p: any) => p.id.toString() === selectedPeriod);
          
          // Intentar con periodo ID
          try {
            const verRes = await apiRequest(`/api/syllabi/verificar-existencia?asignatura_id=${asignaturaIdParam}&periodo=${selectedPeriod}${materiaName ? `&materia=${materiaName}` : ''}`);
            if (verRes?.existe && verRes?.syllabus?.id) {
              const fullRes = await apiRequest(`/api/syllabi/${verRes.syllabus.id}`);
              if (fullRes?.data) { syllabusData = fullRes.data; source = 'general'; }
            }
          } catch(e) { /* no encontrado */ }
          
          // Intentar con nombre del periodo
          if (!syllabusData && periodoObj2?.nombre) {
            try {
              const verRes = await apiRequest(`/api/syllabi/verificar-existencia?asignatura_id=${asignaturaIdParam}&periodo=${encodeURIComponent(periodoObj2.nombre)}${materiaName ? `&materia=${materiaName}` : ''}`);
              if (verRes?.existe && verRes?.syllabus?.id) {
                const fullRes = await apiRequest(`/api/syllabi/${verRes.syllabus.id}`);
                if (fullRes?.data) { syllabusData = fullRes.data; source = 'general'; }
              }
            } catch(e) { /* no encontrado */ }
          }
        }
        
        if (!syllabusData) return;
        console.log(`✅ Syllabus encontrado en tabla ${source}:`, syllabusData.id);
        
        let editorData = syllabusData.datos_syllabus || syllabusData.datos_tabla;
        if (typeof editorData === 'string') try { editorData = JSON.parse(editorData); } catch(e) { return; }
        if (!editorData) return;
        
        editorData.id = syllabusData.id;
        if (!editorData.name) editorData.name = syllabusData.nombre;
        if (editorData.tabs) {
          editorData.tabs = editorData.tabs.map((t: any) => ({
            ...t, rows: (t.rows || []).map((r: any) => ({
              ...r, cells: (r.cells || []).map((c: any) => ({
                ...c, backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
                textColor: c.styles?.textColor || c.textColor,
                textAlign: c.styles?.textAlign || c.textAlign,
                textOrientation: c.styles?.textOrientation || c.textOrientation,
                isEditable: true
              }))
            }))
          }));
        } else if (editorData.rows) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: editorData.rows }];
        }
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
        setSavedSyllabi(prev => {
          const exists = prev.find((s: any) => s.id === syllabusData.id);
          return exists ? prev : [{ ...syllabusData, _source: source }, ...prev];
        });
      };
      buscarEnBackend();
    }
  }, [selectedPeriod, savedSyllabi.length, periodos.length, asignaturaInfo]);

  // 🔄 Cargar syllabus específico cuando se viene de "Ver Syllabus" con ?id=X
  useEffect(() => {
    if (!syllabusIdParam) return;
    const cargarSyllabusDirecto = async () => {
      try {
        let syllabusData: any = null;
        
        if (sourceParam === 'general') {
          // Fuente es la tabla general (admin), intentar primero ahí
          try {
            const res = await apiRequest(`/api/syllabi/${syllabusIdParam}`);
            if (res?.data) syllabusData = res.data;
          } catch(e) {
            try {
              const res = await apiRequest(`/api/comision-academica/syllabus/${syllabusIdParam}`);
              if (res?.data) syllabusData = res.data;
            } catch(e2) { /* no encontrado */ }
          }
        } else {
          // Fuente es comisión (default), intentar primero ahí
          try {
            const res = await apiRequest(`/api/comision-academica/syllabus/${syllabusIdParam}`);
            if (res?.data) syllabusData = res.data;
          } catch(e) {
            try {
              const res = await apiRequest(`/api/syllabi/${syllabusIdParam}`);
              if (res?.data) syllabusData = res.data;
            } catch(e2) { /* no encontrado */ }
          }
        }
        
        if (!syllabusData) return;
        console.log('✅ Syllabus cargado directo por ID:', syllabusData.id);
        
        let editorData = syllabusData.datos_syllabus || syllabusData.datos_tabla;
        if (typeof editorData === 'string') {
          try { editorData = JSON.parse(editorData); } catch(e) {}
        }
        if (!editorData) return;
        
        editorData.id = syllabusData.id;
        if (!editorData.name) editorData.name = syllabusData.nombre;
        
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
        
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
        if (syllabusData.periodo) setSelectedPeriod(syllabusData.periodo);
        
        // También agregar a savedSyllabi para que el guardar pueda detectarlo
        setSavedSyllabi(prev => {
          const exists = prev.find(s => s.id === syllabusData.id);
          return exists ? prev : [syllabusData, ...prev];
        });
      } catch (err) {
        console.error('Error cargando syllabus directo:', err);
      }
    };
    cargarSyllabusDirecto();
  }, [syllabusIdParam]);

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) throw new Error("El servidor no devolvió JSON.");
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición.")
    return data
  }

  const handleSmartSync = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSyllabus) return;

    if (fileInputRefSync.current) fileInputRefSync.current.value = "";
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammothLib = (await import('mammoth')).default;

      const resultadoTexto = await mammothLib.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
      const textoCompleto = resultadoTexto.value;
      let wordData: Record<string, string> = {};

      const regexEtiquetas = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g;
      let matchResult;
      while ((matchResult = regexEtiquetas.exec(textoCompleto)) !== null) {
        wordData[matchResult[1].trim().toUpperCase()] = matchResult[2].trim();
      }

      // EXTRACCIÓN MAESTRA CON JSZIP
      const tablasPerfectas = await extraerTablasNativasWord(file);
      if (tablasPerfectas.length > 0) {
        setWordRawTables(tablasPerfectas);
        setShowWordPreview(true);
        const idxMejorTabla = tablasPerfectas.reduce((bestIdx, t, idx, arr) =>
          (t[0]?.length || 0) > (arr[bestIdx][0]?.length || 0) ? idx : bestIdx, 0
        );
        setSelectedWordTable(idxMejorTabla);
        setColumnMapping({});
      }

      alert("Tablas extraídas. Por favor usa el botón azul de Importar Directo para mantener el orden exacto.");

    } catch (error: any) {
      console.error("Error en sincronizacion:", error);
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 LA SOLUCIÓN DEFINITIVA: EL MOTOR DE IMPORTACIÓN QUE EXPANDE Y CLONA LA ESTRUCTURA
  const importarTablaWord = (wordTableIdx: number, startRowEditor: number, colMap: Record<number, number>) => {
    if (!activeSyllabus || !activeTab) return;
    const wordTable = wordRawTables[wordTableIdx];
    if (!wordTable) return;
    
    const tabIdx = activeSyllabus.tabs.findIndex(t => t.id === activeTab.id);
    if (tabIdx < 0) return;
    
    const updatedTabs = activeSyllabus.tabs.map((tab, tIdx) => {
      if (tIdx !== tabIdx) return tab;
      
      const processedRows = [...tab.rows];

      // 1. Determinar el máximo de columnas necesario (Expansión de Columnas)
      const maxEditorCols = Math.max(...processedRows.map(r => r.cells.length), ...Object.values(colMap).map(v => v + 1));

      for (let wRIdx = 0; wRIdx < wordTable.length; wRIdx++) {
        const targetRIdx = startRowEditor + wRIdx;
        const wordRow = wordTable[wRIdx];

        // 2. Si la fila no existe en el editor, la creamos (Expansión de Filas)
        if (!processedRows[targetRIdx]) {
            processedRows[targetRIdx] = {
                id: `row-auto-${Date.now()}-${targetRIdx}`,
                cells: []
            };
        }

        // 3. Si a la fila le faltan columnas, agregamos las faltantes
        while (processedRows[targetRIdx].cells.length < maxEditorCols) {
            processedRows[targetRIdx].cells.push({
                id: `cell-auto-${Date.now()}-${targetRIdx}-${processedRows[targetRIdx].cells.length}`,
                content: "",
                isHeader: targetRIdx === 0,
                rowSpan: 1, colSpan: 1,
                isEditable: true,
                textOrientation: 'horizontal'
            });
        }

        // 4. Copiar los datos y la ESTRUCTURA EXACTA (RowSpan/ColSpan)
        processedRows[targetRIdx].cells = processedRows[targetRIdx].cells.map((cell, cIdx) => {
            const wordColIdx = Object.entries(colMap).find(([, editorCol]) => editorCol === cIdx);
            if (!wordColIdx) return cell;
            
            const wColIdx = parseInt(wordColIdx[0]);
            if (wColIdx >= wordRow.length) return cell;
            
            const wordCell = wordRow[wColIdx];
            if (!wordCell) return cell;
            
            const isVertical = ["PRESENCIAL", "AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "TA", "PFAE"].some(k => wordCell.text.toUpperCase().includes(k));

            // 🔥 APLICAMOS LA MAGIA: Clonar isHidden para no desfasar celdas en React
            return { 
                ...cell, 
                content: wordCell.isHidden ? "" : wordCell.text.trim(), 
                rowSpan: wordCell.isHidden ? 0 : wordCell.rowSpan,
                colSpan: wordCell.isHidden ? 0 : wordCell.colSpan,
                isEditable: !wordCell.isHidden,
                textOrientation: (wordCell.text.length < 20 && isVertical) ? 'vertical' : 'horizontal'
            };
        });
      }
      
      return { ...tab, rows: processedRows };
    });
    
    setSyllabi(prev => prev.map(s => s.id === activeSyllabus.id ? { ...s, tabs: updatedTabs } : s));
    alert(`✅ ¡Tabla importada con éxito!\n\nSe ajustaron automáticamente las filas, columnas y celdas combinadas para mantener el diseño exacto.`);
  };

  const handleSaveToDB = async () => {
    if (!activeSyllabus) return alert("No hay un ProgramaAnalitico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    if (!asignaturaIdParam) return alert("No se detectó la asignatura. Vuelva a la pantalla de asignaturas y seleccione una.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activeSyllabus.metadata,
        tabs: activeSyllabus.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell, styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      };

      const asigId = parseInt(asignaturaIdParam, 10);
      const payload: any = { 
        nombre: activeSyllabus.name || 'Syllabus', 
        periodo: selectedPeriod, 
        materias: activeSyllabus.name || 'Syllabus', 
        datos_syllabus: datosParaGuardar,
        asignatura_id: asigId
      };

      // Verificar si ya existe uno para esta asignatura+periodo (actualizar en vez de crear)
      let existingId: number | null = null;
      try {
        const checkRes = await apiRequest(`/api/comision-academica/syllabus/buscar?asignatura_id=${asigId}&periodo=${selectedPeriod}`);
        if (checkRes?.data?.id) existingId = checkRes.data.id;
      } catch (e) { /* no existe, se creará */ }

      const isUpdate = existingId !== null;
      const endpoint = isUpdate ? `/api/comision-academica/syllabus/${existingId}` : "/api/comision-academica/syllabus";
      const method = isUpdate ? "PUT" : "POST";

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data;
      const savedUIData = savedRecord.datos_syllabus;
      if (savedUIData) {
        savedUIData.id = savedRecord.id;
        
        if (savedUIData.tabs) {
            savedUIData.tabs = savedUIData.tabs.map((t: any) => ({
                ...t, rows: t.rows.map((r: any) => ({
                    ...r, cells: r.cells.map((c: any) => ({
                        ...c, backgroundColor: c.styles?.backgroundColor, textOrientation: c.styles?.textOrientation, isEditable: true
                    }))
                }))
            }));
        }

        setSyllabi((prev) => prev.map((s) => (s.id === activeSyllabusId ? savedUIData : s)))
        setActiveSyllabusId(savedUIData.id)
      }
      
      if (isUpdate) setSavedSyllabi(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      else setSavedSyllabi(prev => [savedRecord, ...prev]);
      
      alert("Syllabus guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<SyllabusData>) => {
    setSyllabi(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleLoadSyllabus = (syllabusId: string) => {
    if (!syllabusId) return;
    const id = parseInt(syllabusId, 10);
    const syllabusToLoad = savedSyllabi.find((s: any) => Number(s.id) === id);
    if (syllabusToLoad) {
      let editorData: any = syllabusToLoad.datos_syllabus || syllabusToLoad.datos_tabla;
      if (typeof editorData === 'string') {
        try { editorData = JSON.parse(editorData); } catch(e) { return; }
      }
      if (!editorData) return;
      editorData.id = syllabusToLoad.id;
      if (!editorData.name) editorData.name = syllabusToLoad.nombre;
      
      // Normalizar tabs
      if (editorData.tabs) {
        editorData.tabs = editorData.tabs.map((t: any) => ({
          ...t, rows: (t.rows || []).map((r: any) => ({
            ...r, cells: (r.cells || []).map((c: any) => ({
              ...c, backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
              textColor: c.styles?.textColor || c.textColor,
              textAlign: c.styles?.textAlign || c.textAlign,
              textOrientation: c.styles?.textOrientation || c.textOrientation,
              isEditable: true
            }))
          }))
        }));
      } else if (editorData.rows) {
        editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: editorData.rows }];
      }
      
      setSyllabi([editorData]);
      setActiveSyllabusId(editorData.id);
      setActiveTabId(editorData.tabs?.[0]?.id || null);
      // Solo cambiar periodo si el del syllabus es un ID válido de periodos
      if (syllabusToLoad.periodo) {
        const esIdValido = periodos.some((p: any) => p.id.toString() === String(syllabusToLoad.periodo));
        if (esIdValido) {
          setSelectedPeriod(String(syllabusToLoad.periodo));
        }
        // Si no es un ID válido, mantener el selectedPeriod actual (que ya vino del URL)
      }
    }
  };

  const handleDeleteSyllabus = async (syllabusId: number) => {
    if (!confirm('¿Está seguro de eliminar este Syllabus? Esta acción no se puede deshacer.')) return;
    try {
      await apiRequest(`/api/comision-academica/syllabus/${syllabusId}`, { method: 'DELETE' });
      setSavedSyllabi(prev => prev.filter(s => s.id !== syllabusId));
      if (activeSyllabusId === syllabusId) {
        setActiveSyllabusId(null);
        setSyllabi([]);
      }
      alert('Syllabus eliminado exitosamente');
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  const handleReuploadSyllabus = (syllabusId: number) => {
    const syl = savedSyllabi.find(s => s.id === syllabusId);
    if (!syl) return;
    // Cargar el syllabus existente para editarlo, luego abrir file input
    handleLoadSyllabus(syllabusId.toString());
    setShowSyllabusSelector(false);
    // Pequeño delay para que el editor se monte y luego abrir el file picker
    setTimeout(() => fileInputRef.current?.click(), 300);
  };

  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    try {
      const tablasNativas = await extraerTablasNativasWord(file);
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const doc = new DOMParser().parseFromString(html, "text/html");
      const findMeta = (k: string) => Array.from(doc.querySelectorAll("p, td")).find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim() || "";
      
      const meta = { subject: findMeta("Nombre de la asignatura") || file.name.replace(".docx",""), period: findMeta("Periodo") || "", level: findMeta("Nivel") || "" };

      const SECTION_TRIGGERS = [
        "DATOS GENERALES", "INFORMACIÓN GENERAL", "OBJETIVOS", "OBJETIVO",
        "RESULTADOS DE APRENDIZAJE", "RESULTADOS", "CONTENIDOS", "UNIDADES TEMÁTICAS",
        "METODOLOGÍA", "ESTRATEGIAS METODOLÓGICAS", "EVALUACIÓN", "SISTEMA DE EVALUACIÓN",
        "BIBLIOGRAFÍA", "FUENTES DE CONSULTA", "VISADO", "LEGALIZACIÓN"
      ];

      const newTabs: TabData[] = [];
      let currentRows: TableRow[] = [];
      let currentSectionTitle = "Información General"; 

      const pushCurrentSection = () => {
        if (currentRows.length > 0) {
            newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: [...currentRows] });
            currentRows = []; 
        }
      };

      tablasNativas.forEach((grid, tIdx) => {
        grid.forEach((gridRow, rIdx) => {
            const firstValidCell = gridRow.find(c => !c.isHidden && c.text.trim() !== "");
            const firstCellText = firstValidCell ? firstValidCell.text.toUpperCase() : "";
            const matchedTrigger = SECTION_TRIGGERS.find(trigger => firstCellText.includes(trigger));

            if (matchedTrigger && firstCellText.length < 50) {
                pushCurrentSection();
                let cleanTitle = matchedTrigger;
                if (cleanTitle.includes("CONTENIDOS")) cleanTitle = "Contenidos y Unidades";
                if (cleanTitle.includes("RESULTADOS")) cleanTitle = "Resultados de Aprendizaje";
                if (cleanTitle.includes("BIBLIOGRAFÍA")) cleanTitle = "Bibliografía";
                currentSectionTitle = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase();
            }

            const isUnitHeader = currentSectionTitle.includes("Contenidos") && gridRow.some(c => c.text.toUpperCase().includes("UNIDADES TEM"));

            const finalCells: TableCell[] = gridRow.map((extCell, cIdx) => {
                const isVertical = ["PRESENCIAL", "AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "TA", "PFAE"].some(k => extCell.text.toUpperCase().includes(k));
                return {
                    id: `cell-${Date.now()}-${tIdx}-${rIdx}-${cIdx}`,
                    content: extCell.text,
                    isHeader: isUnitHeader || rIdx === 0,
                    rowSpan: extCell.isHidden ? 0 : extCell.rowSpan, 
                    colSpan: extCell.isHidden ? 0 : extCell.colSpan, 
                    isEditable: !extCell.isHidden, 
                    textOrientation: (extCell.text.length < 20 && isVertical) ? 'vertical' : 'horizontal',
                    backgroundColor: isUnitHeader ? '#f0fdf4' : undefined 
                };
            });

            currentRows.push({ id: `row-${Date.now()}-${tIdx}-${rIdx}`, cells: finalCells });
        });
      });

      pushCurrentSection();

      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se pudo detectar ninguna estructura válida en el documento.");
      }

      const newData: SyllabusData = {
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.subject,
        description: "Importado (JSZip Expansion)",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setSyllabi([newData]);
      setActiveSyllabusId(newData.id);
      
      const tabContenidos = newTabs.find(t => t.title.toLowerCase().includes("contenidos"));
      setActiveTabId(tabContenidos ? tabContenidos.id : newTabs[0].id);

    } catch (e) { 
        console.error(e); 
        alert("Error al procesar el archivo. Verifica que no esté corrupto."); 
    } finally { 
        setIsLoading(false); 
    }
  };

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
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeSyllabus) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`, title: `Nueva Sección`,
      rows: [ { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true, textOrientation: 'horizontal'}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true, textOrientation: 'horizontal'}] } ]
    };
    const updatedTabs = [...activeSyllabus.tabs, newTab];
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };

  // ✍️ AGREGAR PESTAÑA VISADO/FIRMAS PRE-CONSTRUIDA
  const addVisadoTab = () => {
    if (!activeSyllabus) return;
    // Verificar si ya existe una pestaña VISADO
    const yaExiste = activeSyllabus.tabs.some(t => t.title.toUpperCase().includes('VISADO'));
    if (yaExiste) {
      const visadoTab = activeSyllabus.tabs.find(t => t.title.toUpperCase().includes('VISADO'));
      if (visadoTab) setActiveTabId(visadoTab.id);
      return alert('Ya existe una pestaña de Visado/Firmas.');
    }

    const ts = Date.now();
    const mkCell = (id: string, content: string, opts: Partial<TableCell> = {}): TableCell => ({
      id, content, isHeader: false, rowSpan: 1, colSpan: 1, isEditable: true, textOrientation: 'horizontal', ...opts
    });

    // Obtener nombre del usuario actual y fecha actual
    const nombreUsuario = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : '';
    const fechaHoy = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const visadoRows: TableRow[] = [
      // Fila 0: Título VISADO
      { id: `vr-0-${ts}`, cells: [
        mkCell(`vc-0-0-${ts}`, '3. VISADO', { isHeader: true, colSpan: 4, fontWeight: 'bold', backgroundColor: '#E8EDF2', textAlign: 'center' }),
        mkCell(`vc-0-1-${ts}`, '', { rowSpan: 0, colSpan: 0 }),
        mkCell(`vc-0-2-${ts}`, '', { rowSpan: 0, colSpan: 0 }),
        mkCell(`vc-0-3-${ts}`, '', { rowSpan: 0, colSpan: 0 }),
      ]},
      // Fila 1: Encabezados de cargo
      { id: `vr-1-${ts}`, cells: [
        mkCell(`vc-1-0-${ts}`, 'ELABORADO POR:\nDOCENTE', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F3F4F6' }),
        mkCell(`vc-1-1-${ts}`, 'REVISADO POR:\nDIRECTOR/A DE CARRERA', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F3F4F6' }),
        mkCell(`vc-1-2-${ts}`, 'REVISADO POR:\nCOORDINADOR/A COMISIÓN ACADÉMICA', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F3F4F6' }),
        mkCell(`vc-1-3-${ts}`, 'APROBADO POR:\nDECANO/A DE FACULTAD', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F3F4F6' }),
      ]},
      // Fila 2: Nombre
      { id: `vr-2-${ts}`, cells: [
        mkCell(`vc-2-0-${ts}`, 'Nombre:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-2-1-${ts}`, 'Nombre:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-2-2-${ts}`, 'Nombre:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-2-3-${ts}`, 'Nombre:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
      ]},
      // Fila 3: Valores de nombre (el docente se auto-completa)
      { id: `vr-3-${ts}`, cells: [
        mkCell(`vc-3-0-${ts}`, nombreUsuario, { textAlign: 'center' }),
        mkCell(`vc-3-1-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-3-2-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-3-3-${ts}`, '', { textAlign: 'center' }),
      ]},
      // Fila 4: Firma
      { id: `vr-4-${ts}`, cells: [
        mkCell(`vc-4-0-${ts}`, 'Firma:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-4-1-${ts}`, 'Firma:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-4-2-${ts}`, 'Firma:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-4-3-${ts}`, 'Firma:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
      ]},
      // Fila 5: Espacios para firma
      { id: `vr-5-${ts}`, cells: [
        mkCell(`vc-5-0-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-5-1-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-5-2-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-5-3-${ts}`, '', { textAlign: 'center' }),
      ]},
      // Fila 6: Fecha
      { id: `vr-6-${ts}`, cells: [
        mkCell(`vc-6-0-${ts}`, 'Fecha:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-6-1-${ts}`, 'Fecha:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-6-2-${ts}`, 'Fecha:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
        mkCell(`vc-6-3-${ts}`, 'Fecha:', { isHeader: true, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#F9FAFB' }),
      ]},
      // Fila 7: Valores de fecha (docente se auto-completa con fecha actual)
      { id: `vr-7-${ts}`, cells: [
        mkCell(`vc-7-0-${ts}`, fechaHoy, { textAlign: 'center' }),
        mkCell(`vc-7-1-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-7-2-${ts}`, '', { textAlign: 'center' }),
        mkCell(`vc-7-3-${ts}`, '', { textAlign: 'center' }),
      ]},
    ];

    const visadoTab: TabData = {
      id: `tab-visado-${ts}`,
      title: 'Visado',
      rows: visadoRows,
    };

    const updatedTabs = [...activeSyllabus.tabs, visadoTab];
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setActiveTabId(visadoTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeSyllabus) return;
    if (activeSyllabus.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activeSyllabus.tabs.filter(t => t.id !== tabIdToRemove);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    if (activeTabId === tabIdToRemove) setActiveTabId(updatedTabs[0]?.id || null);
  };

  const findCellPosition = (id: string): {rowIndex: number, colIndex: number} | null => { if (!tableData) return null; for(let r=0;r<tableData.length;r++){ const c=tableData[r].cells.findIndex(cell=>cell.id===id); if(c!==-1)return{rowIndex: r, colIndex: c}} return null }
  const saveEdit = () => { if(editingCell){ const updated=tableData.map(row=>({...row,cells:row.cells.map(c=>(c.id===editingCell?{...c,content:editContent}:c))})); handleUpdateActiveTabRows(updated); setEditingCell(null);setEditContent("")}}
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }
  const saveModalEdit = () => {
    if (!modalCell) return;
    const updated = tableData.map(row => ({ ...row, cells: row.cells.map(c => (c.id === modalCell.id ? { ...c, content: editContent } : c)) }));
    handleUpdateActiveTabRows(updated);
    setModalCell(null);
    setEditContent("");
  }
  const handleCellClick = (id: string, e: React.MouseEvent) => { e.ctrlKey||e.metaKey ? setSelectedCells(p => p.includes(id)?p.filter(i=>i!==id):[...p,id]) : setSelectedCells([id]) }
  
  const handleInsertRow = (direction: "above" | "below") => { const pos = findCellPosition(selectedCells[0]); if(pos) {
    const rId=`r-${Date.now()}`,nCols=tableData[0].cells.length;
    const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0, textOrientation: 'horizontal'}))};
    const nRows=[...tableData];nRows.splice(direction === 'above' ? pos.rowIndex : pos.rowIndex + 1,0,nR);handleUpdateActiveTabRows(nRows)
  }}
  const handleInsertColumn = (direction: "left" | "right") => { const pos = findCellPosition(selectedCells[0]); if(pos) {
    const idx = direction === 'left' ? pos.colIndex : pos.colIndex + 1;
    const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0, textOrientation: 'horizontal'};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});
    handleUpdateActiveTabRows(updated)
  }}
  const removeSelectedRow = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.filter((_, i) => i !== pos.rowIndex); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const removeSelectedColumn = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== pos.colIndex) })); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const clearSelectedCells=()=>{ const updated=tableData.map(r=>({...r,cells:r.cells.map(c=>selectedCells.includes(c.id)?{...c,content:""}:c)})); handleUpdateActiveTabRows(updated); setSelectedCells([]) }
  
  const toggleVerticalText = () => {
    if (selectedCells.length === 0) return;
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(cell => {
        if (selectedCells.includes(cell.id)) {
          return { ...cell, textOrientation: (cell.textOrientation === 'vertical' ? 'horizontal' : 'vertical') as 'horizontal'|'vertical' } 
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
    if(!activeSyllabus) return;

    try {

    // Usar orientación landscape para más espacio horizontal
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cargar el logo de la universidad
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoImg!.onload = () => resolve();
        logoImg!.onerror = () => reject(new Error('No se pudo cargar el logo'));
        logoImg!.src = '/images/unesum-logo-official.png';
      });
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el logo para el PDF:', e);
      logoImg = null;
    }

    // Iterar sobre TODAS las pestañas para incluirlas en el mismo PDF (CONTINUO)
    const allTabs = activeSyllabus.tabs;
    const marginL = 10;
    const marginR = 10;
    console.log(`📄 PDF: Generando PDF con ${allTabs.length} pestañas`);

    // --- Encabezado solo en la primera página ---
    if (logoImg) {
      try { doc.addImage(logoImg, 'PNG', 12, 3, 20, 20); } catch(e) { /* ignore */ }
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ", pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(12);
    doc.text("SYLLABUS DE ASIGNATURA", pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(activeSyllabus.name || '', pageWidth / 2, 20, { align: 'center' });

    let currentY = 26;

    for (let tabIdx = 0; tabIdx < allTabs.length; tabIdx++) {
      const tab = allTabs[tabIdx];
      if (!tab || tab.rows.length === 0) continue;

      console.log(`📄 PDF Tab ${tabIdx + 1}: "${tab.title}" con ${tab.rows.length} filas`);

      const isVisadoTab = tab.title.toUpperCase().includes('VISADO') || tab.title.toUpperCase().includes('LEGALIZACIÓN');

      // Nueva página SOLO si no hay espacio suficiente
      const spaceNeeded = isVisadoTab ? 50 : 15;
      if (currentY + spaceNeeded > pageHeight - 10) { doc.addPage(); currentY = 12; }

      // Título de sección si hay más de 1 tab
      if (allTabs.length > 1) {
        currentY += 2;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(25, 50, 95);
        doc.text(tab.title.toUpperCase(), marginL, currentY);
        currentY += 1;
        doc.setDrawColor(25, 50, 95);
        doc.setLineWidth(0.3);
        doc.line(marginL, currentY, pageWidth - marginR, currentY);
        currentY += 2;
      }

      // --- Construir body ---
      const isMainSection = !isVisadoTab && tabIdx === 0;

      try {

      if (isMainSection) {
        // ======= SECCIÓN PRINCIPAL: tabla limpia de 2 columnas (label | valor) =======
        const contentWidth = pageWidth - marginL - marginR;
        const cleanBody: any[][] = [];

        for (let r = 0; r < tab.rows.length; r++) {
          const row = tab.rows[r];
          const visible = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (visible.length === 0) continue;

          // Fila con 1 celda que abarca toda la fila → título
          if (visible.length === 1 && (visible[0].colSpan || 1) >= 3) {
            const txt = (visible[0].content || '').trim();
            if (!txt) continue;
            cleanBody.push([{
              content: txt, colSpan: 2,
              styles: { fontStyle: 'bold' as const, fillColor: '#E5E7EB', halign: 'center' as const, fontSize: 9, cellPadding: 3 }
            }]);
            continue;
          }

          // Fila con 1 celda sola → valor de un rowSpan previo
          if (visible.length === 1) {
            const txt = (visible[0].content || '').trim();
            if (txt) {
              cleanBody.push([
                { content: '', styles: { fillColor: '#F9FAFB' } },
                { content: txt, styles: { fillColor: '#FFFFFF', halign: 'left' as const } },
              ]);
            }
            continue;
          }

          // Fila con 2 celdas: label + valor
          if (visible.length === 2) {
            const label = (visible[0].content || '').trim();
            let value = (visible[1].content || '').trim();

            // Auto-llenado para ASIGNATURA, NIVEL, PERIODO
            if (r <= 5 && asignaturaInfo) {
              const etiqueta = label.toUpperCase();
              if (etiqueta === 'ASIGNATURA' && !value) {
                value = `${asignaturaInfo.codigo || ''} - ${asignaturaInfo.nombre || ''}`;
              } else if ((etiqueta.includes('PERIODO') || etiqueta === 'PAO') && !value) {
                const periodoNombre = periodos.find((p: any) => p.id?.toString() === selectedPeriod)?.nombre || selectedPeriod;
                value = formatPeriodoSimple(periodoNombre) || '';
              } else if (etiqueta === 'NIVEL' && !value) {
                value = asignaturaInfo.nivel?.nombre || '';
              }
            }

            cleanBody.push([
              { content: label, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
              { content: value, styles: { fontStyle: 'normal' as const, fillColor: '#FFFFFF', halign: 'left' as const } },
            ]);
            continue;
          }

          // Fila con 3 celdas: label + sub-label + valor
          if (visible.length === 3) {
            const label = (visible[0].content || '').trim();
            const subLabel = (visible[1].content || '').trim();
            const value = (visible[2].content || '').trim();

            // Si subLabel es solo ":" o separador, combinar label y value
            const isSep = subLabel === ':' || (subLabel.length <= 2 && subLabel.length > 0 && !/[a-zA-Z0-9]/.test(subLabel));
            if (isSep) {
              cleanBody.push([
                { content: label, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
                { content: value, styles: { fontStyle: 'normal' as const, fillColor: '#FFFFFF', halign: 'left' as const } },
              ]);
            } else if (label) {
              cleanBody.push([
                { content: label, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
                { content: `${subLabel}${subLabel && value ? ': ' : ''}${value}`, styles: { fillColor: '#FFFFFF', halign: 'left' as const } },
              ]);
            } else {
              cleanBody.push([
                { content: subLabel, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
                { content: value, styles: { fillColor: '#FFFFFF', halign: 'left' as const } },
              ]);
            }
            continue;
          }

          // Fila con 4+ celdas → split into 2-column pairs
          if (visible.length >= 4) {
            for (let ci = 0; ci < visible.length - 1; ci += 2) {
              const label = (visible[ci].content || '').trim();
              let value = (visible[ci + 1]?.content || '').trim();

              if (r <= 5 && asignaturaInfo) {
                const etiqueta = label.toUpperCase();
                if (etiqueta === 'ASIGNATURA' && !value) {
                  value = `${asignaturaInfo.codigo || ''} - ${asignaturaInfo.nombre || ''}`;
                } else if ((etiqueta.includes('PERIODO') || etiqueta === 'PAO') && !value) {
                  const periodoNombre = periodos.find((p: any) => p.id?.toString() === selectedPeriod)?.nombre || selectedPeriod;
                  value = formatPeriodoSimple(periodoNombre) || '';
                } else if (etiqueta === 'NIVEL' && !value) {
                  value = asignaturaInfo.nivel?.nombre || '';
                }
              }

              if (label || value) {
                cleanBody.push([
                  { content: label, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
                  { content: value, styles: { fillColor: '#FFFFFF', halign: 'left' as const } },
                ]);
              }
            }
            continue;
          }
        }

        if (cleanBody.length > 0) {
          const contentWidth2 = pageWidth - marginL - marginR;
          const labelW = contentWidth2 * 0.28;
          const valW = contentWidth2 * 0.72;

          autoTable(doc, {
            body: cleanBody as any,
            startY: currentY,
            theme: 'grid',
            columnStyles: {
              0: { cellWidth: labelW },
              1: { cellWidth: valW },
            },
            styles: {
              fontSize: 7,
              cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
              lineColor: '#9CA3AF',
              lineWidth: 0.2,
              overflow: 'linebreak',
              halign: 'left',
              valign: 'top',
              textColor: '#1F2937',
            },
            margin: { left: marginL, right: marginR },
            tableWidth: contentWidth2,
          });
          currentY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || currentY + 10;
          currentY += 4;
        }

      } else {
        // ======= VISADO y OTRAS SECCIONES: rowSpan/colSpan directo =======
        const body: any[][] = [];

        for (let r = 0; r < tab.rows.length; r++) {
          const row = tab.rows[r];
          const pdfRow: any[] = [];

          for (let c = 0; c < row.cells.length; c++) {
            const cell = row.cells[c];
            if (cell.rowSpan === 0 || cell.colSpan === 0) continue;

            let content = cell.content || '';
            if (cell.textOrientation === 'vertical' && content) {
              content = content.split('').join('\n');
            }

            pdfRow.push({
              content: content,
              rowSpan: cell.rowSpan || 1,
              colSpan: cell.colSpan || 1,
              styles: {
                fontStyle: cell.isHeader ? 'bold' : 'normal',
                fillColor: isVisadoTab ? '#FFFFFF' : (cell.backgroundColor || (cell.isHeader ? '#E5E7EB' : '#FFFFFF')),
                textColor: isVisadoTab ? '#000000' : (cell.textColor || '#1F2937'),
                fontSize: isVisadoTab ? 7 : (cell.textOrientation === 'vertical' ? 6 : 8),
                cellPadding: isVisadoTab ? 3 : 2,
                halign: isVisadoTab ? 'center' : (cell.isHeader ? 'center' : (cell.textAlign as any || 'left')),
                valign: 'middle',
                minCellHeight: isVisadoTab ? 16 : (cell.textOrientation === 'vertical' ? 30 : 8),
                cellWidth: cell.textOrientation === 'vertical' ? 10 : 'auto',
                overflow: 'linebreak',
              }
            });
          }

          if (pdfRow.length > 0) {
            body.push(pdfRow);
          }
        }

        if (body.length === 0) continue;

        autoTable(doc, {
          body: body as any,
          startY: currentY,
          theme: 'grid',
          styles: {
            fontSize: isVisadoTab ? 7 : 8,
            cellPadding: isVisadoTab ? 3 : 2,
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
        currentY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || currentY + 10;
        currentY += 4;
      }

      } catch (tabError) {
        console.error(`⚠️ PDF ERROR en pestaña "${tab.title}":`, tabError);
        console.error('Stack:', (tabError as any)?.stack);
      }
    }

    doc.save(`Syllabus_${activeSyllabus.name}.pdf`);

    } catch (globalError) {
      console.error('❌ ERROR GLOBAL en generación PDF:', globalError);
      alert('Error al generar PDF. Revisa la consola (F12) para más detalles.');
    }
  }

  const formatPeriodoSimple = (periodoIdOrName: string) => {
    if (!periodoIdOrName) return "";
    // Buscar nombre del periodo por ID
    const periodoObj = periodos.find((p: any) => p.id?.toString() === periodoIdOrName);
    const nombre = periodoObj?.nombre || periodoIdOrName;
    const match = nombre.match(/(P[IVX]+\s\d{4})/i);
    return match ? match[0].toUpperCase() : nombre;
  };

  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    if (!asignaturaInfo || rowIndex > 5) return cell.content || "";
    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const etiqueta = currentRow.cells[cellIndex - 1]?.content?.toUpperCase().trim() || "";
      if (etiqueta === "ASIGNATURA") return `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
      if (etiqueta === "PERIODO ACADÉMICO ORDINARIO (PAO)" || etiqueta === "PAO") return formatPeriodoSimple(selectedPeriod) || cell.content || "";
      if (etiqueta === "NIVEL") return asignaturaInfo.nivel?.nombre || "";
    }
    return cell.content || "";
  };

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        <MainHeader />
        <main className={`mx-auto py-5 ${activeSyllabus ? 'max-w-[98vw] px-4' : 'max-w-7xl px-6'}`}>
          
          {!activeSyllabus ? (
            <>
              <Card className="mb-5 overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl animate-fade-in-up">
                <div className="syllabus-accent-bar" />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">Editor de Syllabus</h2>
                        <p className="text-[11px] text-gray-400 font-normal mt-0.5">Comisión Académica</p>
                      </div>
                    </div>
                    <Button onClick={() => setShowSyllabusSelector(true)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm hover:shadow-md transition-all h-9 px-4">
                      <Plus className="h-4 w-4 mr-2" /> Nuevo Syllabus
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-1/2 space-y-2">
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Periodo Académico</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="border-gray-200 focus:ring-emerald-500 focus:border-emerald-500"><SelectValue placeholder="Seleccione el periodo" /></SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>{periodo.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {showSyllabusSelector && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-[6px] flex items-center justify-center z-50 p-4 animate-fade-in-up">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl border border-gray-100 rounded-2xl">
                    <div className="syllabus-accent-bar" />
                    <CardHeader className="bg-gradient-to-b from-gray-50/80 to-white pb-3 pt-4">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-100 rounded-xl"><BookOpen className="h-4 w-4 text-emerald-700" /></div>
                          <span className="text-gray-800 font-semibold">Seleccionar Syllabus</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowSyllabusSelector(false)} className="rounded-full hover:bg-gray-100 h-8 w-8"><X className="h-4 w-4" /></Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 overflow-y-auto max-h-[calc(80vh-80px)] syllabus-scroll">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm h-11 text-sm" disabled={isLoading}>
                        {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</span> : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleSyllabusUpload(e); setShowSyllabusSelector(false); }} className="hidden" />
                      
                      <div className="border-t border-gray-100 pt-4">
                        <h3 className="font-semibold mb-3 text-gray-700 text-sm flex items-center gap-1.5"><FileText className="h-4 w-4 text-emerald-600" /> O seleccione uno existente:</h3>
                        {isListLoading ? <div className="flex items-center justify-center py-8"><span className="h-6 w-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div> : savedSyllabi.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto syllabus-scroll">
                            {savedSyllabi.map(s => (
                              <div key={s.id} className="syllabus-list-item flex items-center justify-between p-3 border border-gray-100 rounded-2xl hover:bg-emerald-50/40 hover:border-emerald-200/60 gap-2 group">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate text-gray-800 group-hover:text-emerald-800 transition-colors text-[13px]">{s.nombre}</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">{s.periodo} - {s.materias}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <Button onClick={() => { handleLoadSyllabus(s.id.toString()); setShowSyllabusSelector(false); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm h-8" size="sm">Seleccionar</Button>
                                  <Button variant="outline" size="sm" onClick={() => handleReuploadSyllabus(s.id)} className="rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8" title="Actualizar con nuevo Word"><Upload className="h-3.5 w-3.5" /></Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteSyllabus(s.id)} className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 h-8" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <div className="text-center py-8 empty-pattern rounded-xl"><FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No hay Syllabus para este periodo</p></div>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <>
              <Card className="mb-5 overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl animate-fade-in-up">
                <div className="syllabus-accent-bar" />
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm flex-shrink-0">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-800 truncate">{activeSyllabus.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          {asignaturaInfo && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200"><BookOpen className="h-3 w-3" />{asignaturaInfo.nombre}</span>}
                          {selectedPeriod && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"><Calendar className="h-3 w-3" />{formatPeriodoSimple(selectedPeriod)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button onClick={() => { setActiveSyllabusId(null); setSyllabi([]); }} variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50 h-9 px-3"><Plus className="h-4 w-4 mr-1.5" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm h-9 px-4" size="sm" disabled={isSaving}>
                         {isSaving ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</span> : <><Save className="h-4 w-4 mr-1.5"/> Guardar</>}
                       </Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab} className="rounded-xl border-gray-200 hover:bg-gray-50 h-9 px-3"><FileDown className="h-4 w-4 mr-1.5" /> PDF</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/40 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100/80 rounded-xl flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-amber-800 font-semibold text-[13px]">Sincronización Inteligente</h4>
                        <p className="text-amber-600/80 text-[11px]">Sube el Word lleno y las celdas se auto-completarán</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button onClick={() => fileInputRefSync.current?.click()} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm h-8" size="sm" disabled={isLoading}><Upload className="h-3.5 w-3.5 mr-1.5" /> Subir Word</Button>
                      {wordRawTables.length > 0 && <Button onClick={() => setShowWordPreview(!showWordPreview)} variant="outline" size="sm" className="rounded-xl text-blue-700 border-blue-200/60 hover:bg-blue-50 h-8"><Eye className="h-3.5 w-3.5 mr-1" /> Ver Tablas</Button>}
                    </div>
                    <input type="file" ref={fileInputRefSync} className="hidden" accept=".docx" onChange={handleSmartSync} />
                  </div>
                </CardContent>
              </Card>

              <div className="mb-0 select-none flex flex-wrap items-end gap-1 relative px-1">
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
                {activeSyllabus.tabs.map((tab, tabIndex) => (
                  <div key={tab.id} className="relative group">
                    {editingTabId === tab.id ? (
                      <div className="flex items-center bg-white border-2 border-emerald-400 rounded-t-xl px-2 h-10 shadow-sm">
                        <Input value={tempTabTitle} onChange={(e) => setTempTabTitle(e.target.value)} className="h-7 w-36 text-xs border-none focus-visible:ring-0 bg-transparent" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTabRename()} onBlur={saveTabRename} />
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-emerald-600" onClick={saveTabRename}><Check className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <div onClick={() => setActiveTabId(tab.id)} onDoubleClick={() => startRenamingTab(tab)} className={`syllabus-tab flex items-center h-10 px-4 rounded-t-xl cursor-pointer text-[12px] font-medium transition-all ${
                        activeTabId === tab.id 
                          ? 'bg-white text-emerald-700 shadow-[0_-1px_4px_rgba(0,0,0,0.04)] z-10 -mb-[2px] pb-[2px] font-semibold border border-b-0 border-gray-100' 
                          : 'text-gray-400 hover:text-emerald-700 hover:bg-white/60'
                      } ${activeTabId === tab.id ? 'active' : ''}`}>
                        <span className={`text-[10px] font-bold mr-1.5 ${activeTabId === tab.id ? 'text-emerald-500' : 'text-gray-300'}`}>{tabIndex + 1}.</span>
                        <span className="mr-2">{tab.title}</span>
                        <div className={`flex gap-0.5 transition-opacity ${activeTabId === tab.id ? 'opacity-50 hover:opacity-100' : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'}`}>
                           <Pencil className="h-2.5 w-2.5 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); startRenamingTab(tab); }} />
                           <X className="h-3 w-3 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={addTab} variant="ghost" size="sm" className="h-10 text-[11px] text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-t-xl border border-b-0 border-dashed border-emerald-200/60 px-3"><Plus className="h-3 w-3 mr-1" /> Sección</Button>
                <Button onClick={addVisadoTab} variant="ghost" size="sm" className="h-10 text-[11px] text-amber-500 hover:text-amber-700 hover:bg-amber-50/50 rounded-t-xl border border-b-0 border-dashed border-amber-200/60 px-3"><PenLine className="h-3 w-3 mr-1" /> Visado / Firmas</Button>
              </div>

              {activeTab && (
                <Card className="border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-2xl rounded-tl-none overflow-hidden animate-fade-in-up">
                  <CardContent className="p-5">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-5 px-3 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                       <div className="flex items-center gap-1 bg-emerald-50/60 rounded-xl px-2 py-1">
                         <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Insertar</span>
                         <Button size="sm" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200/80 shadow-none"><Rows3 className="h-3 w-3 mr-1"/>↑ Fila</Button>
                         <Button size="sm" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200/80 shadow-none"><Rows3 className="h-3 w-3 mr-1"/>↓ Fila</Button>
                         <Button size="sm" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200/80 shadow-none"><Columns className="h-3 w-3 mr-1"/>← Col</Button>
                         <Button size="sm" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200/80 shadow-none"><Columns className="h-3 w-3 mr-1"/>→ Col</Button>
                       </div>
                       <div className="flex items-center gap-1 bg-red-50/50 rounded-xl px-2 py-1">
                         <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Eliminar</span>
                         <Button size="sm" onClick={removeSelectedRow} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-red-50 text-red-500 hover:text-red-700 border border-red-100/80 shadow-none"><Minus className="h-3 w-3 mr-1"/>Fila</Button>
                         <Button size="sm" onClick={removeSelectedColumn} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-red-50 text-red-500 hover:text-red-700 border border-red-100/80 shadow-none"><Minus className="h-3 w-3 mr-1"/>Col</Button>
                       </div>
                       <div className="flex items-center gap-1 bg-blue-50/50 rounded-xl px-2 py-1">
                         <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Formato</span>
                         <Button size="sm" onClick={toggleVerticalText} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-700 border border-gray-200/80 shadow-none"><Type className="h-3 w-3 mr-1" /> Vertical</Button>
                         <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-purple-50 text-gray-600 hover:text-purple-700 border border-gray-200/80 shadow-none"><Merge className="h-3 w-3 mr-1" />Unir</Button>
                         <Button size="sm" onClick={clearSelectedCells} disabled={!selectedCells.length} className="toolbar-btn h-7 px-2.5 text-[11px] bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200/80 shadow-none"><Eraser className="h-3 w-3 mr-1" />Limpiar</Button>
                       </div>
                       {selectedCells.length > 0 && <span className="ml-auto text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200/50">{selectedCells.length} celda{selectedCells.length > 1 ? 's' : ''}</span>}
                    </div>

                    <div className="syllabus-table-wrap overflow-x-auto max-h-[82vh] overflow-y-auto syllabus-scroll">
                      {(() => {
                        // === PRE-COMPUTE: Analyze all columns to get smart widths ===
                        const isFirstSection = activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS');
                        
                        // Find the REAL column count from actual cell array
                        const totalPhysicalCols = tableData.reduce((max, row) => Math.max(max, row.cells.length), 0);

                        // === COLSPAN-AWARE COLUMN ANALYSIS ===
                        // For each physical column, accumulate weight from cells that SPAN it
                        const colWeights = new Array(totalPhysicalCols).fill(0);
                        const colIsNumeric = new Array(totalPhysicalCols).fill(true);
                        const colIsSeparator = new Array(totalPhysicalCols).fill(true);
                        const colMaxLen = new Array(totalPhysicalCols).fill(0);
                        const colHasContent = new Array(totalPhysicalCols).fill(false);
                        let sampleRows = 0;

                        for (const row of tableData) {
                          const visibleCells = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
                          if (visibleCells.length === 0) continue;
                          sampleRows++;
                          
                          // Map visible cells to their physical positions
                          let physIdx = 0;
                          for (let ci = 0; ci < row.cells.length; ci++) {
                            const cell = row.cells[ci];
                            if (cell.rowSpan === 0 && cell.colSpan === 0) continue; // skip hidden
                            
                            const txt = (cell.content || '').trim();
                            const span = Math.max(cell.colSpan, 1);
                            const txtLen = txt.length;
                            const isSep = txt === ':' || (txtLen <= 2 && txtLen > 0 && !/[a-zA-Z0-9]/.test(txt));
                            const isNum = /^[\d.,\s\-\/]+$/.test(txt) && txtLen > 0;
                            
                            // Spread this cell's content weight across all physical columns it spans
                            // A cell spanning 4 cols gives each col 1/4 of its text weight
                            const weightPerCol = txtLen > 0 ? Math.max(txtLen / span, 1) : 0;
                            
                            for (let s = 0; s < span && (ci + s) < totalPhysicalCols; s++) {
                              const idx = ci + s;
                              if (txtLen > 0) {
                                colHasContent[idx] = true;
                                colMaxLen[idx] = Math.max(colMaxLen[idx], weightPerCol);
                              }
                              if (!isNum && txtLen > 0) colIsNumeric[idx] = false;
                              if (!isSep && txtLen > 0) colIsSeparator[idx] = false;
                            }
                          }
                        }

                        // Mark cols with no content
                        for (let ci = 0; ci < totalPhysicalCols; ci++) {
                          if (!colHasContent[ci]) { colIsNumeric[ci] = false; colIsSeparator[ci] = false; }
                        }

                        // Compute final weight per physical column
                        const getColWeight = (ci: number): number => {
                          if (!colHasContent[ci]) return 0.1;         // empty col -> minimal
                          if (colIsSeparator[ci]) return 0.12;        // ":" -> tiny
                          const len = colMaxLen[ci];
                          if (colIsNumeric[ci] && len <= 4) return 0.35;  // hours (1-3 digits)
                          if (colIsNumeric[ci]) return 0.5;           // other numbers
                          if (len <= 5) return 0.5;                   // very short labels
                          if (len <= 10) return 0.8;                  // short labels
                          if (len <= 20) return 1.5;                  // medium labels
                          if (len <= 40) return 2.5;                  // medium text
                          if (len <= 80) return 4.0;                  // long text
                          return 5.5;                                 // very long text
                        };

                        // Build normalized percentages
                        const rawWeights = Array.from({ length: totalPhysicalCols }, (_, ci) => getColWeight(ci));
                        const totalW = rawWeights.reduce((s, w) => s + w, 0) || 1;
                        const normalizedPcts = rawWeights.map((w, ci) => {
                          const pct = (w / totalW) * 100;
                          // Enforce minimums by column type
                          if (colIsSeparator[ci]) return Math.max(pct, 0.8);
                          if (!colHasContent[ci]) return Math.max(pct, 0.3);
                          if (colIsNumeric[ci] && colMaxLen[ci] <= 4) return Math.max(pct, 1.5);
                          return Math.max(pct, 2);
                        });
                        // Re-normalize to exactly 100%
                        const pctTotal = normalizedPcts.reduce((s, p) => s + p, 0);
                        const finalPcts = normalizedPcts.map(p => Math.round((p / pctTotal) * 1000) / 10);

                        return (
                      <table className="syllabus-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          {finalPcts.map((pct, ci) => (
                            <col key={ci} style={{ width: `${pct}%` }} />
                          ))}
                        </colgroup>
                        <tbody>
                          {tableData.length === 0 ? (
                            <tr><td className="p-16 text-center" colSpan={totalPhysicalCols || 1}>
                              <div className="empty-pattern rounded-2xl py-12">
                                <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">La tabla está vacía</p>
                                <p className="text-gray-300 text-[11px] mt-1">Importe un documento Word o cree una nueva sección</p>
                              </div>
                            </td></tr>
                          ) : (
                            tableData.map((row, rowIndex) => {
                              const rowVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                              const isFormRow = isFirstSection && rowVisibleCols <= 4;
                              return (
                              <tr key={row.id} className="group/row transition-colors duration-100 hover:bg-emerald-50/25">
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                                  
                                  const contentTrimmed = cell.content.trim();
                                  const isSelected = selectedCells.includes(cell.id);
                                  const isReadOnly = isCellReadOnly(cell, rowIndex, cellIndex);
                                  const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex);
                                  const isVertical = cell.textOrientation === 'vertical';

                                  // === NUMERIC DETECTION ===
                                  const isNumericContent = /^[\d.,\s\-\/]+$/.test(contentTrimmed) && contentTrimmed.length > 0 && contentTrimmed.length <= 10;
                                  const isHoursLike = /^\d{1,3}$/.test(contentTrimmed); // 1-3 digit numbers (hours, credits)

                                  // Detector de separadores (":" y similares)
                                  const isSeparator = contentTrimmed === ':' || (contentTrimmed.length <= 2 && !/[a-zA-Z0-9]/.test(contentTrimmed) && contentTrimmed.length > 0);

                                  const totalVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                                  const isSimpleRow = totalVisibleCols <= 4; // filas tipo etiqueta-valor

                                  // Estilo especial para primera sección (formulario)
                                  const isFirstSectionLabel = isFirstSection && isSimpleRow && cellIndex === 0;
                                  const isFirstSectionValue = isFirstSection && isSimpleRow && cellIndex > 0 && !isSeparator;

                                  // Detect if entire row is a "title row" (one visible cell spanning all columns)
                                  const totalVisibleInRow = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                                  const isTitleRow = totalVisibleInRow === 1 && cell.colSpan > 2;

                                  // Alignment: center numeric cells, center headers, center separators
                                  const cellAlign = isSeparator 
                                    ? 'center' 
                                    : (isNumericContent || isHoursLike) && !cell.isHeader && !isTitleRow
                                      ? 'center'
                                      : cell.isHeader && !isTitleRow
                                        ? 'center'
                                        : 'left';
                                  
                                  const cellVAlign = (isNumericContent || isHoursLike || cell.isHeader) ? 'middle' : 'top';

                                  // Build clean class names
                                  const cellTypeClass = isTitleRow ? 'syllabus-title-row'
                                    : isFirstSectionLabel ? 'syllabus-label-cell'
                                    : cell.isHeader && !isTitleRow ? 'syllabus-header-cell'
                                    : '';

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`syllabus-cell relative ${cellTypeClass} ${
                                        isTitleRow
                                          ? 'font-bold text-emerald-800'
                                          : isFirstSectionLabel 
                                            ? 'font-semibold text-slate-700'
                                            : isFirstSectionValue
                                              ? 'text-gray-800'
                                              : isSeparator
                                                ? 'syllabus-separator'
                                                : cell.isHeader 
                                                  ? 'font-semibold text-emerald-800' 
                                                  : (isNumericContent || isHoursLike)
                                                    ? 'text-gray-700 font-medium tabular-nums'
                                                    : 'text-gray-700'
                                      } ${isSelected ? 'syllabus-cell-selected' : ''} ${isReadOnly ? 'syllabus-cell-readonly cursor-not-allowed !text-gray-400 italic' : 'cursor-cell'}`}
                                      style={{ 
                                        padding: 0,
                                        textAlign: cellAlign as any,
                                        verticalAlign: cellVAlign,
                                      }}
                                      rowSpan={cell.rowSpan} 
                                      colSpan={cell.colSpan}
                                      onClick={(e) => handleCellClick(cell.id, e)}
                                      onDoubleClick={() => { setModalCell({ id: cell.id, content: displayContent, isEditable: cell.isEditable && !isReadOnly }); setEditContent(displayContent); }}
                                    >
                                      <div 
                                        className={`w-full h-full flex ${
                                          cellAlign === 'center' ? 'items-center justify-center' : 'items-start justify-start'
                                        } ${
                                          isTitleRow ? 'px-3 py-2' 
                                          : isSeparator ? 'px-0 py-0.5' 
                                          : isFirstSectionLabel ? 'px-2.5 py-2' 
                                          : cell.isHeader ? 'px-2 py-1.5' 
                                          : (isNumericContent || isHoursLike) ? 'px-1.5 py-1.5'
                                          : 'px-2.5 py-1.5'
                                        }`} 
                                        style={{ 
                                          writingMode: 'horizontal-tb', 
                                          transform: 'none',
                                          whiteSpace: 'pre-wrap', 
                                          overflow: 'hidden',
                                          lineHeight: isTitleRow ? '1.5' : cell.isHeader ? '1.35' : '1.45',
                                          fontSize: isTitleRow ? '11.5px' : isFirstSectionLabel ? '11px' : cell.isHeader ? '10px' : (isNumericContent || isHoursLike) ? '11px' : '11px',
                                          letterSpacing: cell.isHeader ? '0.015em' : isTitleRow ? '0.01em' : 'normal',
                                          textAlign: cellAlign,
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea 
                                            value={editContent} 
                                            onChange={(e) => setEditContent(e.target.value)} 
                                            autoFocus 
                                            onBlur={saveEdit} 
                                            className="syllabus-edit-input w-full min-h-[60px] p-2 text-xs resize-y border-emerald-200 focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-lg bg-white" 
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }} 
                                          />
                                        ) : (
                                          <div 
                                            className={`whitespace-pre-wrap break-words w-full ${cellAlign === 'center' ? 'text-center' : 'text-left'}`}
                                            style={{ wordBreak: 'break-word', lineHeight: 'inherit' }}
                                          >
                                            {isSeparator 
                                              ? <span className="text-slate-300 text-[10px] select-none">{displayContent}</span>
                                              : displayContent 
                                                ? displayContent 
                                                : <span className="text-gray-200/80 select-none text-[9px]">·</span>
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );})
                          )}
                        </tbody>
                      </table>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PANEL PREVIEW TABLAS JSZIP */}
              {showWordPreview && wordRawTables.length > 0 && (
                <Card className="mt-6 border-t-4 border-t-blue-600 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex justify-between text-blue-800">
                      <span><FileText className="inline h-5 w-5 mr-2" /> Tablas Nativas Extraídas ({wordRawTables.length})</span>
                      <Button variant="ghost" size="sm" onClick={() => setShowWordPreview(false)}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3 items-center">
                      {wordRawTables.map((table, tIdx) => {
                        // Solo mostrar T2-T5 (índices 1-4): las secciones principales del syllabus
                        if (tIdx === 0 || tIdx > 4) return null;
                        // Nombres fijos para las tablas del syllabus
                        const FIXED_NAMES: Record<number, string> = {
                          1: 'DATOS GENERALES',
                          2: 'ESTRUCTURA DE LA ASIGNATURA',
                          3: 'RESULTADOS Y EVALUACIÓN',
                          4: 'VISADO',
                        };
                        const sectionName = FIXED_NAMES[tIdx] || '';
                        return (
                          <button key={tIdx} className={`text-[10px] leading-tight px-2 py-1 rounded border transition-colors ${selectedWordTable === tIdx ? "bg-blue-600 text-white border-blue-600 font-semibold" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400"}`} onClick={() => { setSelectedWordTable(tIdx); setColumnMapping({}); }}>
                            <span className="font-medium">T{tIdx + 1}</span> <span className="text-[9px] opacity-75">({table.length}×{table[0]?.length || 0})</span>{sectionName ? <><br/><span className="text-[9px]">{sectionName}</span></> : ''}
                          </button>
                        );
                      })}
                      <button className="text-[10px] leading-tight px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors ml-1" onClick={() => { setWordRawTables([]); setSelectedWordTable(null); setShowWordPreview(false); }}>
                        🗑️ Limpiar todo
                      </button>
                    </div>

                    {selectedWordTable !== null && wordRawTables[selectedWordTable] && (
                      <div>
                        <div className="flex gap-2 mb-3">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow" onClick={() => {
                            const maxCols = Math.max(wordRawTables[selectedWordTable][0]?.length || 0, activeTab?.rows[0]?.cells.length || 0);
                            const directMap: Record<number, number> = {};
                            for (let c = 0; c < maxCols; c++) directMap[c] = c;
                            importarTablaWord(selectedWordTable, 0, directMap);
                          }}>
                            📥 Importar Directo (columna 1→1 exacta)
                          </Button>
                        </div>
                        
                        <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                          <table className="w-full border-collapse text-xs">
                            <tbody>
                              {wordRawTables[selectedWordTable].map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx === 0 ? "bg-blue-100 font-bold" : "bg-white hover:bg-gray-50"}>
                                  <td className="border px-1 py-0.5 text-gray-400 text-center w-8 bg-gray-100 sticky left-0 z-10">{rIdx}</td>
                                  {row.map((cell, cIdx) => {
                                    if (cell.isHidden) return null; // No dibujar celdas fantasma
                                    return (
                                      <td 
                                        key={cIdx} 
                                        rowSpan={cell.rowSpan} 
                                        colSpan={cell.colSpan} 
                                        className="border px-2 py-1 max-w-[200px] truncate" 
                                        title={cell.text}
                                      >
                                        {cell.text.substring(0, 80) || <span className="text-gray-300">—</span>}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      {modalCell && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={() => setModalCell(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="syllabus-accent-bar" />
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-b from-gray-50/60 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100/80 rounded-xl">
                  {modalCell.isEditable ? <PenLine className="h-4 w-4 text-emerald-700" /> : <Eye className="h-4 w-4 text-emerald-700" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-[15px]">{modalCell.isEditable ? 'Editar Celda' : 'Ver Contenido'}</h3>
                  <p className="text-[11px] text-gray-400">Doble clic en cualquier celda para abrir este editor</p>
                </div>
              </div>
              <button onClick={() => setModalCell(null)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 syllabus-scroll">
              {modalCell.isEditable 
                ? <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="syllabus-edit-input w-full min-h-[300px] p-4 text-sm border-gray-200 rounded-xl focus:ring-emerald-400 focus:border-emerald-400 font-mono leading-relaxed bg-white" autoFocus /> 
                : <div className="whitespace-pre-wrap text-sm text-gray-700 p-4 bg-gray-50/60 rounded-xl min-h-[200px] border border-gray-100 leading-relaxed">{modalCell.content}</div>
              }
            </div>
            <div className="flex justify-between items-center gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/40">
              <span className="text-[11px] text-gray-400 tabular-nums">{editContent.length} caracteres</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalCell(null)} className="rounded-xl border-gray-200 h-9">Cancelar</Button>
                {modalCell.isEditable && <Button className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm h-9" onClick={saveModalEdit}><Save className="h-4 w-4 mr-1.5" /> Guardar</Button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}