import { NavLink, useParams } from "react-router-dom";
import { Home, Dumbbell, Utensils, TrendingUp, Stethoscope, Users, User } from "lucide-react";

const items = [
  { label: "Início", icon: Home, to: "" },
  { label: "Treino", icon: Dumbbell, to: "treino" },
  { label: "Dieta", icon: Utensils, to: "dieta" },
  { label: "Evolução", icon: TrendingUp, to: "evolucao" },
  { label: "Clínica", icon: Stethoscope, to: "clinica" },
  { label: "Comuni…", icon: Users, to: "comunidade" },
  { label: "Perfil", icon: User, to: "perfil" },
];

const BottomNav = () => {
  const { slug } = useParams();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border">
      <div className="max-w-2xl mx-auto grid grid-cols-7 px-1 pt-2 pb-3">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={`/${slug}/app${to ? `/${to}` : ""}`}
            end={!to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 text-[9px] uppercase tracking-wider transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="truncate w-full text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
