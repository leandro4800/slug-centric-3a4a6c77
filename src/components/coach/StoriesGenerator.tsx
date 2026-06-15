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

type TemplateId = "treino-dieta-pro" | "consultoria-phone" | "yellow-cyber" | "dark-purple" | "ironberg" | "gradient-fit" | "feed-brutalist";

const TEMPLATES: { id: TemplateId; label: string; desc: string; accent: string; format: "9:16" | "1:1" }[] = [
  { id: "treino-dieta-pro", label: "Consultoria Gold", desc: "Pôster premium dourado", accent: "#D4A24A", format: "9:16" },
  { id: "consultoria-phone", label: "Consultoria Cyan", desc: "Mesma arte em cyan", accent: "#22D3EE", format: "9:16" },
  { id: "yellow-cyber", label: "Consultoria Neon", desc: "Mesma arte em amarelo neon", accent: "#E0FF00", format: "9:16" },
  { id: "dark-purple", label: "Consultoria Purple", desc: "Mesma arte em roxo", accent: "#BF00FF", format: "9:16" },
  { id: "ironberg", label: "Consultoria Lime", desc: "Mesma arte em verde lima", accent: "#CCFF00", format: "9:16" },
  { id: "gradient-fit", label: "Consultoria Orange", desc: "Mesma arte em laranja", accent: "#FB923C", format: "9:16" },
  { id: "feed-brutalist", label: "Consultoria Red", desc: "Mesma arte em vermelho", accent: "#EF4444", format: "9:16" },
];

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
    headline: "TREINE COMIGO",
    subheadline: "TRANSFORME SEU CORPO",
    cta_text: "FALE COMIGO AGORA!",
    website_url: "seusite.com.br",
    phone: "+55 11 99999-0000",
    discount: "30% OFF",
    photo_url: "",
    branding_color: "#E0FF00",
  });

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
   SHARED — Consultoria On-Line poster (clones reference image)
   All 7 templates reuse this layout with different accent colors.
   ============================================================ */
