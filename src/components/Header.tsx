"use client";

export default function Header() {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-5rem)] lg:w-[calc(100%-15rem)] z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 h-16 transition-all">
      <div className="flex items-center bg-slate-100 px-4 py-1.5 rounded-lg w-72 lg:w-96 border border-slate-200">
        <span className="material-symbols-outlined text-cool-grey text-xl mr-2">
          search
        </span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-cool-grey outline-none"
          placeholder="Buscar comando (CMD + K)"
          type="text"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="text-cool-grey hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-cool-grey hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-xs">Matias</p>
            <p className="text-[9px] uppercase tracking-wider text-cool-grey">
              Admin
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            MF
          </div>
        </div>
      </div>
    </header>
  );
}
