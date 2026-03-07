"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, Lock, Unlock, FileDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

// --- INTERFACES ---
interface TableCell {
  id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number;
  isEditable: boolean; backgroundColor?: string; textColor?: string; fontSize?: string;
  fontWeight?: string; textAlign?: string; textOrientation?: 'horizontal' | 'vertical';
}
interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface SyllabusData {
  id?: string | number; name?: string; description?: string; tabs: TabData[];
  metadata?: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; };
  version?: string;
}

// Campos que el docente PUEDE editar en el syllabus
const DOCENTE_EDITABLE_LABELS = [
  "PARALELO", "PARALELOS", "PARALELO/S",
  "HORARIO DE CLASES", "HORARIO DE CLASE", "HORARIO CLASES",
  "HORARIO PARA TUTORÍAS", "HORARIO TUTORÍAS", "HORARIO TUTORIAS", "HORARIO PARA TUTORIAS",
  "PERFIL DEL PROFESOR", "PERFIL PROFESOR", "PERFIL DOCENTE", "PROFESOR",
  "HD. PRESENCIAL", "HD PRESENCIAL", "HORAS PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA", "HORAS SINCRONICA",
  "PFAE", "PRÁCTICAS DE APLICACIÓN",
  "TA", "TRABAJO AUTÓNOMO",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS", "METODOLOGIA", "METODOLOGÍAS DE ENSEÑANZA",
  "RECURSOS DIDÁCTICOS", "RECURSOS DIDACTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO", "ESCENARIOS DE APRENDIZAJE",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA", "BIBLIOGRAFIA", "BIBLIOGRAFIAS", "FUENTES DE CONSULTA",
  "FECHA/PARALELO", "FECHA", "FECHA / PARALELO",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS EVALUACION", "CRITERIOS DE EVALUACION",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS EVALUACION", "INSTRUMENTOS DE EVALUACION",
  "CONTENIDOS", "CONTENIDO",
]

// Headers de columnas editables (para tablas con headers)
const DOCENTE_EDITABLE_HEADERS = [
  "HD. PRESENCIAL", "HD PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA",
  "PFAE", "TA",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS",
  "RECURSOS DIDÁCTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA",
  "FECHA/PARALELO", "FECHA",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS",
  "CONTENIDOS", "CONTENIDO",
]

export default function DocenteEditorSyllabusPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [profesorInfo, setProfesorInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [syllabus_comision_id, setSyllabusComisionId] = useState<number | null>(null)
  const [hasDocenteVersion, setHasDocenteVersion] = useState(false)
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const authToken = getToken() || token
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, ...options.headers }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data
  }

  // Cargar periodos
  useEffect(() => {
    const loadPeriodos = async () => {
      try {
        const res = await apiRequest('/periodo')
        const data = Array.isArray(res) ? res : (res.data || [])
        setPeriodos(data)
        if (data.length > 0 && !selectedPeriod) {
          setSelectedPeriod(String(data[0].id))
        }
      } catch (e) { console.error('Error cargando periodos:', e) }
    }
    loadPeriodos()
  }, [])

  // Cargar info del profesor
  useEffect(() => {
    const loadProfesor = async () => {
      try {
        const res = await apiRequest('/docente-editor/mi-info')
        if (res.success) {
          setProfesorInfo(res.data)
          const asigs = res.data.todas_asignaturas || []
          const primaryId = res.data.asignatura_id || res.data.asignatura?.id
          if (primaryId) {
            setSelectedAsignaturaId(String(primaryId))
          } else if (asigs.length > 0) {
            setSelectedAsignaturaId(String(asigs[0].id))
          }
        }
      } catch (e) { console.error('Error cargando info profesor:', e) }
    }
    loadProfesor()
  }, [])

  // Cargar syllabus cuando cambia el periodo o asignatura
  useEffect(() => {
    if (!selectedPeriod || !profesorInfo || !selectedAsignaturaId) return
    loadSyllabus()
  }, [selectedPeriod, profesorInfo, selectedAsignaturaId])

  const loadSyllabus = async () => {
    setLoading(true)
    setError(null)

    const asignaturaId = selectedAsignaturaId
    if (!asignaturaId) {
      setError("No tienes una asignatura asignada. Contacta al administrador.")
      setLoading(false)
      return
    }

    try {
      // 1. Primero buscar si el docente ya tiene una versión guardada
      try {
        const docenteRes = await apiRequest(`/docente-editor/syllabus/mio?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (docenteRes.success && docenteRes.data?.datos_syllabus) {
          let datos = docenteRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)
          processSyllabusData(datos)
          setSyllabusComisionId(docenteRes.data.syllabus_comision_id)
          setHasDocenteVersion(true)
          setLoading(false)
          return
        }
      } catch (e) { /* No tiene versión propia, buscar la de comisión */ }

      // 2. Buscar syllabus de la comisión
      const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
      if (comisionRes.success && comisionRes.data?.datos_syllabus) {
        let datos = comisionRes.data.datos_syllabus
        if (typeof datos === 'string') datos = JSON.parse(datos)
        processSyllabusData(datos)
        setSyllabusComisionId(comisionRes.data.id)
        setHasDocenteVersion(false)
      } else {
        setError("No se encontró syllabus para tu asignatura en este periodo.")
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar syllabus")
    } finally {
      setLoading(false)
    }
  }

  const processSyllabusData = (datos: any) => {
    let parsed: SyllabusData

    if (datos.tabs) {
      parsed = {
        ...datos,
        tabs: datos.tabs.map((t: any) => ({
          ...t,
          rows: (t.rows || []).map((r: any) => ({
            ...r,
            cells: (r.cells || []).map((c: any) => ({
              ...c,
              backgroundColor: c.backgroundColor || c.styles?.backgroundColor,
              textOrientation: c.textOrientation || c.styles?.textOrientation || 'horizontal',
              isEditable: true
            }))
          }))
        }))
      }
    } else {
      setError("Formato de syllabus no reconocido")
      return
    }

    setSyllabusData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  // Determinar si una celda es editable para el docente
  const isDocenteEditable = (cell: TableCell, rowIndex: number, cellIndex: number, allRows: TableRow[]): boolean => {
    if (!allRows || allRows.length === 0) return false
    
    const currentRow = allRows[rowIndex]
    if (!currentRow) return false
    
    // Revisar si la celda de la izquierda (misma fila) es una etiqueta editable
    if (cellIndex > 0) {
      const leftCell = currentRow.cells[cellIndex - 1]
      if (leftCell) {
        const label = leftCell.content?.toUpperCase().trim() || ""
        if (DOCENTE_EDITABLE_LABELS.some(l => label.includes(l) || l.includes(label))) {
          return true
        }
      }
    }

    // Revisar si hay headers en las primeras filas que coincidan
    // Buscar la fila de headers (usualmente fila 0 o 1)
    for (let headerRow = 0; headerRow < Math.min(3, allRows.length); headerRow++) {
      const hRow = allRows[headerRow]
      if (!hRow) continue
      
      // Verificar si la celda en la misma columna del header es editable
      if (cellIndex < hRow.cells.length) {
        const headerCell = hRow.cells[cellIndex]
        if (headerCell) {
          const headerLabel = headerCell.content?.toUpperCase().trim() || ""
          if (DOCENTE_EDITABLE_HEADERS.some(h => headerLabel.includes(h) || h.includes(headerLabel))) {
            // Solo aplicar si estamos después de la fila de headers
            if (rowIndex > headerRow) return true
          }
        }
      }
    }

    // Permitir editar en celdas del "Contenidos" section (filas después de la header de contenidos)
    // Buscar si estamos en una sección de contenidos
    for (let r = rowIndex; r >= 0; r--) {
      const row = allRows[r]
      if (!row) continue
      for (const c of row.cells) {
        const label = c.content?.toUpperCase().trim() || ""
        if (label.includes("CONTENIDO") || label.includes("UNIDAD")) {
          // Estamos en la sección de contenidos, verificar columna
          if (cellIndex > 0) return true // Cualquier columna después de la primera en contenidos
        }
      }
    }

    return false
  }

  const activeTab = syllabusData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Edición de celdas
  const startEdit = (cellId: string, content: string) => {
    setEditingCell(cellId)
    setEditContent(content)
  }

  const saveEdit = () => {
    if (!editingCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === editingCell ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setEditingCell(null)
    setEditContent("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditContent("")
  }

  const saveModalEdit = () => {
    if (!modalCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === modalCell.id ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setModalCell(null)
    setEditContent("")
  }

  // Guardar
  const handleSave = async () => {
    if (!syllabusData) return alert("No hay syllabus para guardar.")
    if (!selectedPeriod) return alert("Seleccione un periodo.")

    const asignaturaId = selectedAsignaturaId
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0-docente",
        metadata: syllabusData.metadata,
        tabs: syllabusData.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell,
              styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      }

      await apiRequest('/docente-editor/syllabus/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignatura_id: asignaturaId,
          periodo: selectedPeriod,
          nombre: syllabusData.name || 'Syllabus Docente',
          datos_syllabus: datosParaGuardar,
          syllabus_comision_id: syllabus_comision_id
        })
      })

      setHasDocenteVersion(true)
      alert("Syllabus guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ==============================
  // EXPORTAR PDF — Syllabus
  // ==============================
  const handleExportPDF = () => {
    if (!syllabusData) return;

    const allTabs = syllabusData.tabs;
    let tablesHtml = '';

    for (let tabIdx = 0; tabIdx < allTabs.length; tabIdx++) {
      const tab = allTabs[tabIdx];
      if (!tab || !tab.rows || tab.rows.length === 0) continue;

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

          let rawContent = cell.content || '';
          // Auto-fill profesor info for PDF
          if (rowIdx <= 5 && cellIdx > 0 && profesorInfo) {
            const prevCell = row.cells[cellIdx - 1];
            const etiqueta = (prevCell?.content || '').toUpperCase().trim();
            if (etiqueta.includes('PARALELO') && profesorInfo.paralelo?.nombre && !rawContent.trim()) {
              rawContent = profesorInfo.paralelo.nombre;
            }
            if ((etiqueta.includes('PROFESOR') || etiqueta.includes('DOCENTE')) && !etiqueta.includes('PERFIL') && !rawContent.trim()) {
              rawContent = `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim();
            }
          }

          const content = rawContent.replace(/\n/g, '<br/>');

          const bg = cell.backgroundColor || (isHeader ? '#D9E2EC' : '#fff');
          const color = cell.textColor || '#000';
          const fw = isHeader ? 'bold' : 'normal';
          const ta = isSep || isHeader || isVertical ? 'center' : (cell.textAlign || 'left');
          const fs = isVertical ? vertFontSize : baseFontSize;
          const pad = isVertical ? '2px 1px' : (isSep ? '1px 2px' : (isWideTable ? '2px 4px' : '4px 6px'));

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

    const syllabusName = syllabusData.name || 'Syllabus';
    const asignaturaNombre = profesorInfo?.asignatura?.nombre || profesorInfo?.todas_asignaturas?.[0]?.nombre || '';
    const periodoNombre = periodos.find((p: any) => String(p.id) === selectedPeriod)?.nombre || '';

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Syllabus - ${asignaturaNombre}</title>
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
    font-size: 9pt;
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
      <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANAB\u00CD</h1>
      <h2>SYLLABUS</h2>
      <p>${asignaturaNombre}${periodoNombre ? ' - ' + periodoNombre : ''}</p>
    </div>
  </div>
  ${tablesHtml}
</body>
</html>`;

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) { alert('Permite ventanas emergentes para generar el PDF.'); return; }
    w.document.write(htmlDoc);
    w.document.close();
    const triggerPrint = () => { try { w.focus(); w.print(); } catch(_){} };
    w.onload = () => setTimeout(triggerPrint, 400);
    setTimeout(triggerPrint, 1500);
  };

  // Auto-fill content for profesor info
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    if (rowIndex <= 5 && cellIndex > 0 && profesorInfo) {
      const currentRow = tableData[rowIndex]
      if (!currentRow) return cell.content || ""
      const prevCell = currentRow.cells[cellIndex - 1]
      const etiqueta = prevCell?.content?.toUpperCase().trim() || ""
      
      if (etiqueta.includes("PARALELO") && profesorInfo.paralelo?.nombre) {
        return profesorInfo.paralelo.nombre
      }
      if ((etiqueta.includes("PROFESOR") || etiqueta.includes("DOCENTE")) && !etiqueta.includes("PERFIL")) {
        return `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim()
      }
    }
    return cell.content || ""
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/docente">
                <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editor de Syllabus</h1>
                <p className="text-sm text-gray-500">
                  {profesorInfo ? `${profesorInfo.nombres} ${profesorInfo.apellidos}` : 'Cargando...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Selector de asignatura cuando tiene múltiples */}
              {profesorInfo?.todas_asignaturas?.length > 1 && (
                <Select value={selectedAsignaturaId} onValueChange={setSelectedAsignaturaId}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Asignatura" /></SelectTrigger>
                  <SelectContent>
                    {profesorInfo.todas_asignaturas.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[250px]"><SelectValue placeholder="Periodo" /></SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleExportPDF} variant="outline" disabled={!syllabusData}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !syllabusData}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del syllabus.
            </div>
          )}

          {/* Legend */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Unlock className="h-4 w-4 text-green-600" /> Campos editables (verde)</span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-gray-400" /> Campos de solo lectura (gris)</span>
            </div>
            <p className="mt-1 text-amber-700 text-xs">
              Puedes editar: Paralelo, Horario, Perfil del profesor, Contenidos (HD, PFAE, TA), Metodologías, Recursos, Escenario, Bibliografía, Fecha, Criterios e Instrumentos de evaluación.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando syllabus...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadSyllabus} variant="outline">Reintentar</Button>
            </div>
          )}

          {!loading && !error && syllabusData && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
                {syllabusData.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-4 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>

              {/* Table */}
              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[75vh] overflow-y-auto">
                      <table className="border-collapse text-xs text-left w-full">
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr><td className="p-12 text-center text-gray-500">La tabla está vacía.</td></tr>
                          ) : (
                            tableData.map((row, rowIndex) => (
                              <tr key={row.id} className="hover:bg-slate-50/50">
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

                                  const editable = isDocenteEditable(cell, rowIndex, cellIndex, tableData)
                                  const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex)
                                  const isVertical = cell.textOrientation === 'vertical'

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative align-top ${
                                        editable
                                          ? 'border-green-300 bg-green-50/50 cursor-cell hover:bg-green-100/50'
                                          : cell.isHeader
                                            ? 'border-gray-300 bg-gray-100/80 font-bold text-black text-center'
                                            : 'border-gray-200 bg-gray-50/50 text-gray-600'
                                      }`}
                                      style={{
                                        backgroundColor: cell.backgroundColor || undefined,
                                        padding: 0,
                                        minWidth: isVertical ? '28px' : '40px',
                                      }}
                                      rowSpan={cell.rowSpan}
                                      colSpan={cell.colSpan}
                                      onDoubleClick={() => {
                                        if (editable) {
                                          setModalCell({ id: cell.id, content: displayContent, isEditable: true })
                                          setEditContent(displayContent)
                                        }
                                      }}
                                    >
                                      <div
                                        className={`w-full h-full px-1 py-0.5 flex ${cell.isHeader ? 'justify-center text-center' : 'justify-start text-left'}`}
                                        style={{
                                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                                          transform: isVertical ? 'rotate(180deg)' : 'none',
                                          alignItems: 'flex-start',
                                          maxHeight: isVertical ? '100px' : 'none',
                                          whiteSpace: isVertical ? 'nowrap' : 'pre-wrap',
                                          overflow: 'hidden',
                                          lineHeight: '1.15',
                                          fontSize: isVertical ? '9px' : '11px',
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            autoFocus
                                            onBlur={saveEdit}
                                            className="w-full min-h-[50px] p-1 text-xs resize-y"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                              if (e.key === "Escape") cancelEdit();
                                            }}
                                          />
                                        ) : (
                                          <div className="whitespace-pre-wrap break-words w-full" style={{ wordBreak: 'break-word', lineHeight: '1.15' }}>
                                            {displayContent || <span className="opacity-0">.</span>}
                                            {editable && !displayContent && (
                                              <span className="text-green-400 italic text-[9px]">Doble clic para editar</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {!editable && (
                                        <div className="absolute top-0 right-0 p-0.5">
                                          <Lock className="h-2.5 w-2.5 text-gray-300" />
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))
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

        {/* Modal de edición */}
        {modalCell && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalCell(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
                <h3 className="text-lg font-bold text-emerald-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                {modalCell.isEditable ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg"
                    autoFocus
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 p-3 bg-gray-50 rounded-lg min-h-[200px]">
                    {modalCell.content}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                {modalCell.isEditable && (
                  <Button className="bg-emerald-600 text-white" onClick={saveModalEdit}>
                    <Save className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
