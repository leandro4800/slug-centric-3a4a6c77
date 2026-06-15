import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, Apple, Trash2, Plus, Mic, MicOff, Send, Calculator } from "lucide-react";
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
  const [isPublished, setIsPublished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [macrosCalculados, setMacrosCalculados] = useState<{ kcal: number; proteina_g: number; carboidrato_g: number; lipideos_g: number } | null>(null);
  const [iaCommand, setIaCommand] = useState(searchParams.get("prompt") || "");
  const recognitionRef = useRef<any>(null);

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
      const [perfilTreinoRes, perfilRes, avaliacaoRes, anamneseRes] = await Promise.all([
        supabase.from("perfis_treino").select("*").eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("perfis").select("sexo, data_nascimento").eq("id", alunoId).maybeSingle(),
        supabase.from("avaliacoes_fisicas").select("peso_kg, altura_cm, bf_pct_calculado, pescoco_cm, cintura_cm, quadril_cm, idade, sexo").eq("aluno_id", alunoId).order("data", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("anamnese_aluno").select("nivel_experiencia, refeicoes_dia").eq("aluno_id", alunoId).maybeSingle(),
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

      const { data: d } = await supabase
        .from("dietas")
        .select("id, is_published")
        .eq("user_id", alunoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (d) {
        setDietaId(d.id);
        setIsPublished(!!d.is_published);
        const { data: refs } = await supabase
          .from("refeicoes")
          .select("*")
          .eq("dieta_id", d.id)
          .order("ordem");
        if (refs) setRefeicoes(refs as any[]);
      } else {
        setDietaId(null);
        setIsPublished(false);
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

  const gerarComIA = useCallback(async (customPrompt?: string, skipConfirm = false) => {
    if (!alunoId) {
      toast.error("Selecione um aluno.");
      return;
    }
    if (!perfil.peso_kg || !perfil.altura_cm) {
      toast.error("Peso e altura são obrigatórios.");
      return;
    }

    if (!skipConfirm) {
      const resumo = `Confirmar geração da dieta?\n\nObjetivo: ${perfil.objetivo || "-"}\nPeso: ${perfil.peso_kg}kg • Altura: ${perfil.altura_cm}cm\nIdade: ${perfil.idade || "-"} • Sexo: ${perfil.sexo || "-"}\nRefeições/dia: ${refeicoesDia}\n\nA dieta será criada como RASCUNHO. Você poderá revisar e ajustar antes de enviar ao aluno.`;
      if (!window.confirm(resumo)) return;
    }

    setGenerating(true);
    const toastId = toast.loading("Gerando dieta...");
    
    try {
      await salvarPerfil(true);
      const activePrompt = customPrompt || iaCommand || "";
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
      
      if (data?.dieta_id) {
        setDietaId(data.dieta_id);
        setIsPublished(false); // Sempre gera como rascunho
        const { data: refs } = await supabase
          .from("refeicoes")
          .select("*")
          .eq("dieta_id", data.dieta_id)
          .order("ordem");
        if (refs) setRefeicoes(refs as any[]);
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  }, [alunoId, perfil, tenant, searchParams, refeicoesDia]);

  const addRefeicao = () => {
    setRefeicoes(prev => [
      ...prev,
      { nome: `Refeição ${prev.length + 1}`, horario: "08:00:00", descricao_ia: "" }
    ]);
  };

  const removeRefeicao = (idx: number) => {
    setRefeicoes(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRefeicao = (idx: number, patch: any) => {
    setRefeicoes(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const salvarPrescricaoDieta = async (publish = false) => {
    if (!alunoId || !tenant) return;
    setSaving(true);
    const toastId = toast.loading(publish ? "Publicando dieta..." : "Salvando rascunho...");

    try {
      let currentDietaId = dietaId;

      const dietData = {
        user_id: alunoId,
        objetivo: perfil.objetivo,
        is_published: publish || isPublished,
      };

      if (!currentDietaId) {
        const { data: d, error: dErr } = await supabase
          .from("dietas")
          .insert({
            ...dietData,
            kcal_alvo: 0,
            macros_alvo: {},
          })
          .select()
          .single();
        if (dErr) throw dErr;
        currentDietaId = d.id;
        setDietaId(d.id);
      } else {
        const { error: updErr } = await supabase
          .from("dietas")
          .update(dietData)
          .eq("id", currentDietaId);
        if (updErr) throw updErr;
      }

      setIsPublished(publish || isPublished);

      await supabase.from("refeicoes").delete().eq("dieta_id", currentDietaId);

      if (refeicoes.length > 0) {
        const { error: insErr } = await supabase.from("refeicoes").insert(
          refeicoes.map((r, i) => ({
            dieta_id: currentDietaId,
            nome: r.nome,
            horario: r.horario,
            ordem: i,
            descricao_ia: r.descricao_ia
          }))
        );
        if (insErr) throw insErr;
      }

      toast.success(publish ? "Dieta publicada para o aluno!" : "Rascunho salvo com sucesso!", { id: toastId });
      
      // Enviar notificação push se for publicado
      if (publish) {
        try {
          await supabase.functions.invoke("fcm-notifications", {
            body: {
              user_id: alunoId,
              title: "Sua Nova Dieta Chegou! 🍎",
              body: "Seu coach publicou seu novo plano alimentar. Dê uma olhada!",
            },
          });
        } catch (pushErr) {
          console.error("Erro ao enviar push:", pushErr);
        }
      }
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const equilibrarMacros = async () => {
    if (!alunoId || refeicoes.length === 0) return;
    setAdjusting(true);
    const toastId = toast.loading("Ajustando quantidades para bater os macros...");

    try {
      // Buscamos a dieta para saber os alvos
      const { data: diet } = await supabase.from("dietas").select("*").eq("id", dietaId).maybeSingle();
      if (!diet) throw new Error("Dieta não encontrada para ajuste.");

      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: { 
          mode: "refine",
          aluno_id: alunoId,
          dieta_id: dietaId,
          kcal_alvo: diet.kcal_alvo,
          macros_alvo: diet.macros_alvo,
          prompt: iaCommand,
          refeicoes: refeicoes.map(r => ({ nome: r.nome, descricao: r.descricao_ia }))
        },
      });

      if (error) throw error;

      if (data?.refeicoes) {
        setRefeicoes(prev => prev.map((r, i) => ({
          ...r,
          descricao_ia: data.refeicoes[i]?.descricao_ia || r.descricao_ia
        })));
        if (data?.totais) {
          setMacrosCalculados({
            kcal: Math.round(data.totais.kcal || 0),
            proteina_g: Math.round(data.totais.proteina_g || 0),
            carboidrato_g: Math.round(data.totais.carboidrato_g || 0),
            lipideos_g: Math.round(data.totais.lipideos_g || 0),
          });
        }
        if (data?.recalculado) {
          toast.success(`Dieta ajustada: ${data.kcal_alvo} kcal • P${data.macros_alvo?.proteina_g}g C${data.macros_alvo?.carboidrato_g}g G${data.macros_alvo?.lipideos_g}g`, { id: toastId });
        } else {
          toast.success("Macros equilibrados com sucesso!", { id: toastId });
        }
      }
    } catch (e: any) {
      toast.error("Erro ao ajustar: " + e.message, { id: toastId });
    } finally {
      setAdjusting(false);
    }
  };

  const recalcularMacros = async () => {
    if (!alunoId || refeicoes.length === 0 || !dietaId) {
      toast.error("Salve a dieta antes de recalcular.");
      return;
    }
    setRecalculating(true);
    const toastId = toast.loading("Recalculando macros a partir dos alimentos editados...");
    try {
      // Persiste edições atuais antes de recalcular
      await supabase.from("refeicoes").delete().eq("dieta_id", dietaId);
      if (refeicoes.length > 0) {
        await supabase.from("refeicoes").insert(
          refeicoes.map((r, i) => ({
            dieta_id: dietaId,
            nome: r.nome,
            horario: r.horario,
            ordem: i,
            descricao_ia: r.descricao_ia,
          }))
        );
      }

      const { data, error } = await supabase.functions.invoke("gerar-dieta", {
        body: {
          mode: "recalc",
          aluno_id: alunoId,
          dieta_id: dietaId,
          refeicoes: refeicoes.map(r => ({ nome: r.nome, descricao: r.descricao_ia || "" })),
        },
      });
      if (error) throw error;
      if (data?.totais) {
        setMacrosCalculados({
          kcal: Math.round(data.totais.kcal || 0),
          proteina_g: Math.round(data.totais.proteina_g || 0),
          carboidrato_g: Math.round(data.totais.carboidrato_g || 0),
          lipideos_g: Math.round(data.totais.lipideos_g || 0),
        });
      }
      toast.success("Macros recalculados com sucesso!", { id: toastId });
    } catch (e: any) {
      toast.error("Erro ao recalcular: " + e.message, { id: toastId });
    } finally {
      setRecalculating(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join("");
      
      setIaCommand(prev => (prev + " " + transcript).trim());
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      searchParams.get("auto") === "true" &&
      alunoId &&
      !generating &&
      !loading &&
      !autoTriggeredRef.current &&
      perfil.peso_kg && perfil.altura_cm
    ) {
      const confirmAction = window.confirm("Deseja gerar a dieta agora com a IA?");
      if (confirmAction) {
        autoTriggeredRef.current = true;
        void gerarComIA(undefined, true);
      } else {
        autoTriggeredRef.current = true;
      }
    }
  }, [searchParams, alunoId, generating, loading, perfil.peso_kg, perfil.altura_cm, gerarComIA]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <AdminBackButton to={alunoId ? `/${slug}/admin/atleta/${alunoId}` : `/${slug}/admin/atletas`} />
          <h1 className="font-display text-2xl uppercase">Montar Dieta</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-widest border border-primary/30">IA Coach</span>
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
          <div className="space-y-6">
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
                <div className="flex flex-col flex-[2] gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      Comando para a IA (Opcional)
                      <span className="text-[9px] text-primary/60">Afeta toda a dieta</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Textarea 
                          value={iaCommand}
                          onChange={(e) => setIaCommand(e.target.value)}
                          placeholder="Ex: Limit aveia em 100g, remover castanhas, priorizar arroz..."
                          className="min-h-[80px] bg-black/40 border-white/10 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute bottom-2 right-2 h-8 w-8 rounded-full ${isRecording ? 'bg-red-600/20 text-red-500 animate-pulse' : 'text-muted-foreground hover:text-white'}`}
                          onClick={startVoice}
                        >
                          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                      onClick={() => gerarComIA()}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                      {refeicoes.length > 0 ? "Refazer com IA" : "Gerar com IA"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl uppercase">Editor de Dieta</h2>
                  {isPublished ? (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/20 text-green-500 uppercase font-bold border border-green-500/30">Publicada</span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase font-bold border border-yellow-500/30">Rascunho</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={addRefeicao}>
                    <Plus className="h-4 w-4 mr-1" /> Refeição
                  </Button>
                  <Button variant="outline" size="sm" onClick={recalcularMacros} disabled={recalculating || !dietaId} className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10">
                    {recalculating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
                    Recalcular Macros
                  </Button>
                  <Button variant="outline" size="sm" onClick={equilibrarMacros} disabled={adjusting || !dietaId} className="border-primary/50 text-primary hover:bg-primary/10">
                    {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Equilibrar Macros
                  </Button>
                  <Button size="sm" onClick={() => salvarPrescricaoDieta(false)} disabled={saving || !alunoId} className="bg-secondary hover:bg-secondary/80">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar Rascunho
                  </Button>
                  <Button size="sm" onClick={() => salvarPrescricaoDieta(true)} disabled={saving || !alunoId} className="bg-primary hover:bg-primary/90">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Enviar para Aluno
                  </Button>
                </div>
              </div>

              {macrosCalculados && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-2 flex items-center gap-1">
                    <Calculator className="h-3 w-3" /> Macros recalculados (com base nos alimentos editados)
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><div className="font-display text-xl">{macrosCalculados.kcal}</div><div className="text-[9px] uppercase text-muted-foreground">kcal</div></div>
                    <div><div className="font-display text-xl text-emerald-400">{macrosCalculados.proteina_g}g</div><div className="text-[9px] uppercase text-muted-foreground">Proteína</div></div>
                    <div><div className="font-display text-xl text-yellow-400">{macrosCalculados.carboidrato_g}g</div><div className="text-[9px] uppercase text-muted-foreground">Carbo</div></div>
                    <div><div className="font-display text-xl text-red-400">{macrosCalculados.lipideos_g}g</div><div className="text-[9px] uppercase text-muted-foreground">Gordura</div></div>
                  </div>
                </div>
              )}

              {refeicoes.length === 0 ? (
                <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
                  Nenhuma refeição definida. Use a IA acima ou adicione manualmente.
                </div>
              ) : (
                <div className="space-y-4">
                  {refeicoes.map((r, i) => (
                    <div key={i} className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeRefeicao(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome da Refeição</Label>
                          <Input value={r.nome} onChange={e => updateRefeicao(i, { nome: e.target.value })} placeholder="Ex: Café da Manhã" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Horário</Label>
                          <Input type="time" value={r.horario?.slice(0, 5)} onChange={e => updateRefeicao(i, { horario: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Alimentos e Quantidades</Label>
                        <Textarea 
                          value={r.descricao_ia || ""} 
                          onChange={e => updateRefeicao(i, { descricao_ia: e.target.value })} 
                          placeholder="Ex: 100g de Frango, 200g de Arroz..."
                          className="min-h-[100px] bg-black/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminMontarDieta;