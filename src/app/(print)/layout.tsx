// Mise en page minimale pour l'impression (rapports du Studio) : pas de menu ni d'en-tête.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas py-8 print:bg-white print:py-0">{children}</div>;
}
