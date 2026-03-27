"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StoryCanvas from "@/components/StoryCanvas";
import PhotoUploader from "@/components/PhotoUploader";

/* ─── types ─── */
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

interface Post {
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

interface IGMedia {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

interface IGProfile {
  followers_count: number;
  media_count: number;
}

interface IGMetrics {
  reach: number;
  profile_views: number;
  website_clicks: number;
}

type Tab = "publicar" | "calendario" | "insights" | "ia-fotos";

/* ─── helpers ─── */
function conditionLabel(c: string) {
  return c === "A" ? "Excelente estado" : c === "B" ? "Muy buen estado" : "Buen estado";
}

function buildCaption(p: Product): string {
  const lines = [];
  lines.push(`📱 ${p.model}${p.capacity ? ` ${p.capacity}` : ""}${p.color ? ` - ${p.color}` : ""}`);
  if (p.is_new) lines.push(`✨ Equipo nuevo, sellado`);
  else {
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

/* ─── GlassCard ─── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] ${className}`}>
      <div className="rounded-[19px] bg-[#161619] h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

/* ─── Spinner ─── */
function Spinner() {
  return <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />;
}

/* ═══════════════════════════════════════ TABS ═══════════════════════════════════════ */

/* ── TAB: Publicar ── */
function TabPublicar({
  products, posts, supervisado, setSupervisado, reloadPosts,
}: {
  products: Product[];
  posts: Post[];
  supervisado: boolean;
  setSupervisado: (v: boolean) => void;
  reloadPosts: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [modalTab, setModalTab] = useState<"post" | "historia">("post");

  const pendingPosts  = posts.filter(p => p.status === "borrador");
  const publishedPosts = posts.filter(p => p.status === "publicado");

  function openModal(p: Product) {
    setSelectedProduct(p); setCaption(buildCaption(p));
    setImageUrl(p.photos?.[0] || ""); setPublishError(""); setModalTab("post"); setShowModal(true);
  }

  async function handlePublish() {
    if (!selectedProduct || !imageUrl || !caption) return;
    setPublishing(true); setPublishError("");
    try {
      const { data: postRow, error: insertErr } = await supabase
        .from("ig_posts").insert({ product_id: selectedProduct.id, caption, image_url: imageUrl,
          status: supervisado ? "borrador" : "programado" }).select().single();
      if (insertErr) throw new Error(insertErr.message);
      if (!supervisado) {
        const res = await fetch("/api/instagram/publish", { method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, caption }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await supabase.from("ig_posts").update({ status: "publicado", ig_media_id: data.mediaId,
          published_at: new Date().toISOString() }).eq("id", postRow.id);
      }
      setShowModal(false); reloadPosts();
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Error al publicar");
    } finally { setPublishing(false); }
  }

  async function approvePost(post: Post) {
    try {
      const res = await fetch("/api/instagram/publish", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: post.image_url, caption: post.caption }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await supabase.from("ig_posts").update({ status: "publicado", ig_media_id: data.mediaId,
        published_at: new Date().toISOString() }).eq("id", post.id);
      reloadPosts();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Error"); }
  }

  async function rejectPost(id: string) {
    await supabase.from("ig_posts").delete().eq("id", id); reloadPosts();
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Izquierda */}
      <div className="col-span-12 lg:col-span-8 space-y-5">

        {/* Cola pendientes */}
        {pendingPosts.length > 0 && (
          <GlassCard>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Pendientes de aprobación</p>
              <div className="space-y-2">
                {pendingPosts.map(post => {
                  const prod = products.find(p => p.id === post.product_id);
                  return (
                    <div key={post.id} className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.image_url} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{prod?.model || "Equipo"}</p>
                        <p className="text-[11px] text-white/40 truncate">{post.caption.split("\n")[0]}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approvePost(post)}
                          className="px-3 py-1.5 bg-white/[0.07] border border-white/[0.10] text-white/65 text-[11px] font-medium rounded-lg hover:bg-white/[0.11] transition-colors">
                          Publicar
                        </button>
                        <button onClick={() => rejectPost(post.id)}
                          className="px-2 py-1.5 bg-white/[0.04] border border-white/[0.07] text-white/35 text-[11px] rounded-lg hover:bg-white/[0.07] transition-colors">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Stock */}
        <GlassCard>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Stock disponible</p>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/30">
                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p className="text-sm">No hay equipos disponibles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:border-white/[0.09] transition-colors">
                    {p.photos?.[0]
                      ? <img src={p.photos[0]} alt={p.model} className="w-12 h-12 object-cover rounded-lg shrink-0" /> // eslint-disable-line @next/next/no-img-element
                      : <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-white/25 text-[18px]">smartphone</span>
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85">{p.model} {p.capacity}</p>
                      <p className="text-[11px] text-white/40">{p.color} · Cond. {p.condition}{p.battery_health ? ` · 🔋${p.battery_health}%` : ""}</p>
                      {p.sale_price && <p className="text-[12px] font-semibold text-white/65 mt-0.5">${p.sale_price.toLocaleString()} USD</p>}
                    </div>
                    <button onClick={() => openModal(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.10] text-white/60 rounded-xl text-[11px] font-medium hover:bg-white/[0.10] transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[14px]">campaign</span>
                      Publicar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Historial */}
        {publishedPosts.length > 0 && (
          <GlassCard>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Publicados en Instagram</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {publishedPosts.slice(0, 10).map(post => (
                  <div key={post.id} className="relative group aspect-square">
                    {post.image_url
                      ? <img src={post.image_url} alt="" className="w-full h-full object-cover rounded-xl" /> // eslint-disable-line @next/next/no-img-element
                      : <div className="w-full h-full rounded-xl bg-white/[0.05]" />
                    }
                    <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[10px] text-white/80 text-center px-1 truncate">{post.caption.split("\n")[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Derecha */}
      <div className="col-span-12 lg:col-span-4 space-y-5">
        <GlassCard>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Modo del agente</p>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white/85">{supervisado ? "Supervisado" : "Automático"}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{supervisado ? "Aprueba antes de publicar" : "Publica sin confirmación"}</p>
              </div>
              <button onClick={() => setSupervisado(!supervisado)}
                className={`relative w-11 h-6 rounded-full transition-colors ${supervisado ? "bg-white/25" : "bg-white/[0.12]"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white/80 rounded-full transition-transform shadow-sm ${supervisado ? "left-6" : "left-1"}`} />
              </button>
            </div>
            <p className="text-[11px] text-white/35 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              {supervisado ? "Cada post pasa por tu aprobación antes de publicarse." : "El agente publica automáticamente con el stock nuevo."}
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-3">Reglas</p>
            <div className="space-y-2.5">
              {[
                { k: "Horarios", v: "10:00 y 18:00" },
                { k: "Hashtags", v: "Automático" },
                { k: "Foto requerida", v: "Sí" },
                { k: "Formato", v: "Feed + Historia" },
              ].map(r => (
                <div key={r.k} className="flex justify-between items-center pb-2.5 border-b border-white/[0.05] last:border-0 last:pb-0">
                  <p className="text-[11px] text-white/40">{r.k}</p>
                  <p className="text-[11px] font-medium text-white/60">{r.v}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161619] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-base font-medium text-white/90">Publicar en Instagram</h3>
                  <p className="text-[12px] text-white/40 mt-0.5">{selectedProduct.model} {selectedProduct.capacity}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/[0.07] rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-white/35 text-[20px]">close</span>
                </button>
              </div>

              <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-xl mb-5">
                {(["post", "historia"] as const).map(tab => (
                  <button key={tab} onClick={() => setModalTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${modalTab === tab ? "bg-white/[0.10] border border-white/[0.12] text-white/85" : "text-white/35 hover:text-white/55"}`}>
                    <span className="material-symbols-outlined text-[14px]">{tab === "post" ? "image" : "auto_awesome"}</span>
                    {tab === "post" ? "Post Feed" : "Historia"}
                  </button>
                ))}
              </div>

              {modalTab === "post" && (
                <>
                  <div className="mb-4">
                    {imageUrl
                      ? <div className="relative group">
                          <img src={imageUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl" /> {/* eslint-disable-line @next/next/no-img-element */}
                          <button onClick={() => setImageUrl("")}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[14px] text-white/70">close</span>
                          </button>
                        </div>
                      : <PhotoUploader productId={selectedProduct.id} currentPhotos={selectedProduct.photos || []}
                          onPhotosChange={photos => { setImageUrl(photos[0] || ""); setSelectedProduct({ ...selectedProduct, photos }); }} />
                    }
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-[0.14em] text-white/35 block mb-1.5">Caption</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={7}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/70 font-mono resize-none outline-none focus:border-white/15" />
                  </div>
                  {publishError && (
                    <div className="mb-4 p-3 bg-red-500/[0.07] border border-red-500/20 text-red-400 text-[11px] rounded-xl">{publishError}</div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setShowModal(false)}
                      className="flex-1 py-2.5 bg-white/[0.05] border border-white/[0.07] text-white/45 rounded-xl text-[12px] hover:bg-white/[0.08] transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handlePublish} disabled={publishing || !imageUrl}
                      className="flex-1 py-2.5 bg-white/[0.09] border border-white/[0.14] text-white/80 rounded-xl text-[12px] font-medium hover:bg-white/[0.12] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                      {publishing ? <><Spinner /> Publicando...</> : supervisado ? "Enviar a cola" : "Publicar ahora"}
                    </button>
                  </div>
                </>
              )}

              {modalTab === "historia" && (
                <div className="space-y-4">
                  {!imageUrl && (
                    <PhotoUploader productId={selectedProduct.id} currentPhotos={selectedProduct.photos || []}
                      onPhotosChange={photos => { setImageUrl(photos[0] || ""); setSelectedProduct({ ...selectedProduct, photos }); }} />
                  )}
                  {imageUrl && (
                    <div className="flex items-center gap-2 p-2 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                      <img src={imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" /> {/* eslint-disable-line @next/next/no-img-element */}
                      <p className="text-[11px] text-white/45 flex-1 truncate">{selectedProduct.model}</p>
                      <button onClick={() => setImageUrl("")} className="p-1 hover:bg-white/[0.07] rounded-lg">
                        <span className="material-symbols-outlined text-[14px] text-white/30">close</span>
                      </button>
                    </div>
                  )}
                  <StoryCanvas imageUrl={imageUrl} model={selectedProduct.model} capacity={selectedProduct.capacity}
                    color={selectedProduct.color} condition={selectedProduct.condition}
                    batteryHealth={selectedProduct.battery_health} price={selectedProduct.sale_price} isNew={selectedProduct.is_new} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TAB: Calendario ── */
function TabCalendario({ posts }: { posts: Post[] }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const postsByDay: Record<number, Post[]> = {};
  posts.forEach(p => {
    const d = new Date(p.published_at || p.created_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      postsByDay[day] = [...(postsByDay[day] || []), p];
    }
  });

  const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAY_NAMES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <GlassCard>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{MONTH_NAMES[month]} {year}</p>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/[0.07] rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[16px] text-white/35">chevron_left</span>
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/[0.07] rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[16px] text-white/35">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[9px] uppercase tracking-widest text-white/25 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            const dayPosts = day ? (postsByDay[day] || []) : [];
            return (
              <div key={i} className={`aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition-colors
                ${day ? "hover:bg-white/[0.04]" : ""} ${isToday ? "bg-white/[0.06] ring-1 ring-white/[0.12]" : ""}`}>
                {day && (
                  <>
                    <span className={`text-[11px] leading-none ${isToday ? "text-white/90 font-semibold" : "text-white/35"}`}>{day}</span>
                    {dayPosts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                        {dayPosts.slice(0, 3).map((_, j) => (
                          <div key={j} className="w-1 h-1 rounded-full bg-white/40" />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30 mb-3">Posts este mes</p>
          {posts.filter(p => {
            const d = new Date(p.published_at || p.created_at);
            return d.getMonth() === month && d.getFullYear() === year;
          }).length === 0
            ? <p className="text-[11px] text-white/25 italic">Sin publicaciones este mes</p>
            : posts.filter(p => {
                const d = new Date(p.published_at || p.created_at);
                return d.getMonth() === month && d.getFullYear() === year;
              }).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0" /> // eslint-disable-line @next/next/no-img-element
                    : <div className="w-8 h-8 rounded-lg bg-white/[0.05] shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{p.caption.split("\n")[0]}</p>
                    <p className="text-[10px] text-white/30">
                      {new Date(p.published_at || p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium
                    ${p.status === "publicado" ? "bg-emerald-500/15 text-emerald-400" :
                      p.status === "borrador" ? "bg-amber-500/15 text-amber-400" :
                      "bg-white/[0.07] text-white/35"}`}>{p.status}</span>
                </div>
              ))
          }
        </div>
      </div>
    </GlassCard>
  );
}

/* ── TAB: Insights ── */
function TabInsights() {
  const [data, setData] = useState<{ profile: IGProfile; metrics: IGMetrics; media: IGMedia[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/instagram/insights")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Error al cargar insights"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  if (error) return (
    <GlassCard>
      <div className="p-8 text-center">
        <p className="text-[12px] text-red-400/60">Error al cargar insights de Instagram</p>
        <p className="text-[11px] text-white/30 mt-1">{error}</p>
      </div>
    </GlassCard>
  );
  if (!data) return null;

  const kpis = [
    { label: "Seguidores",     value: data.profile.followers_count.toLocaleString("es-AR") },
    { label: "Reach (30 días)", value: data.metrics.reach.toLocaleString("es-AR") },
    { label: "Visitas al perfil", value: data.metrics.profile_views.toLocaleString("es-AR") },
    { label: "Clics al link",  value: data.metrics.website_clicks.toLocaleString("es-AR") },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <GlassCard key={k.label}>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-3">{k.label}</p>
              <p className="text-[26px] font-medium text-white/90 leading-none">{k.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Últimas publicaciones</p>
          {data.media.length === 0
            ? <p className="text-[12px] text-white/30 text-center py-8">Sin publicaciones</p>
            : <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {data.media.map(m => (
                  <div key={m.id} className="group relative">
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.04]">
                      {(m.media_url || m.thumbnail_url)
                        ? <img src={m.media_url || m.thumbnail_url} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/20 text-[24px]">image</span>
                          </div>
                      }
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[12px] text-white/30">favorite</span>
                        <span className="text-[10px] text-white/35">{m.like_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-white/30">chat_bubble</span>
                        <span className="text-[10px] text-white/35">{m.comments_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </GlassCard>
    </div>
  );
}

/* ── TAB: IA Fotos ── */
function TabIAFotos({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [style, setStyle] = useState<"dark" | "gradient" | "lifestyle" | "white">("dark");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState("");

  const STYLES = [
    { id: "dark" as const,      label: "Fondo negro",    desc: "Dramático, high-end" },
    { id: "gradient" as const,  label: "Degradado",      desc: "Azul/violeta, moderno" },
    { id: "lifestyle" as const, label: "Lifestyle",      desc: "Mármol blanco, natural" },
    { id: "white" as const,     label: "Fondo blanco",   desc: "E-commerce clásico" },
  ];

  function selectProduct(p: Product) {
    setSelectedProduct(p);
    setSourceUrl(p.photos?.[0] || "");
    setResults([]);
    setError("");
  }

  async function generate() {
    if (!sourceUrl) return;
    setGenerating(true); setError(""); setResults([]);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: sourceUrl, style }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(prev => [...prev, data.url]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar imagen");
    } finally { setGenerating(false); }
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Panel izquierdo */}
      <div className="col-span-12 lg:col-span-5 space-y-5">
        <GlassCard>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Seleccionar equipo</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {products.map(p => (
                <button key={p.id} onClick={() => selectProduct(p)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors border ${
                    selectedProduct?.id === p.id
                      ? "bg-white/[0.08] border-white/[0.14]"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                  }`}>
                  {p.photos?.[0]
                    ? <img src={p.photos[0]} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" /> // eslint-disable-line @next/next/no-img-element
                    : <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white/20 text-[16px]">smartphone</span>
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-white/75">{p.model} {p.capacity}</p>
                    <p className="text-[10px] text-white/35">{p.color} · {p.condition}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {selectedProduct && (
          <GlassCard>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Estilo de fondo</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-xl text-left border transition-colors ${
                      style === s.id
                        ? "bg-white/[0.08] border-white/[0.16]"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
                    }`}>
                    <p className="text-[11px] font-medium text-white/70">{s.label}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>

              {sourceUrl && (
                <div className="mb-4">
                  <p className="text-[10px] text-white/30 mb-1.5">Foto original</p>
                  <img src={sourceUrl} alt="" className="w-full aspect-square object-cover rounded-xl opacity-70" /> {/* eslint-disable-line @next/next/no-img-element */}
                </div>
              )}

              {error && <p className="text-[11px] text-red-400/70 mb-3">{error}</p>}

              <button onClick={generate} disabled={generating || !sourceUrl}
                className="w-full py-3 bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.12] rounded-xl text-[12px] font-medium text-white/70 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {generating ? <><Spinner /> Generando con IA...</> : <>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Generar variación
                </>}
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">Powered by fal.ai · Flux Schnell</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Panel derecho — resultados */}
      <div className="col-span-12 lg:col-span-7">
        <GlassCard className="h-full">
          <div className="p-5 h-full">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-4">Variaciones generadas</p>
            {results.length === 0 && !generating
              ? <div className="flex flex-col items-center justify-center py-16 text-white/25">
                  <span className="material-symbols-outlined text-[48px] mb-3">auto_awesome</span>
                  <p className="text-[12px]">Seleccioná un equipo y generá variaciones</p>
                  <p className="text-[10px] mt-1 text-white/20">Las imágenes generadas aparecen acá</p>
                </div>
              : <div className="grid grid-cols-2 gap-3">
                  {results.map((url, i) => (
                    <div key={i} className="space-y-2">
                      <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.04]">
                        <img src={url} alt={`Variación ${i + 1}`} className="w-full h-full object-cover" /> {/* eslint-disable-line @next/next/no-img-element */}
                      </div>
                      <a href={url} download={`variacion-${i + 1}.jpg`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-[11px] text-white/45 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">download</span>
                        Descargar
                      </a>
                    </div>
                  ))}
                  {generating && (
                    <div className="aspect-square rounded-xl bg-white/[0.03] border border-white/[0.06] border-dashed flex items-center justify-center">
                      <Spinner />
                    </div>
                  )}
                </div>
            }
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ MAIN ════════════════════════════════════════ */
export default function PublicidadPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [supervisado, setSupervisado] = useState(true);
  const [tab, setTab]           = useState<Tab>("publicar");

  const loadData = useCallback(async () => {
    try {
      const [prodRes, postsRes] = await Promise.all([
        supabase.from("ig_products")
          .select("id,model,capacity,color,condition,battery_health,sale_price,photos,status,defects,notes,is_new")
          .eq("status", "disponible").order("created_at", { ascending: false }),
        supabase.from("ig_posts").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setProducts((prodRes.data || []) as Product[]);
      setPosts((postsRes.data || []) as Post[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const publishedCount = posts.filter(p => p.status === "publicado").length;
  const pendingCount   = posts.filter(p => p.status === "borrador").length;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "publicar",   label: "Publicar",  icon: "campaign"       },
    { id: "calendario", label: "Calendario",icon: "calendar_month"  },
    { id: "insights",   label: "Insights",  icon: "bar_chart"       },
    { id: "ia-fotos",   label: "IA Fotos",  icon: "auto_awesome"    },
  ];

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
      <Spinner />
    </div>
  );

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] text-white/40 uppercase tracking-[0.14em] mb-2">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-[28px] font-medium text-white/90 leading-none tracking-tight">Publicidad</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Disponibles",          value: products.length    },
          { label: "Publicados",           value: publishedCount     },
          { label: "Pendientes",           value: pendingCount       },
          { label: "Modo agente",          value: supervisado ? "Supervisado" : "Automático", raw: true },
        ].map(k => (
          <GlassCard key={k.label}>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-3">{k.label}</p>
              <p className="text-[26px] font-medium text-white/90 leading-none">{k.raw ? k.value : k.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.07] rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${
              tab === t.id ? "bg-white/[0.09] border border-white/[0.12] text-white/85" : "text-white/35 hover:text-white/55"
            }`}>
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "publicar"   && <TabPublicar products={products} posts={posts} supervisado={supervisado} setSupervisado={setSupervisado} reloadPosts={loadData} />}
      {tab === "calendario" && <TabCalendario posts={posts} />}
      {tab === "insights"   && <TabInsights />}
      {tab === "ia-fotos"   && <TabIAFotos products={products} />}

    </div>
    </div>
  );
}
