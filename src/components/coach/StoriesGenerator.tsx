import { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Smartphone, 
  User as UserIcon, 
  Award, 
  Users, 
  Globe, 
  Zap, 
  Maximize, 
  Minimize,
  Instagram,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS = {
  Award: Award,
  Users: Users,
  Globe: Globe,
  Zap: Zap,
};

interface StoriesGeneratorProps {
  onEnterFullScreen?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

export const StoriesGenerator = ({ onEnterFullScreen, onExitFullScreen, isFullScreen }: StoriesGeneratorProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModel, setActiveModel] = useState<'profile' | 'sales'>('profile');
  const [config, setConfig] = useState({
    instagram_handle: "",
    topic1_label: "Experiência",
    topic1_icon: "Award",
    topic2_label: "Foco de Público",
    topic2_icon: "Users",
    topic3_label: "Atendimento Online",
    topic3_icon: "Globe",
    topic4_label: "Metodologia Própria",
    topic4_icon: "Zap",
    branding_color: "#ff0000",
  });
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: p } = await supabase.from("perfis").select("*").eq("id", user.id).single();
      setProfileData(p);

      const { data: c } = await supabase.from("coach_marketing_config").select("*").eq("user_id", user.id).maybeSingle();
      if (c) {
        setConfig({
          instagram_handle: c.instagram_handle || "",
          topic1_label: c.topic1_label || "Experiência",
          topic1_icon: c.topic1_icon || "Award",
          topic2_label: c.topic2_label || "Foco de Público",
          topic2_icon: c.topic2_icon || "Users",
          topic3_label: c.topic3_label || "Atendimento Online",
          topic3_icon: c.topic3_icon || "Globe",
          topic4_label: c.topic4_label || "Metodologia Própria",
          topic4_icon: c.topic4_icon || "Zap",
          branding_color: c.branding_color || "#ff0000",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("coach_marketing_config").upsert({
        user_id: user.id,
        ...config,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className={cn("space-y-6", isFullScreen && "fixed inset-0 z-[100] bg-black m-0 p-0 overflow-hidden flex flex-col items-center justify-center")}>
      {!isFullScreen && (
        <div className="flex gap-4 p-1 bg-card border border-border/40 rounded-xl w-fit">
          <Button 
            variant={activeModel === 'profile' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveModel('profile')}
            className="gap-2 text-xs"
          >
            <UserIcon className="h-4 w-4" /> Perfil do Coach
          </Button>
          <Button 
            variant={activeModel === 'sales' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveModel('sales')}
            className="gap-2 text-xs"
          >
            <Smartphone className="h-4 w-4" /> Chamada de Vendas
          </Button>
        </div>
      )}

      {/* Preview Area */}
      <div className={cn(
        "relative mx-auto bg-black shadow-2xl overflow-hidden transition-all duration-500 ring-1 ring-white/10",
        isFullScreen ? "h-[100vh] aspect-[9/16]" : "h-[600px] aspect-[9/16] rounded-[2.5rem]"
      )}>
        {/* Ironberg Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0a0a0a]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
          {/* Neon Gradients */}
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[40%] blur-[100px] opacity-20" style={{ background: config.branding_color }} />
          <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[40%] blur-[100px] opacity-20" style={{ background: config.branding_color }} />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-8 pt-16">
          {activeModel === 'profile' ? (
            <div className="flex-1 flex flex-col">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center space-y-4 mb-12">
                <div className="relative p-1 rounded-full bg-gradient-to-tr from-primary to-orange-500">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black ring-2 ring-white/10">
                    <img 
                      src={profileData?.avatar_url || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48"} 
                      className="w-full h-full object-cover" 
                      alt="Coach"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-['Anton'] text-4xl uppercase tracking-tight text-white leading-none italic">
                    {profileData?.nome_completo || "COACH ALPHA"}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-sm tracking-widest uppercase italic">
                    <Instagram className="h-4 w-4" /> {config.instagram_handle || "@seuhandle"}
                  </div>
                </div>
              </div>

              {/* Topics Grid */}
              <div className="grid grid-cols-1 gap-4 mt-auto mb-12">
                {[
                  { label: config.topic1_label, icon: config.topic1_icon },
                  { label: config.topic2_label, icon: config.topic2_icon },
                  { label: config.topic3_label, icon: config.topic3_icon },
                  { label: config.topic4_label, icon: config.topic4_icon },
                ].map((topic, i) => {
                  const Icon = ICONS[topic.icon as keyof typeof ICONS] || Award;
                  return (
                    <div key={i} className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border-l-4 border-primary p-4 rounded-r-xl group">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-['Anton'] uppercase text-xl text-white tracking-wide italic">
                        {topic.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="mt-auto py-6 border-t border-white/10">
                <div className="bg-primary text-black font-['Anton'] text-2xl text-center py-3 skew-x-[-10deg] uppercase tracking-tighter italic">
                  TREINE COMIGO AGORA
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="text-center space-y-2 mb-12">
                <h4 className="font-['Anton'] text-6xl uppercase tracking-tighter text-white leading-[0.8] italic">
                  TREINO E <br />
                  <span className="text-primary">DIETA ONLINE</span>
                </h4>
                <p className="text-white/60 uppercase tracking-[0.3em] font-bold text-xs">A evolução que você precisa</p>
              </div>

              {/* Smartphone Mockup */}
              <div className="relative w-full max-w-[280px] aspect-[9/18.5] bg-[#1a1a1a] rounded-[3rem] border-8 border-[#333] shadow-2xl overflow-hidden ring-4 ring-black">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#333] rounded-b-2xl z-20" />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent z-10 pointer-events-none" />
                {/* Simulated App Screenshot */}
                <div className="absolute inset-2 bg-[#050505] rounded-[2.5rem] overflow-hidden flex flex-col">
                  <div className="h-20 bg-primary/10 flex items-center justify-center border-b border-white/5">
                    <div className="font-black italic text-primary text-lg">ALPHA COACH</div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
                      <div className="h-16 bg-white/5 rounded-xl border border-white/10" />
                    </div>
                    <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
                  </div>
                </div>
              </div>

              <div className="mt-12 w-full space-y-4">
                <div className="font-['Anton'] text-3xl text-center text-white uppercase italic tracking-tight">
                  CLIQUE NO <span className="text-primary">LINK DA BIO</span>
                </div>
                <div className="flex items-center justify-center gap-2 animate-bounce">
                  <ChevronRight className="h-8 w-8 text-primary rotate-90" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Watermark */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 opacity-50">
          <div className="h-[1px] w-4 bg-white/30" />
          <div className="text-[10px] uppercase tracking-widest font-black text-white/50 italic">Alpha Coach Pro</div>
          <div className="h-[1px] w-4 bg-white/30" />
        </div>
      </div>

      {/* Control Panel */}
      {isFullScreen ? (
        <Button 
          variant="outline" 
          size="lg" 
          onClick={onExitFullScreen}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border-white/20 text-white rounded-full gap-2 px-8"
        >
          <Minimize className="h-5 w-5" /> Sair do Modo Print
        </Button>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
            <h5 className="font-bold flex items-center gap-2">
              <Instagram className="h-4 w-4 text-primary" /> Configurações
            </h5>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold opacity-70">Seu @ do Instagram</Label>
                <Input 
                  value={config.instagram_handle}
                  onChange={e => setConfig(prev => ({ ...prev, instagram_handle: e.target.value }))}
                  placeholder="@seuperfil"
                  className="bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold opacity-70">Cor de Destaque (Neon)</Label>
                <div className="flex gap-2">
                  {['#ff0000', '#facc15', '#22c55e', '#3b82f6', '#d946ef'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setConfig(prev => ({ ...prev, branding_color: color }))}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        config.branding_color === color ? "border-white scale-110" : "border-transparent opacity-50"
                      )}
                      style={{ background: color }}
                    />
                  ))}
                  <Input 
                    type="color" 
                    value={config.branding_color}
                    onChange={e => setConfig(prev => ({ ...prev, branding_color: e.target.value }))}
                    className="w-8 h-8 p-0 border-none bg-transparent rounded-full overflow-hidden cursor-pointer"
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Salvar Configurações
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
            <h5 className="font-bold flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Captura
            </h5>
            <p className="text-xs text-muted-foreground">
              Prepare sua arte e entre no modo tela cheia para tirar o print perfeito sem as barras do sistema.
            </p>
            <Button 
              onClick={onEnterFullScreen} 
              variant="secondary" 
              className="w-full h-12 rounded-xl bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-widest gap-2"
            >
              <Maximize className="h-5 w-5" /> Modo Tela Cheia
            </Button>
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] uppercase font-bold opacity-50">Tópicos (Modelo Perfil)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={config.topic1_label}
                  onChange={e => setConfig(prev => ({ ...prev, topic1_label: e.target.value }))}
                  className="text-[10px] h-8"
                />
                <Input 
                  value={config.topic2_label}
                  onChange={e => setConfig(prev => ({ ...prev, topic2_label: e.target.value }))}
                  className="text-[10px] h-8"
                />
                <Input 
                  value={config.topic3_label}
                  onChange={e => setConfig(prev => ({ ...prev, topic3_label: e.target.value }))}
                  className="text-[10px] h-8"
                />
                <Input 
                  value={config.topic4_label}
                  onChange={e => setConfig(prev => ({ ...prev, topic4_label: e.target.value }))}
                  className="text-[10px] h-8"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