const ConsultoriaPoster = ({ config, coachName, cutoutUrl, accent: accentOverride }: any) => {
  const accent = accentOverride || config.branding_color || "#D4A24A";

  const features = [
    { i: Dumbbell, t: "TREINOS", s: "PERSONALIZADOS", d: "Planejamentos de treino\nadaptados ao seu objetivo,\nnível e rotina." },
    { i: Utensils, t: "DIETAS", s: "INDIVIDUALIZADAS", d: "Planos alimentares práticos\ne flexíveis, de acordo com\nsuas necessidades." },
    { i: Phone, t: "ACOMPANHAMENTO", s: "PRÓXIMO", d: "Suporte contínuo para ajustes,\ndúvidas e motivação." },
    { i: TrendingUp, t: "RESULTADOS", s: "COMPROVADOS", d: "Mais performance, mais saúde\ne a melhor versão de você." },
  ];

  const bottomIcons = [
    { i: Check, t1: "TREINE NO SEU", t2: "TEMPO" },
    { i: Target, t1: "DE ONDE", t2: "ESTIVER" },
    { i: Target, t1: "FOCO NO QUE", t2: "IMPORTA" },
    { i: Trophy, t1: "DISCIPLINA", t2: "RESULTADOS" },
  ];

  // Premium metallic gradient for the big ON-LINE word
  const onlineStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, #fff2c2 0%, ${accent} 45%, #6b4a16 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextStroke: "1px rgba(0,0,0,0.4)",
    filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.55))",
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-black">
      {/* BG */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 25%, #1a1a1a 0%, #050505 70%)" }} />
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E)" }} />

      {/* Coach cutout — right */}
      {cutoutUrl && (
        <div className="absolute right-[-6%] top-[1%] h-[62%] w-[64%] z-[2]">
          <img
            src={cutoutUrl}
            alt=""
            className="h-full w-full object-contain object-right grayscale contrast-125"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.8))",
              maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
            }}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/30 to-transparent z-[3]" />

      {/* Headline block */}
      <div className="relative z-10 pt-6 px-5">
        <div className="font-['Anton'] text-[26px] leading-[0.95] uppercase tracking-wide">CONSULTORIA</div>
        <div className="font-['Anton'] text-[78px] leading-[0.82] uppercase tracking-tight italic mt-1" style={onlineStyle}>
          ON-LINE
        </div>
        <div className="font-['Anton'] text-[20px] leading-[1] uppercase tracking-wide mt-1">DE TREINO E DIETA</div>

        <div className="mt-4">
          <div className="font-['Anton'] text-[16px] leading-tight uppercase opacity-95">RESULTADOS REAIS,</div>
          <div className="font-['Anton'] text-[16px] leading-tight uppercase" style={{ color: accent }}>ONDE VOCÊ ESTIVER.</div>
        </div>
      </div>

      {/* 100% ON-LINE badge */}
      <div className="absolute right-3 top-[44%] z-10">
        <div className="w-[78px] h-[78px] rounded-full border-2 flex flex-col items-center justify-center text-center bg-black/60 backdrop-blur-sm"
          style={{ borderColor: accent, boxShadow: `0 0 24px ${accent}55` }}>
          <div className="font-['Anton'] text-[18px] leading-none" style={{ color: accent }}>100%</div>
          <div className="font-['Anton'] text-[10px] leading-tight" style={{ color: accent }}>ON-LINE</div>
          <div className="text-[6px] opacity-80 tracking-widest mt-0.5">PRA VOCÊ</div>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 mt-5 px-5 space-y-3 max-w-[58%]">
        {features.map((f, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 bg-black/40"
              style={{ borderColor: accent }}>
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

      {/* Phone + meal mockup — bottom right */}
      <div className="absolute right-2 bottom-[150px] z-[6] flex items-end" style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.7))" }}>
        <div className="relative w-[95px] h-[95px] -mr-7 mb-2 z-[7]"
          style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.8))" }}>
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

      {/* WhatsApp CTA box */}
      <div className="absolute left-3 right-3 bottom-[78px] z-10 rounded-xl border px-3 py-2.5"
        style={{ borderColor: `${accent}80`, background: "rgba(0,0,0,0.55)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
            <MessageCircle className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[10px] uppercase tracking-wide" style={{ color: accent }}>VAMOS JUNTOS</div>
            <div className="font-black text-[12px] uppercase tracking-wide">ALCANÇAR SEUS OBJETIVOS!</div>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
          <div className="text-[8px] opacity-70 uppercase tracking-widest">Fale comigo agora:</div>
          <div className="flex items-center gap-1 text-[9px] font-bold" style={{ color: accent }}>
            <AtSign className="h-2.5 w-2.5" />{config.instagram_handle}
          </div>
        </div>
      </div>

      {/* Bottom 4-icon strip */}
      <div className="absolute left-0 right-0 bottom-[34px] z-10 px-3">
        <div className="flex items-center justify-between gap-1 border-y border-white/15 py-2">
          {bottomIcons.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
                style={{ borderColor: accent }}>
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
          <span className="font-bold">DISCIPLINA HOJE,</span>{" "}
          <span style={{ color: accent }} className="font-bold">LIBERDADE AMANHÃ.</span>
        </div>
      </div>
    </div>
  );
};

/* Variants — same poster, different accent colors */
const TreinoDietaProTemplate  = (p: any) => <ConsultoriaPoster {...p} accent="#D4A24A" />;
const ConsultoriaPhoneTemplate = (p: any) => <ConsultoriaPoster {...p} accent="#22D3EE" />;
const YellowCyberTemplate     = (p: any) => <ConsultoriaPoster {...p} accent="#E0FF00" />;
const DarkPurpleTemplate      = (p: any) => <ConsultoriaPoster {...p} accent="#BF00FF" />;
const IronbergTemplate        = (p: any) => <ConsultoriaPoster {...p} accent="#CCFF00" />;
const GradientFitTemplate     = (p: any) => <ConsultoriaPoster {...p} accent="#FB923C" />;
const FeedBrutalistTemplate   = (p: any) => <ConsultoriaPoster {...p} accent="#EF4444" />;

