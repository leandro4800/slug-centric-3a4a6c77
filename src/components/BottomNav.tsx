import { NavLink, useParams } from "react-router-dom";
import { Home, Dumbbell, Utensils, TrendingUp, Users, Stethoscope, User, CalendarCheck } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";

const items = [
  { label: "Início", icon: Home, to: "" },
  { label: "Treino", icon: Dumbbell, to: "treino" },
  { label: "Dieta", icon: Utensils, to: "dieta" },
  { label: "Comuni.", icon: Users, to: "comunidade" },
  { label: "Evolução", icon: TrendingUp, to: "evolucao" },
  { label: "Clínica", icon: Stethoscope, to: "clinica" },
  { label: "Presen.", icon: CalendarCheck, to: "presencial" },
  { label: "Perfil", icon: User, to: "perfil" },
];

const BottomNav = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const tenantSlug = tenant?.slug || slug;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch px-0.5 pt-1.5 pb-1.5">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={`/${tenantSlug}/app${to ? `/${to}` : ""}`}
            end={!to}
            className="flex-1 min-w-0"
          >
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[9px] leading-tight uppercase tracking-tight transition-all duration-300 ${
                isActive
                  ? "text-primary filter drop-shadow-[0_0_8px_hsla(var(--primary-glow)/0.8)]"
                  : "text-muted-foreground hover:text-foreground opacity-70"
              }`}>
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
                <span className={`w-full text-center ${isActive ? "font-bold" : "font-normal"}`}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
