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
  client_last_name: string | null;
  client_phone: string | null;
  client_dni: string | null;
  client_email: string | null;
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
  const num = parseInt(saleId.replace(/-/g, "").slice(-4), 16) % 9999 + 1;
  return `GAR-${year}-${num.toString().padStart(4, "0")}`;
}

const CONDITION_LABELS: Record<string, string> = {
  A: "A — Impecable",
  B: "B — Bueno",
  C: "C — Con detalles",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", marginBottom: "5px" }}>
      <span style={{ color: "#888", width: "180px", flexShrink: 0, fontSize: "11px" }}>{label}</span>
      <span style={{ fontWeight: "600", fontSize: "11px", color: "#111" }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.15em", color: "#444" }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: "#ddd", marginLeft: "10px" }} />
      </div>
      {children}
    </div>
  );
}

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
          client_name, client_last_name, client_phone, client_dni, client_email,
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
        setError("No se encontró la venta.");
        setLoading(false);
        return;
      }

      setSale(data as unknown as SaleData);
      setLoading(false);
    }
    load();
  }, [productId, saleId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <p style={{ color: "#999", fontSize: "13px" }}>Cargando garantía...</p>
    </div>
  );

  if (error || !sale) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#e00", fontWeight: "600", marginBottom: "8px" }}>Error</p>
        <p style={{ color: "#666", fontSize: "13px" }}>{error}</p>
        <a href="/ventas/stock" style={{ color: "#999", fontSize: "12px", marginTop: "12px", display: "inline-block" }}>← Volver al stock</a>
      </div>
    </div>
  );

  const garCode = generateGarCode(sale.id, sale.sold_at);
  const warrantyDays = sale.warranty_days || 90;
  const warrantyUntil = sale.warranty_until || addDays(sale.sold_at, warrantyDays);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 16mm; background: white; }
          html, body { background: white !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
        body { margin: 0; padding: 0; background: white; }
      `}</style>

      {/* Action bar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid #eee", background: "#fafafa" }}>
        <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", background: "#111", color: "#fff", border: "none", borderRadius: "20px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>print</span>
          Imprimir
        </button>
        <a href="/ventas/stock" style={{ fontSize: "13px", color: "#666", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Volver
        </a>
      </div>

      {/* Print area */}
      <div className="print-area" style={{ maxWidth: "180mm", margin: "0 auto", padding: "32px 24px", background: "#fff", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", paddingBottom: "20px", borderBottom: "2px solid #111" }}>
          {/* Logo + dirección */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-igreen.png" alt="iGreen" style={{ height: "34px", objectFit: "contain", marginBottom: "6px", display: "block" }} />
            <p style={{ fontSize: "10px", color: "#888", lineHeight: "1.5", margin: 0 }}>Las Heras 1774, Recoleta, CABA</p>
            <p style={{ fontSize: "10px", color: "#888", margin: 0 }}>+54 9 11 3129-1774</p>
          </div>
          {/* Cert info */}
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", color: "#888", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Certificado de Garantía</p>
            <p style={{ fontSize: "16px", fontWeight: "800", color: "#111", marginBottom: "2px" }}>{garCode}</p>
            <p style={{ fontSize: "11px", color: "#666" }}>{formatDate(sale.sold_at)}</p>
          </div>
        </div>

        {/* Equipo */}
        <Section title="Equipo">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Modelo" value={sale.product.model} />
            <Row label="Capacidad" value={sale.product.capacity} />
            <Row label="Color" value={sale.product.color} />
            <Row label="IMEI" value={sale.product.imei} />
            <Row label="Estado" value={CONDITION_LABELS[sale.product.condition] || sale.product.condition} />
            <Row label="Batería al momento de venta" value={`${sale.product.battery_health}%`} />
            {sale.product.product_code && <Row label="Código de producto" value={sale.product.product_code} />}
          </div>
        </Section>

        {/* Cliente */}
        <Section title="Cliente">
          {(sale.client_name || sale.client_phone || sale.client_dni) ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0" }}>
              {[
                (sale.client_name || sale.client_last_name) && { label: "Nombre y apellido", value: [sale.client_name, sale.client_last_name].filter(Boolean).join(" ") },
                sale.client_dni && { label: "DNI", value: sale.client_dni },
                sale.client_phone && { label: "Teléfono", value: sale.client_phone },
                sale.client_email && { label: "Email", value: sale.client_email },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ width: "50%", paddingRight: "16px", marginBottom: "8px", boxSizing: "border-box" as const }}>
                  <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>{(item as {label:string;value:string}).label}</p>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#111", wordBreak: "break-word" as const }}>{(item as {label:string;value:string}).value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "#aaa", fontStyle: "italic" }}>Venta sin datos de cliente registrados</p>
          )}
        </Section>

        {/* Cobertura */}
        <Section title="Cobertura">
          <div style={{ display: "flex", gap: "0", marginBottom: "14px", background: "#f8f8f8", borderRadius: "8px", overflow: "hidden" }}>
            {[
              { label: "Vigencia", value: `${warrantyDays} días${warrantyDays > 90 ? " (ext.)" : ""}` },
              { label: "Desde", value: formatDate(sale.sold_at) },
              { label: "Hasta", value: formatDate(warrantyUntil) },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, padding: "10px 14px", borderRight: i < 2 ? "1px solid #eee" : "none" }}>
                <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "3px" }}>{item.label}</p>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#111" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Qué cubre / No cubre */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
            {/* Cubre */}
            <div style={{ background: "#f8f8f8", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#333", marginBottom: "7px" }}>Incluye</p>
              {["Defectos de fabricación o funcionamiento bajo uso normal", "Fallas de componentes internos (placa, pantalla, batería por defecto)", "Problemas de software no causados por el usuario"].map(t => (
                <p key={t} style={{ fontSize: "10px", color: "#444", marginBottom: "4px", lineHeight: "1.4" }}>· {t}</p>
              ))}
            </div>
            {/* No cubre */}
            <div style={{ background: "#f8f8f8", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#333", marginBottom: "7px" }}>No incluye</p>
              {["Caídas, golpes o daño físico", "Daño por líquidos u oxidación", "Manipulación por terceros no autorizados", "Desgaste normal (batería, botones)", "Accesorios o daño de puerto por cargador no original"].map(t => (
                <p key={t} style={{ fontSize: "10px", color: "#444", marginBottom: "4px", lineHeight: "1.4" }}>· {t}</p>
              ))}
            </div>
          </div>

          {/* Condiciones */}
          <div style={{ marginTop: "12px", padding: "10px 12px", border: "1px solid #e8e8e8", borderRadius: "8px" }}>
            <p style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#333", marginBottom: "6px" }}>Condiciones de uso</p>
            <p style={{ fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
              Para hacer válida esta garantía, presentar este certificado junto con el equipo en nuestro local. El IMEI del equipo debe coincidir con el registrado. Diagnóstico en hasta 48hs hábiles · Reparación en hasta 10 días hábiles. En caso de no tener solución, se realizará cambio por equipo equivalente o devolución. Garantía personal, no transferible.
            </p>
          </div>
        </Section>

        {/* Firmas */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36px", paddingTop: "20px" }}>
          <div style={{ textAlign: "center", width: "140px" }}>
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px" }}>
              <p style={{ fontSize: "10px", color: "#666" }}>Firma del cliente</p>
            </div>
          </div>
          <div style={{ textAlign: "center", width: "140px" }}>
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#111" }}>iGreen</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #eee" }}>
          <p style={{ fontSize: "9px", color: "#bbb" }}>iGreen · Las Heras 1774, Recoleta, CABA · +54 9 11 3129-1774</p>
        </div>

      </div>
    </>
  );
}

export default function GarantiaPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}><p style={{ color: "#999" }}>Cargando...</p></div>}>
      <GarantiaContent />
    </Suspense>
  );
}
