"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── Types ───── */
interface Product {
  id: string;
  model: string;
  capacity: string;
  color: string;
  condition: string;
  battery_health: number | null;
  sale_price: number | null;
  photos: string[] | null;
  status: string;
  defects: string | null;
  notes: string | null;
  is_new: boolean;
}

interface ScheduledPost {
  id: string;
  product_id: string;
  caption: string;
  image_url: string;
  scheduled_at: string | null;
  published_at: string | null;
  status: "borrador" | "programado" | "publicado" | "error";
  ig_media_id: string | null;
  created_at: string;
}

/* ───── Helpers ───── */
function conditionLabel(c: string) {
  return c === "A" ? "Excelente estado" : c === "B" ? "Muy buen estado" : "Buen estado";
}

function buildCaption(p: Product): string {
  const lines = [];
  lines.push(`📱 ${p.model}${p.capacity ? ` ${p.capacity}` : ""}${p.color ? ` - ${p.color}` : ""}`);
  if (p.is_new) {
    lines.push(`✨ Equipo nuevo, sellado`);
  } else {
    lines.push(`✅ ${conditionLabel(p.condition)}`);
    if (p.battery_health) lines.push(`🔋 Batería ${p.battery_health}%`);
  }
  if (p.sale_price) lines.push(`💰 $${p.sale_price.toLocaleString()} USD`);
  lines.push(`📍 iGreen - Los Ríos 1774, Recoleta`);
  lines.push(``);
  lines.push(`💬 Consultanos por DM o WhatsApp`);
  lines.push(``);
  lines.push(`#iGreen #iPhone #Apple #BuenosAires #Recoleta #iPhoneUsado #iPhoneNuevo`);
  return lines.join("\n");
}

function statusBadge(s: ScheduledPost["status"]) {
  const labels = { publicado: "Publicado", programado: "Programado", borrador: "Pendiente aprobación", error: "Error" };
  return (
    <span className="px-2.5 py-0.5 bg-white/[0.07] text-white/55 text-[10px] font-bold rounded-full border border-white/[0.08]">
      {labels[s]}
    </span>
  );
}

