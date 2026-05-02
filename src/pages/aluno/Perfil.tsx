import { useState, useEffect } from "react";
import { Play, Camera, LogOut, KeyRound, Loader2, ClipboardCheck, User, Ruler } from "lucide-react";
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

  // Edit Modals
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);

  // Form states
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  // Profile form
  const [formProfile, setFormProfile] = useState({
    nome_completo: "",
    telefone: "",
    data_nascimento: "",
    sexo: "M" as "M" | "F",
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
      
      if (p) {
        setProfile(p);
        setFormProfile({
          nome_completo: p.nome_completo || "",
          telefone: p.telefone || "",
          data_nascimento: p.data_nascimento || "",
          sexo: p.sexo as "M" | "F" || "M",
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

  const handleLogout = async () => { await signOut(); navigate("/login"); };

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
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
            <button 
              onClick={() => setProfileOpen(true)}
              className="bg-white text-black font-semibold px-6 py-3 rounded-md flex items-center gap-2 flex-1 justify-center"
            >
              <User className="h-4 w-4" /> Editar Perfil
            </button>
            <button 
              onClick={() => setEvalOpen(true)}
              className="bg-secondary/80 text-foreground font-semibold px-6 py-3 rounded-md flex items-center gap-2 flex-1 justify-center"
            >
              <Ruler className="h-4 w-4" /> Nova Avaliação
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => navigate(`/${slug}/app/anamnese`)}
              className="flex-1 h-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider shadow-glow"
            >
              <ClipboardCheck className="h-4 w-4" /> Minha Anamnese
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setPwOpen(true)}
              className="flex-1 h-11 rounded-md bg-secondary/70 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <KeyRound className="h-4 w-4" /> Trocar senha
            </button>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-md bg-secondary/70 flex items-center justify-center"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
              <Button type="submit" disabled={saving} className="bg-gradient-primary">
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
              <Button type="submit" disabled={saving} className="bg-gradient-primary">
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
