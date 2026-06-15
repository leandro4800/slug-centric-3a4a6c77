import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Loader2,
  Check,
  Maximize,
  Minimize,
  Upload,
  Phone,
  AtSign,
  Dumbbell,
  Apple,
  Heart,
  Flame,
  Trophy,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  Wifi,
  MessageCircle,
  User,
  Lock,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import pratoRefeicao from "@/assets/prato-refeicao-realista.png";

type TemplateId = "treino-dieta-pro" | "consultoria-online" | "consultoria-phone" | "yellow-cyber" | "dark-purple" | "ironberg" | "gradient-fit" | "feed-brutalist";

const TEMPLATES: { id: TemplateId; label: string; desc: string; accent: string; format: "9:16" | "1:1" }[] = [
  { id: "treino-dieta-pro", label: "Treino & Dieta Pro", desc: "Pôster fitness com IA (cyan)", accent: "#22D3EE", format: "9:16" },
  { id: "consultoria-online", label: "Consultoria On-Line", desc: "Pôster premium dourado", accent: "#D4A24A", format: "9:16" },
  { id: "consultoria-phone", label: "Método Exclusivo", desc: "Cyan elétrico premium", accent: "#22D3EE", format: "9:16" },
  { id: "yellow-cyber", label: "Transformação Total", desc: "Amarelo neon high-energy", accent: "#E0FF00", format: "9:16" },
  { id: "dark-purple", label: "Elite Performance", desc: "Roxo neon premium", accent: "#BF00FF", format: "9:16" },
  { id: "ironberg", label: "Força & Foco", desc: "Verde lima brutal", accent: "#CCFF00", format: "9:16" },
  { id: "gradient-fit", label: "Alta Performance", desc: "Laranja vibrante", accent: "#FB923C", format: "9:16" },
  { id: "feed-brutalist", label: "Resultado Real", desc: "Vermelho impacto", accent: "#EF4444", format: "9:16" },
];

// Conteúdo padrão de cada template — mostrado no formulário ao selecionar
// para que o coach veja e edite exatamente o texto que aparece no pôster.
const TEMPLATE_DEFAULTS: Record<TemplateId, { headline: string; cta_text: string; discount: string; subheadline: string }> = {
  "treino-dieta-pro":   { headline: "PERSONALIZADOS",          cta_text: "SUA TRANSFORMAÇÃO!",        discount: "100%",        subheadline: "RESULTADOS REAIS, ONDE VOCÊ ESTIVER!" },
  "consultoria-online": { headline: "ON-LINE",                 cta_text: "ALCANÇAR SEUS OBJETIVOS!",  discount: "100%",        subheadline: "RESULTADOS REAIS, ONDE VOCÊ ESTIVER." },
  "consultoria-phone":  { headline: "EXCLUSIVO",               cta_text: "SUA EVOLUÇÃO HOJE!",        discount: "MÉTODO",      subheadline: "PROTOCOLO ÚNICO, FEITO PARA VOCÊ." },
  "yellow-cyber":       { headline: "TOTAL",                   cta_text: "DE SE TRANSFORMAR!",        discount: "12 SEMANAS",  subheadline: "VOCÊ NO COMANDO, DO INÍCIO AO FIM." },
  "dark-purple":        { headline: "PERFORMANCE",             cta_text: "DOS QUE FAZEM ACONTECER!",  discount: "TOP 1%",      subheadline: "ALTO NÍVEL, SEM ATALHOS." },
  "ironberg":           { headline: "& FOCO",                  cta_text: "SEM DESCULPAS!",            discount: "100% FOCO",   subheadline: "DISCIPLINA DE FERRO, RESULTADO DE OURO." },
  "gradient-fit":       { headline: "PERFORMANCE",             cta_text: "SUA TRANSFORMAÇÃO!",        discount: "2X RÁPIDO",   subheadline: "MAIS RÁPIDO, MAIS LONGE." },
  "feed-brutalist":     { headline: "REAL",                    cta_text: "BORA PRO RESULTADO!",       discount: "+500 ALUNOS", subheadline: "PROMESSA HONESTA, ENTREGA COMPROVADA." },
};

