"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Edit3, AlertTriangle } from "lucide-react";

interface ModoRegistroModalProps {
  open: boolean;
  onClose: () => void;
  onModoSelected: (modo: "personalizada" | "masiva") => void;
  codigoMalla: string;
}

export default function ModoRegistroModal({
  open,
  onClose,
  onModoSelected,
  codigoMalla,
}: ModoRegistroModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#00563F]">
            Modo de Registro de Asignaturas
          </DialogTitle>
          <DialogDescription>
            Seleccione cómo desea registrar las asignaturas para la malla: <strong>{codigoMalla}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Modo Personalizada */}
          <Card
            className="cursor-pointer hover:border-[#00563F] hover:shadow-lg transition-all border-2"
            onClick={() => {
              onModoSelected("personalizada");
              onClose();
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <Edit3 className="h-8 w-8 text-[#00563F]" />
                <CardTitle className="text-lg">Personalizada</CardTitle>
              </div>
              <CardDescription>Formulario paso a paso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Complete un formulario detallado para cada asignatura, ingresando:
              </p>
              <ul className="text-sm space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#00563F] font-bold">•</span>
                  <span>Código y nombre de la asignatura</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00563F] font-bold">•</span>
                  <span>Unidad de organización curricular</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00563F] font-bold">•</span>
                  <span>Prerrequisitos y correquisitos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00563F] font-bold">•</span>
                  <span>Distribución de horas por tipo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00563F] font-bold">•</span>
                  <span>Unidades temáticas y resultados</span>
                </li>
              </ul>
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 font-medium">
                  ✓ Ideal para registros individuales o pequeños volúmenes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modo Carga Masiva */}
          <Card
            className="cursor-pointer hover:border-emerald-600 hover:shadow-lg transition-all border-2 border-emerald-200 bg-emerald-50"
            onClick={() => {
              onModoSelected("masiva");
              onClose();
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                <CardTitle className="text-lg text-emerald-700">Carga Masiva</CardTitle>
              </div>
              <CardDescription>Importar desde archivo Excel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Importe múltiples asignaturas desde un archivo Excel con todos los datos:
              </p>
              <ul className="text-sm space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Cargue decenas de asignaturas de una vez</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Formato Excel/CSV predefinido</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Validación automática de datos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Vista previa antes de importar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Descargue plantilla de ejemplo</span>
                </li>
              </ul>
              <div className="pt-4 border-t bg-emerald-100 -mx-6 -mb-6 px-6 pb-6 rounded-b">
                <p className="text-xs text-emerald-700 font-medium mt-4">
                  ✓ Ideal para importar currículos completos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-300 rounded-md">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Consejo:</p>
            <p>Puede cambiar entre modos en cualquier momento usando los botones que encontrará en la parte superior.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
