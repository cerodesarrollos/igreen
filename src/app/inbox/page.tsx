export default function InboxPage() {
  const conversations = [
    { name: "Laura Morales", msg: "La pantalla de mi iPhone 13...", time: "10:42", platform: "instagram", platformColor: "bg-pink-500", platformIcon: "photo_camera", active: true, badge: "REPARACIÓN ACTIVA" },
    { name: "Marcus Chen", msg: "¿Ya está mi Mac?", time: "9:15", platform: "whatsapp", platformColor: "bg-green-500", platformIcon: "forum", unread: 2 },
    { name: "Sarah Jenkins", msg: "¡Gracias por el arreglo rápido!", time: "Ayer", platform: "email", platformColor: "bg-blue-500", platformIcon: "mail" },
    { name: "David Rossi", msg: "Quiero cotizar un cambio de batería", time: "Lunes", platform: "instagram", platformColor: "bg-pink-500", platformIcon: "photo_camera" },
  ];

  return (
    <div className="-m-6 -mt-4 flex h-[calc(100vh-5rem)] overflow-hidden">
      {/* Left: Conversations List */}
      <section className="w-80 flex flex-col bg-surface border-r border-slate-100 flex-shrink-0">
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-bold">Inbox</h2>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {["Todos", "WhatsApp", "Instagram", "Email"].map((f, i) => (
              <button key={f} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                i === 0 ? "bg-primary text-white" : "text-cool-grey hover:bg-slate-200"
              }`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map((c) => (
            <div key={c.name} className={`p-4 cursor-pointer transition-colors ${c.active ? "bg-white border-l-4 border-primary" : "hover:bg-slate-100/50 border-b border-slate-50"}`}>
              <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-on-surface-variant">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${c.platformColor}`}>
                    <span className="material-symbols-outlined text-[10px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{c.platformIcon}</span>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`text-sm truncate ${c.active ? "font-bold" : "font-semibold"}`}>{c.name}</h4>
                    <span className="text-[10px] text-cool-grey font-medium">{c.time}</span>
                  </div>
                  <p className="text-xs text-cool-grey truncate mb-1">{c.msg}</p>
                  {c.badge && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-bold">{c.badge}</span>}
                </div>
                {c.unread && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold self-center">{c.unread}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Center: Message Thread */}
      <section className="flex-1 flex flex-col bg-white">
        <div className="px-8 py-4 flex items-center justify-between border-b border-slate-100/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-on-surface-variant">LM</div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Laura Morales</h3>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">En línea</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors">Vincular a Ticket</button>
            <button className="px-4 py-2 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors">Crear Lead</button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col no-scrollbar">
          <div className="flex flex-col items-center">
            <span className="px-4 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-cool-grey uppercase tracking-widest">Hoy</span>
          </div>

          {/* Incoming */}
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold self-end mb-1">LM</div>
            <div>
              <div className="bg-slate-100 rounded-t-2xl rounded-br-2xl p-4">
                <p className="text-sm leading-relaxed">¡Hola! Quería saber cómo va la reparación de mi iPhone 13 Pro. ¿Ya cambiaron la pantalla?</p>
              </div>
              <span className="text-[10px] text-cool-grey mt-1 inline-block">10:42 AM</span>
            </div>
          </div>

          {/* Outgoing */}
          <div className="flex flex-col items-end gap-1 ml-auto max-w-[80%]">
            <div className="bg-gradient-to-br from-primary-dark to-primary text-white rounded-t-2xl rounded-bl-2xl p-4 shadow-md shadow-primary/10">
              <p className="text-sm leading-relaxed font-medium">¡Hola Laura! Sí, recién terminamos de instalar el panel OLED original. Ahora estamos corriendo el test de estrés final de 30 minutos para asegurarnos de que todo quede perfecto.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-cool-grey">10:45 AM</span>
              <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
            </div>
          </div>

          {/* Incoming 2 */}
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold self-end mb-1">LM</div>
            <div>
              <div className="bg-slate-100 rounded-t-2xl rounded-br-2xl p-4">
                <p className="text-sm leading-relaxed">¡Genial! ¿Puedo pasar a buscarlo esta tarde?</p>
              </div>
              <span className="text-[10px] text-cool-grey mt-1 inline-block">10:46 AM</span>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-slate-100/60">
          <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl ring-1 ring-slate-200 focus-within:ring-primary/30 transition-shadow">
            <button className="p-2 hover:bg-white rounded-xl transition-colors text-cool-grey hover:text-primary">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <input className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 outline-none" placeholder="Escribí un mensaje a Laura..." type="text" />
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white rounded-xl transition-colors text-cool-grey">
                <span className="material-symbols-outlined">mood</span>
              </button>
              <button className="bg-primary text-white p-2.5 rounded-xl hover:scale-95 transition-transform">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right: CRM Profile */}
      <section className="w-80 flex flex-col bg-slate-50 p-6 overflow-y-auto no-scrollbar gap-6 flex-shrink-0 hidden xl:flex">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-green-50 to-green-100 opacity-50" />
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-on-surface-variant">LM</div>
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
          <h2 className="text-xl font-black tracking-tight">Laura Morales</h2>
          <p className="text-cool-grey text-sm mb-6">Cliente desde 2022</p>
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
              <span className="material-symbols-outlined text-cool-grey text-lg">phone</span>
              <span className="text-sm font-medium">+1 555-0123</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
              <span className="material-symbols-outlined text-cool-grey text-lg">mail</span>
              <span className="text-sm font-medium">laura@example.com</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-cool-grey">Reparación Activa</h4>
            <span className="w-2 h-2 bg-primary animate-pulse rounded-full" />
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-primary">#IG-9842</span>
              <span className="text-[10px] px-2 py-0.5 bg-primary text-white rounded-full font-bold">TEST DE ESTRÉS</span>
            </div>
            <p className="font-bold text-sm mb-1">iPhone 13 Pro - Alpine Green</p>
            <p className="text-xs text-cool-grey mb-4">Reemplazo de pantalla y calibración</p>
            <div className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest text-cool-grey mb-4">Historial de Compras</h4>
          <div className="space-y-4">
            {[
              { icon: "smartphone", name: "MagSafe Charger", date: "12 Dic 2023", price: "$39.00" },
              { icon: "headphones", name: "AirPods Pro Gen 2", date: "20 Ago 2023", price: "$249.00" },
              { icon: "laptop_mac", name: "Servicio Batería - Mac", date: "15 May 2022", price: "$199.00" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cool-grey">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{item.name}</p>
                    <p className="text-[10px] text-cool-grey">{item.date}</p>
                  </div>
                </div>
                <span className="text-xs font-bold">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
