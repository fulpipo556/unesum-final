"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Home } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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
interface ProgramaAnaliticoData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { carrera?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedProgramaAnaliticoRecord { id: number; nombre: string; periodo: string; carrera: string; datos_programa: ProgramaAnaliticoData; created_at: string; updated_at: string; }

export default function EditorProgramaAnaliticoPage() {
  const { token, getToken } = useAuth()
  const router = useRouter()
  
  // --- ESTADOS ---
  const [programas, setProgramas] = useState<ProgramaAnaliticoData[]>([])
  const [activeProgramaAnaliticoId, setActiveProgramaAnaliticoId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedProgramas, setsavedProgramas] = useState<SavedProgramaAnaliticoRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showProgramaAnaliticoSelector, setShowProgramaAnaliticoSelector] = useState(false)
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tempTabTitle, setTempTabTitle] = useState("")

  const [isListLoading, setIsListLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeProgramaAnalitico = programas.find((s) => s.id === activeProgramaAnaliticoId);
  const activeTab = activeProgramaAnalitico?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];

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
        
        setsavedProgramas(programasArray);
        setPeriodos(periodosArray);
        
        console.log('Datos cargados:', {
          programas: programasArray.length,
          periodos: periodosArray.length,
          periodosData: periodosArray
        });
      } catch (error) { 
        console.error("âŒ Error al cargar datos:", error); 
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

  // --- API ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolviÃ³ JSON.");
    }

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición al API.")
    return data
  }

  const handleSaveToDB = async () => {
    if (!activeProgramaAnalitico) return alert("No hay un Programa Analitico activo para guardar.")
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

      const payload = {
        nombre: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        periodo: selectedPeriod,
        carrera: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        datos_programa: datosParaGuardar
      }
      
      const isUpdate = typeof activeProgramaAnalitico.id === "number"
      const endpoint = isUpdate ? `/api/programa-analitico/${activeProgramaAnalitico.id}` : "/api/programa-analitico"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      console.log("📥 Respuesta del servidor:", result);
      
      const savedRecord = result.data as SavedProgramaAnaliticoRecord;
      console.log("📋 Registro guardado:", savedRecord);
      
      if (!savedRecord || !savedRecord.datos_programa) {
        throw new Error("El servidor no devolvió los datos esperados");
      }
      
      const savedUIData = savedRecord.datos_programa;
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

      setProgramas((prev) => prev.map((s) => (s.id === activeProgramaAnaliticoId ? savedUIData : s)))
      setActiveProgramaAnaliticoId(savedUIData.id)
      
      if (isUpdate) {
        setsavedProgramas(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setsavedProgramas(prev => [savedRecord, ...prev]);
      }
      
      alert("Programa Analitico guardado exitosamente!")
      
      // Regresar a la vista principal después de guardar
      setActiveProgramaAnaliticoId(null)
      setProgramas([])
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<ProgramaAnaliticoData>) => {
    setProgramas(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'carrera' | 'level', value: string) => {
    if (!activeProgramaAnalitico) return;
    const updatedMetadata = { ...activeProgramaAnalitico.metadata, [field]: value };
    updateProgramaAnalitico(activeProgramaAnalitico.id, field === 'carrera' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadPrograma = (ProgramaAnaliticoId: string) => {
    console.log("ðŸ” handleLoadPrograma - ID recibido:", ProgramaAnaliticoId);
    console.log("ðŸ“š savedProgramas disponibles:", savedProgramas.length);
    
    if (!ProgramaAnaliticoId) {
      console.error("âŒ No se proporcionÃ³ ProgramaAnaliticoId");
      return;
    }
    
    const id = parseInt(ProgramaAnaliticoId, 10);
    console.log("ðŸ”¢ ID parseado:", id);
    
    // Comparar convirtiendo ambos a nÃºmero
    const ProgramaAnaliticoToLoad = savedProgramas.find(s => Number(s.id) === id);
    console.log("ðŸ“– ProgramaAnalitico encontrado:", ProgramaAnaliticoToLoad ? "SÃ" : "NO");
    
    if (ProgramaAnaliticoToLoad) {
      console.log("âœ… Cargando ProgramaAnalitico:", ProgramaAnaliticoToLoad.nombre);
      const editorData = ProgramaAnaliticoToLoad.datos_programa;
      editorData.id = ProgramaAnaliticoToLoad.id;
      if (!editorData.tabs || editorData.tabs.length === 0) {
         editorData.tabs = [{ id: `tab-${Date.now()}`, title: "General", rows: (editorData as any).rows || [] }];
      }
      setProgramas([editorData]);
      setActiveProgramaAnaliticoId(editorData.id);
      setActiveTabId(editorData.tabs[0]?.id || null);
      
      // Establecer el periodo seleccionado
      setSelectedPeriod(ProgramaAnaliticoToLoad.periodo);
      console.log("âœ… ProgramaAnalitico cargado exitosamente, periodo:", ProgramaAnaliticoToLoad.periodo);
    } else {
      console.error("âŒ No se encontrÃ³ el ProgramaAnalitico con ID:", id);
      console.log("ðŸ“‹ IDs disponibles:", savedProgramas.map(s => s.id));
    }
  };

  // --- IMPORTACIÃ“N MAESTRA V8: HEURÃSTICA DE ESTRUCTURA Y VERTICALIDAD ---
  const handleProgramaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);
    try {
      const { value: html } = await mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        { 
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Title'] => h1:fresh",
            "b => strong",
            // Forzar detecciÃ³n de celdas de encabezado si el word tiene estilo "Header"
            "table.header => thead" 
          ]
        }
      );

      const doc = new DOMParser().parseFromString(html, "text/html");
      const findValue = (k: string) => Array.from(doc.querySelectorAll("p, td, th"))
        .find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim().replace(/^[:\s]+/, "") || "";
      
      const meta = { 
        carrera: findValue("Nombre de la asignatura") || findValue("Materia") || "", 
        period: findValue("Periodo") || "", level: findValue("Nivel") || "" 
      };

      console.log("--- INICIANDO ESCANEO AVANZADO ---");
      
      const newTabs: TabData[] = [];
      let currentSectionTitle = "PRINCIPAL"; 
      let hasAssignedTableToTitle = true; 

      const elements = Array.from(doc.body.children);

      elements.forEach((element, idx) => {
        const tagName = element.tagName;
        const text = element.textContent?.replace(/\n/g, " ").replace(/\s+/g, " ").trim() || "";
        const textUpper = text.toUpperCase();

        // 1. SI ES TABLA
        if (tagName === "TABLE") {
             const rowsRaw = Array.from(element.querySelectorAll("tr"));
             const tableContent = rowsRaw.map(r => r.textContent).join(" ").toUpperCase();
             // Filtro de tablas basura
             const isJunkTable = (tableContent.includes("UNIVERSIDAD") || tableContent.includes("ProgramaAnalitico")) && rowsRaw.length < 6;

             if (isJunkTable) return; 
             
             // --- LÃ“GICA DE DETECCIÃ“N DE ESTRUCTURA ---
             const rows: TableRow[] = rowsRaw.map((tr, rIdx) => ({
                id: `row-${newTabs.length}-${rIdx}-${Date.now()}`,
                cells: Array.from(tr.querySelectorAll("td, th")).map((td, cIdx) => {
                  const content = td.textContent?.trim() || "";
                  const contentUpper = content.toUpperCase();
                  
                  // DETECCIÃ“N DE ENCABEZADO
                  // En tablas complejas (como la imagen), las primeras filas suelen ser encabezados
                  const hasBold = !!td.querySelector("strong, b");
                  // Consideramos header si estÃ¡ en negrita, es <th> o estÃ¡ en las primeras 2 filas de una tabla compleja
                  const isHeader = td.tagName === "TH" || hasBold || (rowsRaw.length > 3 && rIdx <= 1);

                  // DETECCIÃ“N DE VERTICAL (PALABRAS CLAVE)
                  // Solo estas palabras EXACTAS deben ser verticales
                  const verticalKeywords = ["PRESENCIAL", "SINCRÃ“NICA", "SINCRONICA", "PFAE", "TA"];
                  
                  let guessVertical = false;
                  // ComparaciÃ³n exacta: solo si el contenido ES exactamente una de estas palabras
                  if (isHeader) {
                      const contentTrimmed = contentUpper.trim();
                      guessVertical = verticalKeywords.includes(contentTrimmed);
                  }
                  return {
                    id: `cell-${newTabs.length}-${rIdx}-${cIdx}-${Date.now()}`,
                    content: content,
                    isHeader: isHeader, 
                    rowSpan: parseInt(td.getAttribute("rowspan") || "1"),
                    colSpan: parseInt(td.getAttribute("colspan") || "1"),
                    isEditable: true,
                    textOrientation: guessVertical ? 'vertical' : 'horizontal' 
                  };
                }),
              }));

             if (rows.length > 0) {
                 newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: rows });
                 hasAssignedTableToTitle = true; 
             }
             return;
        }

        // 2. SI ES TEXTO
        const isIgnored = text.length < 3 || textUpper.includes("UNIVERSIDAD") || textUpper.includes("ProgramaAnalitico") || tagName === "IMG";

        if (!isIgnored) {
            const startsWithNumber = /^\d/.test(text); 
            const isHeaderTag = ['H1','H2','H3','H4'].includes(tagName);
            const isList = tagName === "UL" || tagName === "OL";
            const isUppercaseTitle = (text === textUpper) && text.length < 100;
            const hasBold = !!element.querySelector('strong') || !!element.querySelector('b');

            let isNewTitle = startsWithNumber || isHeaderTag || isList || isUppercaseTitle || hasBold;

            if (!hasAssignedTableToTitle && isNewTitle) {
                if (!startsWithNumber && !isHeaderTag && !isList) {
                    isNewTitle = false;
                }
            }

            if (isNewTitle) {
                let cleanTitle = text.replace(/[:]+$/, '');
                if (isList) cleanTitle = element.querySelector("li")?.textContent?.trim().replace(/[:]+$/, '') || cleanTitle;
                
                currentSectionTitle = cleanTitle;
                hasAssignedTableToTitle = false; 
            } else if (!hasAssignedTableToTitle && text.length > 0) {
                const fakeRow: TableRow = {
                    id: `row-fake-${Date.now()}`,
                    cells: [{
                        id: `cell-fake-${Date.now()}`,
                        content: text, 
                        isHeader: false,
                        rowSpan: 1,
                        colSpan: 1,
                        isEditable: true,
                        textOrientation: 'horizontal'
                    }]
                };
                newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: [fakeRow] });
                hasAssignedTableToTitle = true; 
            }
        }
      });

      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se encontraron datos vÃ¡lidos.");
      }

      const newData: ProgramaAnaliticoData = {
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.carrera || `ProgramaAnalitico de ${file.name}`,
        description: "Importado",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setProgramas([newData]);
      setActiveProgramaAnaliticoId(newData.id);
      setActiveTabId(newTabs[0]?.id || null);

    } catch (e) { console.error(e); alert("Error crÃ­tico."); } 
    finally { setIsLoading(false); }
  };

  // --- MÃ‰TODOS DE EDICIÃ“N ---
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
    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin TÃ­tulo" } : tab);
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
  const handleCellClick = (id: string, e: React.MouseEvent) => { e.ctrlKey||e.metaKey ? setSelectedCells(p => p.includes(id)?p.filter(i=>i!==id):[...p,id]) : setSelectedCells([id]) }
  
  const addRowAt=(idx:number)=>{if(!tableData.length)return;const rId=`r-${Date.now()}`,nCols=tableData[0].cells.reduce((a,c)=>a+c.colSpan,0);const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0}))};const nRows=[...tableData];nRows.splice(idx,0,nR);handleUpdateActiveTabRows(nRows)}
  const addColumnAt=(idx:number)=>{const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});handleUpdateActiveTabRows(updated)}
  
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

  const handlePrintToPdf = () => { 
    if(!activeProgramaAnalitico || !activeTab) return;
    const doc=new jsPDF(); doc.setFontSize(18); doc.text(activeProgramaAnalitico.name, 14, 22); doc.setFontSize(12); doc.text(`SecciÃ³n: ${activeTab.title}`, 14, 30); 
    const body = activeTab.rows.map(r => r.cells.map(c => ({ content: c.content, rowSpan: c.rowSpan, colSpan: c.colSpan, _raw: c })));
    autoTable(doc, { body: body as any, startY: 40, theme: 'grid', didParseCell: d => { 
       const c=(d.cell.raw as any)._raw as TableCell;
       if(c){ if(c.isHeader){d.cell.styles.fontStyle='bold';d.cell.styles.fillColor='#F3F4F6'} if(c.backgroundColor)d.cell.styles.fillColor=c.backgroundColor; }
    } });
    doc.save(`${activeProgramaAnalitico.name}_${activeTab.title}.pdf`);
  }

  // --- FUNCIONES ADICIONALES ---
  const handleDuplicatePrograma = async (ProgramaAnaliticoId: number) => {
    const ProgramaAnaliticoToClone = savedProgramas.find(s => s.id === ProgramaAnaliticoId);
    if (!ProgramaAnaliticoToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(ProgramaAnaliticoToClone.datos_programa));
      clonedData.id = `ProgramaAnalitico-${Date.now()}`;
      clonedData.name = `${ProgramaAnaliticoToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      // Guardar automÃ¡ticamente en el backend
      const payload = {
        nombre: clonedData.name,
        periodo: ProgramaAnaliticoToClone.periodo,
        carrera: ProgramaAnaliticoToClone.carrera,
        datos_programa: clonedData
      };
      
      const result = await apiRequest('/api/programa-analitico', { method: 'POST', body: JSON.stringify(payload) });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setsavedProgramas(programasArray);
      
      alert("Programa Analitico duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeletePrograma = async (ProgramaAnaliticoId: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este Programa Analitico? Esta acción no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/programa-analitico/${ProgramaAnaliticoId}`, { method: 'DELETE' });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setsavedProgramas(programasArray);
      
      alert("Programa Analitico eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPrograma = (ProgramaAnaliticoId: number) => {
    console.log("Editando Programa Analitico ID:", ProgramaAnaliticoId);
    handleLoadPrograma(ProgramaAnaliticoId.toString());
    setShowProgramaAnaliticoSelector(false);
  };

  const handleNewPrograma = () => {
    setShowProgramaAnaliticoSelector(true);
  };

  const programasFiltered = selectedPeriod 
    ? savedProgramas.filter(s => s.periodo === selectedPeriod)
    : savedProgramas;
  
  return (
    <ProtectedRoute allowedRoles={["administrador", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeProgramaAnalitico ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Programa Analítico</span>
                    <div className="flex gap-2">
                      <Button onClick={() => router.push('/dashboard/admin')} variant="outline">
                        <Home className="h-4 w-4 mr-2" /> Menú
                      </Button>
                      <Button onClick={handleNewPrograma} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activeProgramaAnalitico} className="bg-emerald-600 hover:bg-emerald-700">
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
                        <span className="truncate">{uploadedFileName || "Seleccionar Programa Analítico"}</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowProgramaAnaliticoSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleProgramaUpload(e); setShowProgramaAnaliticoSelector(false); }} className="hidden" />
                      
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
                                  <p className="text-sm text-gray-500">{s.periodo} - {s.carrera}</p>
                                </div>
                                <Button onClick={() => { handleLoadPrograma(s.id.toString()); setShowProgramaAnaliticoSelector(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                                  Seleccionar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay programas analíticos disponibles</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de Programa Analítico Creados */}
              <Card>
                <CardHeader>
                  <CardTitle>Programas Analíticos Creados</CardTitle>
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
                              <td className="px-4 py-3">{s.carrera}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(s.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditPrograma(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Pencil className="h-4 w-4 mr-1" /> Modificar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDuplicatePrograma(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Copy className="h-4 w-4 mr-1" /> Duplicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeletePrograma(s.id)} className="text-red-600 hover:text-red-700">
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
                      <p className="text-gray-500">No hay programas analíticos creados aún</p>
                      <Button onClick={handleNewPrograma} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer Programa Analítico
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
                       <Button onClick={() => router.push('/dashboard/admin')} variant="outline">
                        <Home className="h-4 w-4 mr-2" /> Menú
                      </Button>
                       <Button onClick={() => { setActiveProgramaAnaliticoId(null); setProgramas([]); }} variant="outline" size="sm"> <Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-emerald-600 hover:bg-emerald-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
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
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila â†‘</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila â†“</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col â†</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col â†’</Button>
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
                          {tableData.map((row) => {
                            const isFormRow = row.cells.length === 3 && row.cells[1].content.trim() === ':';

                            return (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                {row.cells.map((cell, index) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                                  
                                  const isSelected = selectedCells.includes(cell.id);
                                  const isHeader = cell.isHeader;
                                  const isSeparator = cell.content.trim() === ':';
                                  const isVertical = cell.textOrientation === 'vertical';

                                  // --- LÃ“GICA DE ANCHOS ---
                                  let widthStyle = 'auto';
                                  let minWidthStyle = 'auto';

                                  if (isFormRow) {
                                    if (index === 0) widthStyle = '20%';      
                                    else if (index === 1) widthStyle = '1%';  
                                    else widthStyle = 'auto';                 
                                  } else {
                                    if (isVertical) {
                                        minWidthStyle = '40px';
                                        widthStyle = '1%'; 
                                    } else if (cell.content.length > 5 || isHeader) {
                                        minWidthStyle = '120px'; 
                                    } else {
                                        minWidthStyle = '40px';
                                    }
                                  }
                                  
                                  // --- ALINEACIÃ“N: CENTRAR TÃTULOS Y VERTICALES ---
                                  let justifyContent = 'justify-start'; 
                                  if (isHeader || isSeparator || isVertical) justifyContent = 'justify-center';
                                  
                                  return (
                                    <td 
                                      key={cell.id} 
                                      className={`
                                        border border-gray-200 
                                        relative transition-all duration-75 ease-in-out
                                        ${isHeader ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"}
                                        ${isSelected ? "ring-2 ring-inset ring-emerald-500 z-10" : ""}
                                      `}
                                      style={{ 
                                        backgroundColor: cell.backgroundColor || (isHeader ? '#f9fafb' : '#ffffff'),
                                        color: cell.textColor, 
                                        width: widthStyle,
                                        minWidth: minWidthStyle, 
                                        whiteSpace: isSeparator ? 'nowrap' : 'normal',
                                        padding: 0, 
                                        height: '1px', 
                                      }} 
                                      rowSpan={cell.rowSpan || 1} 
                                      colSpan={cell.colSpan || 1} 
                                      onClick={(e) => handleCellClick(cell.id, e)} 
                                      onDoubleClick={() => cell.isEditable && startEditing(cell.id, cell.content)}
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
                                            className="w-full min-h-[60px] p-1 bg-white border-emerald-400 focus:ring-0 text-sm resize-none shadow-sm leading-normal"
                                            style={{ writingMode: 'horizontal-tb', transform: 'none' }} 
                                            onKeyDown={(e) => { 
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } 
                                              if (e.key === "Escape") { cancelEdit(); } 
                                            }}
                                          />
                                        ) : (
                                          <div className="whitespace-pre-wrap leading-normal break-words">
                                            {cell.content || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            );
                          })}
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
    </ProtectedRoute>
  )
}



