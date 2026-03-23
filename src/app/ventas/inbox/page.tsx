"use client";

import { useState } from "react";

/* ─── TYPES ─── */
interface Message {
  id: number;
  from: "client" | "ia" | "human";
  text: string;
  time: string;
  isImage?: boolean;
}

interface Conversation {
  id: number;
  name: string;
  initials: string;
  color: string;
  phone: string;
  preview: string;
  time: string;
  unread: number;
  responder: "ia" | "human";
  responderName?: string;
  hasTurno?: boolean;
  clientSince?: string;
  interest?: string;
  status?: string;
  messages: Message[];
}

/* ─── MOCK DATA ─── */
const CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    name: "María López",
    initials: "ML",
    color: "bg-pink-500",
    phone: "+54 9 11 2345-6789",
    preview: "Hola, tienen iPhone 14 Pro 256GB?",
    time: "Hace 2 min",
    unread: 2,
    responder: "ia",
    clientSince: "Marzo 2026",
    interest: "iPhone 14 Pro 256GB",
    status: "Interesada — turno agendado",
    messages: [
      { id: 1, from: "client", text: "Hola! Vi en Instagram que tienen iPhones. Tienen el 14 Pro 256GB?", time: "14:32" },
      { id: 2, from: "ia", text: "¡Hola María! Sí, tenemos iPhone 14 Pro 256GB disponible en condición A (impecable) y B. El de condición A está a USD 850 y el B a USD 720. Ambos con 90 días de garantía. ¿Te interesa alguno?", time: "14:32" },
      { id: 3, from: "client", text: "El de condición A, tiene buena batería?", time: "14:35" },
      { id: 4, from: "ia", text: "¡Sí! Tiene 92% de salud de batería. Te mando unas fotos 📸", time: "14:35" },
      { id: 5, from: "ia", text: "3 fotos enviadas", time: "14:36", isImage: true },
      { id: 6, from: "client", text: "Se ve muy bien! Puedo ir a verlo?", time: "14:40" },
      { id: 7, from: "ia", text: "¡Claro! Estamos en Los Ríos 1774, de lunes a viernes 10 a 18hs. ¿Querés que te agendemos un turno? Así te lo tenemos reservado.", time: "14:40" },
      { id: 8, from: "client", text: "Dale, mañana a las 15 puede ser?", time: "14:42" },
      { id: 9, from: "ia", text: "Perfecto, te agendé turno para mañana a las 15:00. El equipo queda reservado a tu nombre. Te mando recordatorio 1 hora antes por WhatsApp. ¡Te esperamos! 📱", time: "14:42" },
    ],
  },
  {
    id: 2,
    name: "Carlos Duarte",
    initials: "CD",
    color: "bg-blue-500",
    phone: "+54 9 11 3456-7890",
    preview: "Perfecto, paso mañana a las 16",
    time: "Hace 15 min",
    unread: 0,
    responder: "ia",
    hasTurno: true,
    clientSince: "Febrero 2026",
    interest: "iPhone 15 128GB",
    status: "Turno reservado — mañana 16:00",
    messages: [
      { id: 1, from: "client", text: "Buenas! Tienen algún iPhone 15 en stock?", time: "14:00" },
      { id: 2, from: "ia", text: "¡Hola Carlos! Sí, tenemos iPhone 15 128GB condición A a USD 920. ¿Te interesa?", time: "14:00" },
      { id: 3, from: "client", text: "Sí, puedo ir mañana?", time: "14:05" },
      { id: 4, from: "ia", text: "¡Claro! ¿A qué hora te queda bien? Estamos de 10 a 18hs.", time: "14:05" },
      { id: 5, from: "client", text: "Perfecto, paso mañana a las 16", time: "14:10" },
      { id: 6, from: "ia", text: "Listo, te agendé turno para mañana a las 16:00. ¡Te esperamos!", time: "14:10" },
    ],
  },
  {
    id: 3,
    name: "Lucía Fernández",
    initials: "LF",
    color: "bg-purple-500",
    phone: "+54 9 11 4567-8901",
    preview: "Cuánto sale el iPhone 13?",
    time: "Hace 1h",
    unread: 1,
    responder: "ia",
    clientSince: "Nuevo",
    interest: "iPhone 13",
    status: "Consulta inicial",
    messages: [
      { id: 1, from: "client", text: "Hola! Cuánto sale el iPhone 13?", time: "13:15" },
    ],
  },
  {
    id: 4,
    name: "Diego Martínez",
    initials: "DM",
    color: "bg-amber-600",
    phone: "+54 9 11 5678-9012",
    preview: "Me sirve, ¿aceptan transferencia?",
    time: "Hace 3h",
    unread: 0,
    responder: "human",
    responderName: "Matías",
    clientSince: "Enero 2026",
    interest: "iPhone 14 128GB",
    status: "Negociando forma de pago",
    messages: [
      { id: 1, from: "client", text: "Buenas, vi que tienen iPhone 14 128GB. Cuánto?", time: "11:00" },
      { id: 2, from: "ia", text: "¡Hola Diego! Sí, tenemos iPhone 14 128GB condición A a USD 680. ¿Te interesa?", time: "11:00" },
      { id: 3, from: "client", text: "Un poco caro, hacen algo de descuento?", time: "11:05" },
      { id: 4, from: "human", text: "Hola Diego, soy Matías. Para ese equipo podemos dejarlo en USD 650 si es efectivo. ¿Te sirve?", time: "11:20" },
      { id: 5, from: "client", text: "Me sirve, ¿aceptan transferencia?", time: "11:25" },
    ],
  },
  {
    id: 5,
    name: "Ana Ruiz",
    initials: "AR",
    color: "bg-teal-500",
    phone: "+54 9 11 6789-0123",
    preview: "Gracias, quedó impecable el iPhone",
    time: "Ayer",
    unread: 0,
    responder: "ia",
    clientSince: "Diciembre 2025",
    interest: "iPhone 13 Pro (comprado)",
    status: "Post-venta — satisfecha",
    messages: [
      { id: 1, from: "client", text: "Hola! Quería decirles que quedó impecable el iPhone 13 Pro que compré. Muy contenta!", time: "18:00" },
      { id: 2, from: "ia", text: "¡Qué bueno Ana, nos alegra mucho! Recordá que tenés 90 días de garantía. Cualquier cosa escribinos. 😊", time: "18:00" },
      { id: 3, from: "client", text: "Gracias, quedó impecable el iPhone", time: "18:05" },
    ],
  },
  {
    id: 6,
    name: "Tomás Herrera",
    initials: "TH",
    color: "bg-red-500",
    phone: "+54 9 11 7890-1234",
    preview: "Tienen batería para iPhone 12?",
    time: "Ayer",
    unread: 0,
    responder: "ia",
    clientSince: "Marzo 2026",
    interest: "Batería iPhone 12",
    status: "Derivado a servicio técnico",
    messages: [
      { id: 1, from: "client", text: "Hola, tienen batería para iPhone 12? La mía ya no dura nada", time: "16:00" },
      { id: 2, from: "ia", text: "¡Hola Tomás! Sí, hacemos cambio de batería para iPhone 12. El servicio está a $35.000 con batería incluida y tiene 60 días de garantía. ¿Querés agendar un turno?", time: "16:00" },
      { id: 3, from: "client", text: "Sí dale, cuánto tarda?", time: "16:05" },
      { id: 4, from: "ia", text: "El cambio de batería demora aproximadamente 40 minutos. Te derivo con nuestro equipo de servicio técnico para agendar el turno. ¡Ellos te contactan enseguida!", time: "16:05" },
    ],
  },
];

