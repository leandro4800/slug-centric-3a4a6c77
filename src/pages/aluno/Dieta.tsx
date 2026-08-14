import { useCallback, useEffect, useMemo, useState } from "react";
import { Utensils, Sparkles, Loader2, RefreshCcw, AlertCircle, Activity, Play, Clock, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingProvider";
import FightNutritionView from "@/pages/aluno/fight/FightNutritionView";
import imgBreakfast from "@/assets/refeicao/desjejum.jpg";
import imgLunch from "@/assets/refeicao/almoco.jpg";
import imgSnack from "@/assets/refeicao/lanche-manha.jpg";
import imgSnackTarde from "@/assets/refeicao/lanche-tarde.jpg";
import imgDinner from "@/assets/refeicao/jantar.jpg";
import imgJejum from "@/assets/refeicao/jejum.jpg";
import imgPost from "@/assets/refeicao/pos-treino.jpg";
import imgSupper from "@/assets/refeicao/ceia.jpg";
import imgSupplement from "@/assets/refeicao/suplementacao.jpg";
import imgMacroProtein from "@/assets/macro-protein.jpg";
import imgMacroCarbs from "@/assets/macro-carbs.jpg";
import imgMacroFats from "@/assets/macro-fats.jpg";
import imgMacroHero from "@/assets/macro-hero.jpg";
import { DietScienceFooter } from "@/components/HealthScienceFootnotes";

type Alimento = { id: string; nome: string; energia_kcal: number; proteina_g: number; carboidrato_g: number; lipideos_g: number };
type Item = { id: string; quantidade_g: number; substituicoes: string | null; alimento: Alimento | null };
type Refeicao = { id: string; nome: string; horario: string | null; ordem: number | null; descricao_ia: string | null; itens: Item[] };
type MacrosAlvo = { proteina_g?: number | string | null; carboidrato_g?: number | string | null; lipideos_g?: number | string | null; badge?: string | null } | null;
type ItemRow = Omit<Item, "quantidade_g"> & { quantidade_g: number | string | null; refeicao_id: string | null };
type Dieta = {
  id: string;
  objetivo: string | null;
  kcal_alvo: number | null;
  tmb_estimada: number | null;
  macros_alvo: MacrosAlvo;
  observacoes_clinicas: string | null;
  refeicoes: Refeicao[];
};

// Cores fixas dos macros (estilo Netflix/semáforo)
const COLOR_PROT = "142 71% 45%";   // verde
const COLOR_CARB = "45 100% 51%";   // amarelo
const COLOR_FAT  = "0 84% 55%";     // vermelho

const calcMacros = (itens: Item[]) => {
  let kcal = 0, p = 0, c = 0, g = 0;
  itens.forEach(i => {
    if (!i.alimento) return;
    const f = (Number(i.quantidade_g) || 0) / 100;
    kcal += (Number(i.alimento.energia_kcal) || 0) * f;
    p += (Number(i.alimento.proteina_g) || 0) * f;
    c += (Number(i.alimento.carboidrato_g) || 0) * f;
    g += (Number(i.alimento.lipideos_g) || 0) * f;
  });
  return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), g: Math.round(g) };
};

const macrosFromTarget = (dieta: Dieta | null) => ({
  kcal: Math.round(Number(dieta?.kcal_alvo) || 0),
  p: Math.round(Number(dieta?.macros_alvo?.proteina_g) || 0),
  c: Math.round(Number(dieta?.macros_alvo?.carboidrato_g) || 0),
  g: Math.round(Number(dieta?.macros_alvo?.lipideos_g) || 0),
});

// Imagem cinematográfica por refeição (assets locais)
// Considera o NOME da refeição + descrição da IA + os alimentos listados,
// para que "Suplementação antes de dormir - creatina" mostre suplemento, etc.
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const has = (txt: string, words: string[]) => words.some(w => txt.includes(w));

// Escolhe a imagem SEMPRE de acordo com o que está escrito na refeição
// (nome + descrição + alimentos) e, na falta disso, pelo horário.
// Repetir a mesma imagem é aceitável; imagem incoerente não é.
const supl = ["suplement", "creatina", "whey", "caseina", "albumina", "bcaa", "glutamina",
  "cafein", "termogenico", "hipercalorico", "maltodextrina", "dextrose", "colageno",
  "multivitamin", "omega 3", "omega-3", "vitamina", "capsula", "capsulas", "scoop",
  "pre-workout", "pre workout", "beta alanina", "zma", "melatonina", "magnesio", "lipodrene"];

const horaDe = (horario?: string | null) => {
  const m = String(horario || "").match(/^(\d{1,2})/);
  const h = m ? Number(m[1]) : NaN;
  return Number.isFinite(h) ? h : null;
};

const imgFor = (r: { nome: string; horario?: string | null; descricao_ia?: string | null; itens?: Item[] }): string => {
  const n = norm(r.nome);
  const conteudo = norm(
    [r.descricao_ia || "", ...(r.itens || []).map(i => `${i.substituicoes || ""} ${i.alimento?.nome || ""}`)].join(" ")
  );
  const all = `${n} ${conteudo}`;

  // 1) Nome da refeição
  if (has(n, ["pos-treino", "pos treino", "pós"])) return imgPost;
  if (has(n, ["pre-treino", "pre treino", "pre-workout"])) return imgPre;
  if (has(n, ["ceia", "antes de dormir"])) return imgSupper;
  if (has(n, ["jantar"])) return imgDinner;
  if (has(n, ["almoco"])) return imgLunch;
  if (has(n, ["cafe da manha", "desjejum"])) return imgBreakfast;
  if (has(n, ["lanche"])) return imgSnack;

  // 2) Bloco só de suplementação / cápsulas
  const soSuplemento = has(n, supl) || (has(conteudo, supl) && !has(all, ["arroz", "frango", "carne", "ovo", "pao", "batata", "peixe", "salada"]));
  if (soSuplemento) return imgSupplement;

  // 3) Conteúdo escrito dos alimentos
  if (has(all, ["arroz", "feijao", "frango", "carne", "patinho", "file", "macarrao", "batata", "peixe", "bovino"])) return imgLunch;
  if (has(all, ["ovo", "pao", "tapioca", "aveia", "leite", "cuscuz", "queijo", "cafe"])) return imgBreakfast;
  if (has(all, ["iogurte", "fruta", "banana", "maca", "castanha", "barra", "inhame", "aipim", "shake"])) return imgSnack;
  if (has(all, ["sopa", "salada", "omelete"])) return imgDinner;

  // 4) Horário
  const h = horaDe(r.horario);
  if (h !== null) {
    if (h < 10) return imgBreakfast;
    if (h < 15) return imgLunch;
    if (h < 19) return imgSnack;
    if (h < 22) return imgDinner;
    return imgSupper;
  }
  return imgBreakfast;
};

// Remove refeições duplicadas (mesmo nome + horário + itens) vindas de importações repetidas
const dedupeRefeicoes = <T extends { nome: string; horario?: string | null; descricao_ia?: string | null; itens?: Item[] }>(lista: T[]): T[] => {
  const vistos = new Set<string>();
  const conteudos = new Set<string>();
  return (lista || []).filter((r) => {
    const conteudo = [
      norm(r.descricao_ia || ""),
      (r.itens || []).map((i) => norm(`${i.substituicoes || ""}${i.alimento?.nome || ""}${i.quantidade_g ?? ""}`)).sort().join("|"),
    ].join("::");
    const chave = [norm(r.nome), String(r.horario || ""), conteudo].join("::");
    if (vistos.has(chave)) return false;
    // conteúdo idêntico em horários diferentes = repetição indevida da IA
    if (conteudo.replace(/[:|]/g, "").trim() && conteudos.has(conteudo)) return false;
    vistos.add(chave);
    conteudos.add(conteudo);
    return true;
  });
};




const Dieta = () => {
  const { tenant } = useBranding();
  if (tenant?.vertical === "fight") return <FightNutritionView />;
  return <PersonalDieta />;
};

