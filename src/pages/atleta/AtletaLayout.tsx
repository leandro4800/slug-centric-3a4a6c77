import { useState } from "react";
import { Link, NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { Activity, CalendarDays, Dumbbell, FileText, Home, LogOut, Menu, UserRound, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/BrandingProvider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navigation = [
  { label: "Visão geral", path: "", icon: Home },
  { label: "Desempenho no treino", path: "treino", icon: Dumbbell },
  { label: "Evolução e fotos", path: "evolucao", icon: Activity },
  { label: "Planejamento alimentar", path: "dieta", icon: Utensils },
  { label: "Minha carta", path: "carta", icon: FileText },
  { label: "Meu perfil", path: "perfil", icon: UserRound },
  { label: "Agenda", path: "presencial", icon: CalendarDays },
  { label: "Anamnese", path: "anamnese", icon: FileText },
];

export default function AtletaLayout() {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/${slug}/atleta`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 md:ml-60 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 md:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <span className="truncate text-sm font-semibold">Painel do atleta</span>
        </div>
      </header>

      <aside className={cn("fixed inset-y-0 left-0 z-50 w-60 flex-col overflow-y-auto border-r border-border bg-background p-3 md:flex", menuOpen ? "top-16 flex md:top-0" : "hidden")}>
        <Link to={base} onClick={() => setMenuOpen(false)} className="mb-5 flex min-w-0 items-center gap-3 border-b border-border px-2 py-4">
          {tenant?.logo_url ? <img src={tenant.logo_url} alt={tenant.nome} className="h-9 w-9 shrink-0 object-contain" /> : <Activity className="h-9 w-9 shrink-0 text-primary" />}
          <div className="min-w-0"><span className="break-words font-display text-lg tracking-normal">{tenant?.nome || "Alpha Coach"}</span><p className="mt-1 text-[10px] text-muted-foreground">Painel do atleta</p></div>
        </Link>
        <nav aria-label="Painel do atleta" className="space-y-1">
          {navigation.map(({ label, path, icon: Icon }) => (
            <Button key={path} asChild variant="ghost" className="h-auto min-h-10 w-full justify-start rounded-md px-3 py-2 text-sm font-normal normal-case tracking-normal shadow-none">
              <NavLink to={`${base}${path ? `/${path}` : ""}`} end onClick={() => setMenuOpen(false)} className={({ isActive }) => cn(isActive ? "border-l-2 border-primary bg-primary/15 text-primary" : "text-muted-foreground")}><Icon /><span className="whitespace-normal text-left">{label}</span></NavLink>
            </Button>
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-4"><Button variant="ghost" className="w-full justify-start text-sm font-normal normal-case tracking-normal shadow-none" onClick={async () => { await supabase.auth.signOut(); navigate("/login?painel=atleta", { replace: true }); }}><LogOut /> Sair</Button></div>
      </aside>

      <main className="min-w-0 md:ml-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></div>
      </main>
    </div>
  );
}