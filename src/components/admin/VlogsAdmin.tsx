import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Eye, EyeOff, Music2, Link as LinkIcon, Save, Video, Star, Upload, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { isDirectVideo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  buildYouTubeThumbnailUrl,
  detectVlogPlatform,
  extractVlogYouTubeId,
  isVlogVideoPageUrl,
  normalizeVlogUrl,
  prepareVlogUrl,
  type VlogPlatform,
} from "@/lib/vlog-url";

interface VlogPost {
  id: string;
  platform: VlogPlatform;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  author: string | null;
  posted_at: string | null;
  source: string;
  visivel: boolean;
  destaque: boolean;
  created_at: string;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p === "youtube") return <Video className="h-4 w-4 text-[hsl(0_85%_55%)]" />;
  if (p === "instagram") return <Video className="h-4 w-4 text-[hsl(330_85%_60%)]" />;
  if (p === "tiktok") return <Music2 className="h-4 w-4 text-foreground" />;
  return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
};

const normalizeInput = (raw: string) => prepareVlogUrl(raw) ?? raw.trim();

const isImageUrl = (value: string | null | undefined) => {
  if (!value?.trim()) return false;
  if (isVlogVideoPageUrl(value)) return false;
  return /^https?:\/\//i.test(value.trim());
};

