import { useEffect, useMemo, useState, useCallback } from "react";
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
  objetivo: string | null;
  tempo_treino: string | null;
}

const AdminMontarDieta = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>(searchParams.get("aluno") || "");
  const [perfil, setPerfil] = useState<PerfilTreino>({
    sexo: "", idade: null, peso_kg: null, altura_cm: null, bf_pct: null,
    objetivo: "hipertrofia", tempo_treino: "intermediario",
  });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const { data } = await supabase
        .from("perfis_treino")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();
      if (data) {
        setPerfil({
          sexo: data.sexo,
          idade: data.idade,
          peso_kg: data.peso_kg,
          altura_cm: data.altura_cm,
          bf_pct: data.bf_pct,
          objetivo: data.objetivo,
          tempo_treino: data.tempo_treino,
        });
      }
      setLoading(false);
    })();
  }, [alunoId]);

  const gerarComIA = useCallback(async () => {
    if (!alunoId) {
      toast.error("Selecione um aluno.");
      return;
    }
    setGenerating(true);
    const toastId = toast.loading("Gerando dieta com IA...");
    try {
      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: { 
          aluno_id: alunoId,
          objetivo: perfil.objetivo,
          peso_kg: perfil.peso_kg,
          altura_cm: perfil.altura_cm,
          idade: perfil.idade,
          sexo: perfil.sexo === "masculino" ? "M" : "F",
          nivel: perfil.tempo_treino
        },
      });
      if (error) throw error;
      toast.success("Dieta gerada com sucesso!", { id: toastId });
      // Redirect to athlete detail or stay here? 
      // For now, let's just show success.
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  }, [alunoId, perfil]);

  useEffect(() => {
    if (searchParams.get("auto") === "true" && alunoId && !generating && !loading) {
      void gerarComIA();
    }
  }, [searchParams, alunoId, generating, loading, gerarComIA]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <h1 className="font-display text-2xl uppercase">Montar Dieta</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-black tracking-widest border border-primary/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">IA Pacho</span>
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
                  value={perfil.tempo_treino || "intermediario"} 
                  onChange={(e) => setPerfil({...perfil, tempo_treino: e.target.value})}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                  <option value="alto_nivel">Atleta de Alto Nível</option>
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

            <Button 
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest"
              onClick={gerarComIA}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
              Gerar Dieta de Elite com IA
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminMontarDieta;