/* ───── Component ───── */
export default function PublicidadPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [supervisado, setSupervisado] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prodRes, postsRes] = await Promise.all([
      supabase
        .from("ig_products")
        .select("id,model,capacity,color,condition,battery_health,sale_price,photos,status,defects,notes,is_new")
        .eq("status", "disponible")
        .order("created_at", { ascending: false }),
      supabase
        .from("ig_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setProducts((prodRes.data || []) as Product[]);
    setPosts((postsRes.data || []) as ScheduledPost[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openModal(p: Product) {
    setSelectedProduct(p);
    setCaption(buildCaption(p));
    setImageUrl(p.photos?.[0] || "");
    setPublishError("");
    setShowModal(true);
  }

  async function handlePublish() {
    if (!selectedProduct || !imageUrl || !caption) return;
    setPublishing(true);
    setPublishError("");
    try {
      const { data: postRow, error: insertErr } = await supabase
        .from("ig_posts")
        .insert({ product_id: selectedProduct.id, caption, image_url: imageUrl, status: supervisado ? "borrador" : "programado" })
        .select().single();
      if (insertErr) throw new Error(insertErr.message);
      if (!supervisado) {
        const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl, caption }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await supabase.from("ig_posts").update({ status: "publicado", ig_media_id: data.mediaId, published_at: new Date().toISOString() }).eq("id", postRow.id);
      }
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  }

  async function approvePost(post: ScheduledPost) {
    try {
      const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: post.image_url, caption: post.caption }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await supabase.from("ig_posts").update({ status: "publicado", ig_media_id: data.mediaId, published_at: new Date().toISOString() }).eq("id", post.id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al publicar");
    }
  }

  async function rejectPost(postId: string) {
    await supabase.from("ig_posts").delete().eq("id", postId);
    loadData();
  }

  const pendingPosts = posts.filter((p) => p.status === "borrador");
  const publishedPosts = posts.filter((p) => p.status === "publicado");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        <span className="ml-3 text-sm text-white/45">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1 space-y-6">

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Disponibles para publicar", value: products.length.toString(),      icon: "smartphone"  },
          { label: "Publicados",                value: publishedPosts.length.toString(), icon: "check_circle" },
          { label: "Pendientes aprobación",     value: pendingPosts.length.toString(),   icon: "pending"      },
          { label: "Modo agente",               value: supervisado ? "Supervisado" : "Automático", icon: "smart_toy" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{kpi.label}</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">{kpi.icon}</span>
              </div>
              <div className="mt-3">
                <p className="text-[22px] font-medium leading-none tracking-tight text-white/90">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* ── Izquierda ── */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Cola pendientes */}
          {pendingPosts.length > 0 && (
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-white/35 text-[18px]">pending_actions</span>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Cola del Agente — Pendientes de Aprobación</p>
                </div>
                <div className="space-y-3">
                  {pendingPosts.map((post) => {
                    const prod = products.find((p) => p.id === post.product_id);
                    return (
                      <div key={post.id} className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                        {post.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.image_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/80 truncate">{prod?.model || "Equipo"}</p>
                          <p className="text-xs text-white/45 truncate">{post.caption.split("\n")[0]}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => approvePost(post)}
                            className="px-3 py-1.5 bg-white/[0.09] border border-white/[0.12] text-white/70 text-xs font-bold rounded-lg hover:bg-white/[0.12] transition-colors"
                          >
                            ✓ Publicar
                          </button>
                          <button
                            onClick={() => rejectPost(post.id)}
                            className="px-3 py-1.5 bg-white/[0.06] border border-white/[0.09] text-white/45 text-xs font-bold rounded-lg hover:bg-white/[0.09] transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stock disponible */}
          <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Stock Disponible para Publicar</p>
              </div>
              <div className="p-5">
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/35">
                    <span className="material-symbols-outlined text-4xl mb-3">inventory_2</span>
                    <p className="text-sm font-medium">No hay equipos disponibles</p>
                    <p className="text-xs mt-1">Cargá stock desde la sección Stock</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:border-white/[0.10] transition-colors">
                        {p.photos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photos[0]} alt={p.model} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white/30">smartphone</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/85">{p.model} {p.capacity}</p>
                          <p className="text-xs text-white/45">{p.color} · Cond. {p.condition}{p.battery_health ? ` · 🔋${p.battery_health}%` : ""}</p>
                          {p.sale_price && <p className="text-sm font-semibold text-white/70 mt-0.5">${p.sale_price.toLocaleString()} USD</p>}
                        </div>
                        <button
                          onClick={() => openModal(p)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.08] border border-white/[0.12] text-white/70 rounded-full text-xs font-bold hover:bg-white/[0.11] transition-all flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm">campaign</span>
                          Publicar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial publicados */}
          {publishedPosts.length > 0 && (
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Publicados en Instagram</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Post</th>
                        <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Estado</th>
                        <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Fecha</th>
                        <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">IG Media ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {publishedPosts.map((post) => {
                        const prod = products.find((p) => p.id === post.product_id);
                        return (
                          <tr key={post.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {post.image_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={post.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                                )}
                                <span className="text-sm font-medium text-white/75">{prod?.model || "Equipo"}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">{statusBadge(post.status)}</td>
                            <td className="px-3 py-3 text-xs text-white/45">
                              {post.published_at ? new Date(post.published_at).toLocaleDateString("es-AR") : "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-white/40 font-mono">
                              {post.ig_media_id ? (
                                <a href={`https://www.instagram.com/p/${post.ig_media_id}/`} target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-white/80 transition-colors">
                                  {post.ig_media_id.slice(0, 12)}...
                                </a>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Derecha: Config agente ── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Modo agente */}
          <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-4">Modo del Agente 🤖</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-white/85">{supervisado ? "Supervisado" : "Automático"}</p>
                  <p className="text-xs text-white/45 mt-0.5">{supervisado ? "Pide aprobación antes de publicar" : "Publica sin confirmación"}</p>
                </div>
                <button
                  onClick={() => setSupervisado(!supervisado)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${supervisado ? "bg-white/25" : "bg-white/[0.12]"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white/80 rounded-full transition-transform shadow-sm ${supervisado ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="p-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs text-white/50">
                {supervisado
                  ? "Cada post necesita tu aprobación antes de publicarse en Instagram."
                  : "El agente publica automáticamente cuando detecta stock nuevo."}
              </div>
            </div>
          </div>

          {/* Caption template */}
          <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-3">Caption Automático</p>
              <p className="text-xs text-white/45 leading-relaxed mb-3">
                El sistema genera el caption automáticamente con modelo, condición, batería, precio y ubicación. Podés editarlo antes de publicar.
              </p>
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/45 font-mono whitespace-pre-wrap leading-relaxed">
                {`📱 iPhone 14 Pro 256GB\n✅ Excelente estado\n🔋 Batería 94%\n💰 $750 USD\n📍 iGreen - Los Ríos 1774`}
              </div>
            </div>
          </div>

          {/* Reglas */}
          <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-3">Reglas del Agente</p>
              <div className="space-y-2">
                {[
                  { label: "Auto-publicar stock nuevo", value: supervisado ? "Con aprobación" : "Automático" },
                  { label: "Horarios de publicación", value: "10:00 y 18:00" },
                  { label: "Hashtags automáticos",    value: "Activo" },
                  { label: "Foto requerida",           value: "Sí" },
                ].map((rule) => (
                  <div key={rule.label} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
                    <p className="text-xs text-white/45">{rule.label}</p>
                    <p className="text-xs font-bold text-white/65">{rule.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal publicar ── */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161619] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">Publicar en Instagram</h3>
                  <p className="text-sm text-white/45">{selectedProduct.model} {selectedProduct.capacity}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/[0.07] rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-white/40">close</span>
                </button>
              </div>

              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl mb-4" />
              ) : (
                <div className="w-full aspect-square bg-white/[0.04] border border-white/[0.07] rounded-xl mb-4 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-white/25 mb-2">add_photo_alternate</span>
                  <p className="text-xs text-white/35">Sin foto — el agente no puede publicar sin imagen</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">URL de la imagen *</label>
                <input
                  type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm focus:outline-none placeholder:text-white/25"
                />
                <p className="text-[10px] text-white/30 mt-1">Debe ser una URL pública accesible por Meta</p>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Caption</label>
                <textarea
                  value={caption} onChange={(e) => setCaption(e.target.value)} rows={8}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none"
                />
              </div>

              {publishError && (
                <div className="mb-4 p-3 bg-white/[0.04] border border-white/[0.08] text-white/55 text-xs rounded-xl">
                  ❌ {publishError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] text-white/50 rounded-xl text-sm font-bold hover:bg-white/[0.09] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublish} disabled={publishing || !imageUrl}
                  className="flex-1 px-4 py-2.5 bg-white/[0.10] border border-white/[0.16] text-white/85 rounded-xl text-sm font-bold hover:bg-white/[0.13] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {publishing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/50" /> Publicando...</>
                  ) : supervisado ? "Enviar a cola" : "Publicar ahora"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
