export default function SettingsPage() {
  return (
    <>
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Configuración</h1>
          <p className="text-on-surface-variant max-w-lg">Gestión de perfil, preferencias del local y notificaciones.</p>
        </div>
        <div className="bg-white p-4 rounded-xl flex items-center gap-4 shadow-sm border border-slate-200">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border-2 border-primary/30">MF</div>
          <div>
            <h4 className="font-bold">Matias Frigeri</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary text-white">Administrador</span>
          </div>
        </div>
      </header>

      <div className="flex gap-8">
        {/* Settings Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 space-y-1 flex-shrink-0">
          {[
            { icon: "person", label: "Perfil", active: true },
            { icon: "shield", label: "Seguridad" },
            { icon: "notifications", label: "Notificaciones" },
            { icon: "settings_suggest", label: "Sistema" },
          ].map((item) => (
            <a key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              item.active ? "text-primary-dark bg-white shadow-sm" : "text-cool-grey hover:text-on-surface hover:translate-x-1"
            }`} href="#">
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </a>
          ))}
          <div className="mt-auto pt-8">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Soporte</p>
                  <p className="text-sm font-bold">Matias Frigeri</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Settings Content */}
        <div className="flex-1 space-y-8 max-w-4xl">
          {/* Profile Section */}
          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-green-50 rounded-lg">
                <span className="material-symbols-outlined text-primary">badge</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Información de Perfil</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Nombre completo</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" type="text" defaultValue="Matias Frigeri" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Email</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" type="email" defaultValue="matias@igreen.com.ar" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Teléfono</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" type="tel" defaultValue="+54 11 6863-6497" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Descripción</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" rows={3} defaultValue="Administrador de iGreen Buenos Aires. Especializado en microsoldadura y diagnóstico avanzado de dispositivos Apple." />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Shop Preferences */}
            <section className="md:col-span-2 bg-white rounded-xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-green-50 rounded-lg">
                  <span className="material-symbols-outlined text-primary">storefront</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Preferencias del Local</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Moneda</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all">
                    <option>ARS ($)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Idioma</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all">
                    <option>Español</option>
                    <option>English (US)</option>
                    <option>Deutsch</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Zona horaria</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all">
                    <option>Argentina (UTC-3)</option>
                    <option>Eastern Standard Time (UTC-5)</option>
                    <option>Pacific Standard Time (UTC-8)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-green-50 rounded-lg">
                  <span className="material-symbols-outlined text-primary">vibration</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Alertas</h3>
              </div>
              <div className="space-y-6">
                {[
                  { label: "Alertas por Email", sub: "Resumen diario de reparaciones", on: true },
                  { label: "Notificaciones SMS", sub: "Alertas críticas del sistema", on: false },
                  { label: "Notificaciones Push", sub: "Alertas en navegador y app", on: true },
                ].map((toggle) => (
                  <div key={toggle.label} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{toggle.label}</span>
                      <span className="text-xs text-on-surface-variant">{toggle.sub}</span>
                    </div>
                    <button className={`relative inline-flex h-6 w-11 items-center rounded-full ${toggle.on ? "bg-primary" : "bg-slate-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${toggle.on ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 py-10">
            <button className="w-full sm:w-auto px-8 py-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:bg-slate-200 rounded-full transition-all active:scale-95">
              Cancelar
            </button>
            <button className="w-full sm:w-auto px-10 py-4 text-sm font-bold uppercase tracking-widest text-white bg-gradient-to-b from-primary-dark to-primary rounded-full shadow-lg active:scale-95 transition-all">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
