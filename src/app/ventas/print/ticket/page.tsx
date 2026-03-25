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
  client_dni: string | null;
  extended_warranty: boolean;
  warranty_until: string | null;
  product: {
    model: string;
    capacity: string;
    color: string;
    condition: string;
    battery_health: number;
    imei: string;
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function generateGarCode(saleId: string, soldAt: string) {
  const year = new Date(soldAt).getFullYear().toString().slice(-2);
  const num = parseInt(saleId.replace(/-/g, "").slice(-4), 16) % 9999 + 1;
  return `GAR-${year}-${num.toString().padStart(4, "0")}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta Débito",
  tarjeta_credito: "Tarjeta Crédito",
  mixto: "Mixto",
};

function TicketContent() {
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
          client_name, client_phone, client_dni,
          extended_warranty, warranty_until,
          product:ig_products(model, capacity, color, condition, battery_health, imei)
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
        setError("No se encontró la venta.");
        setLoading(false);
        return;
      }

      setSale(data as unknown as SaleData);
      setLoading(false);
    }
    load();
  }, [productId, saleId]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-white"><p className="text-slate-400 text-sm">Cargando ticket...</p></div>;
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
  const warrantyDays = sale.extended_warranty ? 180 : 90;
  const warrantyUntil = sale.warranty_until || addDays(sale.sold_at, warrantyDays);
  const imeiMasked = sale.product.imei
    ? "••••••••" + sale.product.imei.slice(-4)
    : "—";

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

      <div className="no-print flex items-center gap-4 p-4 border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#34C759] text-white rounded-full font-bold text-sm shadow-md hover:brightness-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">print</span>
          Imprimir
        </button>
        <a href="/ventas/stock" className="flex items-center gap-1 px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver
        </a>
      </div>

      <div className="print-area max-w-[80mm] mx-auto bg-white min-h-screen font-mono text-sm p-4">
        <div className="text-center leading-relaxed">
          <p className="text-slate-400">─────────────────────</p>
          <p className="text-xl mt-1">🍏 <span className="font-bold">iGreen</span></p>
          <p className="text-xs text-slate-600">Los Ríos 1774, CABA</p>
          <p className="text-xs text-slate-600">Tel: 11 3577-2057</p>
          <p className="text-slate-400">─────────────────────</p>
        </div>

        <div className="text-center my-2">
          <p className="font-bold text-base">GARANTÍA + RECIBO</p>
          <p className="font-bold">#{garCode}</p>
          <p className="text-xs text-slate-600">{formatDate(sale.sold_at)} · {formatTime(sale.sold_at)}</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          <p className="font-bold">{sale.product.model}</p>
          <p>{sale.product.capacity} · {sale.product.color}</p>
          <p>IMEI: {imeiMasked}</p>
          <p>Batería: {sale.product.battery_health}%</p>
          <p>Estado: {sale.product.condition} — {sale.product.condition === "A" ? "Impecable" : sale.product.condition === "B" ? "Bueno" : "Con detalles"}</p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          {sale.client_name && <p>Cliente: <span className="font-bold">{sale.client_name}</span></p>}
          {sale.client_dni && <p>DNI: {sale.client_dni}</p>}
          {sale.client_phone && <p>Tel: {sale.client_phone}</p>}
          {!sale.client_name && !sale.client_dni && <p className="text-slate-400 italic">Sin datos de cliente</p>}
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-2">
          <p>Garantía: <span className="font-bold">{warrantyDays} días{sale.extended_warranty ? " (extendida)" : ""}</span></p>
          <p>Vence: <span className="font-bold">{formatDate(warrantyUntil)}</span></p>
        </div>

        <p className="text-center text-slate-400">─────────────────────</p>

        <div className="my-3">
          <p className="font-bold text-center mb-2">DETALLE DE PAGO</p>
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>USD {sale.sale_price}</span>
          </div>
          <p className="mt-1">Forma de pago: <span className="font-bold">{PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</span></p>
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

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white"><p className="text-slate-400 text-sm">Cargando...</p></div>}>
      <TicketContent />
    </Suspense>
  );
}
