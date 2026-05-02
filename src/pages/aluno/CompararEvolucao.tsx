import { useState, useEffect } from "react";
import { TrendingUp, ArrowLeft, Calendar, Scale, Activity, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/aluno/PageHeader";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const CompararEvolucao = () => {
  const { tenant } = useBranding();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [antesId, setAntesId] = useState<string>("");
  const [depoisId, setDepoisId] = useState<string>("");
  
  const [antes, setAntes] = useState<any>(null);
  const [depois, setDepois] = useState<any>(null);
  
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [analise, setAnalise] = useState<string>("");
  const [analisando, setAnalisando] = useState(false);

  const gerarAnalise = async () => {
    if (!antesId || !depoisId) {
      toast.error("Selecione os dois check-ins");
      return;
    }
    if (antesId === depoisId) {
      toast.error("Selecione check-ins diferentes");
      return;
    }
    setAnalisando(true);
    setAnalise("");
    try {
      const { data, error } = await supabase.functions.invoke("analise-evolucao", {
        body: { antes_id: antesId, depois_id: depoisId },
      });
      if (error) {
        const msg = (error as any)?.context?.status === 429
          ? "Limite atingido, tente em instantes."
          : (error as any)?.context?.status === 402
          ? "Créditos de IA insuficientes."
          : error.message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setAnalise(data?.analise || "");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar análise");
    } finally {
      setAnalisando(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCheckins();
    }
  }, [user]);

  const fetchCheckins = async () => {
    try {
      const { data, error } = await supabase
        .from('evolucao_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .order('data_checkin', { ascending: false });

      if (error) throw error;
      setCheckins(data || []);
      
      if (data && data.length >= 2) {
        setAntesId(data[data.length - 1].id);
        setDepoisId(data[0].id);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar check-ins: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (antesId) {
      const checkin = checkins.find(c => c.id === antesId);
      setAntes(checkin);
      loadSignedUrls(checkin, 'antes');
    }
  }, [antesId, checkins]);

  useEffect(() => {
    if (depoisId) {
      const checkin = checkins.find(c => c.id === depoisId);
      setDepois(checkin);
      loadSignedUrls(checkin, 'depois');
    }
  }, [depoisId, checkins]);

  const loadSignedUrls = async (checkin: any, prefix: string) => {
    if (!checkin) return;
    
    const types = ['foto_frente_url', 'foto_costas_url', 'foto_lado_url'];
    const newUrls: Record<string, string> = { ...urls };
    
    for (const type of types) {
      if (checkin[type]) {
        try {
          const { data, error } = await supabase.storage
            .from('evolucao-fotos')
            .createSignedUrl(checkin[type], 3600);
          
          if (data?.signedUrl) {
            newUrls[`${prefix}_${type}`] = data.signedUrl;
          }
        } catch (err) {
          console.error(`Error loading signed URL for ${type}:`, err);
        }
      }
    }
    setUrls(newUrls);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white">Carregando...</div>;
  }

  const pesoDiff = depois && antes ? (depois.peso_kg - antes.peso_kg).toFixed(1) : "0";
  const bfDiff = depois && antes && depois.bf_percentual && antes.bf_percentual 
    ? (depois.bf_percentual - antes.bf_percentual).toFixed(1) 
    : "0";

  const formatAnalise = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-6" />;
      
      const isTitle = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3;
      if (isTitle) {
        return (
          <p key={i} className="text-primary font-medium mt-10 mb-5 tracking-[0.3em] text-[14px] uppercase border-b border-primary/20 pb-3">
            {trimmedLine}
          </p>
        );
      }
      return <p key={i} className="text-white text-[18px] leading-[1.8] mb-6 font-normal tracking-wide">{trimmedLine}</p>;
    });
  };

  return (
    <div className="pb-32 bg-black min-h-screen">
      <div className="px-5 pt-5">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="text-white/60 hover:text-white p-0 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <PageHeader icon={TrendingUp} title="COMPARATIVO" subtitle="EVOLUÇÃO VISUAL" />

      <div className="px-5 space-y-6">
        {/* Seleção de Check-ins */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Antes</Label>
            <Select value={antesId} onValueChange={setAntesId}>
              <SelectTrigger className="bg-card/40 border-border text-xs rounded-none">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-border text-white">
                {checkins.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {format(new Date(c.data_checkin), "dd/MM/yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-widest uppercase text-muted-foreground">Depois</Label>
            <Select value={depoisId} onValueChange={setDepoisId}>
              <SelectTrigger className="bg-card/40 border-border text-xs rounded-none">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-border text-white">
                {checkins.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {format(new Date(c.data_checkin), "dd/MM/yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo de Mudanças */}
        {antes && depois && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/40 border border-border p-4 flex flex-col items-center justify-center text-center">
              <Scale className="h-5 w-5 text-primary mb-1" />
              <p className="text-[10px] uppercase text-muted-foreground tracking-widest">Peso</p>
              <p className="text-sm font-normal text-white">
                {antes.peso_kg}kg → {depois.peso_kg}kg
              </p>
              <p className={`text-[10px] font-normal ${parseFloat(pesoDiff) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {parseFloat(pesoDiff) > 0 ? '+' : ''}{pesoDiff}kg
              </p>
            </div>
            <div className="bg-card/40 border border-border p-4 flex flex-col items-center justify-center text-center">
              <Activity className="h-5 w-5 text-primary mb-1" />
              <p className="text-[10px] uppercase text-muted-foreground tracking-widest">BF%</p>
              <p className="text-sm font-normal text-white">
                {antes.bf_percentual || '--'}% → {depois.bf_percentual || '--'}%
              </p>
              <p className={`text-[10px] font-normal ${parseFloat(bfDiff) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {parseFloat(bfDiff) > 0 ? '+' : ''}{bfDiff}%
              </p>
            </div>
          </div>
        )}

        {/* Análise IA Visual */}
        <div className="bg-card/40 border border-primary/30 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <p className="font-display text-base text-primary tracking-widest uppercase">Análise Visual do Coach IA</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Análise baseada nas fotos enviadas e nos números reais informados — sem invenções.
          </p>
          <Button
            onClick={gerarAnalise}
            disabled={analisando || !antes || !depois}
            className="w-full rounded-none uppercase tracking-widest text-xs"
          >
            {analisando ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando fotos...</>
            ) : analise ? "Gerar nova análise" : "Gerar análise visual"}
          </Button>
          {analise && (
            <div className="bg-zinc-950 border border-white/5 p-8 mt-4 rounded-none shadow-2xl">
              <div className="max-w-none">
                {formatAnalise(analise)}
              </div>
            </div>
          )}
        </div>

        {/* Grade de Fotos */}
        <div className="space-y-4">
          {['frente', 'costas', 'lado'].map((angulo) => (
            <div key={angulo} className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold border-l-2 border-primary pl-2">
                {angulo}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative aspect-[3/4] bg-zinc-900 overflow-hidden border border-white/5">
                  {urls[`antes_foto_${angulo}_url`] ? (
                    <img 
                      src={urls[`antes_foto_${angulo}_url`]} 
                      className="w-full h-full object-cover" 
                      alt={`Antes ${angulo}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white/20 uppercase">Sem foto</div>
                  )}
                  <span className="absolute top-2 left-2 bg-black/80 text-white text-[8px] px-2 py-0.5 rounded uppercase font-medium tracking-tighter">Antes</span>
                </div>
                <div className="relative aspect-[3/4] bg-zinc-900 overflow-hidden border border-primary/20 shadow-glow-sm">
                  {urls[`depois_foto_${angulo}_url`] ? (
                    <img 
                      src={urls[`depois_foto_${angulo}_url`]} 
                      className="w-full h-full object-cover" 
                      alt={`Depois ${angulo}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white/20 uppercase">Sem foto</div>
                  )}
                  <span className="absolute top-2 left-2 bg-primary text-white text-[8px] px-2 py-0.5 rounded uppercase font-medium tracking-tighter">Depois</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompararEvolucao;