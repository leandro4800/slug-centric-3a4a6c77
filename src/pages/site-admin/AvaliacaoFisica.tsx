import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import JacksonPollockCalculator from "@/components/admin/JacksonPollockCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, Loader2, User, UserPlus, History, Play, Dumbbell, Apple } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Aluno { id: string; nome_completo: string | null; email: string | null; sexo: string | null; data_nascimento: string | null; avatar_url: string | null; }
interface Avulso { id: string; nome: string; email: string | null; sexo: string | null; data_nascimento: string | null; peso_inicial_kg: number | null; altura_cm: number | null; }
interface Avaliacao {
  id: string; data: string; peso_kg: number | null; bf_pct_calculado: number | null;
  massa_magra_kg: number | null; aluno_id: string;
}

const AvaliacaoFisica = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avulsos, setAvulsos] = useState<Avulso[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"existing" | "avulso">("existing");

  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");
  const [selectedIsAvulso, setSelectedIsAvulso] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcContext, setCalcContext] = useState<{ alunoId: string; nome: string; peso?: number; idade?: number; sexo?: string; altura?: number } | null>(null);
  const [historico, setHistorico] = useState<Avaliacao[]>([]);

  // Avulso form
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoSexo, setAvulsoSexo] = useState<"M" | "F">("M");
  const [avulsoIdade, setAvulsoIdade] = useState("");
  const [avulsoPeso, setAvulsoPeso] = useState("");
  const [avulsoAltura, setAvulsoAltura] = useState("");
  const [criandoAvulso, setCriandoAvulso] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      setLoading(true);
      const [{ data }, { data: avulsoData }] = await Promise.all([
        supabase.from("perfis")
        .select("id, nome_completo, email, sexo, data_nascimento, avatar_url")
        .eq("tenant_id", tenant.id)
          .order("nome_completo"),
        (supabase as any).from("avaliacao_avulsa_alunos")
          .select("id, nome, email, sexo, data_nascimento, peso_inicial_kg, altura_cm")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
      ]);
      setAlunos((data as Aluno[]) || []);
      setAvulsos((avulsoData as Avulso[]) || []);
      setLoading(false);
    })();
  }, [tenant?.id]);

  // Carregar histórico do aluno selecionado
  useEffect(() => {
    if (!selectedAlunoId) { setHistorico([]); return; }
    (async () => {
      const { data } = await supabase
        .from("avaliacoes_fisicas")
        .select("id, data, peso_kg, bf_pct_calculado, massa_magra_kg, aluno_id")
        .eq("aluno_id", selectedAlunoId)
        .order("data", { ascending: false })
        .limit(10);
      setHistorico((data as Avaliacao[]) || []);
    })();
  }, [selectedAlunoId, calcOpen]);

  const abrirCalculadora = (aluno: Aluno) => {
    const idade = aluno.data_nascimento
      ? Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;
    setCalcContext({
      alunoId: aluno.id,
      nome: aluno.nome_completo || "Aluno",
      sexo: aluno.sexo || undefined,
      idade,
    });
    setSelectedAlunoId(aluno.id);
    setSelectedIsAvulso(false);
    setCalcOpen(true);
  };

  const abrirCalculadoraAvulso = (aluno: Avulso) => {
    const idade = aluno.data_nascimento
      ? Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;
    setCalcContext({
      alunoId: aluno.id,
      nome: aluno.nome || "Avaliado avulso",
      sexo: aluno.sexo || undefined,
      idade,
      peso: aluno.peso_inicial_kg ?? undefined,
      altura: aluno.altura_cm ?? undefined,
    });
    setSelectedAlunoId(aluno.id);
    setSelectedIsAvulso(true);
    setCalcOpen(true);
  };

  const criarAvulsoEAbrir = async () => {
    if (!avulsoNome.trim()) { toast.error("Informe o nome"); return; }
    if (!avulsoIdade || !avulsoPeso) { toast.error("Informe idade e peso"); return; }
    setCriandoAvulso(true);
    try {
      const dataNasc = new Date();
      dataNasc.setFullYear(dataNasc.getFullYear() - Number(avulsoIdade));
      const { data, error } = await supabase.functions.invoke("site-create-aluno-avulso", {
        body: {
          nome: avulsoNome.trim(),
          sexo: avulsoSexo,
          data_nascimento: dataNasc.toISOString().slice(0, 10),
          peso_inicial_kg: Number(avulsoPeso),
          altura_cm: avulsoAltura ? Number(avulsoAltura) : null,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Falha ao criar aluno avulso");
      }
      const alunoId = (data as any).aluno_id as string;
      setCalcContext({
        alunoId,
        nome: avulsoNome.trim(),
        sexo: avulsoSexo,
        idade: Number(avulsoIdade),
        peso: Number(avulsoPeso),
        altura: avulsoAltura ? Number(avulsoAltura) : undefined,
      });
      setSelectedAlunoId(alunoId);
      setSelectedIsAvulso(true);
      setCalcOpen(true);
      toast.success("Avaliação avulsa criada — sem cadastro no app");
      // Reset
      setAvulsoNome(""); setAvulsoIdade(""); setAvulsoPeso(""); setAvulsoAltura("");
      const { data: refreshed } = await (supabase as any)
        .from("avaliacao_avulsa_alunos")
        .select("id, nome, email, sexo, data_nascimento, peso_inicial_kg, altura_cm")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      setAvulsos((refreshed as Avulso[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar aluno");
    } finally {
      setCriandoAvulso(false);
    }
  };

  if (tenantLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programação</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Ruler className="h-7 w-7 text-primary" /> Avaliação física — 7 dobras
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Método Jackson & Pollock. Escolha um aluno do app ou crie uma avaliação avulsa (sem acesso ao app).
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-border/50 bg-card p-1 w-fit">
        <button
          onClick={() => setMode("existing")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${mode === "existing" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Aluno cadastrado
        </button>
        <button
          onClick={() => setMode("avulso")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${mode === "avulso" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Avaliação avulsa
        </button>
      </div>

      {mode === "existing" ? (
        alunos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado. Use a aba "Avaliação avulsa" ou cadastre um aluno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {alunos.map((a) => {
              const nome = a.nome_completo || "Sem nome";
              const primeiroNome = nome.split(" ")[0];
              return (
                <button
                  key={a.id}
                  onClick={() => abrirCalculadora(a)}
                  className="group relative overflow-hidden rounded-lg bg-zinc-900 border border-white/5 hover:border-primary/60 transition-all hover:scale-[1.03] hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] text-left"
                  style={{ aspectRatio: "2/3" }}
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt={nome} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <User className="h-16 w-16 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">Avaliar</p>
                    <h3 className="font-display text-sm md:text-base uppercase italic tracking-tight text-white leading-tight line-clamp-2">
                      {primeiroNome}
                    </h3>
                    {a.email && <p className="text-[10px] text-white/50 truncate mt-0.5">{a.email}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-5">
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg uppercase tracking-wider">Nova avaliação avulsa</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta pessoa fica apenas em avaliação avulsa. Não cria login, senha, perfil no app ou acesso à plataforma do aluno.
          </p>

          <div>
            <Label htmlFor="anome">Nome *</Label>
            <Input id="anome" value={avulsoNome} onChange={(e) => setAvulsoNome(e.target.value)} placeholder="Nome do avaliado" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Sexo *</Label>
              <select value={avulsoSexo} onChange={(e) => setAvulsoSexo(e.target.value as "M" | "F")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <Label htmlFor="aidade">Idade *</Label>
              <Input id="aidade" type="number" value={avulsoIdade} onChange={(e) => setAvulsoIdade(e.target.value)} placeholder="30" />
            </div>
            <div>
              <Label htmlFor="apeso">Peso (kg) *</Label>
              <Input id="apeso" type="number" step="0.1" value={avulsoPeso} onChange={(e) => setAvulsoPeso(e.target.value)} placeholder="75" />
            </div>
          </div>

          <div>
            <Label htmlFor="aaltura">Altura (cm) — opcional</Label>
            <Input id="aaltura" type="number" value={avulsoAltura} onChange={(e) => setAvulsoAltura(e.target.value)} placeholder="175" />
          </div>

          <Button onClick={criarAvulsoEAbrir} disabled={criandoAvulso} className="w-full gap-2">
            {criandoAvulso ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
            Iniciar avaliação
          </Button>
        </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg uppercase tracking-wider">Avulsos salvos</h2>
            </div>
            {avulsos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação avulsa criada ainda.</p>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {avulsos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => abrirCalculadoraAvulso(a)}
                    className="w-full rounded-xl border border-border/50 bg-background/60 p-3 text-left hover:border-primary/60 transition-colors"
                  >
                    <p className="font-display text-sm uppercase tracking-wide">{a.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.sexo || "Sexo —"} • {a.peso_inicial_kg ? `${a.peso_inicial_kg}kg` : "Peso —"} • Sem acesso ao app
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
      )}

      {/* Ações pós-avaliação: montar treino/dieta e baixar PDFs */}
      {selectedAlunoId && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Próximos passos</p>
          <h2 className="font-display text-lg uppercase tracking-wider mb-3">Prescrever para este aluno</h2>
          <p className="text-xs text-muted-foreground mb-4">
            A dieta usará automaticamente os dados salvos na avaliação (peso, altura, BF%, sexo, idade). Depois baixe o PDF e envie ao aluno.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/site/admin/montar-treino?aluno=${selectedAlunoId}${selectedIsAvulso ? "&avulso=1" : ""}`}>
              <Button className="gap-2"><Dumbbell className="h-4 w-4" /> Montar treino</Button>
            </Link>
            <Link to={`/site/admin/montar-dieta?aluno=${selectedAlunoId}${selectedIsAvulso ? "&avulso=1" : ""}`}>
              <Button variant="secondary" className="gap-2"><Apple className="h-4 w-4" /> Montar dieta</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Histórico do aluno selecionado */}
      {selectedAlunoId && historico.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm uppercase tracking-wider">Histórico</h2>
          </div>
          <ul className="space-y-2">
            {historico.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2 last:border-0">
                <span className="text-muted-foreground">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                <div className="flex gap-4">
                  <span>Peso: <strong className="text-foreground">{h.peso_kg?.toFixed(1) ?? "—"} kg</strong></span>
                  <span>BF: <strong className="text-primary">{h.bf_pct_calculado?.toFixed(1) ?? "—"}%</strong></span>
                  <span>MM: <strong>{h.massa_magra_kg?.toFixed(1) ?? "—"} kg</strong></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {calcContext && (
        <JacksonPollockCalculator
          open={calcOpen}
          onOpenChange={setCalcOpen}
          alunoId={calcContext.alunoId}
          tenantId={tenant?.id}
          pesoInicial={calcContext.peso ?? null}
          idadeInicial={calcContext.idade ?? null}
          sexoInicial={calcContext.sexo ?? null}
          alturaInicial={calcContext.altura ?? null}
          alunoNomeInicial={calcContext.nome}
          onSaved={() => {
            toast.success(`Avaliação salva para ${calcContext.nome}`);
            setCalcOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AvaliacaoFisica;
