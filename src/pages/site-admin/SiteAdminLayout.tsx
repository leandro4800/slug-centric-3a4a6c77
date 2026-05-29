import { Outlet, Navigate, useLocation, NavLink } from "react-router-dom";
import { Loader2, LayoutDashboard, Users, UserPlus, Dumbbell, Apple, Ruler, Palette, Wallet, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteTenantProvider, useSiteTenant } from "@/hooks/use-site-tenant";
import { SiteAdminSidebar } from "@/components/site-admin/SiteAdminSidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { to: "/site/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/site/admin/alunos", label: "Alunos", icon: Users },
  { to: "/site/admin/alunos/novo", label: "Cadastrar aluno", icon: UserPlus },
  { to: "/site/admin/treinos", label: "Treino", icon: Dumbbell },
  { to: "/site/admin/dieta", label: "Dieta", icon: Apple },
  { to: "/site/admin/avaliacao-fisica", label: "Avaliação", icon: Ruler },
  { to: "/site/admin/aparencia", label: "Aparência", icon: Palette },
  { to: "/site/admin/faturamento", label: "Faturamento", icon: Wallet },
];

const Inner = () => {
  const { tenant, loading } = useSiteTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-sm uppercase tracking-widest text-primary font-bold">Acesso restrito</p>
          <p className="text-sm text-muted-foreground">
            Este painel é exclusivo para coaches. Você ainda não tem um painel de coach ativo.
          </p>
          <a href="/seja-coach" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
            Testar por R$ 1
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <SiteAdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur px-4 py-3">
          <button onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menu" className="p-2">
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-display text-sm tracking-widest">ALPHA<span className="text-primary">COACH</span></p>
          <div className="w-9" />
        </header>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="md:hidden border-b border-white/10 bg-black/95 backdrop-blur">
            <nav className="grid grid-cols-2 gap-1 p-2">
              {mobileItems.map((item) => {
                const active = location.pathname === item.to || (item.to !== "/site/admin/alunos/novo" && location.pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/site/admin/alunos"}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded text-xs",
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const SiteAdminLayout = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/site/login" replace />;

  return (
    <SiteTenantProvider>
      <Inner />
    </SiteTenantProvider>
  );
};

export default SiteAdminLayout;
