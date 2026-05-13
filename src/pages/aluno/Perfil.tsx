import { useState, useEffect, useRef } from "react";
import { Play, Camera, LogOut, KeyRound, Loader2, ClipboardCheck, User, Ruler, Upload, Settings, Move, Sparkles, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import heroDefault from "@/assets/hero-default.jpg";
import { calcBodyFatUSNavy, calcIMC } from "@/lib/body-metrics";
import ProfileMusicPlayer from "@/components/aluno/ProfileMusicPlayer";
import { PhysicalEvaluationSelection } from "@/components/aluno/PhysicalEvaluationSelection";
import { ComprehensiveEvaluationForm } from "@/components/aluno/ComprehensiveEvaluationForm";
import heic2any from "heic2any";

type ProfileData = {
  id?: string;
  email?: string | null;
  nome_completo?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  avatar_url?: string | null;
  music_url?: string | null;
  tenant_id?: string | null;
  avatar_pos_y?: number | null;
};

type LastEvalData = {
  peso_kg?: number | null;
  altura_cm?: number | null;
  pescoco_cm?: number | null;
  cintura_cm?: number | null;
  quadril_cm?: number | null;
  bf_pct_calculado?: number | null;
  imc?: number | null;
};

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const hero = heroDefault;

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [lastEval, setLastEval] = useState<LastEvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  // Edit Modals
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false); // Navy form
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [comprehensiveOpen, setComprehensiveOpen] = useState(false);
  const [triggerImport, setTriggerImport] = useState(false);

  // Form states
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [imgPosY, setImgPosY] = useState<number>(50);

  useEffect(() => {
    if (profile?.avatar_pos_y !== undefined && profile?.avatar_pos_y !== null) {
      setImgPosY(profile.avatar_pos_y);
    }
  }, [profile?.avatar_pos_y]);

  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [formImageFailed, setFormImageFailed] = useState(false);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [profile?.avatar_url, tenant?.hero_url]);

  // Profile form
  const [formProfile, setFormProfile] = useState({
    nome_completo: "",
    telefone: "",
    data_nascimento: "",
    sexo: "M" as "M" | "F",
    avatar_url: "",
    music_url: "",
    avatar_pos_y: 50,
  });

  // Evaluation form
  const [formEval, setFormEval] = useState({
    peso_kg: "",
    altura_cm: "",
    pescoco_cm: "",
    cintura_cm: "",
    quadril_cm: "",
  });

  const isUnsupportedProfileImage = (url?: string | null) => false; // Let browser handle it or trust our normalization

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const prepareAvatarImage = async (original: File) => {
    const isHeic =
      /heic|heif/i.test(original.type) ||
      /\.(heic|heif)$/i.test(original.name) ||
      (original.type === "" && /\.(heic|heif)$/i.test(original.name));

    const isImage = original.type.startsWith("image/") || isHeic;

    if (!isImage) {
      throw new Error("Por favor, selecione uma imagem.");
    }

    if (original.size > 15 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 15MB.");
    }

    let source: Blob = original;
    if (isHeic) {
      try {
        const converted = await withTimeout(
          heic2any({ blob: original, toType: "image/jpeg", quality: 0.82 }) as Promise<Blob | Blob[]>,
          45000,
          "A conversão da foto demorou demais. Tente uma imagem JPG, PNG ou WEBP."
        );
        source = Array.isArray(converted) ? converted[0] : converted;
      } catch (e: any) {
        console.error("Erro heic2any:", e);
        throw new Error("Não foi possível converter esta foto HEIC. Tente salvar como JPG.");
      }
    }

    const normalized = await withTimeout(
      compressImage(source, 1600, 0.82),
      45000,
      "A preparação da foto demorou demais. Tente uma imagem menor."
    );

    if (!normalized) {
      throw new Error("Não foi possível preparar essa imagem. Tente salvar a foto como JPG e enviar novamente.");
    }

    return { blob: normalized, extension: "jpg", contentType: "image/jpeg" };
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: p } = await supabase.from("perfis").select("*").eq("id", user?.id).maybeSingle();
      const { data: e } = await supabase.from("avaliacoes_fisicas").select("*").eq("aluno_id", user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user?.id);
      const { data: ownedTenant } = await supabase.from("tenants").select("id").eq("owner_user_id", user?.id).maybeSingle();
      
      setIsCoach(roles?.some(r => r.role === "coach" || r.role === "admin") || !!ownedTenant);
      if (p) {
        setProfile(p);
        setFormProfile({
          nome_completo: p.nome_completo || "",
          telefone: p.telefone || "",
          data_nascimento: p.data_nascimento || "",
          sexo: (p.sexo as "M" | "F") || "M",
          avatar_url: p.avatar_url || "",
          music_url: p.music_url || "",
          avatar_pos_y: p.avatar_pos_y ?? 50,
        });
      }
      if (e) {
        setLastEval(e);
        setFormEval({
          peso_kg: String(e.peso_kg || ""),
          altura_cm: String(e.altura_cm || ""),
          pescoco_cm: String(e.pescoco_cm || ""),
          cintura_cm: String(e.cintura_cm || ""),
          quadril_cm: String(e.quadril_cm || ""),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { 
    await signOut(); 
    if (slug) {
      navigate(`/${slug}/login`);
    } else {
      navigate("/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres.");
    if (newPw !== confirmPw) return toast.error("As senhas não conferem.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso!");
    setPwOpen(false);
    setNewPw(""); setConfirmPw("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original || !user) return;
    const toastId = toast.loading("Preparando foto...");

    try {
      setUploading(true);
      setFormImageFailed(false);
      const prepared = await prepareAvatarImage(original);
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const fileName = `avatar-${stamp}.${prepared.extension}`;
      const filePath = `${user.id}/${fileName}`;
      toast.loading("Enviando foto...", { id: toastId });
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, prepared.blob, {
          contentType: prepared.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?v=${Date.now()}`;
      toast.loading("Salvando no perfil...", { id: toastId });
      const { error: updateError } = await supabase.from("perfis").update({
        avatar_url: finalUrl,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (updateError) {
        const { error: upsertError } = await supabase.from("perfis").upsert({
          id: user.id,
          email: user.email,
          nome_completo: formProfile.nome_completo || user.email || "Usuário",
          avatar_url: finalUrl,
          tenant_id: profile?.tenant_id || tenant?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

        if (upsertError) throw upsertError;
      }

      setFormProfile(prev => ({ ...prev, avatar_url: finalUrl }));
      setProfile((prev) => ({ ...(prev || {}), avatar_url: finalUrl }));
      toast.success("Foto salva com sucesso!", { id: toastId });
    } catch (error: unknown) {
      console.error("Erro detalhado no upload:", error);
      toast.error("Erro ao carregar imagem: " + (error instanceof Error ? error.message : "Erro desconhecido"), { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Comprime/redimensiona imagem via canvas para reduzir tamanho antes do upload
  const compressImage = (blob: Blob, maxDim: number, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, 'image/jpeg', quality);
        } catch { URL.revokeObjectURL(url); resolve(null); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return toast.error("Usuário não identificado.");
    setSaving(true);
    
    // Usar upsert para garantir que o registro existe, mantendo o tenant_id original
    const { error } = await supabase.from("perfis").upsert({
      id: user.id,
      email: user.email,
      ...formProfile,
      tenant_id: profile?.tenant_id || tenant?.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    setSaving(false);
    if (error) {
      console.error("Erro ao salvar perfil:", error);
      // Fallback: tentar update se upsert falhar
      const { error: updateError } = await supabase.from("perfis")
        .update({ ...formProfile, updated_at: new Date().toISOString() })
        .eq('id', user.id);
        
      if (updateError) {
        return toast.error("Erro ao salvar: " + updateError.message);
      }
    }
    
    toast.success("Perfil atualizado!");
    setProfileOpen(false);
    loadData(true);
  };

  const handleUpdateEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return toast.error("Usuário não identificado.");
    setSaving(true);
    
    const peso = Number(formEval.peso_kg);
    const alt = Number(formEval.altura_cm);
    const bf = calcBodyFatUSNavy({
      sexo: formProfile.sexo,
      altura_cm: alt,
      pescoco_cm: Number(formEval.pescoco_cm),
      cintura_cm: Number(formEval.cintura_cm),
      quadril_cm: formEval.quadril_cm ? Number(formEval.quadril_cm) : undefined,
    });
    const imc = calcIMC(peso, alt);
    const massaGorda = bf && peso ? +(peso * (bf / 100)).toFixed(2) : null;
    const massaMagra = bf && peso ? +(peso - (massaGorda ?? 0)).toFixed(2) : null;

    const evalData = {
      aluno_id: user.id,
      tenant_id: profile?.tenant_id || tenant?.id,
      peso_kg: peso,
      altura_cm: alt,
      pescoco_cm: Number(formEval.pescoco_cm),
      cintura_cm: Number(formEval.cintura_cm),
      quadril_cm: formEval.quadril_cm ? Number(formEval.quadril_cm) : null,
      bf_pct_calculado: bf,
      imc,
      massa_magra_kg: massaMagra,
      massa_gorda_kg: massaGorda,
      data: new Date().toISOString()
    };

    const { error } = await supabase.from("avaliacoes_fisicas").insert(evalData);
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar avaliação:", error);
      return toast.error("Erro ao salvar: " + error.message);
    }
    
    toast.success("Nova avaliação registrada!");
    setEvalOpen(false);
    loadData(true);
  };

  const nomeDisplay = profile?.nome_completo || user?.email?.split("@")[0]?.toUpperCase() || "ATLETA";
  const profileAvatarSrc = !profileImageFailed && profile?.avatar_url
    ? profile.avatar_url
    : null;
  const profileHeroSrc = profileAvatarSrc || (isCoach ? tenant?.hero_url : null) || heroDefault;
  const formAvatarSrc = !formImageFailed && formProfile.avatar_url
    ? formProfile.avatar_url
    : "";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ProfileMusicPlayer url={profile?.music_url || tenant?.music_url} />
      {/* Hero estilo Netflix */}
      <section className="relative h-[85vh] min-h-[500px] -mt-0">
        <img
          src={profileHeroSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-[object-position] duration-300 ease-in-out"
          style={{ objectPosition: `center ${imgPosY}%` }}
          onError={() => setProfileImageFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-transparent" />

        <button
          type="button"
          onClick={() => setAdjustOpen(true)}
          className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur border border-white/20 text-white text-[11px] uppercase tracking-widest font-bold px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-black/80 transition"
          aria-label="Ajustar foto"
        >
          <Move className="h-3.5 w-3.5" /> Ajustar foto
        </button>

        <div className="absolute inset-x-0 bottom-[10%] px-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">FILME</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Meu Perfil</span>
          </div>
          <h1 className="font-display text-4xl leading-none">{nomeDisplay.toUpperCase()}</h1>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[hsl(142_70%_55%)] font-semibold">98% compatível</span>
            <span className="text-muted-foreground">{new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
            {user?.email}. {profile?.telefone ? `Contato: ${profile.telefone}.` : ""} Próximo passo: manter a constância e evoluir.
          </p>

          <div className="flex gap-2 pt-1">
            <Button 
              onClick={() => setProfileOpen(true)}
              variant="default"
              className="flex-1"
            >
              <User className="h-4 w-4" /> Editar Perfil
            </Button>
            <Button 
              onClick={() => setSelectionOpen(true)}
              variant="default"
              className="flex-1"
            >
              <Ruler className="h-4 w-4" /> Nova Avaliação
            </Button>
          </div>
          
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => navigate(`/${slug}/app/anamnese`)}
              variant="default"
              className="flex-1 shadow-glow"
            >
              <ClipboardCheck className="h-4 w-4" /> Minha Anamnese
            </Button>
            <Button
              onClick={() => navigate(`/${slug}/app/carta`)}
              className="flex-1 bg-gradient-to-r from-[hsl(180_100%_45%)] to-[hsl(150_100%_45%)] text-black hover:brightness-110 font-bold"
            >
              <Sparkles className="h-4 w-4" /> Minha Carta
            </Button>
          </div>
          
          {isCoach && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => navigate(`/${slug}/app/controle`)}
                variant="outline"
                className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Settings className="h-4 w-4" /> Painel do Coach
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => setPwOpen(true)}
              variant="secondary"
              className="flex-1 h-11"
            >
              <KeyRound className="h-4 w-4" /> Trocar senha
            </Button>
            <Button
              onClick={handleLogout}
              variant="secondary"
              className="w-11 h-11 p-0"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="font-display text-xl mb-3">ÚLTIMAS MÉTRICAS</h2>
        <div className="grid grid-cols-2 gap-3">
          <NetflixCard label="PESO" value={lastEval?.peso_kg ? `${lastEval.peso_kg} kg` : "---"} />
          <NetflixCard label="GORDURA" value={lastEval?.bf_pct_calculado ? `${lastEval.bf_pct_calculado}%` : "---"} />
          <NetflixCard label="ALTURA" value={lastEval?.altura_cm ? `${lastEval.altura_cm} cm` : "---"} />
          <NetflixCard label="IMC" value={lastEval?.imc ? String(lastEval.imc) : "---"} />
        </div>
      </section>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>Atualize seus dados básicos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                  {formAvatarSrc ? (
                    <img src={formAvatarSrc} alt="Avatar" className="w-full h-full object-cover" onError={() => setFormImageFailed(true)} />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.heic,.heif"
                onChange={handleImageUpload}
              />
              <p className="text-xs text-muted-foreground">Toque no ícone para alterar sua foto</p>
            </div>
            <div>
              <Label htmlFor="avatar">Link da Imagem (Opcional)</Label>
              <Input id="avatar" value={formProfile.avatar_url} onChange={(e) => { setFormImageFailed(false); setFormProfile({...formProfile, avatar_url: e.target.value}); }} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" value={formProfile.nome_completo} onChange={(e) => setFormProfile({...formProfile, nome_completo: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" value={formProfile.telefone} onChange={(e) => setFormProfile({...formProfile, telefone: e.target.value})} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label htmlFor="nasc">Data de Nascimento</Label>
              <Input id="nasc" type="date" value={formProfile.data_nascimento} onChange={(e) => setFormProfile({...formProfile, data_nascimento: e.target.value})} />
            </div>
            <div>
              <Label>Sexo Biológico</Label>
              <Select value={formProfile.sexo} onValueChange={(v: "M" | "F") => setFormProfile({...formProfile, sexo: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="music">Minha Música de Perfil (YouTube ou MP3)</Label>
              <div className="relative">
                <Input 
                  id="music" 
                  value={formProfile.music_url} 
                  onChange={(e) => setFormProfile({...formProfile, music_url: e.target.value})} 
                  placeholder="Link do YouTube ou MP3" 
                  className="pl-9"
                />
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                Esta música tocará quando você abrir seu perfil.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setProfileOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} variant="default">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evaluation Edit Dialog */}
      <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Avaliação Física</DialogTitle>
            <DialogDescription>Registre suas medidas atuais.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEval} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input id="peso" type="number" step="0.1" value={formEval.peso_kg} onChange={(e) => setFormEval({...formEval, peso_kg: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input id="altura" type="number" value={formEval.altura_cm} onChange={(e) => setFormEval({...formEval, altura_cm: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pescoco">Pescoço (cm)</Label>
                <Input id="pescoco" type="number" step="0.1" value={formEval.pescoco_cm} onChange={(e) => setFormEval({...formEval, pescoco_cm: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="cintura">Cintura (cm)</Label>
                <Input id="cintura" type="number" step="0.1" value={formEval.cintura_cm} onChange={(e) => setFormEval({...formEval, cintura_cm: e.target.value})} required />
              </div>
            </div>
            {formProfile.sexo === "F" && (
              <div>
                <Label htmlFor="quadril">Quadril (cm)</Label>
                <Input id="quadril" type="number" step="0.1" value={formEval.quadril_cm} onChange={(e) => setFormEval({...formEval, quadril_cm: e.target.value})} required={formProfile.sexo === "F"} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEvalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} variant="default">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Edit Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para sua conta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-pw">Nova senha</Label>
              <Input id="new-pw" type="password" minLength={6} required value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirm-pw">Confirmar senha</Label>
              <Input id="confirm-pw" type="password" minLength={6} required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPwOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <PhysicalEvaluationSelection
        open={selectionOpen}
        onOpenChange={setSelectionOpen}
        onSelect={(type) => {
          setSelectionOpen(false);
          if (type === "navy") {
            setEvalOpen(true);
          } else if (type === "7dobras") {
            setTriggerImport(false);
            setComprehensiveOpen(true);
          } else if (type === "import") {
            setTriggerImport(true);
            setComprehensiveOpen(true);
          }
        }}
      />

      <ComprehensiveEvaluationForm
        open={comprehensiveOpen}
        onOpenChange={setComprehensiveOpen}
        alunoId={user?.id || ""}
        tenantId={profile?.tenant_id}
        sexo={profile?.sexo}
        onSaved={(goToDiet) => {
          loadData(true);
          if (goToDiet) navigate(`/${slug}/app/dieta`);
        }}
        triggerImportOnInit={triggerImport}
      />

      {/* Adjust photo position dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
            <DialogDescription>Arraste o controle para encaixar melhor sua foto na tela.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview com a MESMA proporção da tela hero (largura da viewport x 85vh) */}
            <div
              className="relative w-full rounded-xl overflow-hidden border border-border bg-muted mx-auto"
              style={{
                aspectRatio: `${typeof window !== 'undefined' ? window.innerWidth : 390} / ${typeof window !== 'undefined' ? Math.max(window.innerHeight * 0.85, 500) : 700}`,
                maxHeight: '60vh',
              }}
            >
              <img
                src={profileHeroSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-[object-position] duration-150 ease-out"
                style={{ objectPosition: `center ${imgPosY}%` }}
                onError={() => setProfileImageFailed(true)}
              />
              {/* Marcador do centro visual da hero (onde o rosto deve ficar) */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/40 pointer-events-none" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest">
                <span>↑ Subir</span>
                <span>Centro: {imgPosY}%</span>
                <span>Descer ↓</span>
              </div>
              <Slider
                value={[imgPosY]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setImgPosY(v[0])}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Use o slider para alinhar o rosto com a linha branca (centro da tela).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImgPosY(50)}>Resetar</Button>
            <Button variant="default" onClick={async () => {
              try {
                const { error } = await supabase
                  .from("perfis")
                  .update({ avatar_pos_y: imgPosY })
                  .eq("id", user?.id);
                
                if (error) throw error;
                
                setProfile(prev => prev ? { ...prev, avatar_pos_y: imgPosY } : null);
                setFormProfile(prev => ({ ...prev, avatar_pos_y: imgPosY }));
                setAdjustOpen(false);
                toast.success("Ajuste de foto salvo!");
              } catch (err: any) {
                toast.error("Erro ao salvar ajuste: " + err.message);
              }
            }}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const NetflixCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card/40 border border-border rounded-xl p-4">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="font-display text-xl mt-1">{value}</p>
  </div>
);

export default Perfil;
