import { useState, useEffect } from "react";
import { TrendingUp, Brain, Plus, Camera, Image as ImageIcon, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/aluno/PageHeader";
import { TenantSymbol } from "@/components/TenantSymbol";
import { useBranding } from "@/contexts/BrandingProvider";
import { EvolutionChart } from "@/components/aluno/evolucao/EvolutionChart";
import { BeforeAfterSlider } from "@/components/aluno/evolucao/BeforeAfterSlider";
import { CheckInModal } from "@/components/aluno/evolucao/CheckInModal";
import { HistoricoCheckins } from "@/components/aluno/evolucao/HistoricoCheckins";
import { InstagramCardGenerator } from "@/components/aluno/evolucao/InstagramCardGenerator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const Evolucao = () => {
  const [tab, setTab] = useState<"PESO" | "BF%">("PESO");
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [beforeUrl, setBeforeUrl] = useState("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=60");
  const [afterUrl, setAfterUrl] = useState("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60");
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiAnalise, setAiAnalise] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const gerarAnalise = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analise-performance");
      if (error) {
        let msg = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx) {
            const j = await ctx.json?.();
            if (j?.error) msg = j.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setAiAnalise(data?.analise ?? null);
      setAiMeta(data?.meta ?? null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar análise");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvolucao();
    }
  }, [user, tab, refreshKey]);

  const fetchEvolucao = async () => {
    const { data } = await supabase
      .from('evolucao_checkins')
      .select('*')
      .eq('user_id', user?.id)
      .order('data_checkin', { ascending: true });

    if (data && data.length > 0) {
      const formatted = data
        .filter(c => (tab === "PESO" ? c.peso_kg != null : c.bf_percentual != null))
        .map(c => ({
          date: new Date(c.data_checkin).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          value: tab === "PESO" ? Number(c.peso_kg) : Number(c.bf_percentual)
        }));
      setChartData(formatted);

      // Carregar fotos para o slider — usa primeiro/último com qualquer foto disponível
      const withPhotos = data.filter(c => c.foto_frente_url || c.foto_costas_url || c.foto_lado_url);
      const firstCheckin = withPhotos[0];
      const lastCheckin = withPhotos[withPhotos.length - 1];

      const pickPath = (c: any) => c?.foto_frente_url || c?.foto_lado_url || c?.foto_costas_url;
      const firstPath = pickPath(firstCheckin);
      const lastPath = pickPath(lastCheckin);

      if (firstPath) {
        const { data: fData } = await supabase.storage.from('evolucao-fotos').createSignedUrl(firstPath, 3600);
        if (fData?.signedUrl) setBeforeUrl(fData.signedUrl);
      }
      if (lastPath) {
        const { data: lData } = await supabase.storage.from('evolucao-fotos').createSignedUrl(lastPath, 3600);
        if (lData?.signedUrl) setAfterUrl(lData.signedUrl);
      }
    } else {
      setChartData([]);
    }
  };

  return (
    <div className="pb-32">
      <PageHeader icon={TrendingUp} title="EVOLUÇÃO…" subtitle={tenant?.nome || "MEU TIME"} />
      
      <div className="px-5">
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-[10px] text-primary mb-5 uppercase tracking-widest font-bold">
          <TenantSymbol size={16} /> Painel de Conquistas Alpha
        </div>

        {/* Comparativo Antes e Depois */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-white tracking-widest uppercase underline decoration-primary underline-offset-4 decoration-2">Visual</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("comparar")}
              className="text-[10px] tracking-widest h-7 border-primary/30 hover:bg-primary/10"
            >
              <ImageIcon className="mr-2 h-3 w-3" /> COMPARAR FOTOS
            </Button>
          </div>
          <BeforeAfterSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />
        </div>

        {/* Gráfico de Performance */}
        <div className="bg-card/40 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-primary tracking-widest uppercase">{tab === "PESO" ? "Peso Corporal" : "Gordura Corporal"}</h3>
            <div className="flex bg-card/80 border border-border rounded-xl p-0.5">
              {(["PESO", "BF%"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                    tab === t ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <EvolutionChart data={chartData} type={tab} />
        </div>

        {/* Inteligência Alpha — Análise de Performance com IA real */}
        <div className="bg-card/40 border border-border rounded-xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <p className="font-display text-lg text-primary tracking-widest uppercase">Análise de Performance</p>
            </div>
            {aiAnalise && !aiLoading && (
              <Button variant="ghost" size="sm" onClick={gerarAnalise} className="h-7 px-2 text-[10px] tracking-widest">
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>

          {!aiAnalise && !aiLoading && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Análise inteligente do seu progresso usando IA: ritmo de evolução, projeção realista e ajustes práticos baseados nos seus check-ins, avaliações e anamnese.
              </p>
              <Button onClick={gerarAnalise} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground tracking-widest uppercase text-xs font-bold">
                <Sparkles className="mr-2 h-4 w-4" /> Gerar Análise com IA
              </Button>
            </>
          )}

          {aiLoading && (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analisando sua evolução com IA…
            </div>
          )}

          {aiAnalise && !aiLoading && (
            <>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{aiAnalise}</p>
              {aiMeta && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/40 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Δ Peso</p>
                    <p className="text-sm font-bold text-primary">{aiMeta.delta_peso?.toFixed?.(1) ?? "—"}kg</p>
                  </div>
                  <div className="bg-background/40 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Δ BF%</p>
                    <p className="text-sm font-bold text-primary">{aiMeta.delta_bf?.toFixed?.(1) ?? "—"}</p>
                  </div>
                  <div className="bg-background/40 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Ritmo/sem</p>
                    <p className="text-sm font-bold text-primary">{aiMeta.ritmo_semanal_kg?.toFixed?.(2) ?? "—"}kg</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Histórico de Check-ins (com excluir) */}
        <div className="mt-6 space-y-3">
          <h3 className="font-display text-sm text-white tracking-widest uppercase">Histórico</h3>
          <HistoricoCheckins refreshKey={refreshKey} onChanged={() => setRefreshKey(k => k + 1)} />
        </div>

        {/* Gerador de Card Instagram */}
        <InstagramCardGenerator 
          userName={user?.user_metadata?.nome || "Você"} 
          weightLoss="3.0" 
          beforeImg={beforeUrl} 
          afterImg={afterUrl} 
        />

        {/* Botão de Check-in (Modal) */}
        <CheckInModal onSaved={() => setRefreshKey(k => k + 1)} />
      </div>
    </div>
  );
};

export default Evolucao;
