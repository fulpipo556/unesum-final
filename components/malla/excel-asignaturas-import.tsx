"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExcelAsignaturasImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (asignaturas: any[]) => Promise<void>;
  codigoMalla: string;
  facultadId: number;
  carreraId: number;
}

export default function ExcelAsignaturasImport({
  open,
  onClose,
  onImport,
  codigoMalla,
  facultadId,
  carreraId,
}: ExcelAsignaturasImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload");
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = [
    "Código",
    "Asignatura",
    "Nivel",
    "Unidad de Organización",
    "Horas Docencia",
    "Horas Práctica",
    "Horas Autónoma",
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // --- PROCESAMIENTO DINÁMICO DE CAMPOS MULTIPLES ---
          // processedData contendrá todos los campos originales + arrays dinámicos
          const processedData = jsonData.map((row: any) => {
            // Prerrequisitos
            const prerrequisitos: string[] = [];
            // Correquisitos
            const correquisitos: string[] = [];
            // Unidades temáticas y resultados de aprendizaje
            const unidades: { unidad: string; resultado: string }[] = [];
            // Copia todos los campos originales
            const allFields: any = { ...row };

            // Detectar todos los prerrequisitos y correquisitos
            Object.keys(row).forEach((key) => {
              if (key.toLowerCase().startsWith("prerrequisito")) {
                const valor = row[key]?.toString().trim().toUpperCase();
                // Ignorar valores que significan "sin prerrequisito"
                if (valor && 
                    valor !== "" && 
                    valor !== "NINGUNO" && 
                    valor !== "NO APLICA" &&
                    valor !== "N/A" &&
                    valor !== "SIN PRERREQUISITO") {
                  prerrequisitos.push(row[key].toString().trim());
                }
              }
              if (key.toLowerCase().startsWith("correquisito")) {
                const valor = row[key]?.toString().trim().toUpperCase();
                // Ignorar valores que significan "sin correquisito"
                if (valor && 
                    valor !== "" && 
                    valor !== "NINGUNO" && 
                    valor !== "NO APLICA" &&
                    valor !== "N/A" &&
                    valor !== "SIN CORREQUISITO") {
                  correquisitos.push(row[key].toString().trim());
                }
              }
            });

            // Detectar todas las unidades temáticas y resultados de aprendizaje
            let i = 1;
            while (
              row[`Unidad Temática ${i}`] || row[`Unidad Tematica ${i}`] ||
              row[`Unidad Temática${i}`] || row[`Unidad Tematica${i}`] ||
              row[`Unidad Temática  ${i}`] || row[`Unidad Tematica  ${i}`]
            ) {
              const unidad = row[`Unidad Temática ${i}`] || row[`Unidad Tematica ${i}`] || row[`Unidad Temática${i}`] || row[`Unidad Tematica${i}`] || row[`Unidad Temática  ${i}`] || row[`Unidad Tematica  ${i}`];
              const resultado = row[`Resultado de Aprendizaje ${i}`] || row[`Resultado Aprendizaje ${i}`] || row[`Resultado de Aprendizaje${i}`] || row[`Resultado Aprendizaje${i}`];
              if (unidad || resultado) {
                unidades.push({ unidad: unidad || "", resultado: resultado || "" });
              }
              i++;
            }

            // Devuelve todos los campos originales + los arrays
            return {
              ...allFields,
              prerrequisitos,
              correquisitos,
              unidades
            };
          });

          const validationErrors = validateData(processedData);
          if (validationErrors.length > 0) {
            setErrors(validationErrors);
          }

          setPreviewData(processedData);
          setStep("preview");
        } catch (error) {
          setErrors(["Error al procesar el archivo. Verifique que sea un archivo Excel válido."]);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      setErrors(["Error al leer el archivo. Intente nuevamente."]);
      setIsProcessing(false);
    }
  };

  const validateData = (data: any[]): string[] => {
    const errors: string[] = [];

    if (data.length === 0) {
      errors.push("El archivo está vacío o no contiene datos válidos.");
      return errors;
    }

    // Validar columnas requeridas
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      errors.push(`Columnas faltantes: ${missingColumns.join(", ")}`);
    }

    // Validar datos específicos
    data.forEach((row, index) => {
      if (!row.Código || row.Código.toString().trim() === "") {
        errors.push(`Fila ${index + 2}: Código es requerido`);
      }
      if (!row.Asignatura || row.Asignatura.toString().trim() === "") {
        errors.push(`Fila ${index + 2}: Asignatura es requerida`);
      }
      if (!row["Horas Docencia"] || isNaN(parseInt(row["Horas Docencia"]))) {
        errors.push(`Fila ${index + 2}: Horas de Docencia debe ser un número`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    if (errors.length === 0) {
      setIsProcessing(true);
      try {
        await onImport(previewData);
        setImportedCount(previewData.length);
        setStep("complete");
        setTimeout(() => {
          handleClose();
        }, 3000);
      } catch (error) {
        setErrors(["Error al importar datos. Intente nuevamente."]);
        setIsProcessing(false);
      }
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setStep("upload");
    setImportedCount(0);
    onClose();
  };

  const downloadTemplate = () => {
    // Crear plantilla Excel
    const templateData = [
      {
        "Código": "MAT101",
        "Asignatura": "Matemáticas",
        "Nivel": "Primero",
        "Unidad de Organización": "Básica",
        "Prerrequisito": "NINGUNO",
        "Correquisito": "NINGUNO",
        "Unidad Temática 1": "Lógica Matemática",
        "Resultado de Aprendizaje 1": "Comprender",
        "Unidad Temática 2": "Conjuntos",
        "Resultado de Aprendizaje 2": "Operar con conjuntos",
        "Horas Docencia": "4",
        "Horas Práctica": "2",
        "Horas Autónoma": "3",
        "Horas Vinculación": "0",
        "Horas Práctica Preprofesional": "0"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asignaturas");
    XLSX.writeFile(wb, `plantilla-asignaturas-${codigoMalla}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Asignaturas desde Excel
          </DialogTitle>
          <DialogDescription>Malla: {codigoMalla}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <>
              {/* Plantilla */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Plantilla de Carga</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Descargue la plantilla con el formato correcto para importar asignaturas.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Columnas requeridas: {requiredColumns.join(", ")}
                      </p>
                    </div>
                    <Button onClick={downloadTemplate} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Plantilla
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Carga de archivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Seleccionar Archivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-500">Formatos soportados: .xlsx, .xls, .csv (máximo 10MB)</p>
                      </div>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="mt-4"
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isProcessing ? "Procesando..." : "Seleccionar Archivo"}
                      </Button>
                    </div>

                    {file && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step === "preview" && (
            <>
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Se encontraron errores:</p>
                      <ul className="list-disc list-inside text-sm">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vista Previa ({previewData.length} asignaturas)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2} className="text-center">Código</TableHead>
                          <TableHead rowSpan={2} className="text-center">Asignatura</TableHead>
                          <TableHead rowSpan={2} className="text-center">Nivel</TableHead>
                          <TableHead rowSpan={2} className="text-center">Unidad de Organización</TableHead>
                          <TableHead rowSpan={2} className="text-center">Prerrequisitos</TableHead>
                          <TableHead rowSpan={2} className="text-center">Correquisitos</TableHead>
                          <TableHead className="text-center">Unidad Temática</TableHead>
                          <TableHead className="text-center">Resultado de Aprendizaje</TableHead>
                          <TableHead rowSpan={2} className="text-center">H. Docencia</TableHead>
                          <TableHead rowSpan={2} className="text-center">H. Práctica</TableHead>
                          <TableHead rowSpan={2} className="text-center">H. Autónoma</TableHead>
                          <TableHead rowSpan={2} className="text-center">H. Vinculación</TableHead>
                          <TableHead rowSpan={2} className="text-center">H. Práctica Preprofesional</TableHead>
                          <TableHead rowSpan={2} className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((row, index) => {
                          const unidades = Array.isArray(row.unidades) ? row.unidades : [];
                          const maxRows = Math.max(unidades.length, 1);
                          // Filtrar resultados de aprendizaje duplicados por fila
                          const resultadosMostrados = new Set();
                          return Array.from({ length: maxRows }).map((_, i) => {
                            const resultado = unidades[i]?.resultado || "";
                            // Si el resultado ya fue mostrado, dejar la celda vacía
                            let mostrarResultado = true;
                            if (resultado && resultadosMostrados.has(resultado)) {
                              mostrarResultado = false;
                            } else if (resultado) {
                              resultadosMostrados.add(resultado);
                            }
                            // Calcular total de horas por fila
                            const hDoc = Number(row["Horas Docencia"]) || 0;
                            const hPrac = Number(row["Horas Práctica"]) || 0;
                            const hAuto = Number(row["Horas Autónoma"]) || 0;
                            const hVinc = Number(row["Horas Vinculación"]) || 0;
                            const hPreprof = Number(row["Horas Práctica Preprofesional"]) || 0;
                            const totalHoras = hDoc + hPrac + hAuto + hVinc + hPreprof;
                            return (
                              <TableRow key={index + '-' + i}>
                                {i === 0 && (
                                  <>
                                    <TableCell rowSpan={maxRows} className="font-semibold text-center">{row.Código}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row.Asignatura}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row.Nivel}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Unidad de Organización"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{(row.prerrequisitos || []).join(", ")}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{(row.correquisitos || []).join(", ")}</TableCell>
                                  </>
                                )}
                                <TableCell className="text-center">{unidades[i]?.unidad || ""}</TableCell>
                                <TableCell className="text-center">{mostrarResultado ? resultado : ""}</TableCell>
                                {i === 0 && (
                                  <>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Horas Docencia"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Horas Práctica"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Horas Autónoma"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Horas Vinculación"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="text-center">{row["Horas Práctica Preprofesional"]}</TableCell>
                                    <TableCell rowSpan={maxRows} className="font-bold text-center">{totalHoras}</TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          });
                        })}
                        {/* Fila de sumatoria total */}
                        {/* Fila de total eliminada */}
                      </TableBody>
                    </Table>
                    {previewData.length > 10 && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Mostrando 10 de {previewData.length} asignaturas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button onClick={() => setStep("upload")} variant="outline">
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={errors.length > 0 || isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {previewData.length} Asignaturas
                </Button>
              </div>
            </>
          )}

          {step === "complete" && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Importación Completada</h3>
                <p className="text-gray-600">Se importaron {importedCount} asignaturas exitosamente.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