// Mock workout templates fallback
const MOCK_WORKOUTS = [
  { id: "mock-1", titulo: "Hipertrofia de Glúteos" },
  { id: "mock-2", titulo: "Peito & Tríceps Avançado" },
  { id: "mock-3", titulo: "Costas & Bíceps Volume" },
  { id: "mock-4", titulo: "Treino Full Body 30min" },
  { id: "mock-5", titulo: "Definição Abdominal" },
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
  const [removingBg, setRemovingBg] = useState(false);
  const [template, setTemplate] = useState<TemplateId>("treino-dieta-pro");
  const [profileData, setProfileData] = useState<any>(null);
  const [workouts, setWorkouts] = useState<{ id: string; titulo: string }[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    instagram_handle: "@seuperfil",
    headline: TEMPLATE_DEFAULTS["treino-dieta-pro"].headline,
    subheadline: TEMPLATE_DEFAULTS["treino-dieta-pro"].subheadline,
    cta_text: TEMPLATE_DEFAULTS["treino-dieta-pro"].cta_text,
    website_url: "seusite.com.br",
    phone: "+55 11 99999-0000",
    discount: TEMPLATE_DEFAULTS["treino-dieta-pro"].discount,
    photo_url: "",
    branding_color: "#22D3EE",
  });

  // Ao trocar de template, repopula os textos do formulário com o conteúdo daquele template
  const handleTemplateChange = (id: TemplateId) => {
    setTemplate(id);
    const d = TEMPLATE_DEFAULTS[id];
    const accent = TEMPLATES.find(t => t.id === id)?.accent || config.branding_color;
    setConfig(prev => ({
      ...prev,
      headline: d.headline,
      cta_text: d.cta_text,
      discount: d.discount,
      subheadline: d.subheadline,
      branding_color: accent,
    }));
  };


  const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);
  const dynamicSubtitle = selectedWorkout?.titulo || config.subheadline;

  useEffect(() => { loadConfig(); loadWorkouts(); }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: p } = await supabase.from("perfis").select("*").eq("id", user.id).single();
      setProfileData(p);
      const { data: c } = await supabase.from("coach_marketing_config").select("*").eq("user_id", user.id).maybeSingle();
      if (c) {
        if (["yellow-cyber", "dark-purple", "ironberg", "gradient-fit"].includes(c.template || "")) {
          setTemplate(c.template as TemplateId);
        }
        setConfig(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(c).filter(([k, v]) => v != null && k in prev)),
        }));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadWorkouts = async () => {
    try {
      // busca templates do tenant + globais
      const { data } = await supabase.from("templates_treino").select("id, titulo").limit(50);
      if (data && data.length > 0) {
        setWorkouts(data);
      } else {
        setWorkouts(MOCK_WORKOUTS);
      }
    } catch {
      setWorkouts(MOCK_WORKOUTS);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { phone, discount, ...persistable } = config as any;
      const payload: any = {
        user_id: user.id,
        template,
        ...persistable,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("coach_marketing_config").upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setRemovingBg(true);
    try {
      toast.info("Removendo o fundo da foto com IA...", { duration: 4000 });
      // dynamic import — pesado
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        output: { format: "image/png", quality: 0.9 },
      });
      // upload to supabase storage
      const path = `${user.id}/coach-cutout-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/png",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setConfig(prev => ({ ...prev, photo_url: pub.publicUrl }));
      toast.success("Fundo removido! Foto pronta para os templates.");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao processar a foto. Tente outra imagem.");
    } finally {
      setRemovingBg(false);
    }
  };

  const update = (k: string, v: string) => setConfig(prev => ({ ...prev, [k]: v }));
  const coachName = (profileData?.nome_completo || "SEU NOME").toUpperCase();
  const cutoutUrl = config.photo_url || profileData?.avatar_url || "";

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const tplProps = {
    config,
    coachName,
    cutoutUrl,
    workoutTitle: selectedWorkout?.titulo,
    dynamicSubtitle,
  };

  const renderTemplate = () => {
    switch (template) {
      case "treino-dieta-pro": return <TreinoDietaProTemplate {...tplProps} />;
      case "consultoria-online": return <ConsultoriaOnlineTemplate {...tplProps} />;
      case "consultoria-phone": return <ConsultoriaPhoneTemplate {...tplProps} />;
      case "yellow-cyber": return <YellowCyberTemplate {...tplProps} />;
      case "dark-purple": return <DarkPurpleTemplate {...tplProps} />;
      case "ironberg": return <IronbergTemplate {...tplProps} />;
      case "gradient-fit": return <GradientFitTemplate {...tplProps} />;
      case "feed-brutalist": return <FeedBrutalistTemplate {...tplProps} />;
    }
  };

  if (isFullScreen) {
    const activeTemplate = TEMPLATES.find(t => t.id === template);
    const aspectClass = activeTemplate?.format === "1:1" ? "aspect-square" : "aspect-[9/16]";
    const heightClass = activeTemplate?.format === "1:1" ? "h-auto w-[95vw] max-w-[600px]" : "h-[100vh]";

    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center print-clean">
        <style>{`
          body { overflow: hidden !important; }
          .print-clean::-webkit-scrollbar { display: none; }
        `}</style>
        <div className={cn("relative bg-black overflow-hidden shadow-2xl", aspectClass, heightClass)}>
          {renderTemplate()}
        </div>
        <Button
          onClick={onExitFullScreen}
          size="sm"
          className="fixed bottom-4 right-4 bg-black/70 hover:bg-black border border-white/20 text-white rounded-full gap-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <Minimize className="h-4 w-4" /> Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template selector — carousel */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-black uppercase tracking-wider">Templates Premium</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTemplate(t.id); update("branding_color", t.accent); }}
              className={cn(
                "group relative rounded-xl border-2 p-3 text-left transition-all overflow-hidden",
                template === t.id
                  ? "border-primary scale-[1.02] shadow-lg shadow-primary/20"
                  : "border-border/40 hover:border-primary/40"
              )}
            >
              <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at top right, ${t.accent}, transparent 60%)` }} />
              <div className="relative">
                <div className="w-6 h-6 rounded-full mb-2" style={{ background: t.accent, boxShadow: `0 0 12px ${t.accent}` }} />
                <div className="text-xs font-black uppercase tracking-wider">{t.label}</div>
                <div className="text-[10px] opacity-70">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className={cn(
        "relative mx-auto bg-black shadow-2xl overflow-hidden rounded-[2rem] ring-1 ring-white/10 transition-all duration-500",
        TEMPLATES.find(t => t.id === template)?.format === "1:1" ? "aspect-square w-full" : "h-[600px] aspect-[9/16]"
      )}>
        {renderTemplate()}
      </div>

      {/* Config + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
          <h5 className="font-bold flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" /> Foto do Personal (IA)
          </h5>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={removingBg}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-bold uppercase tracking-widest gap-2"
          >
            {removingBg ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando IA…</> : <><Upload className="h-4 w-4" /> Carregar Foto (IA)</>}
          </Button>
          {cutoutUrl && (
            <div className="flex items-center gap-3 p-2 bg-black/30 rounded-lg">
              <img src={cutoutUrl} alt="cutout" className="w-12 h-12 rounded-lg object-cover bg-checkerboard" />
              <div className="text-[10px] text-muted-foreground">Fundo removido com sucesso. Aplicado automaticamente nos templates.</div>
            </div>
          )}

          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider font-bold opacity-70">Treino destacado</Label>
              <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
                <SelectTrigger className="h-9 text-xs bg-black/20">
                  <SelectValue placeholder="Selecione um treino..." />
                </SelectTrigger>
                <SelectContent>
                  {workouts.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold opacity-70">Instagram</Label>
                <Input value={config.instagram_handle} onChange={e => update("instagram_handle", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold opacity-70">Telefone</Label>
                <Input value={config.phone} onChange={e => update("phone", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold opacity-70">Headline</Label>
                <Input value={config.headline} onChange={e => update("headline", e.target.value)} className="h-8 text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold opacity-70">Desconto</Label>
                <Input value={config.discount} onChange={e => update("discount", e.target.value)} className="h-8 text-xs font-bold" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold opacity-70">CTA</Label>
              <Input value={config.cta_text} onChange={e => update("cta_text", e.target.value)} className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold opacity-70">Site</Label>
              <Input value={config.website_url} onChange={e => update("website_url", e.target.value)} className="h-8 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold opacity-70">Cor de destaque</Label>
              <Input type="color" value={config.branding_color} onChange={e => update("branding_color", e.target.value)} className="h-9 p-1 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3 h-fit">
          <h5 className="font-bold flex items-center gap-2 text-sm"><Camera className="h-4 w-4 text-primary" /> Publicar</h5>
          <p className="text-xs text-muted-foreground">Salve as configurações e ative o modo Print para capturar a tela em 9:16.</p>
          <Button onClick={handleSave} className="w-full" disabled={saving} variant="secondary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />} Salvar
          </Button>
          <Button onClick={onEnterFullScreen} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest gap-2">
            <Maximize className="h-5 w-5" /> Modo Print {TEMPLATES.find(t => t.id === template)?.format || "9:16"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SHARED POSTER SCAFFOLD — used by Consultoria Online + variants.
   Each variant passes its own title, accent, copy, and CTAs.
   ============================================================ */
type PosterVariant = {
  accent: string;
  preHeadline?: string;
  headlineBig: string;
  headlineBigItalic?: boolean;
  headlineSub?: string;
  subline1: string;
  subline2: string;
  badge: { top: string; mid: string; bot: string };
  features: { i: any; t: string; s: string; d: string }[];
  ctaTop: string;
  ctaBig: string;
  bottomIcons: { i: any; t1: string; t2: string }[];
  footerLeft: string;
  footerRight: string;
};

const PosterScaffold = ({ config, coachName, cutoutUrl, v }: any) => {
  const accent: string = config?.branding_color || v.accent;
  // Permite que o coach sobrescreva o conteúdo do template via formulário
  const headlineBig = (config?.headline?.trim()) || v.headlineBig;
  const ctaBig = (config?.cta_text?.trim()) || v.ctaBig;
  const badgeTop = (config?.discount?.trim()) || v.badge.top;
  const bigStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${accent} 45%, #1a1a1a 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextStroke: "1px rgba(0,0,0,0.4)",
    filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.55))",
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-black">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 25%, #1a1a1a 0%, #050505 70%)" }} />
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E)" }} />

      {cutoutUrl && (
        <div className="absolute right-[-6%] top-[1%] h-[62%] w-[64%] z-[2]">
          <img src={cutoutUrl} alt="" className="h-full w-full object-contain object-right grayscale contrast-125"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.8))",
              maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
            }} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/30 to-transparent z-[3]" />

      {/* Headline */}
      <div className="relative z-10 pt-6 px-5 max-w-[62%]">
        {v.preHeadline && <div className="font-['Anton'] text-[22px] leading-[0.95] uppercase tracking-wide">{v.preHeadline}</div>}
        <div
          className={`font-['Anton'] leading-[0.85] uppercase tracking-tight ${v.headlineBigItalic ? "italic" : ""} mt-1 break-words`}
          style={{ ...bigStyle, fontSize: "clamp(34px, 11vw, 56px)" }}
        >
          {headlineBig}
        </div>
        {v.headlineSub && <div className="font-['Anton'] text-[15px] leading-[1] uppercase tracking-wide mt-1.5">{v.headlineSub}</div>}

        <div className="mt-4">
          <div className="font-['Anton'] text-[16px] leading-tight uppercase opacity-95">{v.subline1}</div>
          <div className="font-['Anton'] text-[16px] leading-tight uppercase" style={{ color: accent }}>{v.subline2}</div>
        </div>
      </div>

      {/* Badge */}
      <div className="absolute right-3 top-[44%] z-10">
        <div className="w-[78px] h-[78px] rounded-full border-2 flex flex-col items-center justify-center text-center bg-black/60 backdrop-blur-sm"
          style={{ borderColor: accent, boxShadow: `0 0 24px ${accent}55` }}>
          <div className="font-['Anton'] text-[18px] leading-none" style={{ color: accent }}>{badgeTop}</div>
          <div className="font-['Anton'] text-[10px] leading-tight" style={{ color: accent }}>{v.badge.mid}</div>
          <div className="text-[6px] opacity-80 tracking-widest mt-0.5">{v.badge.bot}</div>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 mt-5 px-5 space-y-3 max-w-[58%]">
        {v.features.map((f: any, i: number) => (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 bg-black/40" style={{ borderColor: accent }}>
              <f.i className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[10px] uppercase tracking-wide" style={{ color: accent }}>{f.t}</div>
              <div className="font-black text-[11px] uppercase tracking-wide">{f.s}</div>
              <div className="text-[7.5px] opacity-75 mt-0.5 whitespace-pre-line leading-snug">{f.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Phone + meal mockup */}
      <div className="absolute right-2 bottom-[150px] z-[6] flex items-end" style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.7))" }}>
        <div className="relative w-[95px] h-[95px] -mr-7 mb-2 z-[7]" style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.8))" }}>
          <img src={pratoRefeicao} alt="" crossOrigin="anonymous" className="w-full h-full object-contain" draggable={false} />
        </div>
        <div className="relative w-[105px] h-[175px] bg-[#0d1117] rounded-[18px] border border-[#2a2a2a] overflow-hidden"
          style={{ boxShadow: "inset 0 0 0 2px #1a1a1a, 0 8px 24px rgba(0,0,0,0.8)" }}>
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black rounded-b-lg z-10" />
          <div className="absolute inset-0 pt-4 px-2 pb-2 flex flex-col gap-1">
            <div className="font-['Anton'] text-[9px] uppercase tracking-wide pt-1 px-0.5" style={{ color: accent }}>SEU PLANO</div>
            <div className="font-['Anton'] text-[7px] uppercase tracking-wide opacity-90 px-0.5 -mt-0.5">PERSONALIZADO</div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <div className="bg-white/[0.05] rounded p-1">
                <div className="text-[5px] opacity-70 tracking-wider">TREINO</div>
                <Dumbbell className="h-3 w-3 mt-0.5" style={{ color: accent }} />
              </div>
              <div className="bg-white/[0.05] rounded p-1">
                <div className="text-[5px] opacity-70 tracking-wider">DIETA</div>
                <Utensils className="h-3 w-3 mt-0.5" style={{ color: accent }} />
              </div>
            </div>
            <div className="bg-white/[0.05] rounded p-1 mt-auto">
              <div className="text-[5px] opacity-70 tracking-wider">EVOLUÇÃO</div>
              <TrendingUp className="h-3 w-3 mt-0.5" style={{ color: accent }} />
            </div>
            <div className="text-[5px] opacity-70 tracking-wider mt-1">RESULTADOS</div>
            <div className="h-0.5 bg-white/20 rounded-full" />
            <div className="h-0.5 bg-white/20 rounded-full w-3/4" />
          </div>
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="absolute left-3 right-3 bottom-[78px] z-10 rounded-xl border px-3 py-2.5"
        style={{ borderColor: `${accent}80`, background: "rgba(0,0,0,0.55)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
            <MessageCircle className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[10px] uppercase tracking-wide" style={{ color: accent }}>{v.ctaTop}</div>
            <div className="font-black text-[12px] uppercase tracking-wide">{ctaBig}</div>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[9px] font-bold opacity-90">
            <Phone className="h-2.5 w-2.5" style={{ color: accent }} />{config.phone}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-bold" style={{ color: accent }}>
            <AtSign className="h-2.5 w-2.5" />{config.instagram_handle}
          </div>
        </div>
      </div>

      {/* Bottom 4-icon strip */}
      <div className="absolute left-0 right-0 bottom-[34px] z-10 px-3">
        <div className="flex items-center justify-between gap-1 border-y border-white/15 py-2">
          {v.bottomIcons.map((b: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0" style={{ borderColor: accent }}>
                <b.i className="h-3 w-3" style={{ color: accent }} />
              </div>
              <div className="leading-tight">
                <div className="text-[6px] font-bold uppercase opacity-90">{b.t1}</div>
                <div className="text-[7px] font-black uppercase">{b.t2}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer tagline */}
      <div className="absolute left-0 right-0 bottom-2 z-10 text-center">
        <div className="text-[8px] tracking-[0.35em] uppercase opacity-80">
          <span className="font-bold">{v.footerLeft},</span>{" "}
          <span style={{ color: accent }} className="font-bold">{v.footerRight}.</span>
          {config.website_url && <span className="opacity-70"> · {config.website_url}</span>}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE — TREINO & DIETA PRO (original, com "TREINO / E DIETA")
   ============================================================ */
const TreinoDietaProTemplate = ({ config, coachName, cutoutUrl }: any) => {
  const accent = config.branding_color || "#22D3EE";
  const accentDark = "#0E7490";
  const features = [
    { i: Dumbbell, t: "TREINOS", s: "PERSONALIZADOS", d: "de acordo com\nseu objetivo" },
    { i: Utensils, t: "DIETAS", s: "ADAPTADAS", d: "ao seu estilo de vida\ne rotina" },
    { i: TrendingUp, t: "ACOMPANHAMENTO", s: "CONSTANTE", d: "suporte e ajustes\nsempre que precisar" },
    { i: MessageCircle, t: "SUPORTE VIA APP", s: "E WHATSAPP", d: "fácil, prático e\nsempre à mão" },
  ];
  const grungeMask =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.5 1.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23r)'/%3E%3C/svg%3E\")";
  const titleWhite: React.CSSProperties = {
    backgroundImage: "linear-gradient(180deg, #ffffff 0%, #e8f6fa 55%, #b9d9e0 100%)",
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    WebkitTextStroke: "1px rgba(0,0,0,0.35)",
    filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.55))",
    WebkitMaskImage: grungeMask, maskImage: grungeMask,
    WebkitMaskSize: "180px 180px", maskSize: "180px 180px",
  };
  const titleAccent: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, #a5f3fc 0%, ${accent} 55%, ${accentDark} 100%)`,
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    WebkitTextStroke: "1px rgba(0,0,0,0.35)",
    filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.55))",
    WebkitMaskImage: grungeMask, maskImage: grungeMask,
    WebkitMaskSize: "180px 180px", maskSize: "180px 180px",
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[#0a0f14]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 30%, #1e2d3a 0%, #0a0f14 70%)" }} />
      <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E)" }} />

      {cutoutUrl && (
        <div className="absolute right-[-8%] top-[2%] h-[68%] w-[68%] z-[2]">
          <img src={cutoutUrl} alt="" className="h-full w-full object-contain object-right contrast-110 saturate-75"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.7))",
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            }} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f14]/95 via-[#0a0f14]/20 to-transparent z-[3]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14] via-transparent to-transparent z-[3]" />

      <div className="relative z-10 pt-5 px-5">
        <div className="text-[9px] font-bold tracking-[0.3em] opacity-85">TRANSFORME SEU CORPO.</div>
        <div className="text-[9px] font-bold tracking-[0.3em] opacity-85">TRANSFORME SUA VIDA.</div>
      </div>

      <div className="relative z-10 px-5 mt-2 max-w-[60%]">
        <div className="font-['Anton'] text-[46px] leading-[0.85] uppercase tracking-tight" style={titleWhite}>TREINO</div>
        <div className="font-['Anton'] text-[46px] leading-[0.85] uppercase tracking-tight mt-1" style={titleAccent}>E DIETA</div>
        <div className="inline-block mt-2 px-2.5 py-0.5 font-['Anton'] text-[16px] uppercase tracking-wider text-black shadow-lg" style={{ background: accent }}>
          {(config.headline?.trim()) || "PERSONALIZADOS"}
        </div>
        <div className="mt-2 inline-flex items-center gap-2 border-2 rounded-full px-2.5 py-0.5 bg-black/40" style={{ borderColor: "#ffffff30" }}>
          <Wifi className="h-3 w-3" style={{ color: accent }} />
          <span className="font-['Anton'] text-[13px] uppercase italic tracking-wide" style={{ color: accent }}>ONLINE</span>
        </div>
      </div>

      <div className="absolute right-3 top-[40%] z-10 flex items-center gap-1.5 bg-black/70 border border-white/20 rounded-full px-2 py-1 backdrop-blur-sm">
        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: accent }}>
          <Check className="h-2.5 w-2.5" style={{ color: accent }} />
        </div>
        <div className="leading-none">
          <div className="font-['Anton'] text-[14px]" style={{ color: accent }}>{(config.discount?.trim()) || "100%"}</div>
          <div className="text-[6px] tracking-widest opacity-80">ACOMPANHAMENTO<br />INDIVIDUAL</div>
        </div>
      </div>

      <div className="relative z-10 px-5 mt-4">
        <div className="font-['Anton'] text-[18px] leading-tight uppercase">RESULTADOS REAIS,</div>
        <div className="font-['Anton'] text-[18px] leading-tight uppercase">ONDE VOCÊ ESTIVER!</div>
      </div>

      <div className="relative z-10 mt-3 px-5 space-y-2.5 max-w-[58%]">
        {features.map((f, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-black/40" style={{ borderColor: accent }}>
              <f.i className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[10px] uppercase tracking-wide">{f.t}</div>
              <div className="font-black text-[11px] uppercase tracking-wide">{f.s}</div>
              <div className="text-[8px] opacity-75 mt-0.5 whitespace-pre-line">{f.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute right-2 bottom-[110px] z-[6] flex items-end" style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.7))" }}>
        <div className="relative w-[110px] h-[110px] -mr-8 mb-2 z-[7]" style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.8))" }}>
          <img src={pratoRefeicao} alt="" crossOrigin="anonymous" className="w-full h-full object-contain" draggable={false} />
        </div>
        <div className="relative w-[120px] h-[200px] bg-[#0d1117] rounded-[20px] border border-[#2a2a2a] overflow-hidden"
          style={{ boxShadow: "inset 0 0 0 2px #1a1a1a, 0 8px 24px rgba(0,0,0,0.8)" }}>
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-2 bg-black rounded-b-lg z-10" />
          <div className="absolute inset-0 pt-5 px-2 pb-2 flex flex-col gap-1.5 text-[6px]">
            <div className="font-['Anton'] text-[11px] uppercase tracking-wide pt-1 px-1" style={{ color: accent }}>PLANO DO DIA</div>
            <div className="bg-white/[0.04] rounded-md p-1.5 space-y-1">
              <div className="flex items-center gap-1 pb-0.5 border-b border-white/10">
                <Dumbbell className="h-2 w-2" style={{ color: accent }} />
                <span className="font-bold text-[6px] uppercase tracking-wider opacity-90">TREINO</span>
              </div>
              <div className="text-[6px] font-bold opacity-95">Peito e Tríceps</div>
              <div className="flex justify-between text-[5.5px] opacity-80"><span>Supino Reto</span><span className="opacity-70">4x 10-12</span></div>
              <div className="flex justify-between text-[5.5px] opacity-80"><span>Crucifixo</span><span className="opacity-70">3x 12-15</span></div>
            </div>
            <div className="bg-white/[0.04] rounded-md p-1.5 space-y-1">
              <div className="flex items-center gap-1 pb-0.5 border-b border-white/10">
                <Utensils className="h-2 w-2" style={{ color: accent }} />
                <span className="font-bold text-[6px] uppercase tracking-wider opacity-90">DIETA</span>
              </div>
              <div className="flex justify-around gap-1 pt-0.5">
                {[{ l: "PROT", v: "150g" }, { l: "CARB", v: "200g" }, { l: "GORD", v: "60g" }].map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="text-[4.5px] opacity-60 tracking-wider">{m.l}</div>
                    <div className="rounded-full border border-white/15 mt-0.5 py-0.5 text-[6px] font-black">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md py-1 text-center text-[6px] font-black uppercase text-black mt-auto" style={{ background: accent }}>
              VER PLANO COMPLETO
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-3 pt-4 bg-gradient-to-t from-[#0a0f14] via-[#0a0f14]/95 to-transparent">
        <div className="flex items-start gap-3">
          <div className="flex items-start gap-2 bg-black/70 border border-white/15 rounded-md px-2.5 py-2 flex-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
              <MessageCircle className="h-3.5 w-3.5 text-white" fill="white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[9px] uppercase">COMECE HOJE</div>
              <div className="font-black text-[10px] uppercase">{(config.cta_text?.trim()) || "SUA TRANSFORMAÇÃO!"}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10 gap-2">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider opacity-90">
            <Phone className="h-3 w-3" style={{ color: accent }} /> {config.phone}
          </div>
          <div className="text-right leading-tight">
            <div className="text-[8px] opacity-60 tracking-widest">{coachName}</div>
            <div className="flex items-center gap-1 justify-end text-[9px] font-bold">
              <AtSign className="h-2.5 w-2.5" style={{ color: accent }} />{config.instagram_handle}
            </div>
          </div>
        </div>
        {config.website_url && (
          <div className="mt-1 text-center text-[8px] tracking-[0.3em] uppercase opacity-70">
            {config.website_url}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   POSTER VARIANTS — same scaffold, different title + accent + copy
   ============================================================ */
const ConsultoriaOnlineTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#D4A24A",
    preHeadline: "CONSULTORIA",
    headlineBig: "ON-LINE",
    headlineBigItalic: true,
    headlineSub: "DE TREINO E DIETA",
    subline1: "RESULTADOS REAIS,",
    subline2: "ONDE VOCÊ ESTIVER.",
    badge: { top: "100%", mid: "ON-LINE", bot: "PRA VOCÊ" },
    features: [
      { i: Dumbbell, t: "TREINOS", s: "PERSONALIZADOS", d: "Planejamentos adaptados\nao seu objetivo,\nnível e rotina." },
      { i: Utensils, t: "DIETAS", s: "INDIVIDUALIZADAS", d: "Planos práticos e flexíveis,\nde acordo com\nsuas necessidades." },
      { i: Phone, t: "ACOMPANHAMENTO", s: "PRÓXIMO", d: "Suporte contínuo para\najustes, dúvidas\ne motivação." },
      { i: TrendingUp, t: "RESULTADOS", s: "COMPROVADOS", d: "Mais performance, saúde\ne a melhor versão\nde você." },
    ],
    ctaTop: "VAMOS JUNTOS",
    ctaBig: "ALCANÇAR SEUS OBJETIVOS!",
    bottomIcons: [
      { i: Check, t1: "TREINE NO SEU", t2: "TEMPO" },
      { i: Target, t1: "DE ONDE", t2: "ESTIVER" },
      { i: Target, t1: "FOCO NO QUE", t2: "IMPORTA" },
      { i: Trophy, t1: "DISCIPLINA", t2: "RESULTADOS" },
    ],
    footerLeft: "DISCIPLINA HOJE",
    footerRight: "LIBERDADE AMANHÃ",
  }} />
);

const ConsultoriaPhoneTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#22D3EE",
    preHeadline: "MÉTODO",
    headlineBig: "EXCLUSIVO",
    headlineSub: "PARA SUA EVOLUÇÃO",
    subline1: "PROTOCOLO ÚNICO,",
    subline2: "FEITO PARA VOCÊ.",
    badge: { top: "MÉTODO", mid: "ÚNICO", bot: "EXCLUSIVO" },
    features: [
      { i: Target, t: "PROTOCOLO", s: "ESTRUTURADO", d: "Etapas claras\ndo início ao\nresultado final." },
      { i: Dumbbell, t: "TREINO", s: "INTELIGENTE", d: "Volume e intensidade\ncalibrados pra você." },
      { i: Apple, t: "NUTRIÇÃO", s: "ESTRATÉGICA", d: "Cardápio prático\nque cabe na sua\nrotina." },
      { i: Zap, t: "EVOLUÇÃO", s: "MENSURÁVEL", d: "Métricas reais\nde performance\ne composição." },
    ],
    ctaTop: "BORA COMEÇAR",
    ctaBig: "SUA EVOLUÇÃO HOJE!",
    bottomIcons: [
      { i: Target, t1: "MÉTODO", t2: "VALIDADO" },
      { i: TrendingUp, t1: "EVOLUÇÃO", t2: "REAL" },
      { i: Zap, t1: "ALTA", t2: "PERFORMANCE" },
      { i: Trophy, t1: "RESULTADO", t2: "GARANTIDO" },
    ],
    footerLeft: "MÉTODO COMPROVADO",
    footerRight: "RESULTADO INEVITÁVEL",
  }} />
);

const YellowCyberTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#E0FF00",
    preHeadline: "TRANSFORMAÇÃO",
    headlineBig: "TOTAL",
    headlineSub: "CORPO E MENTE",
    subline1: "VOCÊ NO COMANDO,",
    subline2: "DO INÍCIO AO FIM.",
    badge: { top: "12", mid: "SEMANAS", bot: "DE FOCO" },
    features: [
      { i: Flame, t: "QUEIMA", s: "DE GORDURA", d: "Estratégia agressiva\npra emagrecer\ncom saúde." },
      { i: Dumbbell, t: "GANHO", s: "DE MASSA", d: "Hipertrofia real\ncom volume\nprogressivo." },
      { i: Heart, t: "SAÚDE", s: "EM 1º LUGAR", d: "Mais energia,\nsono e\ndisposição." },
      { i: Sparkles, t: "MENTALIDADE", s: "DE ATLETA", d: "Foco, disciplina\ne consistência\ndiária." },
    ],
    ctaTop: "CHEGOU SUA VEZ",
    ctaBig: "DE SE TRANSFORMAR!",
    bottomIcons: [
      { i: Flame, t1: "QUEIMA", t2: "GORDURA" },
      { i: Dumbbell, t1: "GANHA", t2: "MÚSCULO" },
      { i: Heart, t1: "MAIS", t2: "ENERGIA" },
      { i: Trophy, t1: "NOVA", t2: "VERSÃO" },
    ],
    footerLeft: "TRANSFORME O CORPO",
    footerRight: "MUDE A VIDA",
  }} />
);

const DarkPurpleTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#BF00FF",
    preHeadline: "ELITE",
    headlineBig: "PERFORMANCE",
    headlineSub: "PARA QUEM QUER MAIS",
    subline1: "ALTO NÍVEL,",
    subline2: "SEM ATALHOS.",
    badge: { top: "TOP", mid: "1%", bot: "ELITE" },
    features: [
      { i: Trophy, t: "MENTALIDADE", s: "DE CAMPEÃO", d: "Pensamento de\nalta performance\ntodo dia." },
      { i: Dumbbell, t: "TREINO", s: "DE ELITE", d: "Periodização\nde atleta\nprofissional." },
      { i: Apple, t: "NUTRIÇÃO", s: "AVANÇADA", d: "Estratégia\nalimentar\nde competidor." },
      { i: TrendingUp, t: "EVOLUÇÃO", s: "CONSTANTE", d: "Métricas e\najustes\nsemanais." },
    ],
    ctaTop: "ENTRE PRA ELITE",
    ctaBig: "DOS QUE FAZEM ACONTECER!",
    bottomIcons: [
      { i: Trophy, t1: "TOP", t2: "PERFORMANCE" },
      { i: Target, t1: "FOCO", t2: "TOTAL" },
      { i: Zap, t1: "INTENSIDADE", t2: "MÁXIMA" },
      { i: Sparkles, t1: "MENTALIDADE", t2: "DE ELITE" },
    ],
    footerLeft: "ELITE NÃO É SORTE",
    footerRight: "É CONSTÂNCIA",
  }} />
);

const IronbergTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#CCFF00",
    preHeadline: "FORÇA",
    headlineBig: "& FOCO",
    headlineSub: "SEM DESCULPAS",
    subline1: "DISCIPLINA DE FERRO,",
    subline2: "RESULTADO DE OURO.",
    badge: { top: "100%", mid: "FOCO", bot: "TOTAL" },
    features: [
      { i: Dumbbell, t: "FORÇA", s: "PROGRESSIVA", d: "Carga aumentando\nsemana após\nsemana." },
      { i: Flame, t: "INTENSIDADE", s: "CONTROLADA", d: "Cada treino\nno limite\ncerto." },
      { i: Target, t: "FOCO", s: "INABALÁVEL", d: "Sem distração,\nsó o\nobjetivo." },
      { i: Trophy, t: "RESULTADO", s: "INEVITÁVEL", d: "Consistência\nvira\nconquista." },
    ],
    ctaTop: "BORA TREINAR",
    ctaBig: "SEM DESCULPAS!",
    bottomIcons: [
      { i: Dumbbell, t1: "FORÇA", t2: "REAL" },
      { i: Flame, t1: "INTENSIDADE", t2: "MÁXIMA" },
      { i: Target, t1: "FOCO", t2: "TOTAL" },
      { i: Trophy, t1: "RESULTADO", t2: "GARANTIDO" },
    ],
    footerLeft: "DOR HOJE",
    footerRight: "ORGULHO AMANHÃ",
  }} />
);

const GradientFitTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#FB923C",
    preHeadline: "ALTA",
    headlineBig: "PERFORMANCE",
    headlineSub: "PRA VOCÊ EVOLUIR",
    subline1: "MAIS RÁPIDO,",
    subline2: "MAIS LONGE.",
    badge: { top: "2X", mid: "MAIS", bot: "RÁPIDO" },
    features: [
      { i: Zap, t: "ENERGIA", s: "EM ALTA", d: "Mais disposição\nno dia\na dia." },
      { i: TrendingUp, t: "PROGRESSO", s: "ACELERADO", d: "Resultado\nvisível\nem semanas." },
      { i: Dumbbell, t: "TREINO", s: "OTIMIZADO", d: "Cada série\ncom\npropósito." },
      { i: Apple, t: "DIETA", s: "EFICIENTE", d: "Comida\nque rende\ne sacia." },
    ],
    ctaTop: "ACELERE AGORA",
    ctaBig: "SUA TRANSFORMAÇÃO!",
    bottomIcons: [
      { i: Zap, t1: "ENERGIA", t2: "MÁXIMA" },
      { i: TrendingUp, t1: "EVOLUÇÃO", t2: "RÁPIDA" },
      { i: Target, t1: "FOCO", t2: "CIRÚRGICO" },
      { i: Trophy, t1: "RESULTADO", t2: "REAL" },
    ],
    footerLeft: "VELOCIDADE COM TÉCNICA",
    footerRight: "EVOLUÇÃO REAL",
  }} />
);

