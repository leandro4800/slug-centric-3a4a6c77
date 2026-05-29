import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, UserPlus, Dumbbell, Apple, Ruler, Palette, Wallet, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useSiteTenant } from "@/hooks/use-site-tenant";

const items = [
  { to: "/site/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/site/admin/alunos", label: "Alunos", icon: Users },
  { to: "/site/admin/alunos/novo", label: "Cadastrar aluno", icon: UserPlus },
  { to: "/site/admin/treinos", label: "Montar treino", icon: Dumbbell },
  { to: "/site/admin/dieta", label: "Montar dieta", icon: Apple },
  { to: "/site/admin/avaliacao-fisica", label: "Avaliação física", icon: Ruler },
  { to: "/site/admin/aparencia", label: "Aparência", icon: Palette },
  { to: "/site/admin/faturamento", label: "Faturamento", icon: Wallet },
];

export const SiteAdminSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tenant } = useSiteTenant();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/site/login", { replace: true });
  };

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Logo withText={false} />
          <div className="leading-tight">
            <p className="font-display text-sm tracking-widest">ALPHA<span className="text-primary">COACH</span></p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Painel do site</p>
          </div>
        </div>
        {tenant && (
          <p className="mt-3 text-[10px] uppercase tracking-widest text-primary truncate">{tenant.nome}</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/site/admin/alunos/novo" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/site/admin/alunos"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};
