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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TemplateId = "consultoria-phone" | "yellow-cyber" | "dark-purple" | "ironberg" | "gradient-fit" | "feed-brutalist";

const TEMPLATES: { id: TemplateId; label: string; desc: string; accent: string; format: "9:16" | "1:1" }[] = [
  { id: "consultoria-phone", label: "Consultoria Online", desc: "Mockup de celular + amarelo", accent: "#FACC15", format: "9:16" },
  { id: "yellow-cyber", label: "Yellow Cyber", desc: "Curvas neon amarelas", accent: "#E0FF00", format: "9:16" },
  { id: "dark-purple", label: "Purple Neon", desc: "Círculos roxos vazados", accent: "#BF00FF", format: "9:16" },
  { id: "ironberg", label: "Ironberg Brutal", desc: "Tipografia gigante vazada", accent: "#CCFF00", format: "9:16" },
  { id: "gradient-fit", label: "Gradient Sport", desc: "Listras de aviso vibrantes", accent: "#FB923C", format: "9:16" },
  { id: "feed-brutalist", label: "Feed Brutalista", desc: "Quadrado de alta conversão", accent: "#FFFFFF", format: "1:1" },
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
  const [template, setTemplate] = useState<TemplateId>("yellow-cyber");
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
   TEMPLATE 1 — YELLOW CYBER (curvas neon amarelas)
   ============================================================ */
const YellowCyberTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const accent = config.branding_color || "#E0FF00";
  return (
    <div className="relative w-full h-full overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 50%, #1a1a1a 100%)" }}>
      {/* texture noise */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E)" }} />

      {/* Big yellow curve — top right */}
      <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full" style={{ background: accent }} />
      {/* Bottom right partial circle */}
      <div className="absolute -bottom-24 -right-20 w-56 h-56 rounded-full" style={{ background: accent }} />

      {/* Header logo + brand */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-black border-2 flex items-center justify-center" style={{ borderColor: accent }}>
            <Dumbbell className="h-4 w-4" style={{ color: accent }} />
          </div>
          <div className="text-[10px] font-black tracking-[0.25em] uppercase">{coachName}</div>
        </div>
      </div>

      {/* Cutout photo */}
      {cutoutUrl && (
        <div className="absolute right-2 top-16 h-[70%] w-[55%] z-[5]">
          <img 
            src={cutoutUrl} 
            alt="" 
            className="h-full w-full object-contain" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }} 
          />
        </div>
      )}

      {/* Texts left */}
      <div className="relative z-10 px-5 mt-6 max-w-[60%]">
        <div className="font-['Anton'] text-[44px] leading-[0.85] uppercase tracking-tight">
          {config.headline?.split(" ").slice(0, 2).join(" ") || "TREINE"}
        </div>
        <div className="font-['Anton'] text-[64px] leading-[0.85] uppercase italic mt-1" style={{ color: accent }}>
          {config.headline?.split(" ").slice(2).join(" ") || "COMIGO"}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest mt-3 opacity-90 leading-snug">
          {dynamicSubtitle}
        </div>
      </div>

      {/* Discount circle */}
      <div className="absolute right-4 bottom-28 z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-black font-black shadow-[0_0_30px_rgba(224,255,0,0.6)]" style={{ background: accent }}>
        <div className="font-['Anton'] text-[24px] leading-none italic">{config.discount?.split(" ")[0] || "30%"}</div>
        <div className="text-[10px] font-black tracking-wider">{config.discount?.split(" ")[1] || "OFF"}</div>
      </div>

      {/* CTA bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-black/60 backdrop-blur-sm flex items-center justify-between border-t" style={{ borderColor: accent }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: accent }}>
            <Phone className="h-3.5 w-3.5 text-black" />
          </div>
          <div>
            <div className="text-[8px] opacity-60 tracking-widest">CALL ME</div>
            <div className="text-[11px] font-black">{config.phone}</div>
          </div>
        </div>
        <button className="px-4 py-2 rounded-full text-black font-black text-[11px] uppercase italic" style={{ background: accent }}>
          {config.cta_text?.includes("!") ? "JOIN NOW" : config.cta_text || "JOIN NOW"}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE 2 — DARK PURPLE NEON CIRCLES
   ============================================================ */
const DarkPurpleTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const accent = config.branding_color || "#BF00FF";
  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-black">
      {/* dotted bg pattern */}
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `radial-gradient(${accent}55 1px, transparent 1px)`, backgroundSize: "16px 16px" }} />

      {/* Neon circles vazados */}
      <div className="absolute top-8 left-6 w-32 h-32 rounded-full border-2 opacity-70" style={{ borderColor: accent, boxShadow: `0 0 30px ${accent}80` }} />
      <div className="absolute top-20 left-20 w-20 h-20 rounded-full border opacity-60" style={{ borderColor: accent }} />
      <div className="absolute bottom-32 right-4 w-40 h-40 rounded-full border-2 opacity-70" style={{ borderColor: accent, boxShadow: `0 0 40px ${accent}80` }} />
      <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full" style={{ background: accent, boxShadow: `0 0 30px ${accent}` }} />
      <div className="absolute top-1/3 right-8 w-3 h-3 rounded-full" style={{ background: accent }} />
      <div className="absolute top-1/2 left-4 w-2 h-2 rounded-full" style={{ background: accent }} />

      {/* Cutout */}
      {cutoutUrl && (
        <div className="absolute left-1/2 -translate-x-1/2 top-14 h-[60%] z-[5]">
          <img 
            src={cutoutUrl} 
            alt="" 
            className="h-full object-contain" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }} 
          />
        </div>
      )}

      {/* Header brand */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/70 border rounded-full px-3 py-1.5" style={{ borderColor: accent }}>
        <Dumbbell className="h-3 w-3" style={{ color: accent }} />
        <span className="text-[9px] font-black tracking-widest">{coachName}</span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 bg-gradient-to-t from-black via-black/95 to-transparent pt-20">
        <div className="font-['Anton'] text-[36px] leading-[0.85] uppercase">PERSONAL</div>
        <div className="font-['Anton'] text-[40px] leading-[0.85] uppercase italic" style={{ color: accent }}>TRAINER</div>
        <div className="text-[10px] font-bold tracking-[0.2em] mt-1 opacity-90">NEVER GIVE UP!</div>

        <div className="text-[10px] mt-3 opacity-80 leading-snug max-w-[80%]">
          {dynamicSubtitle}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-[10px]">
            <Phone className="h-3 w-3" style={{ color: accent }} />
            <span className="font-black">{config.phone}</span>
          </div>
          <button className="px-4 py-2 rounded-md font-black text-[10px] uppercase italic text-black" style={{ background: accent, clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)" }}>
            START TODAY
          </button>
        </div>
        <div className="flex items-center gap-1 mt-2 text-[9px] opacity-70">
          <AtSign className="h-2.5 w-2.5" />
          <span>{config.instagram_handle}</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE 3 — IRONBERG BRUTALIST
   ============================================================ */
const IronbergTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const accent = config.branding_color || "#CCFF00";
  return (
    <div className="relative w-full h-full overflow-hidden text-white"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
      {/* texture */}
      <div className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E)" }} />

      {/* Warning stripe corner */}
      <div className="absolute top-0 left-0 w-16 h-3 bg-[repeating-linear-gradient(45deg,#000_0_6px,#CCFF00_6px_12px)]" />
      <div className="absolute top-3 left-0 w-3 h-16 bg-[repeating-linear-gradient(45deg,#000_0_6px,#CCFF00_6px_12px)]" />

      {/* Vazado text background — NO PAIN NO GAIN */}
      <div className="absolute inset-0 flex flex-col justify-center items-center overflow-hidden opacity-20 select-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="font-['Anton'] text-[44px] leading-[0.95] uppercase italic whitespace-nowrap"
            style={{
              WebkitTextStroke: `1px ${accent}`,
              color: "transparent",
              transform: i % 2 === 0 ? "translateX(-15%)" : "translateX(15%)",
            }}
          >
            NO PAIN NO GAIN
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 pt-6 px-5">
        <div className="font-['Anton'] text-[42px] leading-[0.85] uppercase tracking-tight">EXERCISE</div>
        <div className="font-['Anton'] text-[42px] leading-[0.85] uppercase italic" style={{ color: accent }}>ROUTINE</div>
        <div className="flex items-center gap-1 mt-1.5 opacity-80">
          <div className="text-[10px] font-black tracking-[0.3em]" style={{ color: accent }}>›››</div>
          <div className="text-[9px] uppercase tracking-widest opacity-80">{dynamicSubtitle}</div>
        </div>
      </div>

      {/* Cutout */}
      {cutoutUrl && (
        <div className="absolute right-0 top-1/3 h-[55%] w-[55%] z-[5]">
          <img 
            src={cutoutUrl} 
            alt="" 
            className="h-full w-full object-contain grayscale contrast-125" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }} 
          />
        </div>
      )}

      {/* Feature list */}
      <div className="absolute left-5 top-[42%] z-10 space-y-3 max-w-[50%]">
        {[
          { i: Dumbbell, t: "STRENGTH", d: "Treinos pesados focados em força máxima." },
          { i: Apple, t: "HEALTHY FOOD", d: "Dieta estratégica de alta performance." },
          { i: Heart, t: "HYPERTROPHY", d: "Volume controlado para ganho de massa." },
        ].map((b, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: accent }}>
              <b.i className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div>
              <div className="font-['Anton'] text-[12px] uppercase leading-tight">{b.t}</div>
              <div className="text-[8px] opacity-70 leading-snug">{b.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Diagonal slash */}
        <div className="h-2 bg-[repeating-linear-gradient(45deg,#000_0_6px,#CCFF00_6px_12px)]" />
        <div className="bg-black p-4 flex items-center justify-between">
          <div>
            <div className="text-[8px] opacity-60 tracking-widest">FALE COMIGO</div>
            <div className="text-[11px] font-black">{config.phone}</div>
            <div className="text-[8px] opacity-60 mt-0.5">{config.instagram_handle}</div>
          </div>
          <div className="text-black font-black text-[14px] px-4 py-3 rounded-full italic uppercase" style={{ background: accent, clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)" }}>
            {config.discount || "10% OFF"}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE 4 — GRADIENT FITNESS (warning stripes orange/pink/yellow)
   ============================================================ */
const GradientFitTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const gradient = "linear-gradient(135deg, #FB923C 0%, #EC4899 50%, #FACC15 100%)";
  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[#0a0a0a]">
      {/* Subtle bg shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: gradient, filter: "blur(40px)" }} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-15" style={{ background: gradient, filter: "blur(50px)" }} />

      {/* Top warning stripe */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: gradient }} />
      <div className="absolute top-2 left-0 right-0 h-1.5 bg-[repeating-linear-gradient(45deg,#000_0_8px,transparent_8px_14px)] opacity-60" />

      {/* Header */}
      <div className="relative z-10 pt-6 px-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: gradient }}>
            <Flame className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-[8px] tracking-widest opacity-60">SEU TREINADOR</div>
            <div className="text-[10px] font-black tracking-wider">{coachName}</div>
          </div>
        </div>

        <div className="font-['Anton'] text-[42px] leading-[0.85] uppercase">GET IN SHAPE</div>
        <div className="font-['Anton'] text-[48px] leading-[0.85] uppercase italic bg-clip-text text-transparent" style={{ backgroundImage: gradient }}>
          TODAY!
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="text-sm" style={{ color: "#FB923C" }}>►</div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">{dynamicSubtitle}</div>
        </div>
      </div>

      {/* Cutout */}
      {cutoutUrl && (
        <div className="absolute right-0 top-1/4 h-[60%] w-[65%] z-[5]">
          <img 
            src={cutoutUrl} 
            alt="" 
            className="h-full w-full object-contain" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }} 
          />
        </div>
      )}

      {/* Feature mini-cards */}
      <div className="absolute bottom-32 left-5 z-10 space-y-1.5 max-w-[55%]">
        {[
          { i: Dumbbell, t: "TREINOS PERSONALIZADOS" },
          { i: Target, t: "DIETA ESTRATÉGICA" },
          { i: TrendingUp, t: "ACOMPANHAMENTO 24/7" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1.5 border-l-2" style={{ borderColor: "#FB923C" }}>
            <b.i className="h-3 w-3" style={{ color: "#FB923C" }} />
            <span className="text-[9px] font-black tracking-wider uppercase">{b.t}</span>
          </div>
        ))}
      </div>

      {/* Bottom warning stripe + CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="h-2 bg-[repeating-linear-gradient(45deg,#000_0_8px,#FB923C_8px_14px,#000_14px_22px,#EC4899_22px_28px)]" />
        <div className="bg-black/90 backdrop-blur-md p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black">
              <Phone className="h-3 w-3" style={{ color: "#FB923C" }} />
              {config.phone}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] opacity-70 mt-0.5">
              <AtSign className="h-2.5 w-2.5" />
              {config.instagram_handle}
            </div>
          </div>
          <button className="px-4 py-2.5 rounded-md font-black text-[11px] uppercase italic text-black" style={{ background: gradient }}>
            {config.cta_text || "FALE COMIGO!"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE 5 — CONSULTORIA ONLINE (phone mockup + amarelo)
   ============================================================ */
const ConsultoriaPhoneTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const accent = config.branding_color || "#FACC15";
  const features = [
    { i: Dumbbell, t: "TREINOS", s: "Personalizados" },
    { i: Apple, t: "DIETAS", s: "Individualizadas" },
    { i: TrendingUp, t: "EVOLUÇÃO", s: "Acompanhada 24/7" },
    { i: Target, t: "METAS", s: "Plano sob medida" },
  ];
  const benefits = [
    "Avaliação física completa",
    "Ajustes semanais no plano",
    "Suporte direto via WhatsApp",
    "Vídeos demonstrativos HD",
  ];

  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[#0a0a0a]">
      {/* Glow background */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-30" style={{ background: accent, filter: "blur(80px)" }} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: accent, filter: "blur(60px)" }} />

      {/* Cutout grayscale */}
      {cutoutUrl && (
        <div className="absolute right-0 top-0 h-[65%] w-[60%] z-[2]">
          <img 
            src={cutoutUrl} 
            alt="" 
            className="h-full w-full object-contain object-top grayscale contrast-125 opacity-90" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }} 
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black z-[3]" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: accent }}>
            <Dumbbell className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-[8px] tracking-widest opacity-60">SEU TREINADOR</div>
            <div className="text-[10px] font-black tracking-wider">{coachName}</div>
          </div>
        </div>

        <h2 className="font-['Anton'] text-[36px] leading-[0.85] uppercase tracking-tight">CONSULTORIA</h2>
        <h3 className="font-['Anton'] text-[20px] leading-[1] uppercase opacity-90 mt-1">DE TREINO E DIETA</h3>
        <div className="inline-block mt-2 px-3 py-1 rounded-md text-black font-black text-[14px] italic shadow-lg" style={{ background: accent }}>
          ON-LINE
        </div>
      </div>

      {/* Phone mockup + feature pills */}
      <div className="relative z-10 flex items-start gap-3 mt-4 px-5">
        {/* Phone */}
        <div className="relative w-[88px] h-[170px] bg-[#1a1a1a] rounded-[20px] border-2 border-[#333] shadow-2xl shrink-0 overflow-hidden">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-2 bg-[#333] rounded-b-lg z-10" />
          {cutoutUrl ? (
            <img src={cutoutUrl} alt="" className="absolute inset-1 rounded-[16px] object-cover w-[calc(100%-8px)] h-[calc(100%-8px)] grayscale" />
          ) : (
            <div className="absolute inset-1 rounded-[16px] bg-gradient-to-br from-zinc-800 to-black" />
          )}
          {/* Floating badge on phone */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black text-black" style={{ background: accent }}>
            APP COACH
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {features.map((f, i) => (
            <div key={i} className="bg-black/80 border border-white/10 rounded-lg px-2 py-1.5 flex items-center gap-1.5 backdrop-blur-sm">
              <f.i className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <div className="min-w-0">
                <div className="text-[7px] opacity-60 tracking-widest">{f.t}</div>
                <div className="font-black text-[9px] uppercase leading-tight truncate">{f.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits checklist */}
      <div className="relative z-10 mt-3 mx-5 bg-black/60 backdrop-blur-md border rounded-xl p-3 space-y-1.5" style={{ borderColor: `${accent}40` }}>
        <div className="text-[9px] font-black tracking-widest mb-1" style={{ color: accent }}>O QUE VOCÊ RECEBE:</div>
        {benefits.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check className="h-3 w-3 shrink-0" style={{ color: accent }} />
            <span className="text-[10px] font-medium">{b}</span>
          </div>
        ))}
      </div>

      {/* Dynamic workout highlight */}
      {dynamicSubtitle && (
        <div className="relative z-10 mt-2 mx-5 flex items-center gap-2">
          <div className="text-sm" style={{ color: accent }}>►</div>
          <div className="text-[9px] uppercase tracking-widest opacity-80">{dynamicSubtitle}</div>
        </div>
      )}

      {/* Bottom CTA block */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="font-['Anton'] text-[20px] leading-[0.95] uppercase">QUER ALCANÇAR</div>
        <div className="font-['Anton'] text-[24px] leading-[0.95] uppercase italic" style={{ color: accent }}>SEUS OBJETIVOS?</div>

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black">
              <Phone className="h-3 w-3" style={{ color: accent }} />
              {config.phone}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] opacity-70">
              <AtSign className="h-2.5 w-2.5" />
              {config.instagram_handle}
            </div>
            <div className="text-[8px] opacity-60 tracking-wider">{config.website_url}</div>
          </div>
          <button className="px-3 py-2 rounded-md text-black font-black text-[11px] uppercase italic shadow-[0_4px_20px_rgba(250,204,21,0.4)] shrink-0" style={{ background: accent }}>
            {config.cta_text || "FALE COMIGO!"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TEMPLATE 6 — FEED BRUTALISTA (1:1)
   ============================================================ */
const FeedBrutalistTemplate = ({ config, coachName, cutoutUrl, dynamicSubtitle }: any) => {
  const accent = config.branding_color || "#FFFFFF";
  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col p-8 border-[12px]" style={{ borderColor: accent }}>
      {/* Background large text */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="font-['Anton'] text-[150px] leading-none text-white whitespace-nowrap rotate-[-10deg]">
          ALPHA COACH
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <div className="inline-block px-3 py-1 bg-white text-black font-black text-xs uppercase tracking-[0.2em] mb-4">
            {coachName}
          </div>
          <h2 className="font-['Anton'] text-[60px] leading-[0.9] text-white uppercase tracking-tighter">
            {config.headline || "TRANSFORME SEU CORPO"}
          </h2>
        </div>

        <div className="mt-4">
           <p className="text-xl font-bold uppercase tracking-widest italic" style={{ color: accent }}>
             {dynamicSubtitle}
           </p>
        </div>

        {/* Floating image if exists */}
        {cutoutUrl && (
          <div className="absolute right-[-2rem] bottom-[-2rem] h-[100%] w-[60%] z-[4]">
            <img 
              src={cutoutUrl} 
              alt="" 
              className="h-full w-full object-contain" 
              style={{ 
                maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
              }} 
            />
          </div>
        )}

        <div className="mt-auto pt-8 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-black tracking-widest opacity-50">CLIQUE NO LINK</div>
              <div className="text-lg font-black">{config.website_url || "bio.link/personal"}</div>
            </div>
            <div className="px-6 py-3 bg-white text-black font-black uppercase text-sm skew-x-[-12deg]">
              {config.cta_text || "QUERO COMEÇAR"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
