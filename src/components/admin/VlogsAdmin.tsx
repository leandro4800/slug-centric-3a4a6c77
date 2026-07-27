import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Copy, RefreshCw, Eye, EyeOff, Music2, Link as LinkIcon, Download, Send, Save, Share2, AlertTriangle, Video, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";
import { isDirectVideo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  buildYouTubeThumbnailUrl,
  detectVlogPlatform,
  extractVlogYouTubeId,
  isDownloadableVlogUrl,
  isVlogVideoPageUrl,
  normalizeVlogUrl,
  prepareVlogUrl,
  type VlogPlatform,
} from "@/lib/vlog-url";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";

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
  const { tenant, refresh } = useBranding();
  const [posts, setPosts] = useState<VlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [thumbInput, setThumbInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  // Instagram Graph API config
  const [igToken, setIgToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [showIgToken, setShowIgToken] = useState(false);
  const [igConfigured, setIgConfigured] = useState(false);

  // Download + auto-publish
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadedVideoUrl, setDownloadedVideoUrl] = useState<string | null>(null);
  const [publishCaption, setPublishCaption] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // Upload direto
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [vlogTitle, setVlogTitle] = useState("");

  const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "";
  const webhookUrl = `https://${projectRef}.functions.supabase.co/vlog-ingest`;

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
      supabase.from("tenants_private" as any).select("vlog_webhook_secret, instagram_access_token, instagram_business_account_id").eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    const rows = (list as VlogPost[]) || [];
    setPosts(rows);
    // Backfill: preenche thumbnail_url ausente em vlogs do YouTube usando o próprio ID do vídeo
    const missingYt = rows.filter((r) => (!r.thumbnail_url || isVlogVideoPageUrl(r.thumbnail_url)) && r.platform === "youtube");
    if (missingYt.length) {
      await Promise.all(
        missingYt.map((r) => {
          const ytId = extractVlogYouTubeId(r.url);
          if (!ytId) return Promise.resolve();
          const thumb = buildYouTubeThumbnailUrl(ytId);
          return supabase.from("vlog_posts").update({ thumbnail_url: thumb }).eq("id", r.id).then(() => {});
        })
      );
      setPosts(rows.map((r) => {
        if ((r.thumbnail_url && !isVlogVideoPageUrl(r.thumbnail_url)) || r.platform !== "youtube") return r;
        const ytId = extractVlogYouTubeId(r.url);
        return ytId ? { ...r, thumbnail_url: buildYouTubeThumbnailUrl(ytId) } : r;
      }));
    }
    const tp = (t as unknown) as { vlog_webhook_secret?: string; instagram_access_token?: string; instagram_business_account_id?: string } | null;
    setSecret(tp?.vlog_webhook_secret ?? null);
    setIgToken(tp?.instagram_access_token ?? "");
    setIgAccountId(tp?.instagram_business_account_id ?? "");
    setIgConfigured(!!(tp?.instagram_access_token && tp?.instagram_business_account_id));
    setLoading(false);
  };

  const resolveThumb = (p: VlogPost): string | null => {
    if (p.thumbnail_url && !isVlogVideoPageUrl(p.thumbnail_url)) return p.thumbnail_url;
    if (p.platform === "youtube") {
      const ytId = extractVlogYouTubeId(p.url);
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
    if (!prepared) return;
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
    const prepared = prepareVlogUrl(rawLink);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do Reel, post ou vídeo.");
      return false;
    }
    const cleanUrl = normalizeVlogUrl(prepared);
    const platform = detectVlogPlatform(cleanUrl);

    // Auto-enriquecimento: busca apenas thumb/autor via oEmbed (NUNCA título automático)
    const oe = await fetchOEmbed(platform, cleanUrl);
    const manualThumb = options.useThumbInput && isImageUrl(thumbInput) ? thumbInput.trim() : "";
    let thumb: string | null = manualThumb || options.thumbnail || oe?.thumbnail_url || null;
    const author: string | null = oe?.author_name || null;

    // Fallback YouTube: thumb direta pelo ID
    if (!thumb && platform === "youtube") {
      const ytId = extractVlogYouTubeId(cleanUrl);
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
    toast.success(options.successMessage ?? "Vlog adicionado!");
    return true;
  };

  const handleAdd = async () => {
    if (!tenant || !url.trim()) return;
    const prepared = prepareVlogUrl(url);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do Reel, post ou vídeo.");
      return;
    }
    const cleanUrl = normalizeVlogUrl(prepared);
    setBusy(true);
    const added = await addManualVlog(url, {
      useThumbInput: true,
      source: "import",
      successMessage: "Vlog importado!",
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

  const rotateSecret = async () => {
    if (!tenant) return;
    if (!confirm("Gerar novo segredo? Suas automações antigas vão parar até atualizarem o segredo.")) return;
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabase.from("tenants_private" as any).upsert({ tenant_id: tenant.id, vlog_webhook_secret: newSecret });
    if (error) return toast.error(error.message);
    toast.success("Novo segredo gerado");
    await refresh();
    void load();
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copiado`);
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

  const runDownload = async (sourceUrl: string) => {
    if (!tenant) return;
    const prepared = prepareVlogUrl(sourceUrl);
    if (!prepared) {
      toast.error("URL inválida. Cole o link completo do Instagram, TikTok ou YouTube.");
      return;
    }
    const normalized = normalizeVlogUrl(prepared);
    if (!isDownloadableVlogUrl(normalized)) {
      toast.error("Plataforma não suportada para download automático.");
      return;
    }

    setDownloadUrl(normalized);
    setDownloading(true);
    setDownloadedVideoUrl(null);
    try {
      const data = await invokeEdgeFunction<{
        video_url?: string;
        platform?: string;
        source_url?: string;
      }>("vlog-download", {
        url: normalized,
        tenant_id: tenant.id,
      });
      if (!data?.video_url) throw new Error("Resposta sem URL do vídeo.");
      setDownloadedVideoUrl(data.video_url);
      toast.success("Vídeo baixado! Pronto pra publicar ou baixar manualmente.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao baixar";
      const shouldAddManualFallback = /serviço público de download|adicionar link manual|download está instável/i.test(message);
      if (shouldAddManualFallback) {
        const added = await addManualVlog(downloadUrl, {
          source: "import",
          successMessage: "Download instável no momento; o link foi adicionado aos Vlogs.",
        });
        if (added) {
          setDownloadUrl("");
          void load();
        }
        return;
      }
      toast.error(message.includes("non-2xx") ? "Função vlog-download indisponível. Faça deploy no Supabase." : message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl.trim()) return;
    await runDownload(downloadUrl);
  };

  const handlePublishIG = async () => {
    if (!tenant || !downloadedVideoUrl) return;
    if (!igConfigured) return toast.error("Configure o Instagram Access Token primeiro");
    setPublishing(true);
    try {
      const data = await invokeEdgeFunction<{ ok?: boolean }>("instagram-publish", {
        tenant_id: tenant.id,
        video_url: downloadedVideoUrl,
        caption: publishCaption,
        media_type: "REELS",
      });
      if (!data?.ok) throw new Error("Falha ao publicar");
      toast.success("Reel publicado no Instagram!");
      setDownloadUrl("");
      setDownloadedVideoUrl(null);
      setPublishCaption("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao publicar");
    } finally {
      setPublishing(false);
    }
  };

  const handleShare = async () => {
    if (!downloadedVideoUrl) return;
    try {
      // Tenta share nativo com arquivo (mobile)
      const res = await fetch(downloadedVideoUrl);
      const blob = await res.blob();
      const file = new File([blob], "reel.mp4", { type: blob.type || "video/mp4" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Vlog", text: publishCaption });
        return;
      }
      // Fallback: compartilha link
      if (navigator.share) {
        await navigator.share({ title: "Vlog", text: publishCaption, url: downloadedVideoUrl });
        return;
      }
      copy(downloadedVideoUrl, "Link do vídeo");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Compartilhamento não suportado neste navegador");
    }
  };

  const handleSaveAsVlog = async () => {
    if (!tenant || !downloadedVideoUrl) return;
    const { error } = await supabase.from("vlog_posts").upsert(
      {
        tenant_id: tenant.id,
        url: downloadedVideoUrl,
        platform: detectVlogPlatform(normalizeVlogUrl(downloadUrl)),
        title: null,
        thumbnail_url: null,
        source: "import",
        posted_at: new Date().toISOString(),
        visivel: true,
      },
      { onConflict: "tenant_id,url" }
    );
    if (error) return toast.error(error.message);
    toast.success("Vídeo adicionado aos seus Vlogs!");
    void load();
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

  const exemploCurl = `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "secret": "${secret || "SEU_SEGREDO"}",
    "url": "https://www.instagram.com/reel/XXXXXX/",
    "thumbnail_url": "https://...jpg"
  }'`;

  return (
    <div className="space-y-6">
      {/* Automação externa e tutoriais de Zapier/Make removidos — a estruturar */}

      {/* Manual add — primeira opção */}
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
              placeholder="https://www.instagram.com/reel/..."
            />
          </div>
          <div>
            <Label>Thumbnail (opcional · cole URL de uma imagem)</Label>
            <Input value={thumbInput} onChange={(e) => setThumbInput(e.target.value)} placeholder="https://...jpg — útil para Instagram" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Instagram não fornece thumb pública. Se não colar uma imagem, geramos um screenshot automático.
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
          <Video className="h-6 w-6" /> PUBLICAÇÃO DIRETA NO INSTAGRAM
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Para postar Reels diretamente do app, cole abaixo o <b>Access Token de longa duração</b> e o <b>ID da conta Business</b> do Instagram.
          Requer conta Business/Creator vinculada a uma Página do Facebook + App aprovado pela Meta com permissão <code>instagram_content_publish</code>.{" "}
          <a href="https://developers.facebook.com/docs/instagram-platform/content-publishing" target="_blank" rel="noreferrer" className="text-primary underline">
            Tutorial oficial
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
        {igConfigured && <p className="text-xs text-green-500 mt-2">✓ Instagram conectado</p>}
      </div>

      {/* Download from URL + auto-publish */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary flex items-center gap-2">
          <Download className="h-6 w-6" /> IMPORTAR VÍDEO DE URL
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cole a URL de um Reel, post ou vídeo do Instagram, TikTok ou YouTube Shorts. O link é normalizado e enviado
          para a função <code>vlog-download</code> no Supabase (não há fila — o download roda na hora).
          Se o Instagram bloquear, use <b>Enviar vídeo (Upload)</b>.
        </p>

        <Label>URL do vídeo (Instagram, TikTok, YouTube Shorts)</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            onBlur={() => {
              const normalized = normalizeInput(downloadUrl);
              if (normalized !== downloadUrl.trim()) setDownloadUrl(normalized);
            }}
            placeholder="https://www.instagram.com/reel/..."
          />
          <Button onClick={handleDownload} disabled={downloading || !downloadUrl.trim()} className="bg-gradient-primary shadow-glow">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-2" /> Baixar</>}
          </Button>
        </div>

        {downloadedVideoUrl && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <video src={downloadedVideoUrl} controls className="w-full max-h-80 rounded-lg bg-black" />

            <div className="grid sm:grid-cols-3 gap-2">
              <Button asChild variant="outline">
                <a href={downloadedVideoUrl} download target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Baixar arquivo
                </a>
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" /> Compartilhar
              </Button>
              <Button variant="outline" onClick={handleSaveAsVlog}>
                <Plus className="h-4 w-4 mr-2" /> Salvar nos Vlogs
              </Button>
            </div>

            <Label>Legenda do post</Label>
            <Textarea
              value={publishCaption}
              onChange={(e) => setPublishCaption(e.target.value)}
              placeholder="Escreva a legenda do Reel..."
              rows={3}
            />
            <Button
              onClick={handlePublishIG}
              disabled={publishing || !igConfigured}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Publicar como Reel no Instagram</>}
            </Button>
            {!igConfigured && (
              <div className="flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-500 mb-1">Publicação automática desativada</p>
                  <p className="text-muted-foreground">
                    Para postar direto no  configure o <b>Access Token</b> e o <b>Business Account ID</b> na seção
                    "PUBLICAÇÃO DIRETA NO INSTAGRAM" acima. Enquanto isso, use <b>"Baixar arquivo"</b> ou <b>"Compartilhar"</b> e poste manualmente pelo app do Instagram.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
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
            Nenhum vlog ainda. Adicione um link manual ou configure a automação.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden bg-background/40">
                <div className="block aspect-video bg-muted relative overflow-hidden">
                  {(() => {
                    const ytId = extractVlogYouTubeId(p.url);
                    if (!ytId) return null;
                    return (
                    <iframe
                      src={buildYouTubeEmbedUrl(ytId, {
                        autoplay: false,
                        mute: true,
                        controls: false,
                        rel: false,
                        modestbranding: true,
                        playsinline: true,
                      })}
                      title={p.title || "Vlog do YouTube"}
                      allow={YOUTUBE_IFRAME_ALLOW}
                      referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
                      className="w-full h-full pointer-events-none"
                    />
                    );
                  })() || (isDirectVideo(p.url) ? (
                    <video
                      src={`${p.url}#t=0.1`}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  ) : resolveThumb(p) ? (
                    <img src={resolveThumb(p)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      sem thumbnail
                    </div>
                  ))}
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
                    {isDownloadableVlogUrl(p.url) && !isDirectVideo(p.url) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void runDownload(p.url)}
                        disabled={downloading}
                        className="flex-1 min-w-[7rem]"
                      >
                        {downloading && downloadUrl === normalizeVlogUrl(p.url) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Download className="h-3 w-3 mr-1" /> Baixar</>
                        )}
                      </Button>
                    )}
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