const FeedBrutalistTemplate = (p: any) => (
  <PosterScaffold {...p} v={{
    accent: "#EF4444",
    preHeadline: "RESULTADO",
    headlineBig: "REAL",
    headlineSub: "SEM ENROLAÇÃO",
    subline1: "PROMESSA HONESTA,",
    subline2: "ENTREGA COMPROVADA.",
    badge: { top: "+500", mid: "ALUNOS", bot: "REAIS" },
    features: [
      { i: Check, t: "RESULTADO", s: "COMPROVADO", d: "Centenas de\ncases reais\ndocumentados." },
      { i: Heart, t: "SAÚDE", s: "EM 1º LUGAR", d: "Sem fórmula\nmágica, só\nciência." },
      { i: Dumbbell, t: "TREINO", s: "DE VERDADE", d: "Estímulo\ncerto pra\nseu corpo." },
      { i: Apple, t: "DIETA", s: "QUE FUNCIONA", d: "Sem dieta\nmaluca, só\nestratégia." },
    ],
    ctaTop: "CHEGA DE ENROLAÇÃO",
    ctaBig: "BORA PRO RESULTADO!",
    bottomIcons: [
      { i: Check, t1: "RESULTADO", t2: "REAL" },
      { i: Heart, t1: "SAÚDE", t2: "EM 1º" },
      { i: Target, t1: "ESTRATÉGIA", t2: "CLARA" },
      { i: Trophy, t1: "ENTREGA", t2: "GARANTIDA" },
    ],
    footerLeft: "SEM PROMESSA VAZIA",
    footerRight: "SÓ RESULTADO REAL",
  }} />
);


