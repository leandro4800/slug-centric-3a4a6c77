import { useState } from "react";
import { useBranding, type ThemeOverrides } from "@/contexts/BrandingProvider";
import { Play, Settings, Home, Dumbbell, Utensils, TrendingUp, User } from "lucide-react";
import heroDefault from "@/assets/hero-default.jpg";

interface Props {
  onPick: (target: EditableTarget) => void;
  pickedTarget?: EditableTarget | null;
}

export type EditableTarget =
  | { id: "background"; label: "Fundo do app"; tokens: ["background"] }
  | { id: "card"; label: "Cartões"; tokens: ["card"] }
  | { id: "primary"; label: "Cor primária / Botões"; tokens: ["primary", "primary_glow", "accent"] }
  | { id: "accent"; label: "Detalhes secundários"; tokens: ["accent"] }
  | { id: "foreground"; label: "Texto principal"; tokens: ["foreground"] }
  | { id: "border"; label: "Bordas"; tokens: ["border"] };

export const EDITABLE_TARGETS: EditableTarget[] = [
  { id: "background", label: "Fundo do app", tokens: ["background"] },
  { id: "card", label: "Cartões", tokens: ["card"] },
  { id: "primary", label: "Cor primária / Botões", tokens: ["primary", "primary_glow", "accent"] },
  { id: "accent", label: "Detalhes secundários", tokens: ["accent"] },
  { id: "foreground", label: "Texto principal", tokens: ["foreground"] },
  { id: "border", label: "Bordas", tokens: ["border"] },
];

type ScreenId = "home" | "treino" | "dieta" | "evolucao" | "perfil";

