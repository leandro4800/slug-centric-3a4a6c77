import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { AtletaCard } from "@/pages/site-admin/MontarTreino";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Activity, Loader2, Sparkles, TrendingUp, Scale, Dumbbell } from "lucide-react";
import { toast } from "sonner";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

const Metricas = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [params, setParams] = useSearchParams();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const alunoId = params.get("aluno");

  useEffect(() => {
    if (!tenant?.id || alunoId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email, avatar_url")
        .eq("tenant_id", tenant.id)
        .order("nome_completo");
      setAlunos((data as Aluno[]) || []);
      setLoading(false);
    })();
  }, [tenant?.id, alunoId]);

  if (tenantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (alunoId) {
    return <DetalheMetricas alunoId={alunoId} onBack={() => setParams({})} />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Acompanhamento
        </p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" /> Métricas dos atletas
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Selecione um atleta para ver progressão de carga, evolução e análise da IA.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : alunos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum aluno cadastrado ainda.</p>
          <Link to="/site/admin/alunos/novo" className="text-primary text-sm font-bold uppercase tracking-wider">
            Cadastrar primeiro aluno →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {alunos.map((a) => (
            <AtletaCard key={a.id} aluno={a as any} onSelect={() => setParams({ aluno: a.id })} />
          ))}
        </div>
      )}
    </div>
  );
};

interface CheckinFoto {
  id: string;
  data_checkin: string;
  peso_kg: number | null;
  bf_percentual: number | null;
  fotos: { angulo: string; url: string }[];
}

