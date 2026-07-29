import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Users, UserPlus, Dumbbell, Apple, Ruler, Palette, Wallet,
  LogOut, Calendar, Wrench, UserCog, LifeBuoy, Bot, Swords, Utensils, Tag,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useEffect, useState } from "react";

type Item = { to: string; label: string; icon: any; section?: string };

const baseItems: Item[] = [
  { to: "/site/admin/dashboard", label: "Resumo", icon: Home, section: "Painel" },
  { to: "/site/admin/agenda", label: "Agenda", icon: Calendar, section: "Painel" },

  { to: "/site/admin/alunos", label: "Alunos", icon: Users, section: "Alunos" },
  { to: "/site/admin/alunos/novo", label: "Cadastrar aluno", icon: UserPlus, section: "Alunos" },

  { to: "/site/admin/treinos", label: "Montar treino", icon: Dumbbell, section: "Programação" },
  { to: "/site/admin/dieta", label: "Montar dieta", icon: Apple, section: "Programação" },
  { to: "/site/admin/avaliacao-fisica", label: "Avaliação física", icon: Ruler, section: "Programação" },

  { to: "/site/admin/ferramentas", label: "Ferramentas", icon: Wrench, section: "Negócio" },
  { to: "/site/admin/integracao-ia", label: "Integração com IA", icon: Bot, section: "Negócio" },
  { to: "/site/admin/faturamento", label: "Financeiro", icon: Wallet, section: "Negócio" },
  { to: "/site/admin/planos", label: "Meus Planos", icon: Tag, section: "Negócio" },
  { to: "/site/admin/aparencia", label: "Aparência", icon: Palette, section: "Negócio" },

  { to: "/site/admin/meu-perfil", label: "Meu perfil", icon: UserCog, section: "Conta" },
  { to: "/site/admin/minha-conta", label: "Minha conta", icon: UserCog, section: "Conta" },
  { to: "/site/admin/suporte", label: "Suporte", icon: LifeBuoy, section: "Conta" },
];

const SECTIONS = ["Painel", "Alunos", "Programação", "Luta", "Negócio", "Conta"] as const;

export const SiteAdminSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tenant } = useSiteTenant();
  const [vertical, setVertical] = useState<string>("personal");

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const { data } = await supabase.from("tenants").select("vertical").eq("id", tenant.id).maybeSingle();
      if ((data as any)?.vertical) setVertical((data as any).vertical);
    })();
  }, [tenant?.id]);

  const items: Item[] = [
    ...baseItems,
    ...(vertical === "fight" ? [
      { to: "/site/admin/ct/camps", label: "Camps & Sessões", icon: Swords, section: "Luta" },
      { to: "/site/admin/ct/nutricao", label: "Nutrição de combate", icon: Utensils, section: "Luta" },
    ] : []),
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/site/login", { replace: true });
  };

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("site-admin-sidebar-collapsed") === "1";
  });
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("site-admin-sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm h-screen sticky top-0 transition-[width] duration-200",
      collapsed ? "w-14" : "w-60"
    )}>
      <div className={cn("border-b border-white/10 relative", collapsed ? "px-2 py-4" : "px-5 py-6")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Logo withText={false} />
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm tracking-widest">ALPHA<span className="text-primary">COACH</span> PRO</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Painel do site</p>
            </div>
          )}
        </div>
        {!collapsed && tenant && (
          <p className="mt-3 text-[10px] uppercase tracking-widest text-primary truncate">{tenant.nome}</p>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-white/10 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 z-10"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {SECTIONS.map((section) => (
          <div key={section}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/60">{section}</p>
            )}
            <div className="space-y-0.5">
              {items.filter((i) => i.section === section).map((item) => {
                const exact = item.to === "/site/admin/alunos" || item.to === "/site/admin/alunos/novo";
                const active = exact
                  ? pathname === item.to
                  : pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={exact}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md text-sm transition-colors",
                      collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                      active
                        ? "bg-primary/15 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={signOut}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
};