export const VlogsAdmin = () => {
  const { tenant } = useBranding();
  const [posts, setPosts] = useState<VlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [thumbInput, setThumbInput] = useState("");

  // YouTube sync config
  const [ytChannelId, setYtChannelId] = useState("");
  const [ytConfigured, setYtConfigured] = useState(false);
  const [ytSyncing, setYtSyncing] = useState(false);
  // Instagram Graph API config
  const [igToken, setIgToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [showIgToken, setShowIgToken] = useState(false);
  const [igConfigured, setIgConfigured] = useState(false);
  const [igSyncing, setIgSyncing] = useState(false);
  // Upload direto
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [vlogTitle, setVlogTitle] = useState("");

  const load = async () => {
    if (!tenant) return;
    setLoading(true);
    const [{ data: list }, { data: t }] = await Promise.all([
      supabase
        .from("vlog_posts")
        .select("id, platform, url, title, thumbnail_url, author, posted_at, source, visivel, destaque, created_at")
        .eq("tenant_id", tenant.id)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("tenants_private" as any).select("instagram_access_token, instagram_business_account_id, youtube_channel_id").eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    const rows = (list as VlogPost[]) || [];
    const normalizedRows = rows.map((r) => {
      if (r.platform !== "youtube") return r;
      const ytId = extractVlogYouTubeId(r.url) || extractVlogYouTubeId(r.thumbnail_url);
      if (!ytId) return r;
      return {
        ...r,
        url: `https://www.youtube.com/watch?v=${ytId}`,
        thumbnail_url: buildYouTubeThumbnailUrl(ytId),
        source: "import",
      };
    });
    setPosts(normalizedRows);
    // Backfill: corrige URL/thumbnail/source de vlogs do YouTube salvos por versões antigas.
    const missingYt = rows.filter((r) => {
      if (r.platform !== "youtube") return false;
      const ytId = extractVlogYouTubeId(r.url) || extractVlogYouTubeId(r.thumbnail_url);
      if (!ytId) return false;
      return !extractVlogYouTubeId(r.url) || !r.thumbnail_url || isVlogVideoPageUrl(r.thumbnail_url) || r.source !== "import";
    });
    if (missingYt.length) {
      await Promise.all(
        missingYt.map((r) => {
          const ytId = extractVlogYouTubeId(r.url) || extractVlogYouTubeId(r.thumbnail_url);
          if (!ytId) return Promise.resolve();
          const thumb = buildYouTubeThumbnailUrl(ytId);
          return supabase
            .from("vlog_posts")
            .update({ url: `https://www.youtube.com/watch?v=${ytId}`, thumbnail_url: thumb, source: "import" })
            .eq("id", r.id)
            .then(() => {});
        })
      );
    }
    const tp = (t as unknown) as {
      instagram_access_token?: string;
      instagram_business_account_id?: string;
      youtube_channel_id?: string;
    } | null;
    setIgToken(tp?.instagram_access_token ?? "");
    setIgAccountId(tp?.instagram_business_account_id ?? "");
    setIgConfigured(!!(tp?.instagram_access_token && tp?.instagram_business_account_id));
    setYtChannelId(tp?.youtube_channel_id ?? "");
    setYtConfigured(!!tp?.youtube_channel_id?.trim());
    setLoading(false);
  };

  const resolveThumb = (p: VlogPost): string | null => {
    if (p.thumbnail_url && !isVlogVideoPageUrl(p.thumbnail_url)) return p.thumbnail_url;
    if (p.platform === "youtube") {
      const ytId = extractVlogYouTubeId(p.url) || extractVlogYouTubeId(p.thumbnail_url);
      if (ytId) return buildYouTubeThumbnailUrl(ytId);
    }
    return null;
  };

  const displaySource = (p: VlogPost) => {
    if ((p.source === "manual" || !p.source) && isVlogVideoPageUrl(p.url)) return "import";
    return p.source || "import";
  };

  const importExternalVlog = async (rawLink: string, successMessage = "Vlog importado!") => {
    if (busy) return;
    const prepared = prepareVlogUrl(rawLink);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do vídeo.");
      return;
    }
    const cleanUrl = normalizeVlogUrl(prepared);
    setUrl(cleanUrl);
    setBusy(true);
    const added = await addManualVlog(cleanUrl, {
      useThumbInput: true,
      source: "import",
      successMessage,
    });
    setBusy(false);
    if (!added) return;
    setUrl("");
    setThumbInput("");
    void load();
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const fetchOEmbed = async (platform: string, link: string): Promise<{ title?: string; thumbnail_url?: string; author_name?: string } | null> => {
    try {
      let endpoint: string | null = null;
      if (platform === "youtube") endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`;
      else if (platform === "tiktok") endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`;
      else if (platform === "instagram") endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.instagram.com/api/v1/oembed/?url=${link}`)}`;
      if (!endpoint) return null;
      const r = await fetch(endpoint);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  const addManualVlog = async (
    rawLink: string,
    options: { thumbnail?: string | null; successMessage?: string; useThumbInput?: boolean; source?: string } = {},
  ) => {
    if (!tenant || !rawLink.trim()) return false;
    const thumbVideoId = options.useThumbInput ? extractVlogYouTubeId(thumbInput) : null;
    const prepared = prepareVlogUrl(rawLink) || (thumbVideoId ? `https://www.youtube.com/watch?v=${thumbVideoId}` : null);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do Reel, post ou vídeo.");
      return false;
    }
    let cleanUrl = normalizeVlogUrl(prepared);
    let platform = detectVlogPlatform(cleanUrl);
    if (platform === "youtube" && !extractVlogYouTubeId(cleanUrl) && thumbVideoId) {
      cleanUrl = `https://www.youtube.com/watch?v=${thumbVideoId}`;
      platform = "youtube";
    }
    if (platform === "youtube" && !extractVlogYouTubeId(cleanUrl)) {
      toast.error("Link do YouTube incompleto. Cole a URL completa do vídeo.");
      return false;
    }

    // Auto-enriquecimento: busca apenas thumb/autor via oEmbed (NUNCA título automático)
    const oe = await fetchOEmbed(platform, cleanUrl);
    const manualThumb = options.useThumbInput && isImageUrl(thumbInput) ? thumbInput.trim() : "";
    let thumb: string | null = manualThumb || options.thumbnail || oe?.thumbnail_url || null;
    const author: string | null = oe?.author_name || null;

    // Fallback YouTube: thumb direta pelo ID
    if (!thumb && platform === "youtube") {
      const ytId = extractVlogYouTubeId(cleanUrl) || thumbVideoId;
      if (ytId) thumb = buildYouTubeThumbnailUrl(ytId);
    }

    // Fallback Instagram: usa serviço de screenshot público (microlink)
    if (!thumb && platform === "instagram") {
      thumb = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
    }

    const { data: saved, error } = await supabase.from("vlog_posts").upsert(
      {
        tenant_id: tenant.id,
        url: cleanUrl,
        platform,
        title: null,
        thumbnail_url: thumb,
        author,
        source: options.source ?? "import",
        posted_at: new Date().toISOString(),
        visivel: true,
      },
      { onConflict: "tenant_id,url" }
    ).select("id").single();
    if (error) {
      const message = /row-level security|permission|violates/i.test(error.message)
        ? `Sem permissão para salvar vlogs em ${tenant.nome}. Entre com o login do coach deste tenant.`
        : error.message;
      toast.error(message);
      return false;
    }
    if (!saved?.id) {
      toast.error("Não foi possível confirmar o salvamento do vlog. Tente novamente.");
      return false;
    }
      toast.success(options.successMessage ?? "Vlog importado direto para os Vlogs!");
    return true;
  };

  const handleAdd = async () => {
    if (!tenant || !url.trim()) return;
    const thumbVideoId = extractVlogYouTubeId(thumbInput);
    const prepared = prepareVlogUrl(url) || (thumbVideoId ? `https://www.youtube.com/watch?v=${thumbVideoId}` : null);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do Reel, post ou vídeo.");
      return;
    }
    setBusy(true);
    const added = await addManualVlog(prepared, {
      useThumbInput: true,
      source: "import",
      successMessage: "Vlog importado direto para os Vlogs!",
    });
    setBusy(false);
    if (!added) return;
    setUrl("");
    setThumbInput("");
    void load();
  };

  const toggleDestaque = async (p: VlogPost) => {
    if (!tenant) return;
    if (!p.destaque) {
      // limpa qualquer outro destaque do mesmo tenant
      await supabase.from("vlog_posts").update({ destaque: false }).eq("tenant_id", tenant.id).eq("destaque", true);
    }
    const { error } = await supabase.from("vlog_posts").update({ destaque: !p.destaque }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.destaque ? "Definido como capa" : "Capa removida — voltando ao automático");
    void load();
  };

  const toggleVisible = async (p: VlogPost) => {
    const { error } = await supabase.from("vlog_posts").update({ visivel: !p.visivel }).eq("id", p.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (p: VlogPost) => {
    if (!confirm("Remover este vlog?")) return;
    const { error } = await supabase.from("vlog_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    void load();
  };

  const saveIgConfig = async () => {
    if (!tenant) return;
    const { error } = await supabase
      .from("tenants_private" as any)
      .upsert({
        tenant_id: tenant.id,
        instagram_access_token: igToken.trim() || null,
        instagram_business_account_id: igAccountId.trim() || null,
      });
    if (error) return toast.error(error.message);
    toast.success("Credenciais do Instagram salvas");
    void load();
  };

  const saveYtConfig = async () => {
    if (!tenant) return;
    const { error } = await supabase
      .from("tenants_private" as any)
      .upsert({
        tenant_id: tenant.id,
        youtube_channel_id: ytChannelId.trim() || null,
      });
    if (error) return toast.error(error.message);
    toast.success("Canal YouTube salvo");
    void load();
  };

  const syncYoutubeVideos = async () => {
    if (!tenant || !ytConfigured) {
      toast.error("Configure o canal YouTube antes de sincronizar.");
      return;
    }
    setYtSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-sync-videos", {
        body: { tenant_id: tenant.id, limit: 25 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      const imported = Number(data?.imported ?? 0);
      const updated = Number(data?.updated ?? 0);
      const fetched = Number(data?.fetched ?? 0);
      toast.success(
        fetched
          ? `Vídeos sincronizados: ${imported} novo(s), ${updated} atualizado(s).`
          : "Nenhum vídeo encontrado no canal.",
      );
      void load();
    } catch (err: any) {
      console.error("[VlogsAdmin] youtube-sync-videos:", err);
      toast.error(err?.message || "Falha ao sincronizar vídeos do YouTube.");
    } finally {
      setYtSyncing(false);
    }
  };

  const syncInstagramReels = async () => {
    if (!tenant || !igConfigured) {
      toast.error("Configure o Instagram Business antes de sincronizar.");
      return;
    }
    setIgSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-sync-reels", {
        body: { tenant_id: tenant.id, limit: 25 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      const imported = Number(data?.imported ?? 0);
      const updated = Number(data?.updated ?? 0);
      const fetched = Number(data?.fetched ?? 0);
      toast.success(
        fetched
          ? `Reels sincronizados: ${imported} novo(s), ${updated} atualizado(s).`
          : "Nenhum Reel encontrado na conta.",
      );
      void load();
    } catch (err: any) {
      console.error("[VlogsAdmin] instagram-sync-reels:", err);
      toast.error(err?.message || "Falha ao sincronizar Reels do Instagram.");
    } finally {
      setIgSyncing(false);
    }
  };

  const handleFileUpload = async () => {
    if (!tenant || !videoFile) return;
    setUploading(true);
    try {
      // 1. Upload Video
      const videoExt = videoFile.name.split(".").pop();
      const videoPath = `${tenant.id}/${Date.now()}-vlog.${videoExt}`;
      const { error: vErr } = await supabase.storage.from("vlog_videos").upload(videoPath, videoFile);
      if (vErr) throw vErr;
      const { data: vUrl } = supabase.storage.from("vlog_videos").getPublicUrl(videoPath);

      // 2. Upload Thumb (optional)
      let finalThumb = null;
      if (thumbFile) {
        const thumbExt = thumbFile.name.split(".").pop();
        const thumbPath = `${tenant.id}/${Date.now()}-thumb.${thumbExt}`;
        const { error: tErr } = await supabase.storage.from("vlog_videos").upload(thumbPath, thumbFile);
        if (tErr) throw tErr;
        const { data: tUrl } = supabase.storage.from("vlog_videos").getPublicUrl(thumbPath);
        finalThumb = tUrl.publicUrl;
      }

      // 3. Insert into DB
      const { error: dbErr } = await supabase.from("vlog_posts").insert({
        tenant_id: tenant.id,
        url: vUrl.publicUrl,
        platform: "other",
        title: vlogTitle.trim() || null,
        thumbnail_url: finalThumb,
        source: "upload",
        posted_at: new Date().toISOString(),
        visivel: true,
      });
      if (dbErr) throw dbErr;

      toast.success("Vlog enviado com sucesso!");
      setVideoFile(null);
      setThumbFile(null);
      setVlogTitle("");
      void load();
    } catch (e: any) {
      toast.error("Falha no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Automação externa e tutoriais de Zapier/Make removidos — a estruturar */}

        {/* Link import — primeira opção */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-4 text-primary">IMPORTAR LINK DE VÍDEO</h3>
        <div className="grid gap-3 items-end">
          <div>
            <Label>URL (YouTube, Instagram, TikTok…)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                const prepared = prepareVlogUrl(pasted);
                if (!prepared) return;
                e.preventDefault();
                void importExternalVlog(prepared);
              }}
              onBlur={() => {
                const normalized = normalizeInput(url);
                if (normalized !== url.trim()) setUrl(normalized);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div>
            <Label>Thumbnail (opcional · somente URL de imagem)</Label>
            <Input value={thumbInput} onChange={(e) => setThumbInput(e.target.value)} placeholder="https://...jpg — útil para Instagram" />
            <p className="text-[11px] text-muted-foreground mt-1">
              YouTube gera capa automática. Para Instagram/TikTok, cole uma imagem ou usamos um screenshot automático.
            </p>
          </div>
          <Button onClick={handleAdd} disabled={busy || !url.trim()} className="bg-gradient-primary shadow-glow">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Importar</>}
          </Button>
        </div>
      </div>
      {/* IG Graph API config */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary flex items-center gap-2">
          <Video className="h-6 w-6" /> INSTAGRAM — PUBLICAR E SINCRONIZAR REELS
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Conecte a conta Business do coach para <b>publicar Reels</b> e <b>importar automaticamente</b> os últimos Reels para os Vlogs dos alunos.
          Requer token de longa duração + permissões de leitura/publicação na Meta.{" "}
          <a href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media" target="_blank" rel="noreferrer" className="text-primary underline">
            Graph API — Media
          </a>
        </p>

        <Label className="text-xs uppercase tracking-wider">Instagram Business Account ID</Label>
        <Input
          value={igAccountId}
          onChange={(e) => setIgAccountId(e.target.value)}
          placeholder="17841400000000000"
          className="font-mono text-xs mt-1.5"
        />

        <Label className="text-xs uppercase tracking-wider mt-4 block">Access Token (longa duração)</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={igToken}
            onChange={(e) => setIgToken(e.target.value)}
            type={showIgToken ? "text" : "password"}
            placeholder="EAAB..."
            className="font-mono text-xs"
          />
          <Button variant="outline" size="icon" onClick={() => setShowIgToken((v) => !v)}>
            {showIgToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <Button onClick={saveIgConfig} className="bg-gradient-primary shadow-glow mt-4 w-full">
          <Save className="h-4 w-4 mr-2" /> Salvar credenciais
        </Button>
        <Button
          onClick={() => void syncInstagramReels()}
          disabled={!igConfigured || igSyncing}
          variant="outline"
          className="mt-3 w-full border-primary/40 hover:bg-primary/10"
        >
          {igSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar últimos Reels
        </Button>
        {igConfigured && <p className="text-xs text-green-500 mt-2">✓ Instagram conectado</p>}
      </div>

      {/* YouTube sync */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary flex items-center gap-2">
          <Video className="h-6 w-6 text-[hsl(0_85%_55%)]" /> YOUTUBE — SINCRONIZAR VÍDEOS
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Conecte o canal do coach para <b>importar automaticamente</b> os últimos vídeos (inclui Shorts) para os Vlogs dos alunos.
          Cole o <b>Channel ID</b> (UC…) ou o <b>@handle</b> do canal.{" "}
          <a
            href="https://support.google.com/youtube/answer/3250431"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Como encontrar o Channel ID
          </a>
        </p>

        <Label className="text-xs uppercase tracking-wider">Canal YouTube (Channel ID ou @handle)</Label>
        <Input
          value={ytChannelId}
          onChange={(e) => setYtChannelId(e.target.value)}
          placeholder="UCxxxxxxxxxxxxxxxx ou @seucanal"
          className="font-mono text-xs mt-1.5"
        />

        <Button onClick={saveYtConfig} className="bg-gradient-primary shadow-glow mt-4 w-full">
          <Save className="h-4 w-4 mr-2" /> Salvar canal
        </Button>
        <Button
          onClick={() => void syncYoutubeVideos()}
          disabled={!ytConfigured || ytSyncing}
          variant="outline"
          className="mt-3 w-full border-primary/40 hover:bg-primary/10"
        >
          {ytSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar últimos vídeos
        </Button>
        {ytConfigured && <p className="text-xs text-green-500 mt-2">✓ YouTube configurado</p>}
      </div>

      {/* Upload direto */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-4 text-primary flex items-center gap-2">
          <Upload className="h-6 w-6" /> ENVIAR VÍDEO (UPLOAD)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Suba o arquivo de vídeo e uma imagem de capa diretamente para o nosso servidor.
        </p>

        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Arquivo de Vídeo (MP4, MOV)</Label>
              <div className="relative group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className={cn(
                  "flex items-center gap-3 p-3 border border-dashed rounded-lg transition-all",
                  videoFile ? "border-primary/50 bg-primary/5" : "border-white/20 hover:border-primary/30"
                )}>
                  <Video className={cn("h-5 w-5", videoFile ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm truncate">
                    {videoFile ? videoFile.name : "Clique para selecionar o vídeo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Thumbnail / Capa (PNG, JPG)</Label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className={cn(
                  "flex items-center gap-3 p-3 border border-dashed rounded-lg transition-all",
                  thumbFile ? "border-primary/50 bg-primary/5" : "border-white/20 hover:border-primary/30"
                )}>
                  <Star className={cn("h-5 w-5", thumbFile ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm truncate">
                    {thumbFile ? thumbFile.name : "Clique para selecionar a capa"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Título do Episódio (opcional)</Label>
            <Input 
              value={vlogTitle} 
              onChange={(e) => setVlogTitle(e.target.value)} 
              placeholder="Ex: Bastidores do Treino #01" 
            />
          </div>

          <Button 
            onClick={handleFileUpload} 
            disabled={uploading || !videoFile} 
            className="bg-gradient-primary shadow-glow h-12"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Iniciar Upload</>
            )}
          </Button>
        </div>
      </div>


      {/* List */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-6 text-primary border-l-4 border-primary pl-4">VLOGS · {posts.length}</h3>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Nenhum vlog ainda. Importe um link de vídeo ou envie um upload.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden bg-background/40">
                <div className="block aspect-video bg-muted relative overflow-hidden">
                  {(() => {
                    const ytId = extractVlogYouTubeId(p.url) || extractVlogYouTubeId(p.thumbnail_url);
                    if (ytId) {
                      const thumb = buildYouTubeThumbnailUrl(ytId);
                      return (
                        <>
                          <img src={thumb} alt={p.title || "Vlog do YouTube"} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                              <Play className="h-5 w-5 fill-current" />
                            </span>
                          </div>
                        </>
                      );
                    }
                    if (isDirectVideo(p.url)) {
                      return (
                        <video
                          src={`${p.url}#t=0.1`}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          className="w-full h-full object-cover"
                        />
                      );
                    }
                    const thumb = resolveThumb(p);
                    if (thumb) return <img src={thumb} alt="" className="w-full h-full object-cover" />;
                    return (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        sem preview
                      </div>
                    );
                  })()}
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded px-2 py-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <PlatformIcon p={p.platform} /> {p.platform}
                  </div>
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded px-2 py-1 text-[10px] uppercase">
                    {displaySource(p)}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {p.author && <p className="text-xs text-muted-foreground">@{p.author}</p>}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant={p.destaque ? "default" : "outline"}
                      onClick={() => toggleDestaque(p)}
                      className="flex-1"
                      title={p.destaque ? "Capa fixa — clique para voltar ao automático" : "Usar este vídeo como capa do app"}
                    >
                      <Star className={`h-3 w-3 mr-1 ${p.destaque ? "fill-current" : ""}`} />
                      {p.destaque ? "Capa" : "Definir capa"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleVisible(p)}>
                      {p.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
