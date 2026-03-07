"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, FileDown } from "lucide-react"
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
interface ProgramaData {
  id?: string | number; name?: string; description?: string; tabs: TabData[];
  metadata?: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; };
  version?: string;
}

export default function DocenteEditorProgramaAnaliticoPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [programaData, setProgramaData] = useState<ProgramaData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [profesorInfo, setProfesorInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [programa_comision_id, setProgramaComisionId] = useState<number | null>(null)
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
          // Auto-seleccionar la primera asignatura disponible
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

  // Cargar programa cuando cambia el periodo o asignatura seleccionada
  useEffect(() => {
    if (!selectedPeriod || !profesorInfo || !selectedAsignaturaId) return
    loadPrograma()
  }, [selectedPeriod, profesorInfo, selectedAsignaturaId])

  const loadPrograma = async () => {
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
        const docenteRes = await apiRequest(`/docente-editor/programa/mio?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (docenteRes.success && docenteRes.data?.datos_programa) {
          let datos = docenteRes.data.datos_programa
          if (typeof datos === 'string') datos = JSON.parse(datos)
          processProgramaData(datos)
          setProgramaComisionId(docenteRes.data.programa_comision_id)
          setHasDocenteVersion(true)
          setLoading(false)
          return
        }
      } catch (e) { /* No tiene versión propia, buscar la de comisión */ }

      // 2. Buscar programa de la comisión
      const comisionRes = await apiRequest(`/docente-editor/programa/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
      if (comisionRes.success && comisionRes.data) {
        let datos = comisionRes.data.datos_programa
        if (typeof datos === 'string') datos = JSON.parse(datos)
        processProgramaData(datos)
        setProgramaComisionId(comisionRes.data.id)
        setHasDocenteVersion(false)
      } else {
        setError("No se encontró programa analítico para tu asignatura en este periodo.")
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar programa analítico")
    } finally {
      setLoading(false)
    }
  }

  const processProgramaData = (datos: any) => {
    let parsed: ProgramaData

    // If datos has secciones format (old), convert to tabs
    let normalizedDatos = datos
    if (!datos.tabs && datos.secciones && Array.isArray(datos.secciones)) {
      normalizedDatos = {
        ...datos,
        tabs: datos.secciones.map((sec: any, idx: number) => ({
          id: sec.id || `tab-${idx}`,
          title: sec.titulo || sec.title || `Sección ${idx + 1}`,
          rows: (sec.filas || sec.rows || []).map((fila: any, fIdx: number) => ({
            id: fila.id || `row-${idx}-${fIdx}`,
            cells: (fila.celdas || fila.cells || []).map((celda: any, cIdx: number) => ({
              id: celda.id || `cell-${idx}-${fIdx}-${cIdx}`,
              content: celda.contenido || celda.content || '',
              isHeader: celda.esEncabezado || celda.isHeader || false,
              rowSpan: celda.rowSpan || 1,
              colSpan: celda.colSpan || 1,
              isEditable: true,
              backgroundColor: celda.backgroundColor || celda.styles?.backgroundColor,
              textColor: celda.textColor || celda.styles?.textColor,
              fontSize: celda.fontSize || celda.styles?.fontSize,
              fontWeight: celda.fontWeight || celda.styles?.fontWeight,
              textAlign: celda.textAlign || celda.styles?.textAlign,
              textOrientation: celda.textOrientation || celda.styles?.textOrientation || 'horizontal',
            }))
          }))
        }))
      }
    }

    if (normalizedDatos.tabs) {
      parsed = {
        ...normalizedDatos,
        tabs: normalizedDatos.tabs.map((t: any) => ({
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
      setError("Formato de programa analítico no reconocido")
      return
    }

    setProgramaData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  const activeTab = programaData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Edición de celdas - TODAS editables para programa analítico
  const saveEdit = () => {
    if (!editingCell || !programaData) return
    setProgramaData(prev => {
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
    if (!modalCell || !programaData) return
    setProgramaData(prev => {
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
    if (!programaData) return alert("No hay programa para guardar.")
    if (!selectedPeriod) return alert("Seleccione un periodo.")

    const asignaturaId = selectedAsignaturaId
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0-docente",
        metadata: programaData.metadata,
        tabs: programaData.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell,
              styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      }

      await apiRequest('/docente-editor/programa/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignatura_id: asignaturaId,
          periodo: selectedPeriod,
          nombre: programaData.name || 'Programa Analítico Docente',
          datos_programa: datosParaGuardar,
          programa_comision_id: programa_comision_id
        })
      })

      setHasDocenteVersion(true)
      alert("Programa analítico guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ==============================
  // EXPORTAR PDF — Programa Analítico
  // ==============================
  const handleExportPDF = () => {
    if (!programaData) return;

    const allTabs = programaData.tabs;
    let tablesHtml = '';

    for (let tabIdx = 0; tabIdx < allTabs.length; tabIdx++) {
      const tab = allTabs[tabIdx];
      if (!tab || !tab.rows || tab.rows.length === 0) continue;

      const isVisado = tab.title.toUpperCase().includes('VISADO') || tab.title.toUpperCase().includes('LEGALIZACIÓN');
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

          const rawContent = cell.content || '';
          const content = rawContent.replace(/\n/g, '<br/>');

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

    const programaName = programaData.name || 'Programa Analítico';
    const asignaturaNombre = profesorInfo?.asignatura?.nombre || profesorInfo?.todas_asignaturas?.[0]?.nombre || '';
    const periodoNombre = periodos.find((p: any) => String(p.id) === selectedPeriod)?.nombre || '';

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Programa Analítico - ${asignaturaNombre}</title>
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
      <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANAB\u00CD</h1>
      <h2>PROGRAMA ANAL\u00CDTICO DE ASIGNATURA</h2>
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
                <h1 className="text-2xl font-bold text-gray-900">Editor de Programa Analítico</h1>
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
              <Button onClick={handleExportPDF} variant="outline" disabled={!programaData}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !programaData}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del programa analítico.
            </div>
          )}

          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            Todos los campos son editables en el programa analítico. Haz doble clic en cualquier celda para editarla.
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando programa analítico...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadPrograma} variant="outline">Reintentar</Button>
            </div>
          )}

          {!loading && !error && programaData && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
                {programaData.tabs.map(tab => (
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
                              <tr key={row.id} className="hover:bg-blue-50/50">
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

                                  const isVertical = cell.textOrientation === 'vertical'
                                  const cellText = (cell.content || '').trim();
                                  const isSep = cellText === ':';
                                  const isNumericCell = /^\d{1,4}$/.test(cellText);
                                  const isShortHdr = cell.isHeader && cellText.length <= 5 && cell.colSpan === 1 && !isVertical;

                                  let cellMinW = '40px';
                                  let cellMaxW: string | undefined = undefined;
                                  if (isVertical) { cellMinW = '28px'; cellMaxW = '36px'; }
                                  else if (isSep) { cellMinW = '14px'; cellMaxW = '18px'; }
                                  else if (isNumericCell && cellText.length <= 3) { cellMinW = '30px'; cellMaxW = '50px'; }
                                  else if (isShortHdr) { cellMinW = '35px'; cellMaxW = '55px'; }
                                  else if (cellText.length > 5 || cell.isHeader) { cellMinW = '80px'; }

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative align-middle cursor-cell ${
                                        cell.isHeader
                                          ? 'border-gray-300 bg-gray-100/80 font-bold text-black text-center hover:bg-gray-200/80'
                                          : 'border-gray-200 bg-white text-gray-700 hover:bg-blue-50/50'
                                      }`}
                                      style={{
                                        backgroundColor: cell.backgroundColor || undefined,
                                        padding: 0,
                                        minWidth: cellMinW,
                                        maxWidth: cellMaxW,
                                      }}
                                      rowSpan={cell.rowSpan}
                                      colSpan={cell.colSpan}
                                      onDoubleClick={() => {
                                        setModalCell({ id: cell.id, content: cell.content || '', isEditable: true })
                                        setEditContent(cell.content || '')
                                      }}
                                    >
                                      <div
                                        className={`w-full h-full px-2 py-1.5 flex ${cell.isHeader ? 'justify-center text-center' : 'justify-start text-left'}`}
                                        style={{
                                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                                          transform: isVertical ? 'rotate(180deg)' : 'none',
                                          alignItems: 'center',
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
                                            {cell.content || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                      </div>
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
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-bold text-blue-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                <Button className="bg-blue-600 text-white" onClick={saveModalEdit}>
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