type FilterType = "todas" | "sin_leer" | "ia" | "humano";

/* ─── COMPONENT ─── */
export default function InboxVentasPage() {
  const [activeId, setActiveId] = useState(1);
  const [filter, setFilter] = useState<FilterType>("todas");
  const [search, setSearch] = useState("");
  const [showPanel, setShowPanel] = useState(false);

  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  const filtered = CONVERSATIONS.filter((c) => {
    if (filter === "sin_leer" && c.unread === 0) return false;
    if (filter === "ia" && c.responder !== "ia") return false;
    if (filter === "humano" && c.responder !== "human") return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const active = CONVERSATIONS.find((c) => c.id === activeId)!;

  const filters: { key: FilterType; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "sin_leer", label: "Sin leer" },
    { key: "ia", label: "IA" },
    { key: "humano", label: "Humano" },
  ];

  return (
    <div className="-m-6 -mt-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* ── DEMO BANNER ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium shrink-0">
        <span className="material-symbols-outlined text-base">smart_toy</span>
        Demo — Los datos son de ejemplo. La integración real requiere WhatsApp Business API.
      </div>

      {/* ── MAIN GRID ── */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* ═══ LEFT: CONVERSATION LIST ═══ */}
        <aside className="col-span-4 border-r border-slate-200 flex flex-col bg-white min-h-0">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-on-surface">Conversaciones</h2>
              {totalUnread > 0 && (
                <span className="bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cool-grey text-lg">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-sm placeholder:text-cool-grey focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Buscar conversación..."
              />
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filter === f.key
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-cool-grey hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                  c.id === activeId
                    ? "bg-primary/5 border-primary"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`${c.color} text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
                >
                  {c.initials}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-on-surface truncate">{c.name}</span>
                    <span className="text-[10px] text-cool-grey whitespace-nowrap">{c.time}</span>
                  </div>
                  <p className="text-xs text-cool-grey truncate mt-0.5">{c.preview}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        c.responder === "ia"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {c.responder === "ia" ? "IA" : `HUMANO${c.responderName ? ` · ${c.responderName}` : ""}`}
                    </span>
                    {c.hasTurno && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                        Turno
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread badge */}
                {c.unread > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-1">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-cool-grey">
                <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                <p className="text-sm">No se encontraron conversaciones</p>
              </div>
            )}
          </div>
        </aside>

        {/* ═══ RIGHT: OPEN CHAT ═══ */}
        <section className="col-span-8 flex flex-col bg-slate-50 min-h-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`${active.color} text-white w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold`}
              >
                {active.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-on-surface">{active.name}</span>
                  <span className="text-[10px] text-cool-grey">{active.phone}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    En línea
                  </span>
                  <span className="text-slate-300">·</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      active.responder === "ia" ? "text-blue-600" : "text-orange-600"
                    }`}
                  >
                    {active.responder === "ia" ? "Respondiendo IA 🤖" : `Respondiendo ${active.responderName ?? "Humano"} 👤`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {active.responder === "ia" && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-colors">
                  <span className="material-symbols-outlined text-sm">front_hand</span>
                  Tomar conversación
                </button>
              )}
              <button
                onClick={() => setShowPanel(!showPanel)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showPanel ? "bg-primary/10 text-primary" : "text-cool-grey hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-xl">info</span>
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 flex min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.messages.map((m) => {
                const isClient = m.from === "client";
                return (
                  <div key={m.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isClient
                          ? "bg-white border border-slate-200 rounded-tl-md"
                          : "bg-primary/10 rounded-tr-md"
                      }`}
                    >
                      {/* Responder tag */}
                      {!isClient && (
                        <div className="flex items-center gap-1 mb-1">
                          <span
                            className={`text-[10px] font-semibold ${
                              m.from === "ia" ? "text-blue-500" : "text-orange-500"
                            }`}
                          >
                            {m.from === "ia" ? "🤖 IA" : "👤 Humano"}
                          </span>
                        </div>
                      )}

                      {/* Image placeholder */}
                      {m.isImage ? (
                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-6 text-cool-grey">
                          <span className="material-symbols-outlined text-xl">photo_camera</span>
                          <span className="text-xs font-medium">{m.text}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-on-surface leading-relaxed">{m.text}</p>
                      )}

                      {/* Timestamp */}
                      <p className={`text-[10px] text-slate-400 mt-1 ${isClient ? "text-left" : "text-right"}`}>
                        {m.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Client info panel */}
            {showPanel && (
              <div className="w-72 border-l border-slate-200 bg-white p-4 overflow-y-auto shrink-0">
                <h3 className="font-bold text-sm text-on-surface mb-4">Info del cliente</h3>

                <div className="flex flex-col items-center mb-4">
                  <div
                    className={`${active.color} text-white w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mb-2`}
                  >
                    {active.initials}
                  </div>
                  <p className="font-semibold text-sm text-on-surface">{active.name}</p>
                  <p className="text-xs text-cool-grey">{active.phone}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-cool-grey uppercase tracking-wider font-semibold mb-1">
                      Cliente desde
                    </p>
                    <p className="text-xs text-on-surface">{active.clientSince}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cool-grey uppercase tracking-wider font-semibold mb-1">
                      Equipo de interés
                    </p>
                    <p className="text-xs text-on-surface">{active.interest}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cool-grey uppercase tracking-wider font-semibold mb-1">
                      Estado
                    </p>
                    <p className="text-xs text-on-surface">{active.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cool-grey uppercase tracking-wider font-semibold mb-1">
                      Respondiendo
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold ${
                          active.responder === "ia" ? "text-blue-600" : "text-orange-600"
                        }`}
                      >
                        {active.responder === "ia" ? "🤖 IA" : `👤 ${active.responderName ?? "Humano"}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat footer */}
          <div className="px-5 py-3 bg-white border-t border-slate-200 shrink-0">
            {active.responder === "ia" ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-sm text-cool-grey">
                  <span className="material-symbols-outlined text-base animate-pulse">smart_toy</span>
                  La IA está respondiendo...
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-xl hover:bg-orange-100 transition-colors whitespace-nowrap">
                  <span className="material-symbols-outlined text-sm">front_hand</span>
                  Tomar conversación
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  disabled
                  className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm placeholder:text-cool-grey"
                  placeholder="Escribí un mensaje..."
                />
                <button
                  disabled
                  className="p-2.5 bg-primary text-white rounded-xl opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
