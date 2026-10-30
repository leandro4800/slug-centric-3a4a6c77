import { useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { Activity, BookOpen, CalendarDays, Camera, ChevronRight, Dumbbell, FileText, Home, Menu, MessageCircle, UserRound, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/BrandingProvider";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Visão geral", path: "", icon: Home },
  { label: "Minha evolução", path: "evolucao", icon: Activity },
  { label: "Fotos e comparações", path: "evolucao/comparar", icon: Camera },
  { label: "Meu treino", path: "treino", icon: Dumbbell },
  { label: "Minha dieta", path: "dieta", icon: Utensils },
  { label: "Minha carta", path: "carta", icon: FileText },
  { label: "Meu perfil", path: "perfil", icon: UserRound },
  { label: "Comunidade", path: "comunidade", icon: MessageCircle },
  { label: "Biblioteca", path: "biblioteca", icon: BookOpen },
  { label: "Agenda", path: "presencial", icon: CalendarDays },
  { label: "Anamnese", path: "anamnese", icon: FileText },
  { label: "Links úteis", path: "parceiros", icon: ChevronRight },
];

export default function AtletaLayout() {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/${slug}/atleta`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:ml-64 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 lg:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <span className="truncate text-sm font-semibold">Painel do atleta</span>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 text-xs tracking-normal"><Link to={`/${slug}/app`}>Abrir app <ChevronRight /></Link></Button>
      </header>

      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-border bg-card p-5 lg:block", menuOpen ? "top-16 block" : "hidden")}>
        <Link to={base} onClick={() => setMenuOpen(false)} className="mb-8 flex min-w-0 items-center gap-3">
          {tenant?.logo_url ? <img src={tenant.logo_url} alt={tenant.nome} className="h-12 w-12 shrink-0 object-contain" /> : <Activity className="h-10 w-10 shrink-0 text-primary" />}
          <span className="min-w-0 break-words font-display text-2xl tracking-normal">{tenant?.nome || "Alpha Coach"}</span>
        </Link>
        <nav aria-label="Painel do atleta" className="space-y-1">
          {navigation.map(({ label, path, icon: Icon }) => (
            <Button key={path} asChild variant="ghost" className="h-auto min-h-11 w-full justify-start rounded-none px-3 py-3 text-xs font-semibold normal-case tracking-normal">
              <NavLink to={`${base}${path ? `/${path}` : ""}`} end onClick={() => setMenuOpen(false)} className={({ isActive }) => cn(isActive && "bg-primary/10 text-primary")}><Icon /><span className="whitespace-normal text-left">{label}</span></NavLink>
            </Button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 lg:ml-64">
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 lg:px-8"><Outlet /></div>
      </main>
    </div>
  );
}