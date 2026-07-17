import { useState } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { 
  Home, 
  Dumbbell, 
  Utensils, 
  TrendingUp, 
  Users, 
  User, 
  CalendarCheck, 
  MoreHorizontal,
  ClipboardCheck,
  Sparkles,
  X
} from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const mainItems = [
  { label: "Início", icon: Home, to: "" },
  { label: "Treino", icon: Dumbbell, to: "treino" },
  { label: "Dieta", icon: Utensils, to: "dieta" },
  { label: "Evolução", icon: TrendingUp, to: "evolucao" },
];

const AlunoBottomNav = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const tenantSlug = tenant?.slug || slug;
  const [isOpen, setIsOpen] = useState(false);

  const moreItems = [
    { label: "Meu Perfil", icon: User, to: "perfil" },
    { label: "Comunidade", icon: Users, to: "comunidade" },
    { label: "Presencial", icon: CalendarCheck, to: "presencial" },
    { label: "Minha Carta", icon: Sparkles, to: "carta" },
    { label: "Anamnese", icon: ClipboardCheck, to: "anamnese" },
  ];

  const handleNavigate = (to: string) => {
    setIsOpen(false);
    navigate(`/${tenantSlug}/app/${to}`);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch px-0.5 pt-1.5 pb-1.5">
        {mainItems.map(({ label, icon: Icon, to }) => (
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

        {/* "Mais" Tab with Drawer */}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <button className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[9px] leading-tight uppercase tracking-tight text-muted-foreground hover:text-foreground opacity-70 transition-all duration-300">
              <MoreHorizontal className="h-[18px] w-[18px] shrink-0 stroke-[1.8px]" />
              <span className="w-full text-center font-normal">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-background border-t border-border max-w-2xl mx-auto rounded-t-[2rem] pb-6">
            <DrawerHeader className="border-b border-border/40 pb-4 flex items-center justify-between px-6">
              <div>
                <DrawerTitle className="font-display text-lg tracking-wider text-left">Menu de Opções</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground text-left">Acesse outros recursos do seu app</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="p-6 grid grid-cols-3 gap-4">
              {moreItems.map(({ label, icon: Icon, to }) => (
                <button
                  key={label}
                  onClick={() => handleNavigate(to)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center text-foreground/80 group-hover:text-primary transition-colors">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
};

export default AlunoBottomNav;