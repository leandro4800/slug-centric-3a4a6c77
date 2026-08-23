import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, TrendingDown, Activity, Calendar,
  Dumbbell, Heart, Moon, Pill, Sparkles, Apple, Ruler, ListChecks,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Props = { alunoId: string };

type Checkin = {
  data_checkin: string;
  peso_kg: number | null;
  bf_percentual: number | null;
  massa_magra_kg: number | null;
};
type Avaliacao = {
  data: string; peso_kg: number | null; bf_pct_calculado: number | null;
  cintura_cm: number | null; quadril_cm: number | null; pescoco_cm: number | null;
  dobra_peitoral: number | null; dobra_abdominal: number | null;
  dobra_coxa: number | null; dobra_triceps: number | null;
  dobra_subescapular: number | null; dobra_suprailiaca: number | null;
  dobra_axilar_media: number | null; massa_magra_kg: number | null; massa_gorda_kg: number | null;
};
type Carga = { exercicio_nome: string; carga_kg: number; data_treino: string };
type Anamnese = {
  doencas: string[] | null; medicamentos: string | null; lesoes_atuais: string | null;
  qualidade_sono: number | null; horas_sono: number | null; nivel_estresse: number | null;
  suplementos: string[] | null;
};
type DietaT = { objetivo: string | null; kcal_alvo: number | null; macros_alvo: any; created_at: string };
type Treino = { dia_semana: string; exercicio: string; series: string | null; repeticoes: string | null };

