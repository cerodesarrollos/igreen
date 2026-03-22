"use client";

export default function TicketPage() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
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
      <div className="print-area max-w-[80mm] mx-auto bg-white min-h-screen font-mono text-sm p-4">
        <div className="text-center whitespace-pre-wrap leading-relaxed">
          <p className="text-slate-400">─────────────────────</p>
          <p className="text-xl mt-1">🍏 <span className="font-bold">iGreen</span></p>
          <p className="text-xs text-slate-600">Los Ríos 1774, CABA</p>
          <p className="text-xs text-slate-600">Tel: 11 3577-2057</p>
          <p className="text-slate-400">─────────────────────</p>
        </div>

        <div className="text-center my-2">
          <p className="font-bold text-base">GARANTÍA + RECIBO</p>
          <p className="font-bold">#GAR-2026-0047</p>
          <p className="text-xs text-slate-600">22/03/2026 · 15:30</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          <p className="font-bold">iPhone 14 Pro Max</p>
          <p>256GB · Negro</p>
          <p>IMEI: ••••••••1234</p>
          <p>Batería: 96%</p>
          <p>Estado: A - Impecable</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          <p>Cliente: <span className="font-bold">Juan Pérez</span></p>
          <p>DNI: 38.456.789</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          <p>Garantía: <span className="font-bold">90 días</span></p>
          <p>Vence: 19/06/2026</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-3">
          <p className="font-bold text-center mb-2">DETALLE DE PAGO</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Precio:</span>
              <span className="font-bold">$450 USD</span>
            </div>
            <div className="flex justify-between">
              <span>Trade-in:</span>
              <span className="font-bold">-$200 USD</span>
            </div>
            <p className="text-xs text-slate-500 pl-2">(iPhone 11 64GB)</p>
          </div>
          <p className="text-center text-slate-400 my-1">───────────────────</p>
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>$250 USD</span>
          </div>
          <p className="mt-1">Forma de pago: <span className="font-bold">Efectivo</span></p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="text-center my-3">
          <p className="font-bold">¡Gracias por confiar</p>
          <p className="font-bold">en iGreen!</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>
      </div>
    </>
  );
}
