import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Upload, Users, Palette, LogOut, ImagePlus, Sparkles, Clapperboard, Wallet, ShieldCheck } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import heroDefault from "@/assets/hero-default.jpg";
import { IdentidadeVisual } from "@/components/admin/IdentidadeVisual";
import { VlogsAdmin } from "@/components/admin/VlogsAdmin";

interface Aluno { id: string; nome_completo: string | null; email: string | null; avatar_url: string | null; }

const AdminPanel = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tenant, refresh } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"hero" | "logo" | null>(null);
  const [nome, setNome] = useState("");
  const [tagline, setTagline] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [permiteAulaAvulsa, setPermiteAulaAvulsa] = useState(false);
  const [precoAulaAvulsa, setPrecoAulaAvulsa] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .is("tenant_id", null);
      setIsSuperAdmin(!!data && data.length > 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!tenant) return;
    setNome(tenant.nome);
    setTagline(tenant.tagline || "");
    setCidade(tenant.cidade || "");
    setEstado(tenant.estado || "");
    setPermiteAulaAvulsa(tenant.permite_aula_avulsa || false);
    setPrecoAulaAvulsa(tenant.preco_aula_avulsa?.toString() || "");
    void loadAlunos(tenant.id);
  }, [tenant]);

  const loadAlunos = async (tenantId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("perfis")
      .select("id, nome_completo, email, avatar_url")
      .eq("tenant_id", tenantId);
    setAlunos((data as Aluno[]) || []);
    setLoading(false);
  };

  const handleUpload = async (file: File, kind: "hero" | "logo") => {
    if (!tenant) return;
    setUploading(kind);
    const ext = file.name.split(".").pop();
    const path = `${tenant.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(path);
    const patch = kind === "hero" ? { hero_url: publicUrl } : { logo_url: publicUrl };
    const { error: upErr } = await supabase.from("tenants").update(patch).eq("id", tenant.id);
    if (upErr) toast.error(upErr.message);
    else { toast.success("Atualizado!"); await refresh(); }
    setUploading(null);
  };

  const handleSaveAppearance = async () => {
    if (!tenant) return;
    const { error } = await supabase.from("tenants").update({
      nome, 
      tagline,
      cidade,
      estado,
      permite_aula_avulsa: permiteAulaAvulsa,
      preco_aula_avulsa: precoAulaAvulsa ? parseFloat(precoAulaAvulsa) : null,
    }).eq("id", tenant.id);
    if (error) toast.error(error.message);
    else { toast.success("Dados salvos!"); await refresh(); }
  };

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <AdminBackButton 
            to={`/${slug}/app`} 
            confirmExit 
            exitMessage="Você voltará para a área do aluno. Deseja continuar?" 
          />
          <Logo size={32} />
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-widest border border-primary/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">Admin</span>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost">
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-black border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Você será desconectado do aplicativo. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl mb-2 text-white tracking-wider">PAINEL DO COACH</h1>
            <p className="text-muted-foreground">Gestão do tenant <strong className="text-primary">{tenant?.slug}</strong></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isSuperAdmin && (
              <Link to="/admin/coaches">
                <Button variant="outline" className="border-primary/40 bg-primary/10">
                  <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> Aprovar Coaches
                </Button>
              </Link>
            )}
            <Link to={`/${slug}/admin/atletas`}>
              <Button variant="outline" className="border-primary/40">
                <Users className="h-4 w-4 mr-2" /> Gerenciar Elenco
              </Button>
            </Link>
            <Link to={`/${slug}/admin/faturamento`}>
              <Button variant="outline" className="border-primary/40 h-auto py-2 px-4 flex flex-col items-start gap-0.5 bg-black/60 hover:bg-black/80">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-display text-base tracking-wide">FATURAMENTO</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Gestão financeira e saques</span>
              </Button>
            </Link>
            <Link to={`/${slug}/admin/base-conhecimento`}>
              <Button variant="outline" className="border-primary/40">
                <Sparkles className="h-4 w-4 mr-2" /> Base de Conhecimento IA
              </Button>
            </Link>
            <Link to={`/${slug}/admin/montar-treino`}>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" /> Montar Treino com IA
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="elenco">
          <TabsList className="mb-6">
            <TabsTrigger value="elenco"><Users className="h-4 w-4 mr-2" /> Elenco</TabsTrigger>
            <TabsTrigger value="aparencia"><Palette className="h-4 w-4 mr-2" /> Aparência</TabsTrigger>
            <TabsTrigger value="vlogs"><Clapperboard className="h-4 w-4 mr-2" /> Vlogs</TabsTrigger>
          </TabsList>

          <TabsContent value="elenco">
            <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
              <h2 className="font-display text-3xl mb-6 text-primary border-l-4 border-primary pl-4 uppercase tracking-wider">ALUNOS · {alunos.length}</h2>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : alunos.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum aluno vinculado ainda.</p>
              ) : (
                <div className="divide-y divide-border">
                  {alunos.map((a) => (
                    <Link
                      key={a.id}
                      to={`/${slug}/admin/atleta/${a.id}`}
                      className="flex items-center gap-4 py-3 hover:bg-secondary/40 -mx-2 px-2 rounded transition-colors"
                    >
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs">
                          {(a.nome_completo || a.email || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{a.nome_completo || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="aparencia">
            <Tabs defaultValue="visual">
              <TabsList className="mb-4">
                <TabsTrigger value="visual"><Sparkles className="h-3 w-3 mr-1" /> Identidade Visual</TabsTrigger>
                <TabsTrigger value="midia"><ImagePlus className="h-3 w-3 mr-1" /> Imagens & Textos</TabsTrigger>
              </TabsList>

              <TabsContent value="visual">
                <IdentidadeVisual />
              </TabsContent>

              <TabsContent value="midia">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Hero upload */}
                  <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                    <h3 className="font-display text-2xl mb-4 text-primary uppercase tracking-wider">IMAGEM DE FUNDO</h3>
                    <div className="aspect-video rounded-xl overflow-hidden border border-border mb-4 relative">
                      <img src={tenant?.hero_url || heroDefault} alt="" className="w-full h-full object-cover" />
                    </div>
                    <label className="block">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "hero")} />
                      <Button asChild disabled={uploading === "hero"}>
                        <span>{uploading === "hero" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Trocar imagem de fundo</>}</span>
                      </Button>
                    </label>
                  </div>

                  {/* Logo & textos */}
                  <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
                    <h3 className="font-display text-2xl text-primary uppercase tracking-wider">LOGO & TEXTOS</h3>
                    <div>
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3 mt-2">
                        {tenant?.logo_url ? (
                          <img src={tenant.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><ImagePlus className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <label className="flex-1">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
                          <Button asChild variant="outline" className="w-full" disabled={uploading === "logo"}>
                            <span>{uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar logo"}</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label>Nome do time</Label>
                      <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                    </div>
                    <div>
                      <Label>Tagline</Label>
                      <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cidade</Label>
                        <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: São Paulo" />
                      </div>
                      <div>
                        <Label>Estado (UF)</Label>
                        <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Ex: SP" maxLength={2} />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-display text-sm mb-3 uppercase tracking-wider text-primary">Aulas Avulsas</h4>
                      <div className="flex items-center gap-3 mb-4">
                        <input 
                          type="checkbox" 
                          id="aula-avulsa" 
                          checked={permiteAulaAvulsa} 
                          onChange={(e) => setPermiteAulaAvulsa(e.target.checked)}
                          className="w-4 h-4 accent-primary"
                        />
                        <Label htmlFor="aula-avulsa" className="cursor-pointer">Permitir venda de aula avulsa no marketplace</Label>
                      </div>
                      {permiteAulaAvulsa && (
                        <div>
                          <Label>Preço da Aula Avulsa (R$)</Label>
                          <Input 
                            type="number" 
                            value={precoAulaAvulsa} 
                            onChange={(e) => setPrecoAulaAvulsa(e.target.value)} 
                            placeholder="Ex: 150.00"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase">A plataforma retém 10% de taxa sobre este valor.</p>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleSaveAppearance} className="w-full">Salvar configurações</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="vlogs">
            <VlogsAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
