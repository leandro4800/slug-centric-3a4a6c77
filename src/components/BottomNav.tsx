import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import {
  Home,
  Dumbbell,
  Utensils,
  TrendingUp,
  Users,
  User,
  CalendarCheck,
  MoreHorizontal,
  Sparkles,
  Palette,
  Settings,
  ClipboardList,
  BookOpen,
  Ruler,
  Stethoscope,
  X,
} from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const mainItems = [
  { label: "Início", icon: Home, to: "" },
  { label: "Treino", icon: Dumbbell, to: "treino" },
  { label: "Dieta", icon: Utensils, to: "dieta" },
  { label: "Evolução", icon: TrendingUp, to: "evolucao" },
];

const AlunoBottomNav = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const { user, hasRole } = useAuth();
  const lastSlug =
    typeof window !== "undefined" ? localStorage.getItem("last_tenant_slug") : null;
  const tenantSlug = tenant?.slug || slug || lastSlug || "";
  const [isOpen, setIsOpen] = useState(false);

  // Coach do tenant atual (dono ou role coach/admin) — mesmo critério usado
  // pelo RequireAuth que protege a rota /:slug/admin/aparencia.
  const isCoachOfTenant =
    !!tenant &&
    !!user &&
    (hasRole("admin") ||
      hasRole("coach", tenant.id) ||
      tenant.owner_user_id === user.id);

  const moreItems = [
    { label: "Meu Perfil", icon: User, to: "perfil" },
    ...(isCoachOfTenant
      ? [
          { label: "Personalizar App", icon: Palette, to: `/${tenantSlug}/admin/aparencia` },
          { label: "Painel do Coach", icon: Settings, to: `/${tenantSlug}/app/controle` },
        ]
      : [
          { label: "Anamnese", icon: ClipboardList, to: "anamnese" },
          { label: "Avaliação Física", icon: Ruler, to: "perfil?avaliacao=1" },
        ]),
    { label: "Biblioteca", icon: BookOpen, to: "biblioteca" },
    { label: "Comunidade", icon: Users, to: "comunidade" },
    // { label: "Clínica", icon: Stethoscope, to: "clinica" },
    { label: "Presencial", icon: CalendarCheck, to: "presencial" },
    { label: "Minha Carta", icon: Sparkles, to: "carta" },
  ];

  const appBase = tenantSlug ? `/${tenantSlug}/app` : "/app";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch px-0.5 pt-1.5 pb-1.5">
        {mainItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={`${appBase}${to ? `/${to}` : ""}`}
            end={!to}
            className="flex-1 min-w-0"
          >
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[9px] leading-tight uppercase tracking-tight transition-all duration-300 ${
                  isActive
                    ? "text-primary filter drop-shadow-[0_0_8px_hsla(var(--primary-glow)/0.8)]"
                    : "text-muted-foreground hover:text-foreground opacity-70"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
                <span className={`w-full text-center ${isActive ? "font-bold" : "font-normal"}`}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label="Abrir menu de opções"
          onClick={() => {
            void import("@/pages/aluno/Perfil");
            setIsOpen(true);
          }}
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[9px] leading-tight uppercase tracking-tight text-muted-foreground hover:text-foreground opacity-70 transition-all duration-300"
        >
          <MoreHorizontal className="h-[18px] w-[18px] shrink-0 stroke-[1.8px]" />
          <span className="w-full text-center font-normal">Mais</span>
        </button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            className="z-[100] max-h-[85vh] rounded-t-[2rem] border-t border-border bg-background px-0 pb-6 pt-3 [&>button.absolute]:hidden"
          >
            <SheetHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between px-6 space-y-0 text-left">
              <div>
                <SheetTitle className="font-display text-lg tracking-wider">Menu de Opções</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Acesse outros recursos do seu app
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>

            <div className="p-6 grid grid-cols-3 gap-4">
              {moreItems.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={label}
                  to={to.startsWith("/") ? to : `${appBase}/${to}`}
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center text-foreground/80 group-hover:text-primary transition-colors">
                    {label}
                  </span>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default AlunoBottomNav;
