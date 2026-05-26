import { useState, useEffect } from "react";
import {
  Camera,
  Loader2,
  Check,
  Maximize,
  Minimize,
  AtSign,
  Dumbbell,
  Trophy,
  MapPin,
  Laptop,
  Shield,
  Award,
  Users,
  Globe,
  Zap,
  Apple,
  Utensils,
  TrendingUp,
  MessageCircle,
  Flame,
  Target,
  ClipboardList,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  Dumbbell, Trophy, MapPin, Laptop, Shield, Award, Users, Globe, Zap,
  Apple, Utensils, TrendingUp, MessageCircle, Flame, Target, ClipboardList, Smartphone,
};

type TemplateId = "biografia" | "consultoria" | "treino-dieta" | "transforme";

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: "biografia", label: "Biografia", desc: "Dark / vermelho — autoridade" },
  { id: "consultoria", label: "Consultoria Online", desc: "Phone mockup + amarelo" },
  { id: "treino-dieta", label: "Treino & Dieta", desc: "Grunge amarelo industrial" },
  { id: "transforme", label: "Transformação", desc: "Verde neon / checklist" },
];

interface Props {
  onEnterFullScreen?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

export const StoriesGenerator = ({ onEnterFullScreen, onExitFullScreen, isFullScreen }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateId>("biografia");
  const [profileData, setProfileData] = useState<any>(null);
  const [config, setConfig] = useState({
    instagram_handle: "",
    headline: "TRANSFORME SEU CORPO",
    subheadline: "TRANSFORME SUA VIDA",
    tagline: "DISCIPLINA · FOCO · RESULTADOS",
    cta_text: "FALE COMIGO AGORA!",
    website_url: "client.seudominio.com.br",
    location_text: "IRONBERG SP & ALPHAVILLE",
    photo_url: "",
    topic1_label: "+34 ANOS DE EXPERIÊNCIA",
    topic1_icon: "Dumbbell",
    topic1_desc: "Mais de três décadas dedicadas à musculação de alto nível e à verdadeira transformação de vidas.",
    topic2_label: "+30 ANOS COMO PERSONAL",
    topic2_icon: "Trophy",
    topic2_desc: "Atuando presencialmente e digital, gerando resultados reais com máxima excelência.",
    topic3_label: "FOCO NO PÚBLICO 40+",
    topic3_icon: "MapPin",
    topic3_desc: "Especialista em devolver vitalidade e construir saúde blindada após os 40.",
    topic4_label: "CONSULTORIA VIA APP",
    topic4_icon: "Laptop",
    topic4_desc: "Planejamento 100% individualizado na palma da mão, treine onde quiser.",
    topic5_label: "ESTRUTURAS DE ELITE",
    topic5_icon: "Shield",
    topic5_desc: "Atuação presencial nas maiores e mais renomadas academias do Brasil.",
    topic6_label: "RESULTADOS COMPROVADOS",
    topic6_icon: "TrendingUp",
    topic6_desc: "Método testado e aprovado por centenas de atletas.",
    branding_color: "#E50914",
    accent_secondary: "#FACC15",
  });

  useEffect(() => { loadConfig(); }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: p } = await supabase.from("perfis").select("*").eq("id", user.id).single();
      setProfileData(p);
      const { data: c } = await supabase.from("coach_marketing_config").select("*").eq("user_id", user.id).maybeSingle();
      if (c) {
        setTemplate((c.template as TemplateId) || "biografia");
        setConfig(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(c).filter(([k, v]) => v != null && k in prev)),
        }));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { topic1_desc, topic2_desc, topic3_desc, topic4_desc, topic5_desc, topic6_desc, ...persistable } = config;
      const { error } = await supabase.from("coach_marketing_config").upsert({
        user_id: user.id,
        template,
        ...persistable,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setSaving(false); }
  };

  const update = (k: string, v: string) => setConfig(prev => ({ ...prev, [k]: v }));
  const coachName = (profileData?.nome_completo || "SEU NOME").toUpperCase();
  const avatar = config.photo_url || profileData?.avatar_url || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800";

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const renderTemplate = () => {
    switch (template) {
      case "biografia": return <BiografiaTemplate config={config} coachName={coachName} avatar={avatar} />;
      case "consultoria": return <ConsultoriaTemplate config={config} coachName={coachName} avatar={avatar} />;
      case "treino-dieta": return <TreinoDietaTemplate config={config} coachName={coachName} avatar={avatar} />;
      case "transforme": return <TransformeTemplate config={config} coachName={coachName} avatar={avatar} />;
    }
  };

  return (
    <div className={cn("space-y-6", isFullScreen && "fixed inset-0 z-[100] bg-black m-0 p-0 overflow-hidden flex flex-col items-center justify-center")}>
      {!isFullScreen && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl border text-left transition-all",
                template === t.id
                  ? "bg-primary text-primary-foreground border-primary scale-[1.02]"
                  : "bg-card border-border/40 hover:border-primary/40"
              )}
            >
              <div className="text-xs font-black uppercase tracking-wider">{t.label}</div>
              <div className="text-[10px] opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      <div className={cn(
        "relative mx-auto bg-black shadow-2xl overflow-hidden transition-all ring-1 ring-white/10",
        isFullScreen ? "h-[100vh] aspect-[9/16]" : "h-[600px] aspect-[9/16] rounded-[2rem]"
      )}>
        {renderTemplate()}
      </div>

      {isFullScreen ? (
        <Button variant="outline" size="lg" onClick={onExitFullScreen}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border-white/20 text-white rounded-full gap-2 px-8">
          <Minimize className="h-5 w-5" /> Sair do Modo Print
        </Button>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
          <ConfigPanel template={template} config={config} update={update} />
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <h5 className="font-bold flex items-center gap-2 text-sm"><Camera className="h-4 w-4 text-primary" /> Publicar</h5>
            <p className="text-xs text-muted-foreground">Salve as configurações, depois entre em tela cheia e tire um print 9:16 para postar como Story.</p>
            <Button onClick={handleSave} className="w-full" disabled={saving} variant="secondary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />} Salvar Configurações
            </Button>
            <Button onClick={onEnterFullScreen} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest gap-2">
              <Maximize className="h-5 w-5" /> Modo Tela Cheia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============ TEMPLATE 1: BIOGRAFIA (Jefferson Badboy style) ============ */
const BiografiaTemplate = ({ config, coachName, avatar }: any) => {
  const accent = config.branding_color;
  const topics = [1, 2, 3, 4, 5].map(i => ({
    label: config[`topic${i}_label`],
    icon: config[`topic${i}_icon`],
    desc: config[`topic${i}_desc`],
  })).filter(t => t.label);

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden text-white">
      {/* Background gym */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-black/70" />
      <div className="absolute -top-20 -left-20 w-64 h-64 blur-[80px] opacity-30" style={{ background: accent }} />

      {/* Photo right */}
      <div className="absolute right-0 top-0 w-[55%] h-full">
        <img src={avatar} alt="coach" className="w-full h-full object-cover object-top" style={{ maskImage: "linear-gradient(to left, black 60%, transparent)" , WebkitMaskImage: "linear-gradient(to left, black 60%, transparent)" }} />
      </div>

      {/* Header title */}
      <div className="relative z-10 pt-6 px-5">
        <h1 className="font-['Anton'] text-[34px] leading-[0.9] tracking-tight italic text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
          {coachName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-px w-8" style={{ background: accent }} />
          <div className="text-[10px] font-bold tracking-[0.4em] uppercase" style={{ color: accent }}>BIOGRAFIA</div>
          <div className="h-px flex-1" style={{ background: accent }} />
        </div>
      </div>

      {/* Topics */}
      <div className="relative z-10 px-4 mt-4 space-y-2.5 w-[62%]">
        {topics.map((t, i) => {
          const Icon = ICONS[t.icon] || Award;
          return (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: accent }}>
                <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
              </div>
              <div>
                <div className="font-['Anton'] text-[11px] tracking-wide uppercase leading-tight">{t.label}</div>
                <div className="text-[8.5px] opacity-70 leading-snug mt-0.5">{t.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-t-2 px-4 py-3 flex items-center justify-between" style={{ borderColor: accent }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: accent }}>
            <Target className="h-3 w-3 text-black" />
          </div>
          <div>
            <div className="text-[8px] font-bold tracking-widest opacity-70">FOCO · DISCIPLINA · RESULTADOS</div>
            <div className="text-[10px] font-black uppercase italic" style={{ color: accent }}>ESSE É O CAMINHO!</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[9px] font-bold"><AtSign className="h-2.5 w-2.5" />{config.instagram_handle || "@seuperfil"}</div>
        </div>
      </div>
    </div>
  );
};

/* ============ TEMPLATE 2: CONSULTORIA (white + yellow phone) ============ */
const ConsultoriaTemplate = ({ config, coachName, avatar }: any) => {
  const accent = config.accent_secondary || "#FACC15";
  return (
    <div className="relative w-full h-full overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <img src={avatar} alt="" className="absolute right-0 top-0 h-full w-[70%] object-cover object-top grayscale contrast-125" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />

      <div className="relative z-10 p-5 pt-8 h-full flex flex-col">
        <div>
          <h2 className="font-['Anton'] text-[32px] leading-[0.85] uppercase tracking-tight">CONSULTORIA</h2>
          <h3 className="font-['Anton'] text-[18px] leading-[1] uppercase opacity-90 mt-1">DE TREINO E DIETA</h3>
          <div className="inline-block mt-2 px-3 py-1 rounded-md text-black font-black text-[16px] italic" style={{ background: accent }}>ON-LINE</div>
        </div>

        {/* Phone mockup + badges */}
        <div className="flex items-center gap-3 mt-5 ml-2">
          <div className="relative w-[80px] h-[160px] bg-[#1a1a1a] rounded-[18px] border-2 border-[#333] shadow-2xl shrink-0 overflow-hidden">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-[#333] rounded-b-lg" />
            <img src={avatar} alt="" className="absolute inset-1 rounded-[14px] object-cover w-[calc(100%-8px)] h-[calc(100%-8px)] grayscale" />
          </div>
          <div className="space-y-2">
            <div className="bg-black/80 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <Dumbbell className="h-4 w-4" style={{ color: accent }} />
              <div>
                <div className="text-[8px] opacity-70">TREINOS</div>
                <div className="font-black text-[11px] uppercase">Personalizados</div>
              </div>
            </div>
            <div className="bg-black/80 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <Apple className="h-4 w-4" style={{ color: accent }} />
              <div>
                <div className="text-[8px] opacity-70">DIETAS</div>
                <div className="font-black text-[11px] uppercase">Individualizadas</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div>
            <div className="font-['Anton'] text-[28px] leading-[0.9] uppercase">QUER ALCANÇAR</div>
            <div className="font-['Anton'] text-[28px] leading-[0.9] uppercase" style={{ color: accent }}>SEUS OBJETIVOS?</div>
          </div>
          <div className="inline-block px-4 py-2 rounded-md text-black font-black text-[14px] italic uppercase shadow-lg" style={{ background: accent }}>
            {config.cta_text || "FALE COMIGO AGORA!"}
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1.5 w-fit">
            <Globe className="h-3 w-3" style={{ color: accent }} />
            <span className="text-[10px] font-bold">{config.website_url || "client.seudominio.com.br"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ TEMPLATE 3: TREINO E DIETA (yellow grunge) ============ */
const TreinoDietaTemplate = ({ config, coachName, avatar }: any) => {
  const accent = config.accent_secondary || "#FACC15";
  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[#050505]">
      <img src={avatar} alt="" className="absolute left-0 top-0 h-full w-[55%] object-cover grayscale contrast-150" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/70 to-black" />
      <div className="absolute top-3 right-3 w-12 h-3 bg-[repeating-linear-gradient(45deg,#000_0_4px,#FACC15_4px_8px)]" />

      <div className="relative z-10 p-5 h-full flex flex-col">
        <div className="text-[9px] font-bold tracking-[0.3em] opacity-80 space-y-0.5">
          <div>DISCIPLINA</div><div>FOCO</div><div>RESULTADOS</div>
        </div>

        <div className="ml-auto text-right mt-6">
          <div className="font-['Anton'] text-[52px] leading-[0.85] uppercase italic">TREINO</div>
          <div className="font-['Anton'] text-[52px] leading-[0.85] uppercase italic" style={{ color: accent }}>E DIETA</div>
          <div className="inline-flex items-center gap-2 mt-2">
            <div className="h-px w-6 bg-white" />
            <span className="font-['Anton'] text-[16px] tracking-[0.2em]">ONLINE</span>
            <div className="h-px w-6 bg-white" />
          </div>
          <div className="text-[9px] font-bold tracking-wider mt-2 opacity-90">TRANSFORME SEU CORPO</div>
          <div className="text-[9px] font-bold tracking-wider opacity-90">TRANSFORME SUA VIDA</div>
        </div>

        <div className="mt-6 ml-auto space-y-2.5 w-[55%]">
          {[
            { i: "Dumbbell", t: "TREINOS PERSONALIZADOS", d: "Planejados para o seu objetivo." },
            { i: "Utensils", t: "DIETAS PERSONALIZADAS", d: "Nutrição equilibrada para máximo resultado." },
            { i: "TrendingUp", t: "ACOMPANHAMENTO CONTÍNUO", d: "Suporte e ajustes constantes." },
          ].map((item, i) => {
            const Icon = ICONS[item.i];
            return (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: accent }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                </div>
                <div>
                  <div className="font-['Anton'] text-[11px] uppercase leading-tight">{item.t}</div>
                  <div className="text-[8px] opacity-75 leading-snug">{item.d}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          <div className="inline-flex items-center gap-2 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 mb-3">
            <Smartphone className="h-3 w-3" style={{ color: accent }} />
            <div>
              <div className="text-[10px] font-black">100% ONLINE</div>
              <div className="text-[7px] opacity-70 tracking-widest">TREINE ONDE ESTIVER</div>
            </div>
          </div>
          <div className="rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xl" style={{ background: accent }}>
            <MessageCircle className="h-5 w-5 text-black" />
            <div className="text-black">
              <div className="font-black text-[13px] uppercase italic">{config.cta_text || "FALE COMIGO AGORA!"}</div>
              <div className="text-[8px] font-bold">COMECE SUA TRANSFORMAÇÃO HOJE MESMO!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ TEMPLATE 4: TRANSFORME (green neon) ============ */
const TransformeTemplate = ({ config, coachName, avatar }: any) => {
  const accent = "#A3E635";
  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[#080808]">
      <img src={avatar} alt="" className="absolute right-0 top-0 h-full w-[65%] object-cover object-top grayscale contrast-125" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
      <div className="absolute right-0 bottom-0 w-[60%] h-[40%] opacity-30" style={{ background: `radial-gradient(circle at bottom right, ${accent}, transparent 70%)` }} />

      <div className="relative z-10 p-5 h-full flex flex-col">
        <div>
          <div className="font-['Anton'] text-[28px] leading-[0.9] uppercase italic">TRANSFORME SEU</div>
          <div className="font-['Anton'] text-[58px] leading-[0.85] uppercase italic" style={{ color: accent }}>CORPO.</div>
          <div className="font-['Anton'] text-[26px] leading-[0.9] uppercase italic mt-1">TRANSFORME SUA</div>
          <div className="font-['Anton'] text-[58px] leading-[0.85] uppercase italic" style={{ color: accent }}>VIDA.</div>
        </div>

        <div className="mt-3 text-[10px] font-bold tracking-wide leading-tight">
          <div>TREINO INTELIGENTE.</div>
          <div>DIETA ESTRATÉGICA.</div>
          <div style={{ color: accent }}>RESULTADOS REAIS!</div>
        </div>

        <div className="mt-4 border-2 rounded-2xl p-3 bg-black/60 backdrop-blur-sm w-[60%] space-y-2" style={{ borderColor: accent }}>
          <div className="text-[10px] font-black tracking-wider" style={{ color: accent }}>O QUE VOCÊ RECEBE:</div>
          {[
            { i: "Dumbbell", t: "TREINOS PERSONALIZADOS", s: "100% ON-LINE" },
            { i: "ClipboardList", t: "DIETAS PERSONALIZADAS", s: "PARA SEU OBJETIVO" },
            { i: "MessageCircle", t: "ACOMPANHAMENTO", s: "INDIVIDUAL" },
            { i: "TrendingUp", t: "RESULTADOS COMPROVADOS", s: "MÉTODO APROVADO" },
          ].map((b, i) => {
            const Icon = ICONS[b.i];
            return (
              <div key={i} className="flex gap-2 items-center">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <div>
                  <div className="font-['Anton'] text-[9px] uppercase leading-tight">{b.t}</div>
                  <div className="text-[7px] opacity-70 tracking-wider">{b.s}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          <div className="grid grid-cols-5 gap-1 border-y border-white/10 py-2 mb-3">
            {[
              { i: Flame, t: "QUEIMA" },
              { i: Dumbbell, t: "MASSA" },
              { i: Zap, t: "ENERGIA" },
              { i: Target, t: "FOCO" },
              { i: Trophy, t: "CONFIANÇA" },
            ].map((x, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <x.i className="h-3 w-3" style={{ color: accent }} />
                <div className="text-[6.5px] font-bold tracking-wider text-center">{x.t}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-['Anton'] text-[16px] leading-tight uppercase italic" style={{ color: accent }}>COMECE HOJE</div>
              <div className="text-[8px] opacity-80">A MELHOR VERSÃO DE VOCÊ!</div>
            </div>
            <div className="rounded-md px-3 py-2 text-black font-black text-[10px] uppercase italic flex items-center gap-1.5 shadow-lg" style={{ background: accent }}>
              <MessageCircle className="h-3 w-3" />{config.cta_text || "FALE COMIGO!"}
            </div>
          </div>
          <div className="text-[8px] text-center opacity-60 mt-1.5 tracking-widest">VAGAS LIMITADAS · {config.instagram_handle || "@seuperfil"}</div>
        </div>
      </div>
    </div>
  );
};

/* ============ Config Panel ============ */
const ConfigPanel = ({ template, config, update }: any) => {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
      <h5 className="font-bold flex items-center gap-2 text-sm"><AtSign className="h-4 w-4 text-primary" /> Configurações</h5>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Instagram</Label>
        <Input value={config.instagram_handle} onChange={e => update("instagram_handle", e.target.value)} placeholder="@seuperfil" className="h-9 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">CTA</Label>
        <Input value={config.cta_text} onChange={e => update("cta_text", e.target.value)} placeholder="FALE COMIGO AGORA!" className="h-9 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Link / Site</Label>
        <Input value={config.website_url} onChange={e => update("website_url", e.target.value)} placeholder="client.seudominio.com.br" className="h-9 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Foto (URL pública)</Label>
        <Input value={config.photo_url} onChange={e => update("photo_url", e.target.value)} placeholder="https://..." className="h-9 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase font-bold opacity-70">Cor primária</Label>
          <Input type="color" value={config.branding_color} onChange={e => update("branding_color", e.target.value)} className="h-9 p-1 cursor-pointer" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase font-bold opacity-70">Cor destaque</Label>
          <Input type="color" value={config.accent_secondary} onChange={e => update("accent_secondary", e.target.value)} className="h-9 p-1 cursor-pointer" />
        </div>
      </div>

      {template === "biografia" && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="text-[10px] font-black uppercase opacity-70">Tópicos da Bio</div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-1">
              <Input value={config[`topic${i}_label`] || ""} onChange={e => update(`topic${i}_label`, e.target.value)} placeholder={`Título ${i}`} className="h-8 text-xs font-bold" />
              <Textarea value={config[`topic${i}_desc`] || ""} onChange={e => update(`topic${i}_desc`, e.target.value)} placeholder="Descrição curta" className="text-[11px] min-h-[44px]" rows={2} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