const PersonalDieta = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [selectedRef, setSelectedRef] = useState<Refeicao | null>(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: dietas } = await supabase
      .from("dietas")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1);
    const d = dietas?.[0];
    if (!d) { setDieta(null); setLoading(false); return; }

    const { data: refs } = await supabase
      .from("refeicoes")
      .select("id, nome, horario, ordem, descricao_ia")
      .eq("dieta_id", d.id)
      .order("ordem", { ascending: true });

    const refIds = (refs || []).map(r => r.id);
    const { data: itens } = refIds.length
      ? await supabase
          .from("itens_refeicao")
          .select("id, quantidade_g, substituicoes, refeicao_id, alimento:alimentos_taco(id, nome, energia_kcal, proteina_g, carboidrato_g, lipideos_g)")
          .in("refeicao_id", refIds)
      : { data: [] as ItemRow[] };

    const itemRows = (itens || []) as ItemRow[];

    const refeicoes: Refeicao[] = (refs || []).map(r => ({
      id: r.id,
      nome: r.nome,
      horario: r.horario,
      ordem: r.ordem,
      descricao_ia: r.descricao_ia,
      itens: itemRows.filter((i) => i.refeicao_id === r.id).map((i) => ({
        id: i.id,
        quantidade_g: Number(i.quantidade_g),
        substituicoes: i.substituicoes,
        alimento: i.alimento,
      })),
    }));

    setDieta({ ...d, refeicoes: dedupeRefeicoes(refeicoes) } as Dieta);
    setLoading(false);
  }, [user]);

  useEffect(() => { void carregar(); }, [carregar]);

  const somaItens = dieta
    ? dieta.refeicoes.reduce((acc, r) => {
        const m = calcMacros(r.itens);
        return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
      }, { kcal: 0, p: 0, c: 0, g: 0 })
    : { kcal: 0, p: 0, c: 0, g: 0 };

  // Só usa a soma dos itens quando TODOS os alimentos têm valor nutricional vinculado
  // E essa soma é coerente com a meta escrita no documento (>= 70% da meta).
  // Caso contrário, mostra exatamente as metas prescritas (nada é estimado/inventado).
  const todosItens = dieta ? dieta.refeicoes.flatMap((r) => r.itens) : [];
  const alvo = macrosFromTarget(dieta);
  const temMetaEscrita = alvo.p > 0 || alvo.c > 0 || alvo.g > 0;
  const somaConfiavel =
    todosItens.length > 0 &&
    todosItens.every((i) => !!i.alimento && Number(i.quantidade_g) > 0) &&
    somaItens.kcal > 0 &&
    (!alvo.kcal || somaItens.kcal >= alvo.kcal * 0.7);

  const totalDia = dieta
    ? somaConfiavel
      ? somaItens
      : temMetaEscrita
        ? alvo
        : { ...somaItens, kcal: alvo.kcal || somaItens.kcal }
    : { kcal: 0, p: 0, c: 0, g: 0 };



  const pieData = [
    { name: "Proteína", value: totalDia.p * 4, color: `hsl(${COLOR_PROT})` },
    { name: "Carbo",    value: totalDia.c * 4, color: `hsl(${COLOR_CARB})` },
    { name: "Gordura",  value: totalDia.g * 9, color: `hsl(${COLOR_FAT})` },
  ];

  const badge = dieta?.macros_alvo?.badge;
  const selectedMacros = useMemo(
    () =>
      selectedRef &&
      selectedRef.itens.length > 0 &&
      selectedRef.itens.every((i) => !!i.alimento && Number(i.quantidade_g) > 0)
        ? calcMacros(selectedRef.itens)
        : null,
    [selectedRef],
  );

  return (
    <>
      <PageHeader icon={Utensils} title="MINHA DIETA" subtitle={dieta?.objetivo || undefined} />
      <div className="px-5 pb-10">
        {/* Título da Prescrição */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background p-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-primary mb-1 uppercase font-bold tracking-widest">
                Prescrição Nutricional
              </div>
              <h2 className="font-display text-xl leading-tight">Plano alimentar personalizado</h2>
              <p className="text-xs text-muted-foreground mt-1">Sua dieta será montada e ajustada exclusivamente pelo seu coach.</p>
              {badge && (
                <Badge variant="outline" className="mt-3 border-primary/50 text-primary bg-primary/10">
                  <Activity className="h-3 w-3 mr-1" /> Ajustada para {badge}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando...</div>
        ) : !dieta ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Utensils className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sua dieta personalizada será montada pelo seu coach.</p>
          </div>
        ) : (
          <>
            {/* Resumo + Pizza + cards laterais — estilo Netflix cinematográfico */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {/* Painel pizza com hero image de fundo */}
              <div className="col-span-2 relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-card to-background">
                <div className="relative p-4 flex flex-col items-center justify-center h-full">
                  <div className="relative w-full aspect-square max-w-[180px] mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          innerRadius="68%"
                          outerRadius="95%"
                          paddingAngle={3}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                          startAngle={90}
                          endAngle={-270}
                          isAnimationActive={false}
                        >
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Texto central */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="font-display text-3xl leading-none text-foreground">
                        {totalDia.kcal.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em] mt-1">kcal</span>
                    </div>
                  </div>

                  {/* Legenda */}
                  <div className="mt-4 w-full space-y-1.5">
                    {pieData.map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-muted-foreground uppercase tracking-wider font-semibold">{p.name}</span>
                        </div>
                        <span className="text-foreground font-bold">{Math.round(p.value)} kcal</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-[9px] text-muted-foreground uppercase tracking-widest">
                    Meta: {dieta.kcal_alvo} kcal
                  </div>
                </div>
              </div>

              {/* Cards macros estilo Netflix com imagens cinematográficas */}
              <div className="col-span-3 grid grid-cols-1 gap-2">
                {[
                  { l: "PROTEÍNA", v: totalDia.p, alvo: dieta.macros_alvo?.proteina_g, hsl: COLOR_PROT, img: imgMacroProtein },
                  { l: "CARBO",    v: totalDia.c, alvo: dieta.macros_alvo?.carboidrato_g, hsl: COLOR_CARB, img: imgMacroCarbs },
                  { l: "GORDURA",  v: totalDia.g, alvo: dieta.macros_alvo?.lipideos_g, hsl: COLOR_FAT, img: imgMacroFats },
                ].map(m => {
                  const alvo = Number(m.alvo) || 0;
                  const pct = alvo ? Math.min(100, Math.round((m.v / alvo) * 100)) : 0;
                  return (
                    <div
                      key={m.l}
                      className="relative rounded-xl overflow-hidden border group cursor-pointer transition-all hover:scale-[1.015]"
                      style={{ borderColor: `hsl(${m.hsl} / 0.5)`, boxShadow: `0 0 20px hsl(${m.hsl} / 0.08)` }}
                    >
                      {/* Imagem de fundo */}
                      <img
                        src={m.img}
                        alt={m.l}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700"
                      />
                      {/* Gradiente lateral cor do macro -> transparente */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, hsl(${m.hsl} / 0.85) 0%, hsl(${m.hsl} / 0.35) 35%, hsl(0 0% 0% / 0.2) 60%, hsl(0 0% 0% / 0.7) 100%)`,
                        }}
                      />
                      {/* Vinheta inferior */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

                      <div className="relative px-4 py-3 flex items-center justify-between min-h-[72px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold tracking-[0.2em] text-white drop-shadow-md">{m.l}</span>
                          <span className="text-[10px] text-white/70 uppercase tracking-wider">
                            {alvo ? `${pct}% da meta` : "total do dia"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                          <span className="font-display text-2xl text-white">{m.v}</span>
                          <span className="text-xs text-white/80">{alvo ? `/ ${alvo}g` : "g"}</span>
                        </div>

                      </div>

                      {/* Barra de progresso na borda inferior */}
                      <div className="relative h-[3px] bg-black/40">
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `hsl(${m.hsl})`, boxShadow: `0 0 10px hsl(${m.hsl})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {dieta.observacoes_clinicas && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 text-xs text-primary flex gap-2 mb-5">
                <TenantSymbol size={14} /> {dieta.observacoes_clinicas}
              </div>
            )}

            <h2 className="font-display text-base flex items-center gap-2 mb-3">
              <span className="text-primary">▶</span> REFEIÇÕES DIÁRIAS
            </h2>

            {/* Cards de refeição estilo Netflix */}
            <div className="space-y-3">
              {dieta.refeicoes.map(r => {
                const macros = calcMacros(r.itens);
                const hasItems = r.itens.length > 0;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRef(r)}
                    className="group relative w-full h-36 rounded-xl overflow-hidden bg-black ring-1 ring-white/5 hover:ring-primary/60 transition-all text-left"
                  >
                    <img
                      src={imgFor(r)}
                      alt={r.descricao_ia || r.nome}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Escurecimento global + gradiente suave da esquerda para legibilidade do texto */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-black/10" />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center ring-1 ring-white/10">
                            <Utensils className="h-3 w-3" style={{ color: `hsl(${COLOR_CARB})` }} />
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide">{r.horario || "—"}</span>
                        </div>
                        {/* Macros da refeição no card */}
                          {hasItems && (
                            <div className="flex gap-2">
                              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] text-white font-bold flex flex-col items-center">
                                <span className="text-primary">{macros.kcal}</span>
                                <span className="opacity-50 font-normal">kcal</span>
                              </div>
                              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] text-white font-bold flex flex-col items-center">
                                <span style={{ color: `hsl(${COLOR_PROT})` }}>{macros.p}g</span>
                                <span className="opacity-50 font-normal">P</span>
                              </div>
                              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] text-white font-bold flex flex-col items-center">
                                <span style={{ color: `hsl(${COLOR_CARB})` }}>{macros.c}g</span>
                                <span className="opacity-50 font-normal">C</span>
                              </div>
                            </div>
                          )}
                      </div>
                      <div>
                        <h3 className="font-display italic text-2xl tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {r.nome.toUpperCase()}
                        </h3>
                          <p className="text-[10px] text-white/70 line-clamp-2 mt-1 font-medium">{r.descricao_ia || "Toque para ver a prescrição."}</p>
                      </div>
                    </div>
                    {/* Play cinza no canto inferior direito */}
                    <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center group-hover:bg-primary group-hover:ring-primary transition-colors">
                      <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <DietScienceFooter />
      </div>

      {/* Modal de detalhes da refeição */}
      <Dialog open={!!selectedRef} onOpenChange={(o) => !o && setSelectedRef(null)}>
        <DialogContent
          overlayClassName="bg-background/90 backdrop-blur-sm"
          className="max-w-lg p-0 overflow-hidden gap-0 bg-card border-border shadow-2xl"
        >
          {selectedRef && (
            <>
              <div className="relative h-48 -mt-px">
                <img
                  src={imgFor(selectedRef)}
                  alt={selectedRef.nome}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <button
                  onClick={() => setSelectedRef(null)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-4 right-4">
                  <Badge className="bg-primary text-primary-foreground border-0 text-[10px] mb-2 gap-1">
                    <Clock className="h-3 w-3" /> {selectedRef.horario || "—"}
                  </Badge>
                  <h2 className="font-display italic text-2xl tracking-wide drop-shadow-lg">
                    {selectedRef.nome.toUpperCase()}
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {selectedMacros && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-background/60 border border-border rounded-lg p-2 text-center">
                      <div className="text-[9px] text-muted-foreground font-bold tracking-wider">KCAL</div>
                      <div className="font-display text-xl">{selectedMacros.kcal}</div>
                    </div>
                    {[
                      { l: "PROT", v: selectedMacros.p, hsl: COLOR_PROT },
                      { l: "CARB", v: selectedMacros.c, hsl: COLOR_CARB },
                      { l: "GORD", v: selectedMacros.g, hsl: COLOR_FAT },
                    ].map(m => (
                      <div
                        key={m.l}
                        className="bg-background/60 border rounded-lg p-2 text-center"
                        style={{ borderColor: `hsl(${m.hsl} / 0.4)` }}
                      >
                        <div className="text-[9px] font-bold tracking-wider" style={{ color: `hsl(${m.hsl})` }}>{m.l}</div>
                        <div className="font-display text-xl" style={{ color: `hsl(${m.hsl})` }}>{m.v}<span className="text-[10px] text-muted-foreground">g</span></div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground mb-2">ALIMENTOS</h3>
                  {selectedRef.itens.length > 0 ? (
                    <div className="divide-y divide-border/50 border border-border rounded-lg overflow-hidden">
                      {selectedRef.itens.map(it => {
                        const escrito = (it.substituicoes || "").trim();
                        const titulo = escrito || it.alimento?.nome || "—";
                        const liquido = /(agua|água|\bml\b|leite|suco|cafe|café|chá|cha)/i.test(titulo);
                        const unidade = liquido ? "ml" : "g";
                        const temSub = escrito.toLowerCase().includes(" ou ");
                        return (
                          <div key={it.id} className="px-3 py-2.5 flex items-center justify-between gap-3 bg-background/40">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{titulo}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {it.quantidade_g}{unidade}
                                {it.alimento?.nome && escrito && it.alimento.nome.toLowerCase() !== escrito.toLowerCase()
                                  ? ` · ${it.alimento.nome}`
                                  : ""}
                              </p>
                            </div>
                            {temSub && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[10px] h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => toast.info(escrito, { duration: 6000 })}
                              >
                                <RefreshCcw className="h-3 w-3 mr-1" /> Substituir
                              </Button>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background/40 p-4 text-sm leading-relaxed whitespace-pre-line">
                      {selectedRef.descricao_ia || "Prescrição não informada para esta refeição."}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dieta;