const HotZone = ({
  active, onClick, className, children, label,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={label}
    aria-label={label}
    className={`group relative ${className || ""} ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent" : "hover:ring-2 hover:ring-primary/60"}`}
  >
    {children}
    <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
      {label}
    </span>
  </button>
);

const find = (id: EditableTarget["id"]) => EDITABLE_TARGETS.find((t) => t.id === id)!;

export const PhonePreview = ({ onPick, pickedTarget }: Props) => {
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;
  const [screen, setScreen] = useState<ScreenId>("home");

  const pick = (id: EditableTarget["id"]) => () => onPick(find(id));
  const isActive = (id: EditableTarget["id"]) => pickedTarget?.id === id;

  const navItems: { id: ScreenId; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Início" },
    { id: "treino", icon: Dumbbell, label: "Treino" },
    { id: "dieta", icon: Utensils, label: "Dieta" },
    { id: "evolucao", icon: TrendingUp, label: "Evolução" },
    { id: "perfil", icon: User, label: "Perfil" },
  ];

  return (
    <div className="mx-auto" style={{ width: 290 }}>
      <div className="relative" style={{ width: 290, height: 600 }}>
        <div className="absolute inset-0 rounded-[36px] bg-neutral-900 shadow-2xl" />
        <div className="absolute inset-[6px] rounded-[30px] overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-neutral-900 rounded-b-2xl z-20" />

          {/* Background hot-zone */}
          <HotZone label="Fundo do app" active={isActive("background")} onClick={pick("background")} className="absolute inset-0 rounded-none">
            <div className="absolute inset-0" />
          </HotZone>

          {/* ====== TELA: HOME ====== */}
          {screen === "home" && (
            <>
              <div className="absolute top-0 left-0 right-0 h-[55%] overflow-hidden pointer-events-none">
                <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(var(--background)/0.3), hsl(var(--background)/0.4), hsl(var(--background)))" }} />
              </div>
              <div className="absolute top-7 left-0 right-0 flex items-center justify-between px-3 z-10">
                <HotZone label="Cor primária / Logo" active={isActive("primary")} onClick={pick("primary")} className="rounded px-1 py-0.5">
                  <span className="font-display text-xs" style={{ color: "hsl(var(--primary))" }}>ALPHA</span>
                </HotZone>
                <HotZone label="Botão Reproduzir / Ícones" active={isActive("accent")} onClick={pick("accent")} className="rounded-full">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.2)", border: "1px solid hsl(var(--primary)/0.4)" }}>
                    <Settings className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                </HotZone>
              </div>
              <div className="absolute top-[28%] left-0 right-0 px-3 z-10">
                <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "hsl(var(--primary))" }}>{tenant?.nome || "AlphaCoach"}</p>
                <HotZone label="Texto principal" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                  <h2 className="font-display text-xl leading-none" style={{ color: "hsl(var(--foreground))" }}>
                    {(tenant?.tagline || "TREINE COMO CAMPEÃO").slice(0, 24)}
                  </h2>
                </HotZone>
                <div className="mt-2">
                  <HotZone label="Botão Reproduzir / Ícones" active={isActive("accent")} onClick={pick("accent")} className="rounded-md inline-flex">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded shadow-glow" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                      <Play className="h-2.5 w-2.5 fill-current" /> REPRODUZIR
                    </span>
                  </HotZone>
                </div>
              </div>
              <div className="absolute top-[58%] left-3 right-3">
                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg w-full block">
                  <div className="w-full rounded-lg p-2 flex items-center gap-2" style={{ background: "hsl(var(--card)/0.8)", border: "1px solid hsl(var(--border))" }}>
                    <div className="w-7 h-7 rounded-md" style={{ background: "hsl(var(--primary)/0.2)", border: "1px solid hsl(var(--primary)/0.4)" }} />
                    <div className="text-left">
                      <p className="font-display text-[10px]" style={{ color: "hsl(var(--primary))" }}>LINKS ÚTEIS</p>
                      <p className="text-[7px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>Parceiros & cupons</p>
                    </div>
                  </div>
                </HotZone>
              </div>
              <div className="absolute top-[72%] left-3 right-3">
                <p className="font-display text-[9px] mb-1" style={{ color: "hsl(var(--foreground))" }}>
                  <span style={{ color: "hsl(var(--primary))" }}>▶</span> MINHA PRESCRIÇÃO
                </p>
                <div className="flex gap-1.5">
                  {[0,1,2].map((i) => (
                    <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md flex-1">
                      <div className="aspect-[2/3] rounded-md" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </HotZone>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ====== TELA: TREINO ====== */}
          {screen === "treino" && (
            <div className="absolute inset-0 pt-8 pb-12 px-3 overflow-hidden">
              <HotZone label="Texto principal" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                <h2 className="font-display text-lg" style={{ color: "hsl(var(--foreground))" }}>TREINO DE HOJE</h2>
              </HotZone>
              <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: "hsl(var(--primary))" }}>Peito & Tríceps · Variante 2</p>
              <div className="space-y-2 mt-3">
                {["Supino reto", "Crucifixo", "Tríceps corda", "Cardio Pós-Treino"].map((ex, i) => (
                  <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md w-full block">
                    <div className="w-full rounded-md p-2 flex items-center gap-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <div className="w-8 h-8 rounded" style={{ background: "hsl(var(--primary)/0.2)" }} />
                      <div className="flex-1 text-left">
                        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{ex}</p>
                        <p className="text-[8px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>4x · 8-12 reps</p>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>TRAB</span>
                    </div>
                  </HotZone>
                ))}
              </div>
            </div>
          )}

          {/* ====== TELA: DIETA ====== */}
          {screen === "dieta" && (
            <div className="absolute inset-0 pt-8 pb-12 px-3 overflow-hidden">
              <HotZone label="Texto principal" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                <h2 className="font-display text-lg" style={{ color: "hsl(var(--foreground))" }}>DIETA</h2>
              </HotZone>
              <div className="flex justify-center my-3">
                <HotZone label="Cor primária / Botões" active={isActive("primary")} onClick={pick("primary")} className="rounded-full">
                  <div className="w-20 h-20 rounded-full border-[6px] flex items-center justify-center" style={{ borderColor: "hsl(var(--primary))" }}>
                    <span className="font-display text-sm" style={{ color: "hsl(var(--foreground))" }}>2.4k</span>
                  </div>
                </HotZone>
              </div>
              <div className="space-y-2">
                {["Café da manhã", "Almoço", "Lanche", "Jantar"].map((m, i) => (
                  <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md w-full block">
                    <div className="w-full rounded-md p-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <p className="text-[10px] font-semibold text-left" style={{ color: "hsl(var(--foreground))" }}>{m}</p>
                      <p className="text-[8px] text-left" style={{ color: "hsl(var(--foreground)/0.6)" }}>600 kcal · P 40g · C 60g</p>
                    </div>
                  </HotZone>
                ))}
              </div>
            </div>
          )}

          {/* ====== TELA: EVOLUÇÃO ====== */}
          {screen === "evolucao" && (
            <div className="absolute inset-0 pt-8 pb-12 px-3 overflow-hidden">
              <HotZone label="Texto principal" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                <h2 className="font-display text-lg" style={{ color: "hsl(var(--foreground))" }}>EVOLUÇÃO</h2>
              </HotZone>
              <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md w-full block mt-3">
                <div className="w-full h-28 rounded-md p-2 flex items-end gap-1" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  {[40, 55, 48, 70, 65, 80, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "hsl(var(--primary))" }} />
                  ))}
                </div>
              </HotZone>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Peso", "Gordura"].map((k, i) => (
                  <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md">
                    <div className="rounded-md p-2 text-left" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <p className="text-[8px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>{k}</p>
                      <p className="font-display text-base" style={{ color: "hsl(var(--primary))" }}>{i === 0 ? "82kg" : "14%"}</p>
                    </div>
                  </HotZone>
                ))}
              </div>
            </div>
          )}

          {/* ====== TELA: PERFIL ====== */}
          {screen === "perfil" && (
            <div className="absolute inset-0 pt-8 pb-12 px-3 overflow-hidden">
              <div className="flex flex-col items-center gap-2 mt-2">
                <HotZone label="Cor primária / Botões" active={isActive("primary")} onClick={pick("primary")} className="rounded-full">
                  <div className="w-16 h-16 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                </HotZone>
                <HotZone label="Texto principal" active={isActive("foreground")} onClick={pick("foreground")} className="rounded">
                  <p className="font-display text-sm" style={{ color: "hsl(var(--foreground))" }}>ATLETA</p>
                </HotZone>
                <p className="text-[8px] uppercase tracking-widest" style={{ color: "hsl(var(--primary))" }}>Plano Premium</p>
              </div>
              <div className="space-y-2 mt-3">
                {["Anamnese", "Clínica", "Comunidade", "Sair"].map((m, i) => (
                  <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md w-full block">
                    <div className="w-full rounded-md p-2 text-left" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <p className="text-[10px]" style={{ color: "hsl(var(--foreground))" }}>{m}</p>
                    </div>
                  </HotZone>
                ))}
              </div>
            </div>
          )}

          {/* Bottom nav clicável */}
          <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-around px-2 z-30" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = screen === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setScreen(id); }}
                  title={label}
                  className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 transition-all"
                  style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.5)" }}
                >
                  <Icon className="h-3 w-3" strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[6px] uppercase tracking-wider font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Indicador de tela atual */}
      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
        Tela: <span className="text-primary font-bold">{screen}</span> · toque no rodapé para trocar
      </p>
    </div>
  );
};
