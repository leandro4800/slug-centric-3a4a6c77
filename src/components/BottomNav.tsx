import { NavLink, useParams } from "react-router-dom";
import { Home, Dumbbell, Apple, TrendingUp, User } from "lucide-react";

const items = [
  { label: "Início", icon: Home, to: "" },
  { label: "Treino", icon: Dumbbell, to: "treino" },
  { label: "Dieta", icon: Apple, to: "dieta" },
  { label: "Evolução", icon: TrendingUp, to: "evolucao" },
  { label: "Perfil", icon: User, to: "perfil" },
];

const BottomNav = () => {
  const { slug } = useParams();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border">
      <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 py-2">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={`/${slug}/app${to ? `/${to}` : ""}`}
            end={!to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 text-[10px] uppercase tracking-wider transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