const DetalheMetricas = ({ alunoId, onBack }: { alunoId: string; onBack: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Aluno | null>(null);
  const [cargas, setCargas] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [pesoDiario, setPesoDiario] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  const [exercicio, setExercicio] = useState<string>("");
  const [analise, setAnalise] = useState<string>("");
  const [analisando, setAnalisando] = useState(false);
  const [checkins, setCheckins] = useState<CheckinFoto[]>([]);
  const [fotosLoading, setFotosLoading] = useState(true);
  const [antesId, setAntesId] = useState<string>("");
  const [depoisId, setDepoisId] = useState<string>("");
  const [analiseFotos, setAnaliseFotos] = useState<string>("");
  const [analisandoFotos, setAnalisandoFotos] = useState(false);

  useEffect(() => {
    (async () => {
      setFotosLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("coach-fotos-evolucao", {
          body: { aluno_id: alunoId, action: "list" },
        });
        if (error) throw error;
        const lista = ((data as any)?.checkins || []) as CheckinFoto[];
        setCheckins(lista);
        if (lista.length) {
          setAntesId(lista[0].id);
          setDepoisId(lista[lista.length - 1].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFotosLoading(false);
      }
    })();
  }, [alunoId]);

  const analisarFotos = async () => {
    setAnalisandoFotos(true);
    setAnaliseFotos("");
    try {
      const { data, error } = await supabase.functions.invoke("coach-fotos-evolucao", {
        body: { aluno_id: alunoId, action: "analisar", antes_id: antesId, depois_id: depoisId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnaliseFotos((data as any)?.analise || "Sem retorno da IA.");
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível analisar as fotos: " + (e?.message || "erro"));
    } finally {
      setAnalisandoFotos(false);
    }
  };


  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, se, e, av, pd, pr] = await Promise.all([
        supabase.from("perfis").select("id, nome_completo, email, avatar_url").eq("id", alunoId).maybeSingle(),
        supabase
          .from("series_executadas")
          .select("peso_kg, reps, volume_kg, rm_estimado, concluida_em, treino_prescrito_id, treinos_prescritos(exercicio)")
          .eq("aluno_id", alunoId)
          .order("concluida_em", { ascending: true })
          .limit(2000),
        supabase
          .from("evolucao_metricas")
          .select("peso, bf, massa_magra, massa_gorda, cintura, braco, data_registro")
          .eq("user_id", alunoId)
          .order("data_registro", { ascending: true })
          .limit(500),
        supabase
          .from("avaliacoes_fisicas")
          .select("data, peso_kg, bf_pct_calculado, massa_magra_kg, massa_gorda_kg, imc")
          .eq("aluno_id", alunoId)
          .order("data", { ascending: true })
          .limit(200),
        supabase
          .from("peso_diario")
          .select("data, peso")
          .eq("aluno_id", alunoId)
          .order("data", { ascending: true })
          .limit(365),
        supabase
          .from("prs")
          .select("id, exercicio, tipo_recorde, valor_numerico, valor_anterior, valor, unidade, data")
          .eq("aluno_id", alunoId)
          .order("data", { ascending: false })
          .limit(300),
      ]);
      setPerfil((p.data as Aluno) || null);
      setCargas(
        ((se.data as any[]) || []).map((s) => ({
          exercicio_nome: s.treinos_prescritos?.exercicio || "Exercício",
          carga_kg: s.peso_kg,
          repeticoes_feitas: s.reps,
          volume_kg: s.volume_kg,
          rm_estimado: s.rm_estimado,
          data_treino: s.concluida_em,
        })),
      );
      setEvolucao((e.data as any[]) || []);
      setAvaliacoes((av.data as any[]) || []);
      setPesoDiario((pd.data as any[]) || []);
      setPrs((pr.data as any[]) || []);
      setLoading(false);
    })();
  }, [alunoId]);

  const exercicios = useMemo(
    () => Array.from(new Set(cargas.map((c) => c.exercicio_nome))).sort(),
    [cargas],
  );


  useEffect(() => {
    if (!exercicio && exercicios.length) setExercicio(exercicios[0]);
  }, [exercicios, exercicio]);

  const serieCarga = useMemo(
    () =>
      cargas
        .filter((c) => c.exercicio_nome === exercicio)
        .map((c) => ({
          data: fmtDate(c.data_treino),
          carga: Number(c.carga_kg) || 0,
          reps: c.repeticoes_feitas || 0,
        })),
    [cargas, exercicio],
  );

  const seriePeso = useMemo(() => {
    const fromAval = avaliacoes.map((a) => ({
      data: fmtDate(a.data),
      peso: Number(a.peso_kg) || null,
      bf: a.bf_pct_calculado != null ? Number(a.bf_pct_calculado) : null,
    }));
    const fromEvo = evolucao.map((e) => ({
      data: fmtDate(e.data_registro),
      peso: e.peso != null ? Number(e.peso) : null,
      bf: e.bf != null ? Number(e.bf) : null,
    }));
    const fromDiario = pesoDiario.map((p) => ({ data: fmtDate(p.data), peso: Number(p.peso), bf: null }));
    return [...fromAval, ...fromEvo, ...fromDiario];
  }, [avaliacoes, evolucao, pesoDiario]);

  const volumePorExercicio = useMemo(() => {
    const map = new Map<string, number>();
    cargas.forEach((c) => {
      const vol = Number(c.volume_kg) || (Number(c.carga_kg) || 0) * (Number(c.repeticoes_feitas) || 0);
      map.set(c.exercicio_nome, (map.get(c.exercicio_nome) || 0) + vol);
    });
    return Array.from(map.entries())
      .map(([nome, volume]) => ({ nome: nome.length > 14 ? nome.slice(0, 14) + "…" : nome, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }, [cargas]);

  const ultimoPeso = seriePeso.filter((s) => s.peso).slice(-1)[0]?.peso ?? null;
  const primeiroPeso = seriePeso.filter((s) => s.peso)[0]?.peso ?? null;
  const ultimoBf = seriePeso.filter((s) => s.bf).slice(-1)[0]?.bf ?? null;
  const recordeCarga = serieCarga.length ? Math.max(...serieCarga.map((s) => s.carga)) : null;

  const gerarAnalise = async () => {
    setAnalisando(true);
    setAnalise("");
    try {
      const { data, error } = await supabase.functions.invoke("analisar-metricas-aluno", {
        body: {
          aluno: { nome: perfil?.nome_completo, email: perfil?.email },
          cargas: cargas.slice(-200),
          evolucao,
          avaliacoes,
          peso_diario: pesoDiario.slice(-90),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalise((data as any)?.analise || "Sem retorno da IA.");
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível gerar a análise: " + (e?.message || "erro"));
    } finally {
      setAnalisando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const semDados = !cargas.length && !seriePeso.length;

  return (
    <div className="p-4 md:p-8">
      <button
        onClick={onBack}
        className="mb-3 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
      >
        ← Trocar atleta
      </button>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Métricas</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter">
          {perfil?.nome_completo || "Atleta"}
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Scale} label="Peso atual" value={ultimoPeso ? `${ultimoPeso} kg` : "—"} />
        <Kpi
          icon={TrendingUp}
          label="Variação de peso"
          value={ultimoPeso && primeiroPeso ? `${(ultimoPeso - primeiroPeso).toFixed(1)} kg` : "—"}
        />
        <Kpi icon={Activity} label="%BF atual" value={ultimoBf ? `${Number(ultimoBf).toFixed(1)}%` : "—"} />
        <Kpi icon={Dumbbell} label="Recorde de carga" value={recordeCarga ? `${recordeCarga} kg` : "—"} />
      </div>

      {/* Fotos de evolução (app) */}
      <div className="mb-6">
        <Painel title="Fotos de evolução do app">
          {fotosLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este atleta ainda não enviou fotos no botão Evolução do app.
            </p>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {checkins.map((c) => (
                  <div key={c.id} className="min-w-[190px]">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {fmtDate(c.data_checkin)} · {c.peso_kg ? `${c.peso_kg}kg` : "—"}
                      {c.bf_percentual ? ` · ${c.bf_percentual}%BF` : ""}
                    </p>
                    <div className="flex gap-1.5">
                      {c.fotos.map((f) => (
                        <a key={f.angulo} href={f.url} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={f.url}
                            alt={`Foto ${f.angulo} de ${fmtDate(c.data_checkin)}`}
                            loading="lazy"
                            className="h-32 w-[58px] rounded-md border border-white/10 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Antes
                  <select
                    value={antesId}
                    onChange={(e) => setAntesId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                  >
                    {checkins.map((c) => (
                      <option key={c.id} value={c.id}>{fmtDate(c.data_checkin)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Depois
                  <select
                    value={depoisId}
                    onChange={(e) => setDepoisId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                  >
                    {checkins.map((c) => (
                      <option key={c.id} value={c.id}>{fmtDate(c.data_checkin)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                onClick={analisarFotos}
                disabled={analisandoFotos || !antesId || !depoisId}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
              >
                {analisandoFotos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analisandoFotos ? "Analisando fotos..." : "Analisar fotos com IA"}
              </button>

              {analiseFotos && (
                <div className="mt-3 max-h-[320px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {analiseFotos}
                </div>
              )}
            </>
          )}
        </Painel>
      </div>



      {semDados ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Este atleta ainda não registrou métricas no app.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Progressão de carga */}
          <Painel title="Progressão de carga">
            {exercicios.length > 0 && (
              <select
                value={exercicio}
                onChange={(ev) => setExercicio(ev.target.value)}
                className="mb-3 w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
              >
                {exercicios.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            )}
            <ChartBox>
              <LineChart data={serieCarga}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="carga" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartBox>
          </Painel>

          {/* Evolução corporal */}
          <Painel title="Evolução corporal (peso e %BF)">
            <ChartBox>
              <LineChart data={seriePeso}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="bf" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ChartBox>
          </Painel>

          {/* Volume por exercício */}
          <Painel title="Volume total por exercício">
            <ChartBox>
              <BarChart data={volumePorExercicio}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          </Painel>

          {/* IA */}
          <Painel title="Análise da IA">
            <button
              onClick={gerarAnalise}
              disabled={analisando}
              className="mb-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
            >
              {analisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analisando ? "Analisando..." : "Gerar análise"}
            </button>
            {analise ? (
              <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed max-h-[320px] overflow-y-auto">
                {analise}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A IA cruza progressão de carga, peso, %BF e avaliações para apontar tendências e recomendações.
              </p>
            )}
          </Painel>

          {/* Recordes pessoais */}
          <Painel title="Recordes pessoais">
            {prs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum recorde registrado ainda.</p>
            ) : (
              <ul className="max-h-[320px] space-y-2 overflow-y-auto">
                {prs
                  .filter((r) => !exercicio || r.exercicio === exercicio || !exercicios.includes(r.exercicio))
                  .map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{r.exercicio}</p>
                        <p className="text-[11px] text-muted-foreground">{fmtDate(r.data)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                          {r.tipo_recorde === "1rm" ? "1RM" : r.tipo_recorde === "peso" ? "Peso" : "Volume"}
                        </span>
                        <span className="font-mono text-sm">
                          {Number(r.valor_numerico ?? 0).toFixed(1)}
                          {r.valor_anterior != null && (
                            <span className="ml-1 text-[11px] text-muted-foreground line-through">
                              {Number(r.valor_anterior).toFixed(1)}
                            </span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Painel>
        </div>

      )}
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </div>
    <p className="mt-2 font-display text-2xl italic tracking-tight">{value}</p>
  </div>
);

const Painel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4 md:p-5">
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
    {children}
  </div>
);

const ChartBox = ({ children }: { children: any }) => (
  <div className="h-[240px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

export default Metricas;
