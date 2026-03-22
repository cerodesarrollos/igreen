export default function MobileVentasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-auto">
      {children}
    </div>
  );
}
