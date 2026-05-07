import { useState, useEffect, useRef } from "react";
import { Play, Camera, LogOut, KeyRound, Loader2, ClipboardCheck, User, Ruler, Upload, Settings } from "lucide-react";
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

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [lastEval, setLastEval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  // Edit Modals
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);

  // Form states
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [formProfile, setFormProfile] = useState({
    nome_completo: "",
    telefone: "",
    data_nascimento: "",
    sexo: "M" as "M" | "F",
    avatar_url: "",
  });

  // Evaluation form
  const [formEval, setFormEval] = useState({
    peso_kg: "",
    altura_cm: "",
    pescoco_cm: "",
    cintura_cm: "",
    quadril_cm: "",
  });

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
          sexo: p.sexo as "M" | "F" || "M",
          avatar_url: p.avatar_url || "",
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
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      return toast.error("Por favor, selecione uma imagem.");
    }

    if (file.size > 2 * 1024 * 1024) {
      return toast.error("A imagem deve ter no máximo 2MB.");
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto carregada com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao carregar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
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
    });

    setSaving(false);
    if (error) {
      console.error("Erro ao salvar perfil:", error);
      return toast.error("Erro ao salvar: " + error.message);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Hero estilo Netflix */}
      <section className="relative h-[60vh] min-h-[450px] -mt-0">
        <img src={profile?.avatar_url || hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">FILME</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Meu Perfil</span>
          </div>
          <h1 className="font-display text-5xl leading-none">{nomeDisplay.toUpperCase()}</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[hsl(142_70%_55%)] font-semibold">98% compatível</span>
            <span className="text-muted-foreground">{new Date().getFullYear()}</span>
            <span className="px-2 py-0.5 border border-muted-foreground/40 rounded text-xs uppercase">{profile?.sexo === "M" ? "MASCULINO" : "FEMININO"}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 max-w-md">
            {user?.email}. {profile?.telefone ? `Contato: ${profile.telefone}.` : ""} Próximo passo: manter a constância e evoluir.
          </p>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={() => setProfileOpen(true)}
              variant="default"
              className="flex-1"
            >
              <User className="h-4 w-4" /> Editar Perfil
            </Button>
            <Button 
              onClick={() => setEvalOpen(true)}
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
                  {formProfile.avatar_url ? (
                    <img src={formProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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
                accept="image/*"
                onChange={handleImageUpload}
              />
              <p className="text-xs text-muted-foreground">Toque no ícone para alterar sua foto</p>
            </div>
            <div>
              <Label htmlFor="avatar">Link da Imagem (Opcional)</Label>
              <Input id="avatar" value={formProfile.avatar_url} onChange={(e) => setFormProfile({...formProfile, avatar_url: e.target.value})} placeholder="https://..." />
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