type Sintese = {
  score_geral: number;
  resumo: string;
  evolucao_corporal: string;
  performance_treino: string;
  aderencia: string;
  pontos_fortes: string[];
  pontos_atencao: string[];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const Stat = ({
  label, value, delta, icon: Icon, suffix,
}: { label: string; value: string | number; delta?: number; icon: any; suffix?: string }) => (
  <div className="fut-glass p-4">
    <div className="flex items-center justify-between mb-1">
      <span className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="font-display-fut text-2xl text-foreground">
      {value}
      {suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}
    </div>
    {typeof delta === "number" && !isNaN(delta) && (
      <div className={`flex items-center gap-1 mt-1 text-xs font-gaming ${delta < 0 ? "text-[hsl(0_70%_60%)]" : "text-[hsl(140_50%_60%)]"}`}>
        {delta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
        {delta > 0 ? "+" : ""}{delta.toFixed(1)}{suffix ?? ""}
      </div>
    )}
  </div>
);

export const PainelEvolucao = ({ alunoId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [anamnese, setAnamnese] = useState<Anamnese | null>(null);
  const [dieta, setDieta] = useState<DietaT | null>(null);
  const [refeicoesCount, setRefeicoesCount] = useState(0);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [fotosCount, setFotosCount] = useState(0);

  const [sintese, setSintese] = useState<Sintese | null>(null);
  const [gerandoSintese, setGerandoSintese] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, a, h, am, d, t, f] = await Promise.all([
        supabase.from("evolucao_checkins").select("data_checkin,peso_kg,bf_percentual,massa_magra_kg")
          .eq("user_id", alunoId).order("data_checkin", { ascending: true }).limit(60),
        supabase.from("avaliacoes_fisicas").select("*")
          .eq("aluno_id", alunoId).order("data", { ascending: true }).limit(60),
        supabase.from("historico_cargas").select("exercicio_nome,carga_kg,data_treino")
          .eq("user_id", alunoId).order("data_treino", { ascending: false }).limit(300),
        supabase.from("anamnese_aluno").select("doencas,medicamentos,lesoes_atuais,qualidade_sono,horas_sono,nivel_estresse,suplementos")
          .eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("dietas").select("objetivo,kcal_alvo,macros_alvo,created_at,id")
          .eq("user_id", alunoId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("treinos_prescritos").select("dia_semana,dia_ordem,exercicio,series,repeticoes")
          .eq("aluno_id", alunoId).order("dia_ordem", { nullsFirst: false }).order("ordem").limit(200),
        supabase.from("evolucao_fotos").select("id", { count: "exact", head: true }).eq("user_id", alunoId),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setAvaliacoes((a.data ?? []) as Avaliacao[]);
      setCargas((h.data ?? []) as Carga[]);
      setAnamnese((am.data ?? null) as Anamnese | null);
      setDieta((d.data ?? null) as DietaT | null);
      setTreinos((t.data ?? []) as Treino[]);
      setFotosCount(f.count ?? 0);

      if (d.data?.id) {
        const { count } = await supabase.from("refeicoes")
          .select("id", { count: "exact", head: true }).eq("dieta_id", d.data.id);
        setRefeicoesCount(count ?? 0);
      }
      setLoading(false);
    })();
  }, [alunoId]);

  const gerarSinteseIA = async () => {
    setGerandoSintese(true);
    setSintese(null);
    const { data, error } = await supabase.functions.invoke("painel-360-sintese", {
      body: { aluno_id: alunoId },
    });
    setGerandoSintese(false);
    if (error || !data?.sintese) {
      toast.error(data?.error || error?.message || "Falha ao gerar síntese");
      return;
    }
    setSintese(data.sintese as Sintese);
    toast.success("Síntese 360° gerada!");
  };

  // Série combinada
  const serie = [
    ...checkins.map((x) => ({ d: x.data_checkin, peso: x.peso_kg, bf: x.bf_percentual })),
    ...avaliacoes.map((x) => ({ d: x.data, peso: x.peso_kg, bf: x.bf_pct_calculado })),
  ]
    .filter((p) => p.peso || p.bf)
    .sort((a, b) => new Date(a.d).getTime() - new Date(b.d).getTime())
    .map((p) => ({ data: fmtDate(p.d), peso: p.peso, bf: p.bf }));

  const pesoVals = serie.map((s) => s.peso).filter((v): v is number => v != null);
  const bfVals = serie.map((s) => s.bf).filter((v): v is number => v != null);
  const pesoAtual = pesoVals[pesoVals.length - 1];
  const pesoInicial = pesoVals[0];
  const deltaPeso = pesoAtual && pesoInicial ? pesoAtual - pesoInicial : NaN;
  const bfAtual = bfVals[bfVals.length - 1];
  const bfInicial = bfVals[0];
  const deltaBf = bfAtual && bfInicial ? bfAtual - bfInicial : NaN;

  const diasDesde = (() => {
    const allDates = [
      ...checkins.map((c) => c.data_checkin),
      ...avaliacoes.map((a) => a.data),
    ];
    if (!allDates.length) return null;
    const last = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Cargas por exercício
  const cargasPorExercicio = new Map<string, { data: string; carga: number }[]>();
  const cargasAsc = [...cargas].sort(
    (a, b) => new Date(a.data_treino).getTime() - new Date(b.data_treino).getTime()
  );
  for (const c of cargasAsc) {
    const arr = cargasPorExercicio.get(c.exercicio_nome) ?? [];
    arr.push({ data: c.data_treino, carga: c.carga_kg });
    cargasPorExercicio.set(c.exercicio_nome, arr);
  }
  const exerciciosProgressao = Array.from(cargasPorExercicio.entries())
    .map(([nome, pontos]) => {
      const max = Math.max(...pontos.map((p) => p.carga));
      const inicial = pontos[0].carga;
      const atual = pontos[pontos.length - 1].carga;
      return { nome, pontos, max, inicial, atual, delta: atual - inicial, registros: pontos.length };
    })
    .sort((a, b) => b.max - a.max);

  // Avaliação mais recente para medidas/dobras
  const ultimaAval = avaliacoes[avaliacoes.length - 1];
  const dobras = ultimaAval ? [
    { l: "Peitoral", v: ultimaAval.dobra_peitoral },
    { l: "Abdominal", v: ultimaAval.dobra_abdominal },
    { l: "Coxa", v: ultimaAval.dobra_coxa },
    { l: "Tríceps", v: ultimaAval.dobra_triceps },
    { l: "Subescapular", v: ultimaAval.dobra_subescapular },
    { l: "Suprailíaca", v: ultimaAval.dobra_suprailiaca },
    { l: "Axilar média", v: ultimaAval.dobra_axilar_media },
  ].filter((d) => d.v != null) : [];

  // Treino agrupado por dia
  const treinoPorDia = treinos.reduce<Record<string, Treino[]>>((acc, t) => {
    (acc[t.dia_semana] ??= []).push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="fut-glass p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Síntese IA 360° */}
      <div className="fut-glass p-5 border border-[hsl(357_92%_47%/0.3)]">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[hsl(357_92%_60%)]" /> Síntese IA 360°
          </h3>
          <Button
            size="sm"
            onClick={gerarSinteseIA}
            disabled={gerandoSintese}
            className="font-gaming bg-[hsl(357_92%_47%)] hover:bg-[hsl(357_92%_55%)] text-white"
          >
            {gerandoSintese ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {sintese ? "Atualizar análise" : "Gerar análise completa"}
          </Button>
        </div>
        {!sintese && !gerandoSintese && (
          <p className="text-sm text-muted-foreground">
            A IA varre TODO o histórico do atleta no app — anamnese, check-ins, avaliações físicas, cargas, dieta e treino prescrito — e gera uma análise 360° precisa.
          </p>
        )}
        {gerandoSintese && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cruzando todos os dados do atleta...
          </div>
        )}
        {sintese && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="font-display-fut text-5xl text-[hsl(357_92%_60%)]">{sintese.score_geral}</div>
              <div className="flex-1">
                <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">Score Geral</div>
                <p className="font-body-fut text-sm">{sintese.resumo}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["Evolução corporal", sintese.evolucao_corporal],
                ["Performance no treino", sintese.performance_treino],
                ["Aderência", sintese.aderencia],
              ].map(([l, v]) => (
                <div key={l} className="border border-white/5 rounded p-3 bg-black/20">
                  <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{l}</div>
                  <p className="text-sm font-body-fut">{v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="font-gaming text-[10px] uppercase tracking-widest text-[hsl(140_50%_60%)] mb-1">Pontos fortes</div>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {sintese.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-gaming text-[10px] uppercase tracking-widest text-[hsl(42_70%_62%)] mb-1">Pontos de atenção</div>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {sintese.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div>
        <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-3">Resumo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Peso atual" value={pesoAtual ? pesoAtual.toFixed(1) : "—"} suffix={pesoAtual ? " kg" : ""} delta={isNaN(deltaPeso) ? undefined : deltaPeso} icon={Activity} />
          <Stat label="BF% atual" value={bfAtual ? bfAtual.toFixed(1) : "—"} suffix={bfAtual ? "%" : ""} delta={isNaN(deltaBf) ? undefined : deltaBf} icon={Activity} />
          <Stat label="Último registro" value={diasDesde === null ? "—" : diasDesde === 0 ? "Hoje" : `${diasDesde}d`} icon={Calendar} />
          <Stat label="Check-ins" value={checkins.length} icon={Calendar} />
          <Stat label="Avaliações" value={avaliacoes.length} icon={Ruler} />
          <Stat label="Registros de carga" value={cargas.length} icon={Dumbbell} />
          <Stat label="Fotos evolução" value={fotosCount} icon={Activity} />
        </div>
      </div>

      {/* Gráfico de evolução */}
      <div className="fut-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground">Evolução • Peso e BF%</h3>
          <span className="text-[10px] text-muted-foreground">{serie.length} registros</span>
        </div>
        {serie.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sem registros suficientes ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie}>
              <CartesianGrid stroke="hsl(0 0% 18%)" strokeDasharray="3 3" />
              <XAxis dataKey="data" stroke="hsl(0 0% 50%)" fontSize={11} />
              <YAxis yAxisId="l" stroke="hsl(0 0% 50%)" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="hsl(0 0% 50%)" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 20%)", fontFamily: "Titillium Web, sans-serif" }} />
              <Line yAxisId="l" type="monotone" dataKey="peso" stroke="hsl(0 0% 92%)" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
              <Line yAxisId="r" type="monotone" dataKey="bf" stroke="hsl(42 70% 62%)" strokeWidth={2} dot={{ r: 3 }} name="BF %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Medidas e dobras (última avaliação) */}
      {ultimaAval && (
        <div className="fut-glass p-5">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Medidas & dobras • última avaliação ({fmtDate(ultimaAval.data)})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              ["Cintura", ultimaAval.cintura_cm, "cm"],
              ["Quadril", ultimaAval.quadril_cm, "cm"],
              ["Pescoço", ultimaAval.pescoco_cm, "cm"],
              ["Massa magra", ultimaAval.massa_magra_kg, "kg"],
              ["Massa gorda", ultimaAval.massa_gorda_kg, "kg"],
            ].filter((x) => x[1] != null).map(([l, v, s]) => (
              <div key={l as string} className="border border-white/5 rounded p-2 bg-black/20">
                <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                <div className="font-display-fut text-lg">{v as number}<span className="text-xs text-muted-foreground ml-1">{s as string}</span></div>
              </div>
            ))}
          </div>
          {dobras.length > 0 && (
            <div>
              <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Dobras cutâneas (mm)</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dobras.map((d) => (
                  <div key={d.l} className="text-sm flex justify-between border-b border-white/5 py-1">
                    <span className="text-muted-foreground">{d.l}</span>
                    <span className="font-display-fut">{d.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dieta atual */}
      {dieta && (
        <div className="fut-glass p-5">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
            <Apple className="w-4 h-4" /> Dieta atual
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">Objetivo</div>
              <p className="font-body-fut text-sm">{dieta.objetivo || "—"}</p>
            </div>
            <div>
              <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">Calorias</div>
              <p className="font-display-fut text-lg">{dieta.kcal_alvo ?? "—"}<span className="text-xs text-muted-foreground ml-1">kcal</span></p>
            </div>
            <div>
              <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">Refeições</div>
              <p className="font-display-fut text-lg">{refeicoesCount}</p>
            </div>
            <div>
              <div className="font-gaming text-[10px] uppercase tracking-widest text-muted-foreground">Macros (P/C/G)</div>
              <p className="font-body-fut text-sm">
                {dieta.macros_alvo
                  ? `${dieta.macros_alvo.proteina_g ?? "?"} / ${dieta.macros_alvo.carboidrato_g ?? "?"} / ${dieta.macros_alvo.lipideos_g ?? "?"} g`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Treino prescrito */}
      {treinos.length > 0 && (
        <div className="fut-glass p-5">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Treino prescrito
            <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground/70">
              {Object.keys(treinoPorDia).length} dias · {treinos.length} exercícios
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {Object.entries(treinoPorDia).map(([dia, exs]) => (
              <div key={dia} className="border border-white/5 rounded p-3 bg-black/20">
                <div className="font-gaming text-xs uppercase tracking-widest fut-cyan mb-2">{dia}</div>
                <ul className="text-sm space-y-1">
                  {exs.map((e, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{e.exercicio}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{e.series}×{e.repeticoes}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progressão de cargas */}
      <div className="fut-glass p-5">
        <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
          <Dumbbell className="w-4 h-4" /> Progressão de cargas
          <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground/70">
            {exerciciosProgressao.length} exercícios
          </span>
        </h3>
        {exerciciosProgressao.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem registros de carga ainda.</p>
        ) : (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {exerciciosProgressao.map((ex) => (
              <div key={ex.nome} className="border border-white/5 rounded-md p-3 bg-black/20">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="font-body-fut text-sm truncate">{ex.nome}</span>
                  <div className="flex items-baseline gap-3 shrink-0">
                    <span className="font-display-fut text-lg fut-gold">
                      {ex.atual}<span className="text-xs text-muted-foreground"> kg</span>
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-gaming ${
                      ex.delta < 0 ? "text-[hsl(0_70%_60%)]" : ex.delta > 0 ? "text-[hsl(140_50%_60%)]" : "text-muted-foreground"
                    }`}>
                      {ex.delta > 0 ? <TrendingUp className="w-3 h-3" /> : ex.delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {ex.delta > 0 ? "+" : ""}{ex.delta} kg
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-muted-foreground font-gaming uppercase tracking-widest shrink-0">
                    <div>Inicial {ex.inicial}kg</div>
                    <div>Máx {ex.max}kg</div>
                    <div>{ex.registros} reg.</div>
                  </div>
                  <div className="flex-1 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ex.pontos.map((p) => ({ d: fmtDate(p.data), carga: p.carga }))}>
                        <XAxis dataKey="d" hide />
                        <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                        <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 20%)", fontSize: 11 }}
                          formatter={(v: number) => [`${v} kg`, "Carga"]} />
                        <Line type="monotone" dataKey="carga" stroke="hsl(42 70% 62%)" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anamnese */}
      {anamnese && (
        <div className="fut-glass p-5">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4" /> Anamnese
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><Moon className="w-3 h-3" /> Sono</div>
              <p className="font-body-fut">
                {anamnese.horas_sono ? `${anamnese.horas_sono}h` : "—"}
                {anamnese.qualidade_sono ? ` · qualidade ${anamnese.qualidade_sono}/10` : ""}
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Estresse</div>
              <p className="font-body-fut">{anamnese.nivel_estresse ? `${anamnese.nivel_estresse}/10` : "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><Pill className="w-3 h-3" /> Medicamentos</div>
              <p className="font-body-fut line-clamp-2">{anamnese.medicamentos || "—"}</p>
            </div>
            <div className="col-span-2 md:col-span-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Lesões atuais</div>
              <p className="font-body-fut">{anamnese.lesoes_atuais || "Nenhuma"}</p>
            </div>
            {anamnese.doencas && anamnese.doencas.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Doenças</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {anamnese.doencas.map((d) => (
                    <span key={d} className="text-[10px] px-2 py-0.5 border border-white/10 rounded">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {anamnese.suplementos && anamnese.suplementos.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Suplementos</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {anamnese.suplementos.map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 border border-white/10 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
