"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SaleData {
  id: string;
  sale_price: number;
  payment_method: string;
  sold_at: string;
  client_name: string | null;
  client_phone: string | null;
  warranty_days: number;
  warranty_until: string | null;
  product: {
    id: string;
    model: string;
    capacity: string;
    color: string;
    condition: string;
    battery_health: number;
    imei: string;
    product_code: string | null;
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function generateGarCode(saleId: string, soldAt: string) {
  const year = new Date(soldAt).getFullYear().toString().slice(-2);
  // Use last 4 chars of UUID as number-ish code
  const num = parseInt(saleId.replace(/-/g, "").slice(-4), 16) % 9999 + 1;
  return `GAR-${year}-${num.toString().padStart(4, "0")}`;
}

const CONDITION_LABELS: Record<string, string> = {
  A: "A — Impecable",
  B: "B — Bueno",
  C: "C — Con detalles",
};

function GarantiaContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");
  const saleId = searchParams.get("sale_id");

  const [sale, setSale] = useState<SaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!productId && !saleId) {
        setError("Falta product_id o sale_id en la URL");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("ig_sales")
        .select(`
          id, sale_price, payment_method, sold_at,
          client_name, client_phone,
          warranty_days, warranty_until,
          product:ig_products(id, model, capacity, color, condition, battery_health, imei, product_code)
        `)
        .order("sold_at", { ascending: false })
        .limit(1);

      if (saleId) {
        query = query.eq("id", saleId);
      } else {
        query = query.eq("product_id", productId);
      }

      const { data, error: err } = await query.single();

      if (err || !data) {
        setError("No se encontró la venta. Verificá que el producto fue vendido.");
        setLoading(false);
        return;
      }

      setSale(data as unknown as SaleData);
      setLoading(false);
    }
    load();
  }, [productId, saleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-slate-400 text-sm">Cargando garantía...</p>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <a href="/ventas/stock" className="mt-4 inline-block text-sm text-slate-400 underline">Volver al stock</a>
        </div>
      </div>
    );
  }

  const garCode = generateGarCode(sale.id, sale.sold_at);
  const warrantyDays = sale.warranty_days || 90;
  const warrantyUntil = sale.warranty_until || addDays(sale.sold_at, warrantyDays);

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

      {/* Action bar */}
      <div className="no-print flex items-center gap-4 p-4 border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#34C759] text-white rounded-full font-bold text-sm shadow-md hover:brightness-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">print</span>
          Imprimir
        </button>
        <a
          href="/ventas/stock"
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

        {/* Cert number + date */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-[#34C759]/20">
          <div />
          <div className="text-right">
            <p className="text-lg font-bold text-slate-800">{garCode}</p>
            <p className="text-sm text-slate-500">{formatDate(sale.sold_at)}</p>
          </div>
        </div>

        {/* Equipo */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Equipo
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Modelo", sale.product.model],
              ["Capacidad", sale.product.capacity],
              ["Color", sale.product.color],
              ["IMEI", sale.product.imei],
              ["Estado", CONDITION_LABELS[sale.product.condition] || sale.product.condition],
              ["Batería al momento de venta", `${sale.product.battery_health}%`],
              ...(sale.product.product_code ? [["Código de producto", sale.product.product_code]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex">
                <span className="text-slate-500 w-48 flex-shrink-0">{label}:</span>
                <span className="font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Cliente
          </h3>
          {(sale.client_name || sale.client_phone) ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {sale.client_name && (
                <div className="flex"><span className="text-slate-500 w-48 flex-shrink-0">Nombre:</span><span className="font-bold">{sale.client_name}</span></div>
              )}
              {sale.client_phone && (
                <div className="flex"><span className="text-slate-500 w-48 flex-shrink-0">Teléfono:</span><span className="font-bold">{sale.client_phone}</span></div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Venta sin datos de cliente registrados</p>
          )}

        </div>

        {/* Cobertura */}
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#34C759] mb-4 pb-2 border-b border-slate-200">
            Cobertura
          </h3>
          <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mb-5">
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Vigencia:</span>
              <span className="font-bold">{warrantyDays} días{warrantyDays > 90 ? " (extendida)" : ""}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Desde:</span>
              <span className="font-bold">{formatDate(sale.sold_at)}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-24 flex-shrink-0">Hasta:</span>
              <span className="font-bold">{formatDate(warrantyUntil)}</span>
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

        {/* Firmas */}
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

export default function GarantiaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white"><p className="text-slate-400 text-sm">Cargando...</p></div>}>
      <GarantiaContent />
    </Suspense>
  );
}
