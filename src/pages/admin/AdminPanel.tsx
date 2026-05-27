import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Upload, Users, Palette, LogOut, ImagePlus, Sparkles, Clapperboard, ShieldCheck, CalendarClock, Save, Dumbbell, Apple, Stethoscope } from "lucide-react";
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
import heic2any from "heic2any";

interface Aluno { id: string; nome_completo: string | null; email: string | null; avatar_url: string | null; }

const AdminPanel = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get("tab") || "aparencia";
  const { user, signOut } = useAuth();
  const { tenant, refresh } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"hero" | "logo" | "splash" | "login" | null>(null);
  const [nome, setNome] = useState("");
  const [tagline, setTagline] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
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

  const handleUpload = async (file: File, kind: "hero" | "logo" | "splash" | "login") => {
    if (!tenant) return;
    setUploading(kind);
    const isImage = kind === "hero" || kind === "logo";
    const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    let uploadFile: Blob = file;
    let ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    let contentType = file.type || "application/octet-stream";
    
    if (isImage) {
      try {
        const source = isHeic
          ? await withTimeout(
              heic2any({ blob: file, toType: "image/jpeg", quality: 0.82 }) as Promise<Blob | Blob[]>,
              45000,
              "A conversão demorou demais. Tente uma imagem JPG."
            )
          : file;
        uploadFile = await withTimeout(
          normalizeImage(Array.isArray(source) ? source[0] : source, kind === "logo" ? 900 : 1800, 0.84),
          45000,
          "O processamento da imagem demorou demais."
        );
        ext = "jpg";
        contentType = "image/jpeg";
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Não foi possível preparar a imagem. Tente JPG, PNG ou WEBP.");
        setUploading(null);
        return;
      }
    }
    
    const path = `${tenant.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, uploadFile, { upsert: false, contentType });
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(path);
    const finalUrl = isImage ? `${publicUrl}?v=${Date.now()}` : publicUrl;
    const patch =
      kind === "hero" ? { hero_url: finalUrl } :
      kind === "logo" ? { logo_url: finalUrl } :
      kind === "login" ? { login_video_url: publicUrl } :
      { splash_video_url: publicUrl };
    const { error: upErr } = await supabase.from("tenants").update(patch).eq("id", tenant.id);
    if (upErr) toast.error(upErr.message);
    else { toast.success("Atualizado!"); await refresh(); }
    setUploading(null);
  };

  const normalizeImage = (blob: Blob, maxDim: number, quality: number): Promise<Blob> => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error("Erro ao criar contexto de imagem."));
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((out) => {
          URL.revokeObjectURL(url);
          if (out) resolve(out);
          else reject(new Error("Erro ao gerar arquivo final."));
        }, "image/jpeg", quality);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida ou não suportada.")); };
    img.src = url;
  });

  const handleSaveAppearance = async () => {
    if (!tenant) return;
    const { error } = await supabase.from("tenants").update({
      nome, 
      tagline,
      cidade,
      estado,
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
            <Link to={`/${slug}/admin/base-conhecimento`}>
              <Button variant="outline" className="border-primary/40">
                <Sparkles className="h-4 w-4 mr-2" /> Base de Conhecimento IA
              </Button>
            </Link>
          </div>
        </div>


        <Tabs value={tabValue} onValueChange={(v) => setSearchParams({ tab: v })}>

          <TabsList className="mb-6">
            <TabsTrigger value="aparencia"><Palette className="h-4 w-4 mr-2" /> Aparência</TabsTrigger>
            <TabsTrigger value="vlogs"><Clapperboard className="h-4 w-4 mr-2" /> Vlogs</TabsTrigger>
          </TabsList>


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
                <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                  <div className="space-y-6">
                    {/* Hero / Login background */}
                    <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                      <h3 className="font-display text-2xl mb-2 text-primary uppercase tracking-wider">FUNDO DA TELA DE LOGIN</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Aparece atrás da tela de login do seu app. Você pode usar uma <strong>imagem</strong> <strong>OU</strong> enviar um <strong>vídeo</strong> em loop. Se houver vídeo, ele tem prioridade sobre a imagem. No celular e tablet, o vídeo se adapta dentro do container.
                      </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Imagem */}
                      <div className="space-y-3">
                        <div className="aspect-video rounded-xl overflow-hidden border border-border relative bg-black">
                          <img src={tenant?.hero_url || heroDefault} alt="" className="w-full h-full object-cover" />
                        </div>
                        <label className="block">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "hero")} />
                          <Button asChild variant="outline" className="w-full" disabled={uploading === "hero"}>
                            <span>{uploading === "hero" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImagePlus className="h-4 w-4 mr-2" /> Trocar imagem de fundo</>}</span>
                          </Button>
                        </label>
                      </div>
                      {/* Vídeo */}
                      <div className="space-y-3">
                        <div className="aspect-video rounded-xl overflow-hidden border border-border relative bg-black flex items-center justify-center">
                          {tenant?.login_video_url ? (
                            <video src={tenant.login_video_url} muted playsInline controls className="w-full h-full object-cover" />
                          ) : (
                            <p className="text-xs text-muted-foreground px-4 text-center">Sem vídeo · usará a imagem acima</p>
                          )}
                        </div>
                        <label className="block">
                          <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "login")} />
                          <Button asChild className="w-full" disabled={uploading === "login"}>
                            <span>{uploading === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Enviar vídeo de fundo</>}</span>
                          </Button>
                        </label>
                        {tenant?.login_video_url && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={async () => {
                              if (!tenant) return;
                              const { error } = await supabase.from("tenants").update({ login_video_url: null }).eq("id", tenant.id);
                              if (error) toast.error(error.message);
                              else { toast.success("Vídeo removido"); await refresh(); }
                            }}
                          >
                            Remover vídeo (usar imagem)
                          </Button>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Dica: MP4 ≤ 8MB, sem áudio, em loop.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Splash (logo do tenant ou vídeo de abertura) */}
                  <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                    <h3 className="font-display text-2xl mb-2 text-primary uppercase tracking-wider">TELA DE ABERTURA (SPLASH)</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Aparece por alguns segundos quando o aluno entra no app. Você pode usar apenas a sua <strong>logo</strong> (já configurada ao lado) <strong>OU</strong> enviar um <strong>vídeo curto</strong> (5–8s, MP4, sem áudio). Se o vídeo for enviado, ele tem prioridade.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="aspect-video rounded-xl overflow-hidden border border-border relative bg-black flex items-center justify-center p-8">
                          {tenant?.logo_url ? <img src={tenant.logo_url} alt="" className="max-w-full max-h-full object-contain" /> : <Logo size={64} />}
                        </div>
                        <label className="block">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
                          <Button asChild variant="outline" className="w-full" disabled={uploading === "logo"}>
                            <span>{uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImagePlus className="h-4 w-4 mr-2" /> Alterar Logo</>}</span>
                          </Button>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className="aspect-video rounded-xl overflow-hidden border border-border relative bg-black flex items-center justify-center">
                          {tenant?.splash_video_url ? (
                            <video src={tenant.splash_video_url} muted playsInline controls className="w-full h-full object-cover" />
                          ) : (
                            <p className="text-xs text-muted-foreground px-4 text-center">Sem vídeo · usará a logo ao lado</p>
                          )}
                        </div>
                        <label className="block">
                          <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "splash")} />
                          <Button asChild className="w-full" disabled={uploading === "splash"}>
                            <span>{uploading === "splash" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Enviar vídeo de abertura</>}</span>
                          </Button>
                        </label>
                        {tenant?.splash_video_url && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={async () => {
                              if (!tenant) return;
                              const { error } = await supabase.from("tenants").update({ splash_video_url: null }).eq("id", tenant.id);
                              if (error) toast.error(error.message);
                              else { toast.success("Vídeo removido"); await refresh(); }
                            }}
                          >
                            Remover vídeo (usar logo)
                          </Button>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Dica: Vídeo curto (máx 8s), MP4 leve.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Outros dados */}
                  <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md lg:col-span-2">
                    <h3 className="font-display text-2xl mb-4 text-primary uppercase tracking-wider">DADOS DO TIME</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do Time</Label>
                          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-secondary/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>Slogan / Tagline</Label>
                          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: A elite do treinamento" className="bg-secondary/40" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className="bg-secondary/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado (UF)</Label>
                            <Input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} className="bg-secondary/40 uppercase" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleSaveAppearance} className="w-full mt-8 bg-gradient-primary shadow-glow font-bold uppercase tracking-widest">
                      <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vlogs">
                <VlogsAdmin />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;