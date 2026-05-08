import { useState } from "react";
import { useBranding } from "@/contexts/BrandingProvider";
import { Play, Settings, Home, Dumbbell, Utensils, TrendingUp, User, Stethoscope, ChevronRight, Music, Camera, KeyRound, LogOut, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import heroDefault from "@/assets/hero-default.jpg";
import cardTreino from "@/assets/card-treino.jpg";
import cardDieta from "@/assets/card-dieta.jpg";
import cardEvolucao from "@/assets/card-evolucao.jpg";
import cardClinica from "@/assets/card-clinica.jpg";
import macroProtein from "@/assets/macro-protein.jpg";
import macroCarbs from "@/assets/macro-carbs.jpg";
import macroFats from "@/assets/macro-fats.jpg";
import mealBreakfast from "@/assets/meal-breakfast.jpg";
import mealLunch from "@/assets/meal-lunch.jpg";
import mealDinner from "@/assets/meal-dinner.jpg";

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
    className={`group relative ${className || ""} ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent" : "hover:ring-1 hover:ring-primary/50"}`}
  >
    {children}
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

  const pieData = [
    { name: "P", value: 35, color: "hsl(142 71% 45%)" },
    { name: "C", value: 45, color: "hsl(45 100% 51%)" },
    { name: "G", value: 20, color: "hsl(0 84% 55%)" },
  ];

  return (
    <div className="mx-auto" style={{ width: 290 }}>
      <div className="relative" style={{ width: 290, height: 600 }}>
        <div className="absolute inset-0 rounded-[36px] bg-neutral-900 shadow-2xl" />
        <div className="absolute inset-[6px] rounded-[30px] overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-neutral-900 rounded-b-2xl z-30" />

          {/* Background hot-zone (atrás de tudo, só captura cliques fora do conteúdo) */}
          <HotZone label="Fundo do app" active={isActive("background")} onClick={pick("background")} className="absolute inset-0 rounded-none z-0">
            <div className="absolute inset-0" />
          </HotZone>

          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-12 scrollbar-hide z-10">
            {/* ====== HOME ====== */}
            {screen === "home" && (
              <>
                {/* Hero section */}
                <div className="relative h-[200px] w-full overflow-hidden">
                  <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                  <div className="absolute top-2 left-0 right-0 flex items-center justify-between px-3 z-10">
                    <HotZone label="Logo" active={isActive("primary")} onClick={pick("primary")} className="rounded">
                      <span className="font-display text-[10px] font-black" style={{ color: "hsl(var(--primary))" }}>
                        {(tenant?.nome || "ALPHA").toUpperCase().slice(0, 8)}
                      </span>
                    </HotZone>
                    <HotZone label="Ícones" active={isActive("accent")} onClick={pick("accent")} className="rounded-full">
                      <div className="w-6 h-6 rounded-full backdrop-blur flex items-center justify-center" style={{ background: "hsl(var(--card)/0.7)", border: "1px solid hsl(var(--border))" }}>
                        <User className="h-3 w-3" style={{ color: "hsl(var(--foreground))" }} />
                      </div>
                    </HotZone>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: "hsl(var(--primary))" }}>{tenant?.nome || "AlphaCoach"}</p>
                    <HotZone label="Texto" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                      <h1 className="font-display text-[11px] leading-none mb-1.5" style={{ color: "hsl(var(--foreground))" }}>
                        {(tenant?.tagline || "TREINE COMO CAMPEÃO").slice(0, 22)}
                      </h1>
                    </HotZone>
                    <HotZone label="Botão" active={isActive("primary")} onClick={pick("primary")} className="rounded-lg inline-flex">
                      <span className="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-1 tracking-widest rounded-lg" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                        <Play className="h-2 w-2 fill-current" /> REPRODUZIR
                      </span>
                    </HotZone>
                  </div>
                </div>

                {/* Links úteis */}
                <div className="px-3 pt-5 pb-1 mt-2 space-y-2" style={{ background: "hsl(var(--background))" }}>
                  <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-xl block w-full">
                    <div className="rounded-xl p-2 flex items-center gap-2" style={{ background: "hsl(var(--card)/0.6)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                        <Stethoscope className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-display text-[10px] uppercase" style={{ color: "hsl(var(--primary))" }}>Dr. IA</p>
                        <p className="text-[7px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>Médico esportivo de bolso</p>
                      </div>
                      <ChevronRight className="h-3 w-3" style={{ color: "hsl(var(--primary)/0.5)" }} />
                    </div>
                  </HotZone>
                  <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-xl block w-full">
                    <div className="rounded-xl p-2 flex items-center gap-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <div className="w-7 h-7 rounded-lg" style={{ background: "hsl(var(--card)/0.5)", border: "1px solid hsl(var(--border))" }} />
                      <div className="text-left">
                        <p className="font-display text-[10px] uppercase" style={{ color: "hsl(var(--foreground)/0.8)" }}>Links Úteis</p>
                        <p className="text-[7px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>Parceiros & cupons</p>
                      </div>
                    </div>
                  </HotZone>
                </div>

                {/* Minha Prescrição */}
                <div className="px-3 mt-4">
                  <p className="font-display text-[10px] mb-2 flex items-center gap-1" style={{ color: "hsl(var(--foreground))" }}>
                    <span style={{ color: "hsl(var(--primary))" }}>▶</span> MINHA PRESCRIÇÃO
                  </p>
                  <div className="flex gap-1.5 overflow-hidden">
                    {[
                      { t: "TREINO", img: cardTreino },
                      { t: "DIETA", img: cardDieta },
                      { t: "EVOLUÇÃO", img: cardEvolucao },
                      { t: "CLÍNICA", img: cardClinica },
                    ].map((s) => (
                      <HotZone key={s.t} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md flex-1 block">
                        <div className="relative w-full h-20 rounded-md overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                          <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)" }} />
                          <p className="absolute bottom-1 left-1 right-1 font-display text-[7px] leading-tight" style={{ color: "hsl(var(--foreground))" }}>{s.t}</p>
                        </div>
                      </HotZone>
                    ))}
                  </div>
                </div>

                {/* Vlogs */}
                <div className="px-3 mt-4">
                  <p className="font-display text-[10px] mb-2 flex items-center gap-1" style={{ color: "hsl(var(--foreground))" }}>
                    <span style={{ color: "hsl(var(--primary))" }}>▶</span> VLOGS DO COACH
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[0, 1].map((i) => (
                      <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md block">
                        <div className="relative aspect-video rounded-md overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                          <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.9)" }}>
                              <Play className="h-2.5 w-2.5 fill-current" style={{ color: "hsl(var(--primary-foreground))" }} />
                            </div>
                          </div>
                        </div>
                      </HotZone>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ====== TREINO ====== */}
            {screen === "treino" && (
              <div className="pt-6 px-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Dumbbell className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <HotZone label="Texto" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                    <h2 className="font-display text-sm" style={{ color: "hsl(var(--foreground))" }}>MEU TREINO</h2>
                  </HotZone>
                </div>
                <p className="text-[8px] uppercase tracking-widest mb-3" style={{ color: "hsl(var(--foreground)/0.6)" }}>12 exercícios</p>

                {/* Aviso prévia */}
                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-xl block w-full mb-2">
                  <div className="rounded-xl px-2 py-1.5 flex items-center justify-center gap-1 text-[8px]" style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.3)", color: "hsl(var(--primary))" }}>
                    Prévia — treino personalizado pelo coach
                  </div>
                </HotZone>

                {/* Botão playlist */}
                <HotZone label="Botão" active={isActive("primary")} onClick={pick("primary")} className="rounded-xl block w-full mb-3">
                  <div className="rounded-xl py-2 flex items-center justify-center gap-1.5 font-display text-[10px]" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", boxShadow: "0 0 20px hsl(var(--primary)/0.4)" }}>
                    <Music className="h-3 w-3" /> PLAYLIST DO TIME
                  </div>
                </HotZone>

                {/* Tabs dias */}
                <div className="flex gap-1 mb-3 overflow-hidden">
                  {["A", "B", "C", "D"].map((d, i) => (
                    <HotZone key={d} label="Botão" active={isActive("primary")} onClick={pick("primary")} className="rounded-full">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{
                        background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--card))",
                        color: i === 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground)/0.6)",
                      }}>Treino {d}</span>
                    </HotZone>
                  ))}
                </div>

                <p className="font-display text-[9px] mb-2 flex items-center gap-1" style={{ color: "hsl(var(--foreground))" }}>
                  <span style={{ color: "hsl(var(--primary))" }}>▶</span> TREINO DE HOJE — 4 EX.
                </p>

                {/* Cards exercícios */}
                <div className="space-y-1.5">
                  {["Supino Reto", "Crucifixo Inclinado", "Crossover", "Tríceps Pulley"].map((ex, i) => (
                    <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block w-full">
                      <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.15)" }}>
                          <Dumbbell className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[9px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{ex}</p>
                          <p className="text-[7px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>4x · 12 reps</p>
                        </div>
                      </div>
                    </HotZone>
                  ))}
                </div>
              </div>
            )}

            {/* ====== DIETA ====== */}
            {screen === "dieta" && (
              <div className="pt-6 px-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Utensils className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <HotZone label="Texto" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                    <h2 className="font-display text-sm" style={{ color: "hsl(var(--foreground))" }}>MINHA DIETA</h2>
                  </HotZone>
                </div>

                {/* Card prescrição */}
                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-xl block w-full mb-3">
                  <div className="rounded-xl p-2.5 text-left" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--background)))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                    <p className="text-[7px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "hsl(var(--primary))" }}>Prescrição Nutricional</p>
                    <p className="font-display text-[10px]" style={{ color: "hsl(var(--foreground))" }}>Plano alimentar personalizado</p>
                  </div>
                </HotZone>

                {/* Donut + macros */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="col-span-2 rounded-xl block">
                    <div className="rounded-xl p-2 h-full flex flex-col items-center justify-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <div className="relative w-16 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} dataKey="value" innerRadius="68%" outerRadius="95%" paddingAngle={3} stroke="hsl(var(--background))" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
                              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="font-display text-[11px]" style={{ color: "hsl(var(--foreground))" }}>2.4k</span>
                          <span className="text-[6px] uppercase tracking-wider" style={{ color: "hsl(var(--foreground)/0.6)" }}>kcal</span>
                        </div>
                      </div>
                    </div>
                  </HotZone>

                  <div className="col-span-3 grid grid-rows-3 gap-1.5">
                    {[
                      { l: "PROT", v: "140g", img: macroProtein, hsl: "142 71% 45%" },
                      { l: "CARB", v: "270g", img: macroCarbs, hsl: "45 100% 51%" },
                      { l: "GORD", v: "53g", img: macroFats, hsl: "0 84% 55%" },
                    ].map((m) => (
                      <HotZone key={m.l} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-md block">
                        <div className="relative h-full rounded-md overflow-hidden" style={{ border: `1px solid hsl(${m.hsl} / 0.5)` }}>
                          <img src={m.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, hsl(${m.hsl} / 0.85) 0%, hsl(${m.hsl} / 0.3) 60%, hsl(0 0% 0% / 0.6) 100%)` }} />
                          <div className="relative px-1.5 py-1 flex items-center justify-between h-full">
                            <span className="text-[7px] font-bold tracking-widest text-white">{m.l}</span>
                            <span className="font-display text-[10px] text-white">{m.v}</span>
                          </div>
                        </div>
                      </HotZone>
                    ))}
                  </div>
                </div>

                <p className="font-display text-[9px] mb-2 flex items-center gap-1" style={{ color: "hsl(var(--foreground))" }}>
                  <span style={{ color: "hsl(var(--primary))" }}>▶</span> REFEIÇÕES DIÁRIAS
                </p>

                {/* Cards refeição */}
                <div className="space-y-1.5">
                  {[
                    { n: "CAFÉ DA MANHÃ", h: "07:00", img: mealBreakfast },
                    { n: "ALMOÇO", h: "12:30", img: mealLunch },
                    { n: "JANTAR", h: "20:00", img: mealDinner },
                  ].map((r, i) => (
                    <HotZone key={i} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block w-full">
                      <div className="relative h-14 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                        <img src={r.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-black/10" />
                        <div className="relative h-full p-2 flex flex-col justify-between text-left">
                          <div className="flex items-center gap-1">
                            <Clock className="h-2 w-2" style={{ color: "hsl(45 100% 51%)" }} />
                            <span className="text-[7px] font-bold text-white">{r.h}</span>
                          </div>
                          <p className="font-display italic text-[10px] text-white">{r.n}</p>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                          <Play className="h-2 w-2 text-white fill-white" />
                        </div>
                      </div>
                    </HotZone>
                  ))}
                </div>
              </div>
            )}

            {/* ====== EVOLUÇÃO ====== */}
            {screen === "evolucao" && (
              <div className="pt-6 px-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <HotZone label="Texto" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                    <h2 className="font-display text-sm" style={{ color: "hsl(var(--foreground))" }}>EVOLUÇÃO</h2>
                  </HotZone>
                </div>

                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-none block w-full mb-3">
                  <div className="rounded-none px-2 py-1.5 flex items-center justify-center text-[7px] uppercase tracking-widest font-bold" style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.3)", color: "hsl(var(--primary))" }}>
                    Painel de Conquistas
                  </div>
                </HotZone>

                {/* Tabs */}
                <div className="flex gap-1 mb-3">
                  {["PESO", "BF%"].map((t, i) => (
                    <HotZone key={t} label="Botão" active={isActive("primary")} onClick={pick("primary")} className="rounded-full flex-1">
                      <span className="block text-center px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{
                        background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--card))",
                        color: i === 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground)/0.6)",
                      }}>{t}</span>
                    </HotZone>
                  ))}
                </div>

                {/* Chart bar */}
                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block w-full mb-2">
                  <div className="rounded-lg p-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                    <p className="text-[7px] uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--foreground)/0.6)" }}>Últimos 7 check-ins</p>
                    <div className="h-24 flex items-end gap-1">
                      {[40, 55, 48, 70, 65, 80, 90].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `hsl(var(--primary) / ${0.4 + (i / 10)})` }} />
                      ))}
                    </div>
                  </div>
                </HotZone>

                {/* Antes/Depois */}
                <p className="font-display text-[9px] mb-1.5 flex items-center gap-1" style={{ color: "hsl(var(--foreground))" }}>
                  <span style={{ color: "hsl(var(--primary))" }}>▶</span> ANTES & DEPOIS
                </p>
                <HotZone label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block w-full">
                  <div className="grid grid-cols-2 gap-1.5">
                    {["ANTES", "DEPOIS"].map((l) => (
                      <div key={l} className="relative aspect-square rounded-lg overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-5 w-5" style={{ color: "hsl(var(--foreground)/0.3)" }} />
                        </div>
                        <span className="absolute bottom-1 left-1 text-[7px] font-bold tracking-widest px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </HotZone>
              </div>
            )}

            {/* ====== PERFIL ====== */}
            {screen === "perfil" && (
              <div className="pt-6 px-3">
                {/* Hero do perfil */}
                <div className="relative h-56 rounded-lg overflow-visible mb-2">
                  <div className="relative h-full rounded-lg overflow-hidden">
                    <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                  <HotZone label="Cor primária" active={isActive("primary")} onClick={pick("primary")} className="absolute bottom-2 left-3 rounded-full">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary))", border: "2px solid hsl(var(--background))" }}>
                      <User className="h-4 w-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                    </div>
                  </HotZone>
                </div>

                <HotZone label="Texto" active={isActive("foreground")} onClick={pick("foreground")} className="rounded inline-block">
                  <h2 className="font-display text-base" style={{ color: "hsl(var(--foreground))" }}>ATLETA</h2>
                </HotZone>
                <p className="text-[8px] uppercase tracking-widest mt-0.5 mb-3" style={{ color: "hsl(var(--primary))" }}>Plano Premium</p>

                {/* Cards dados */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { l: "Peso", v: "82 kg" },
                    { l: "Altura", v: "180 cm" },
                    { l: "BF%", v: "14%" },
                    { l: "IMC", v: "25.3" },
                  ].map((d) => (
                    <HotZone key={d.l} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block">
                      <div className="rounded-lg p-2 text-left" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <p className="text-[7px] uppercase tracking-wider" style={{ color: "hsl(var(--foreground)/0.6)" }}>{d.l}</p>
                        <p className="font-display text-sm" style={{ color: "hsl(var(--primary))" }}>{d.v}</p>
                      </div>
                    </HotZone>
                  ))}
                </div>

                {/* Botões ação */}
                <div className="space-y-1.5">
                  {[
                    { l: "Anamnese", icon: Stethoscope },
                    { l: "Trocar Senha", icon: KeyRound },
                    { l: "Sair", icon: LogOut },
                  ].map(({ l, icon: Icon }) => (
                    <HotZone key={l} label="Cartões" active={isActive("card")} onClick={pick("card")} className="rounded-lg block w-full">
                      <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <Icon className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                        <span className="text-[9px]" style={{ color: "hsl(var(--foreground))" }}>{l}</span>
                      </div>
                    </HotZone>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom nav clicável */}
          <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-around px-1 z-30 backdrop-blur" style={{ background: "hsl(var(--card)/0.95)", borderTop: "1px solid hsl(var(--border))" }}>
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

      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-3">
        Tela: <span className="text-primary font-bold">{screen}</span> · toque no rodapé para trocar
      </p>
    </div>
  );
};
