import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Save, Apple, Trash2, Plus } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import { toNivelCanonico, toNivelEdgeKey } from "@/lib/nivel-experiencia";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
}

interface PerfilTreino {
  sexo: string | null;
  idade: number | null;
  peso_kg: number | null;
  altura_cm: number | null;
  bf_pct: number | null;
  pescoco_cm: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  objetivo: string | null;
  tempo_treino: string | null;
}

// (helper movido para src/lib/nivel-experiencia.ts)

const AdminMontarDieta = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>(searchParams.get("aluno") || "");
  const [refeicoesDia, setRefeicoesDia] = useState<number>(4);
  const [perfil, setPerfil] = useState<PerfilTreino>({
    sexo: "", idade: null, peso_kg: null, altura_cm: null, bf_pct: null,
    pescoco_cm: null, cintura_cm: null, quadril_cm: null,
    objetivo: "hipertrofia", tempo_treino: "Intermediário",
  });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refeicoes, setRefeicoes] = useState<Array<{ id?: string, nome: string, horario: string, descricao_ia: string }>>([]);
  const [dietaId, setDietaId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email")
        .eq("tenant_id", tenant.id);
      setAlunos((data as Aluno[]) || []);
    })();
  }, [tenant]);

  useEffect(() => {
    if (!alunoId) return;
    void (async () => {
      setLoading(true);
      // Mescla as 4 fontes do perfil real do aluno
      const [perfilTreinoRes, perfilRes, avaliacaoRes, anamneseRes] = await Promise.all([
        supabase.from("perfis_treino").select("*").eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("perfis").select("sexo, data_nascimento").eq("id", alunoId).maybeSingle(),
        supabase.from("avaliacoes_fisicas").select("peso_kg, altura_cm, bf_pct_calculado, pescoco_cm, cintura_cm, quadril_cm, idade, sexo").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("anamnese_aluno").select("nivel_experiencia").eq("aluno_id", alunoId).maybeSingle(),
      ]);

      const pt = perfilTreinoRes.data as any;
      const pr = perfilRes.data as any;
      const av = avaliacaoRes.data as any;
      const an = anamneseRes.data as any;

      let idadeCalc: number | null = null;
      if (pr?.data_nascimento) {
        const nasc = new Date(pr.data_nascimento);
        idadeCalc = Math.floor((Date.now() - nasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }

      setPerfil({
        sexo: pt?.sexo || pr?.sexo || av?.sexo || "",
        idade: pt?.idade ?? av?.idade ?? idadeCalc,
        peso_kg: pt?.peso_kg ?? av?.peso_kg ?? null,
        altura_cm: pt?.altura_cm ?? av?.altura_cm ?? null,
        bf_pct: pt?.bf_pct ?? av?.bf_pct_calculado ?? null,
        pescoco_cm: pt?.pescoco_cm ?? av?.pescoco_cm ?? null,
        cintura_cm: pt?.cintura_cm ?? av?.cintura_cm ?? null,
        quadril_cm: pt?.quadril_cm ?? av?.quadril_cm ?? null,
        objetivo: pt?.objetivo || "hipertrofia",
        tempo_treino: toNivelCanonico(pt?.tempo_treino || an?.nivel_experiencia) || "Intermediário",
      });
      setRefeicoesDia(an?.refeicoes_dia || 4);
      setLoading(false);
      
      // Busca dieta atual
      const { data: d } = await supabase
        .from("dietas")
        .select("id")
        .eq("user_id", alunoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (d) {
        setDietaId(d.id);
        const { data: refs } = await supabase
          .from("refeicoes")
          .select("*")
          .eq("dieta_id", d.id)
          .order("ordem");
        if (refs) setRefeicoes(refs as any[]);
      } else {
        setDietaId(null);
        setRefeicoes([]);
      }
    })();
  }, [alunoId]);

  const salvarPerfil = async (silent = false) => {
    if (!alunoId || !tenant) return;
    const { error } = await supabase
      .from("perfis_treino")
      .upsert({ 
        aluno_id: alunoId, 
        tenant_id: tenant.id, 
        sexo: perfil.sexo,
        idade: perfil.idade,
        peso_kg: perfil.peso_kg,
        altura_cm: perfil.altura_cm,
        bf_pct: perfil.bf_pct,
        pescoco_cm: perfil.pescoco_cm,
        cintura_cm: perfil.cintura_cm,
        quadril_cm: perfil.quadril_cm,
        objetivo: perfil.objetivo,
        tempo_treino: perfil.tempo_treino
      } as any, { onConflict: "aluno_id" });
    
    if (error) {
      if (!silent) toast.error("Erro ao salvar perfil: " + error.message);
    } else if (!silent) {
      toast.success("Perfil atualizado!");
    }
  };

  const gerarComIA = useCallback(async (customPrompt?: string) => {
    if (!alunoId) {
      toast.error("Selecione um aluno.");
      return;
    }
    if (!perfil.peso_kg || !perfil.altura_cm) {
      toast.error("Peso e altura são obrigatórios. Peça ao aluno para preencher a avaliação física.");
      return;
    }
    
    setGenerating(true);
    const toastId = toast.loading("Salvando perfil e gerando dieta...");
    
    try {
      // Salva o perfil antes de gerar para garantir que as alterações manuais persistam
      await salvarPerfil(true);

      const promptFromUrl = searchParams.get("prompt");
      const activePrompt = customPrompt || promptFromUrl || "";

      const sexoNorm = (perfil.sexo || "").toLowerCase();
      const sexoEnvio = sexoNorm.startsWith("f") ? "F" : "M";

      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: { 
          aluno_id: alunoId,
          objetivo: perfil.objetivo,
          peso_kg: perfil.peso_kg,
          altura_cm: perfil.altura_cm,
          idade: perfil.idade,
          sexo: sexoEnvio,
          nivel: toNivelEdgeKey(perfil.tempo_treino),
          bf_pct: perfil.bf_pct,
          pescoco_cm: perfil.pescoco_cm,
          cintura_cm: perfil.cintura_cm,
          quadril_cm: perfil.quadril_cm,
          prompt: activePrompt,
          refeicoes_dia: refeicoesDia
        },
      });
      if (error) throw error;
      toast.success("Dieta gerada com sucesso!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  }, [alunoId, perfil, tenant]);

  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    // Só dispara automático se o coach explicitamente vir de AtletaDetalhe com o parâmetro auto=true
    // E apenas UMA VEZ por carregamento de página
    if (
      searchParams.get("auto") === "true" &&
      alunoId &&
      !generating &&
      !loading &&
      !autoTriggeredRef.current &&
      perfil.peso_kg && perfil.altura_cm
    ) {
      // O coach ainda precisa confirmar se quer gerar agora
      const confirmAction = window.confirm("Deseja gerar a dieta agora com a IA?");
      if (confirmAction) {
        autoTriggeredRef.current = true;
        void gerarComIA();
      } else {
        // Se cancelar, marcamos como disparado para não perguntar de novo até recarregar
        autoTriggeredRef.current = true;
      }
    }
  }, [searchParams, alunoId, generating, loading, perfil.peso_kg, perfil.altura_cm, gerarComIA]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <h1 className="font-display text-2xl uppercase">Montar Dieta</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-widest border border-primary/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">IA Coach</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <Label>Aluno</Label>
          <select
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            className="w-full mt-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— selecione —</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>{a.nome_completo || a.email}</option>
            ))}
          </select>
        </div>

        {alunoId && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
            <h2 className="font-display text-xl uppercase">Dados para Cálculo</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Objetivo</Label>
                <select 
                  value={perfil.objetivo || "hipertrofia"} 
                  onChange={(e) => setPerfil({...perfil, objetivo: e.target.value})}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="hipertrofia">Hipertrofia</option>
                  <option value="cutting">Cutting (Emagrecimento)</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </div>
              <div>
                <Label>Nível</Label>
                <select 
                  value={perfil.tempo_treino || "Intermediário"} 
                  onChange={(e) => setPerfil({...perfil, tempo_treino: e.target.value})}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                  <option value="Atleta de Alto Nível">Atleta de Alto Nível</option>
                </select>
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" value={perfil.peso_kg || ""} onChange={(e) => setPerfil({...perfil, peso_kg: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" value={perfil.altura_cm || ""} onChange={(e) => setPerfil({...perfil, altura_cm: Number(e.target.value)})} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Pescoço (cm)</Label>
                <Input type="number" value={perfil.pescoco_cm || ""} onChange={(e) => setPerfil({...perfil, pescoco_cm: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Cintura (cm)</Label>
                <Input type="number" value={perfil.cintura_cm || ""} onChange={(e) => setPerfil({...perfil, cintura_cm: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Quadril (cm)</Label>
                <Input type="number" value={perfil.quadril_cm || ""} onChange={(e) => setPerfil({...perfil, quadril_cm: Number(e.target.value)})} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>BF (%)</Label>
                <Input type="number" value={perfil.bf_pct || ""} onChange={(e) => setPerfil({...perfil, bf_pct: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Sexo</Label>
                <select 
                  value={perfil.sexo || ""} 
                  onChange={(e) => setPerfil({...perfil, sexo: e.target.value})}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              <div>
                <Label>Refeições por dia</Label>
                <select 
                  value={refeicoesDia} 
                  onChange={(e) => setRefeicoesDia(Number(e.target.value))}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {[3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n} refeições</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <Button 
                variant="outline"
                className="flex-1 h-12 border-white/10 hover:bg-white/5 hover:text-white transition-all duration-300 rounded-xl"
                onClick={() => salvarPerfil()}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Perfil
              </Button>
              <Button 
                className="flex-[2] h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] border-none"
                onClick={() => gerarComIA()}
                disabled={generating}
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                Gerar Dieta de Elite com IA
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminMontarDieta;
