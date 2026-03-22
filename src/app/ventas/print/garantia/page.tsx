"use client";

export default function GarantiaPage() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action buttons — hidden on print */}
      <div className="no-print flex items-center gap-4 p-4 border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#34C759] text-white rounded-full font-bold text-sm shadow-md hover:brightness-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">print</span>
          Imprimir
        </button>
        <a
          href="/ventas"
          className="flex items-center gap-1 px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver
        </a>
      </div>

      {/* Print area */}
      <div className="print-area max-w-[210mm] mx-auto p-8 bg-white min-h-screen">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-[#34C759] tracking-tight">iGreen</h1>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">Certificado de Garantía</h2>
        </div>

        {/* Certificate number + date */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-[#34C759]/20">
          <div />
          <div className="text-right">
            <p className="text-lg font-bold text-slate-800">GAR-2026-0047</p>
            <p className="text-sm text-slate-500">22/03/2026</p>
          </div>
        </div>

        {/* Section: EQUIPO */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Equipo
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Modelo:</span>
              <span className="font-bold">iPhone 14 Pro Max</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Capacidad:</span>
              <span className="font-bold">256GB</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Color:</span>
              <span className="font-bold">Negro Espacial</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">IMEI:</span>
              <span className="font-bold font-mono">353912110891234</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Estado:</span>
              <span className="font-bold">A — Impecable</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Batería al momento de venta:</span>
              <span className="font-bold">96%</span>
            </div>
          </div>
        </div>

        {/* Section: CLIENTE */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Cliente
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Nombre:</span>
              <span className="font-bold">Juan Pérez</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">DNI:</span>
              <span className="font-bold">38.456.789</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-48 flex-shrink-0">Teléfono:</span>
              <span className="font-bold">+54 11 5555-1234</span>
            </div>
          </div>
        </div>

        {/* Section: COBERTURA */}
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Cobertura
          </h3>
          <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mb-5">
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Vigencia:</span>
              <span className="font-bold">90 días</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Desde:</span>
              <span className="font-bold">22/03/2026</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Hasta:</span>
              <span className="font-bold">19/06/2026</span>
            </div>
          </div>

          <div className="text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-5 bg-slate-50/50">
            <p className="mb-3">
              Esta garantía cubre defectos de funcionamiento del equipo bajo condiciones normales de uso.
            </p>
            <p className="font-bold mb-2">NO cubre:</p>
            <ul className="list-none space-y-1 ml-1 mb-3">
              <li>• Daño físico (caídas, golpes, presión)</li>
              <li>• Daño por líquidos</li>
              <li>• Manipulación o reparación por terceros no autorizados</li>
              <li>• Desgaste normal de batería</li>
              <li>• Accesorios</li>
            </ul>
            <p>
              En caso de reclamo, presentar este certificado junto con el equipo en el local.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-16 mb-12 px-8">
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-2" />
            <p className="text-sm text-slate-600">Firma del cliente</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-2" />
            <p className="text-sm font-bold text-[#34C759]">iGreen</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-6 border-t border-slate-200">
          <p>iGreen · Los Ríos 1774, CABA · Tel: +54 11 3577-2057</p>
          <p className="mt-1">www.igreen.com.ar</p>
        </div>
      </div>
    </>
  );
}
