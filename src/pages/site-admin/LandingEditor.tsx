import { useEffect, useRef, useState } from "react";
import { Globe, Loader2, Save, Upload, Trash2, ExternalLink, ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlanConfig } from "@/components/coach/PlanConfig";

type MediaKind = "coach" | "hero" | "logo" | "login" | "splash" | "app_preview";

interface TenantLanding {
  id: string;
  slug: string;
  nome: string;
  tagline: string | null;
  bio: string | null;
  cidade: string | null;
  estado: string | null;
  especialidades: string[] | null;
  logo_url: string | null;
  foto_url: string | null;
  hero_url: string | null;
  login_video_url: string | null;
  splash_video_url: string | null;
  app_preview_url: string | null;
}

const COLUMN_BY_KIND: Record<MediaKind, keyof TenantLanding> = {
  coach: "foto_url",
  hero: "hero_url",
  logo: "logo_url",
  login: "login_video_url",
  splash: "splash_video_url",
  app_preview: "app_preview_url",
};

const LandingEditor = () => {
  const { tenant: siteTenant } = useSiteTenant();
  const [data, setData] = useState<TenantLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<MediaKind | null>(null);

  const [nome, setNome] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [especialidades, setEspecialidades] = useState("");

  const load = async () => {
    if (!siteTenant?.id) return;
    setLoading(true);
    const { data: t, error } = await supabase
      .from("tenants")
      .select("id, slug, nome, tagline, bio, cidade, estado, especialidades, logo_url, foto_url, hero_url, login_video_url, splash_video_url, app_preview_url")
      .eq("id", siteTenant.id)
      .maybeSingle();
    if (error) toast.error(error.message);
    const row = (t as TenantLanding | null) || null;
    setData(row);
    setNome(row?.nome || "");
    setTagline(row?.tagline || "");
    setBio(row?.bio || "");
    setCidade(row?.cidade || "");
    setEstado(row?.estado || "");
    setEspecialidades((row?.especialidades || []).join(", "));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [siteTenant?.id]);

  const saveTextos = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({
      nome: nome.trim() || data.nome,
      tagline: tagline.trim() || null,
      bio: bio.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      especialidades: especialidades
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }).eq("id", data.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Landing atualizada"); void load(); }
  };

  const normalizeImage = (blob: Blob, maxDim: number, quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Erro ao processar imagem.")); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((out) => {
          URL.revokeObjectURL(url);
          out ? resolve(out) : reject(new Error("Erro ao gerar arquivo."));
        }, "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida.")); };
      img.src = url;
    });

  const handleUpload = async (file: File, kind: MediaKind) => {
    if (!data) return;
    setUploading(kind);
    try {
      const isImage = kind === "coach" || kind === "hero" || kind === "logo" || kind === "app_preview";
      let uploadFile: Blob = file;
      let ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      let contentType = file.type || "application/octet-stream";
      if (isImage) {
        uploadFile = await normalizeImage(file, kind === "hero" ? 1800 : 900, 0.84);
        ext = "jpg";
        contentType = "image/jpeg";
      }
      const path = `${data.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, uploadFile, { upsert: false, contentType });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(path);
      const finalUrl = isImage ? `${publicUrl}?v=${Date.now()}` : publicUrl;
      const { error: upErr } = await supabase.from("tenants")
        .update({ [COLUMN_BY_KIND[kind]]: finalUrl } as never)
        .eq("id", data.id);
      if (upErr) throw upErr;
      toast.success("Mídia atualizada!");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload.");
    } finally {
      setUploading(null);
    }
  };

  const clearMedia = async (kind: MediaKind) => {
    if (!data) return;
    const { error } = await supabase.from("tenants").update({ [COLUMN_BY_KIND[kind]]: null } as never).eq("id", data.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); await load(); }
  };

  return (
    <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
      <div className="flex items-center gap-2 text-primary/80">
        <Globe className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Landing page</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">APARÊNCIA & MÍDIAS</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Edite todo o conteúdo da sua página pública: textos, foto, logo, imagem de capa e vídeos.
      </p>
      <div className="h-px bg-primary/20 mb-6" />

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data ? (
        <p className="text-muted-foreground text-sm">Tenant não encontrado.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl">
          <section className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl text-primary uppercase tracking-wider">Textos da landing</h2>
            <div className="space-y-2">
              <Label>Nome do time / coach</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slogan / Tagline</Label>
              <Input value={tagline} maxLength={60} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: HIPERTROFIA & EMAGRECIMENTO" />
            </div>
            <div className="space-y-2">
              <Label>Bio / apresentação</Label>
              <Textarea rows={6} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte sua história, método e resultados." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Input value={estado} maxLength={2} onChange={(e) => setEstado(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Especialidades (separadas por vírgula)</Label>
              <Input value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} placeholder="Hipertrofia, Emagrecimento, Competição" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={saveTextos} disabled={saving} className="bg-gradient-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar landing
              </Button>
              <Button asChild variant="outline">
                <a href={`/${data.slug}?preview=1`} target="_blank" rel="noreferrer">
                  Ver landing pública <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            </div>
          </section>

          <section className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="font-display text-xl text-primary uppercase tracking-wider">Mídias</h2>
            <MediaSlot label="Foto do coach" hint="Aparece no topo da landing e nos cards." kind="coach" url={data.foto_url} uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
            <MediaSlot label="Imagem de capa (hero)" hint="Fundo principal da página pública." kind="hero" url={data.hero_url} uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
            <MediaSlot label="Logo" hint="Usada no painel, no app e no cabeçalho." kind="logo" url={data.logo_url} uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
            <MediaSlot label="Tela do celular (mockup)" hint="Imagem exibida dentro do celular na seção “Como funciona”." kind="app_preview" url={data.app_preview_url} uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
            <MediaSlot label="Vídeo de login" hint="Fundo da tela de login do seu app." kind="login" url={data.login_video_url} video uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
            <MediaSlot label="Vídeo de abertura (splash)" hint="Exibido ao abrir o app." kind="splash" url={data.splash_video_url} video uploading={uploading} onUpload={handleUpload} onClear={clearMedia} />
          </section>
        </div>
      )}

      {!loading && data && (
        <div className="max-w-6xl mt-8 bg-black/60 border border-white/10 rounded-2xl p-6">
          <h2 className="font-display text-xl text-primary uppercase tracking-wider mb-1">Planos da landing</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Os valores abaixo são os planos exibidos na sua página pública.
          </p>
          <PlanConfig />
        </div>
      )}
    </div>
  );
};

interface SlotProps {
  label: string;
  hint: string;
  kind: MediaKind;
  url: string | null;
  video?: boolean;
  uploading: MediaKind | null;
  onUpload: (file: File, kind: MediaKind) => void;
  onClear: (kind: MediaKind) => void;
}

const MediaSlot = ({ label, hint, kind, url, video, uploading, onUpload, onClear }: SlotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading === kind;
  return (
    <div className="flex gap-4 items-start">
      <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
        {url ? (
          video ? <video src={url} muted playsInline className="w-full h-full object-cover" />
                : <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          video ? <Video className="h-6 w-6 text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-muted-foreground mb-2">{hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {url ? "Trocar" : "Enviar"}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" onClick={() => onClear(kind)}>
              <Trash2 className="h-4 w-4 mr-2" /> Remover
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={video ? "video/*" : "image/*"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f, kind);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
};

export default LandingEditor;
