import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Activity, Calendar, FileText, AlertTriangle, Dumbbell, Heart, Moon, Pill } from "lucide-react";
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

type Avaliacao = { data: string; peso_kg: number | null; bf_pct_calculado: number | null };

type Carga = { exercicio_nome: string; carga_kg: number; data_treino: string };

type Analise = {
  id: string;
  titulo: string | null;
  created_at: string;
  score_performance: number | null;
  alerta_critico: boolean | null;
};

type Anamnese = {
  doencas: string[] | null;
  medicamentos: string | null;
  lesoes_atuais: string | null;
  qualidade_sono: number | null;
  horas_sono: number | null;
  nivel_estresse: number | null;
  suplementos: string[] | null;
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
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [anamnese, setAnamnese] = useState<Anamnese | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, a, h, an, am] = await Promise.all([
        supabase.from("evolucao_checkins").select("data_checkin,peso_kg,bf_percentual,massa_magra_kg")
          .eq("user_id", alunoId).order("data_checkin", { ascending: true }).limit(60),
        supabase.from("avaliacoes_fisicas").select("data,peso_kg,bf_pct_calculado")
          .eq("aluno_id", alunoId).order("data", { ascending: true }).limit(60),
        supabase.from("historico_cargas").select("exercicio_nome,carga_kg,data_treino")
          .eq("user_id", alunoId).order("data_treino", { ascending: false }).limit(200),
        supabase.from("analises_clinicas").select("id,titulo,created_at,score_performance,alerta_critico")
          .eq("user_id", alunoId).order("created_at", { ascending: false }).limit(5),
        supabase.from("anamnese_aluno").select("doencas,medicamentos,lesoes_atuais,qualidade_sono,horas_sono,nivel_estresse,suplementos")
          .eq("aluno_id", alunoId).maybeSingle(),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setAvaliacoes((a.data ?? []) as Avaliacao[]);
      setCargas((h.data ?? []) as Carga[]);
      setAnalises((an.data ?? []) as Analise[]);
      setAnamnese((am.data ?? null) as Anamnese | null);
      setLoading(false);
    })();
  }, [alunoId]);

  // Série combinada: check-ins + avaliações (peso e BF%)
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

  const ultimoCheckin = serie[serie.length - 1]?.data;
  const diasDesde = (() => {
    const allDates = [
      ...checkins.map((c) => c.data_checkin),
      ...avaliacoes.map((a) => a.data),
    ];
    if (!allDates.length) return null;
    const last = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Progressão completa de cargas por exercício (ordenada cronologicamente)
  const cargasPorExercicio = new Map<
    string,
    { data: string; carga: number }[]
  >();
  // copia + ordena ASC
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
      return {
        nome,
        pontos,
        max,
        inicial,
        atual,
        delta: atual - inicial,
        registros: pontos.length,
      };
    })
    .sort((a, b) => b.max - a.max);

  if (loading) {
    return (
      <div className="fut-glass p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div>
        <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-3">Resumo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Peso atual"
            value={pesoAtual ? pesoAtual.toFixed(1) : "—"}
            suffix={pesoAtual ? " kg" : ""}
            delta={isNaN(deltaPeso) ? undefined : deltaPeso}
            icon={Activity}
          />
          <Stat
            label="BF% atual"
            value={bfAtual ? bfAtual.toFixed(1) : "—"}
            suffix={bfAtual ? "%" : ""}
            delta={isNaN(deltaBf) ? undefined : deltaBf}
            icon={Activity}
          />
          <Stat
            label="Último check-in"
            value={diasDesde === null ? "—" : diasDesde === 0 ? "Hoje" : `${diasDesde}d`}
            icon={Calendar}
          />
          <Stat
            label="Exames"
            value={analises.length}
            icon={FileText}
          />
        </div>
      </div>

      {/* Gráfico de evolução */}
      <div className="fut-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground">
            Evolução • Peso e BF%
          </h3>
          <span className="text-[10px] text-muted-foreground">{serie.length} registros</span>
        </div>
        {serie.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Sem registros suficientes ainda. Faça check-ins para ver a evolução.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie}>
              <CartesianGrid stroke="hsl(0 0% 18%)" strokeDasharray="3 3" />
              <XAxis dataKey="data" stroke="hsl(0 0% 50%)" fontSize={11} />
              <YAxis yAxisId="l" stroke="hsl(0 0% 50%)" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="hsl(0 0% 50%)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 6%)",
                  border: "1px solid hsl(0 0% 20%)",
                  fontFamily: "Titillium Web, sans-serif",
                }}
              />
              <Line yAxisId="l" type="monotone" dataKey="peso" stroke="hsl(0 0% 92%)" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
              <Line yAxisId="r" type="monotone" dataKey="bf" stroke="hsl(42 70% 62%)" strokeWidth={2} dot={{ r: 3 }} name="BF %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top cargas */}
      <div className="fut-glass p-5">
        <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
          <Dumbbell className="w-4 h-4" /> Cargas máximas
        </h3>
        {topCargas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem registros de carga ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {topCargas.map(([nome, info]) => (
              <div key={nome} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <span className="font-body-fut text-sm">{nome}</span>
                <span className="font-display-fut text-lg fut-gold">{info.max} <span className="text-xs text-muted-foreground">kg</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exames recentes */}
      <div className="fut-glass p-5">
        <h3 className="font-gaming text-xs tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Exames recentes
        </h3>
        {analises.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum exame importado.</p>
        ) : (
          <div className="space-y-2">
            {analises.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  {a.alerta_critico && <AlertTriangle className="w-4 h-4 text-[hsl(0_70%_60%)]" />}
                  <div>
                    <p className="font-body-fut text-sm">{a.titulo || "Análise clínica"}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</p>
                  </div>
                </div>
                {a.score_performance != null && (
                  <span className="font-display-fut text-lg fut-cyan">{Math.round(Number(a.score_performance))}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anamnese resumo */}
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
