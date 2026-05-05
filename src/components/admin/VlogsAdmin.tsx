import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Copy, RefreshCw, Eye, EyeOff,   Music2, Link as LinkIcon, Download, Send, Save, Share2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { isDirectVideo } from "@/lib/utils";

interface VlogPost {
  id: string;
  platform: "youtube" | "instagram" | "tiktok" | "other";
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  author: string | null;
  posted_at: string | null;
  source: string;
  visivel: boolean;
  created_at: string;
}

const PlatformIcon = ({ p }: { p: string }) => {
  if (p === "youtube") return <Youtube className="h-4 w-4 text-[hsl(0_85%_55%)]" />;
  if (p === "instagram") return <Instagram className="h-4 w-4 text-[hsl(330_85%_60%)]" />;
  if (p === "tiktok") return <Music2 className="h-4 w-4 text-foreground" />;
  return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
};

const detectPlatform = (url: string): VlogPost["platform"] => {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  return "other";
};

export const VlogsAdmin = () => {
  const { tenant, refresh } = useBranding();
  const [posts, setPosts] = useState<VlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
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

  const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "";
  const webhookUrl = `https://${projectRef}.functions.supabase.co/vlog-ingest`;

  const load = async () => {
    if (!tenant) return;
    setLoading(true);
    const [{ data: list }, { data: t }] = await Promise.all([
      supabase
        .from("vlog_posts")
        .select("id, platform, url, title, thumbnail_url, author, posted_at, source, visivel, created_at")
        .eq("tenant_id", tenant.id)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("tenants_private" as any).select("vlog_webhook_secret, instagram_access_token, instagram_business_account_id").eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    setPosts((list as VlogPost[]) || []);
    const tp = (t as unknown) as { vlog_webhook_secret?: string; instagram_access_token?: string; instagram_business_account_id?: string } | null;
    setSecret(tp?.vlog_webhook_secret ?? null);
    setIgToken(tp?.instagram_access_token ?? "");
    setIgAccountId(tp?.instagram_business_account_id ?? "");
    setIgConfigured(!!(tp?.instagram_access_token && tp?.instagram_business_account_id));
    setLoading(false);
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

  const handleAdd = async () => {
    if (!tenant || !url.trim()) return;
    setBusy(true);
    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl);

    // Auto-enriquecimento: busca título + thumb via oEmbed (YouTube/TikTok)
    const oe = await fetchOEmbed(platform, cleanUrl);
    let thumb: string | null = thumbInput.trim() || oe?.thumbnail_url || null;
    let autoTitle: string | null = oe?.title || null;
    const author: string | null = oe?.author_name || null;

    // Fallback YouTube: thumb direta pelo ID
    if (!thumb && platform === "youtube") {
      const ytMatch = cleanUrl.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
      if (ytMatch) thumb = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }

    // Fallback Instagram: usa serviço de screenshot público (microlink)
    if (!thumb && platform === "instagram") {
      thumb = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
    }

    const { error } = await supabase.from("vlog_posts").upsert(
      {
        tenant_id: tenant.id,
        url: cleanUrl,
        platform,
        title: title.trim() || autoTitle || null,
        thumbnail_url: thumb,
        author,
        source: "manual",
        posted_at: new Date().toISOString(),
        visivel: true,
      },
      { onConflict: "tenant_id,url" }
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Vlog adicionado!");
    setUrl("");
    setTitle("");
    setThumbInput("");
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

  const handleDownload = async () => {
    if (!tenant || !downloadUrl.trim()) return;
    setDownloading(true);
    setDownloadedVideoUrl(null);
    const { data, error } = await supabase.functions.invoke("vlog-download", {
      body: { url: downloadUrl.trim(), tenant_id: tenant.id },
    });
    setDownloading(false);
    if (error || !data?.video_url) {
      return toast.error(error?.message || data?.error || "Falha ao baixar");
    }
    setDownloadedVideoUrl(data.video_url);
    toast.success("Vídeo baixado! Pronto pra publicar ou baixar manualmente.");
  };

  const handlePublishIG = async () => {
    if (!tenant || !downloadedVideoUrl) return;
    if (!igConfigured) return toast.error("Configure o Instagram Access Token primeiro");
    setPublishing(true);
    const { data, error } = await supabase.functions.invoke("instagram-publish", {
      body: { tenant_id: tenant.id, video_url: downloadedVideoUrl, caption: publishCaption, media_type: "REELS" },
    });
    setPublishing(false);
    if (error || !data?.ok) {
      return toast.error(error?.message || data?.error || "Falha ao publicar");
    }
    toast.success("Reel publicado no Instagram!");
    setDownloadUrl("");
    setDownloadedVideoUrl(null);
    setPublishCaption("");
    void load();
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
        platform: detectPlatform(downloadUrl),
        title: publishCaption.trim().slice(0, 120) || "Vlog importado",
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

  const exemploCurl = `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "secret": "${secret || "SEU_SEGREDO"}",
    "url": "https://www.instagram.com/reel/XXXXXX/",
    "title": "Treino de pernas brutal",
    "thumbnail_url": "https://...jpg"
  }'`;

  return (
    <div className="space-y-6">
      {/* Webhook config */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary">AUTOMAÇÃO EXTERNA</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure no Make / n8n / Zapier / Apify para enviar cada novo post pra esse webhook. O app gera a thumb automaticamente quando possível.
        </p>

        <Label className="text-xs uppercase tracking-wider">URL do Webhook</Label>
        <div className="flex gap-2 mt-1.5">
          <Input value={webhookUrl} readOnly className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={() => copy(webhookUrl, "URL")}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Label className="text-xs uppercase tracking-wider mt-4 block">Segredo (autenticação)</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={secret || ""}
            readOnly
            type={showSecret ? "text" : "password"}
            className="font-mono text-xs"
          />
          <Button variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => secret && copy(secret, "Segredo")}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={rotateSecret} title="Rotacionar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Label className="text-xs uppercase tracking-wider mt-4 block">Exemplo de chamada</Label>
        <Textarea readOnly value={exemploCurl} rows={8} className="font-mono text-xs mt-1.5" />
        <p className="text-xs text-muted-foreground mt-2">
          Campos aceitos no JSON: <code>secret</code> (obrigatório), <code>url</code> (obrigatório), <code>platform</code>,
          <code> title</code>, <code>thumbnail_url</code>, <code>author</code>, <code>description</code>, <code>posted_at</code>, <code>external_id</code>.
        </p>
      </div>

      {/* Tutorial Zapier/Make */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary">TUTORIAL · CONECTAR YOUTUBE / INSTAGRAM</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use o Zapier (mais fácil) ou Make. Cada novo vídeo postado vai aparecer aqui automaticamente.
        </p>

        <details className="border border-white/10 rounded-xl p-4 mb-3 bg-background/40" open>
          <summary className="cursor-pointer font-display text-lg flex items-center gap-2">
            <Youtube className="h-5 w-5 text-[hsl(0_85%_55%)]" /> YouTube via Zapier (recomendado)
          </summary>
          <ol className="mt-4 space-y-3 text-sm list-decimal list-inside">
            <li>No <a href="https://zapier.com/app/zaps" target="_blank" rel="noreferrer" className="text-primary underline">Zapier</a>, clique em <b>Create Zap</b>.</li>
            <li><b>Trigger:</b> escolha <code className="bg-muted px-1 rounded">YouTube</code> → evento <code className="bg-muted px-1 rounded">New Video in Channel</code> e conecte sua conta Google.</li>
            <li><b>Action:</b> escolha <code className="bg-muted px-1 rounded">Webhooks by Zapier</code> → <code className="bg-muted px-1 rounded">POST</code>.</li>
            <li>Configure o POST com:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-xs">
                <li><b>URL:</b> cole a URL do webhook acima</li>
                <li><b>Payload Type:</b> <code>json</code></li>
                <li><b>Data</b> (mapeie do trigger YouTube):
                  <pre className="bg-background/60 p-2 rounded mt-1 overflow-x-auto">{`secret        → ${secret ? secret.slice(0, 8) + "..." : "SEU_SEGREDO"}
url           → Video URL  (ou: https://youtube.com/watch?v={{Video Id}})
platform      → youtube
title         → Title
thumbnail_url → Thumbnail Default Url  (ou High/Maxres)
author        → Channel Title
description   → Description
posted_at     → Published At
external_id   → Video Id`}</pre>
                </li>
              </ul>
            </li>
            <li>Clique <b>Test step</b> e depois <b>Publish Zap</b>. Pronto — todo vídeo novo entra aqui em até 15 minutos.</li>
          </ol>
        </details>

        <details className="border border-white/10 rounded-xl p-4 mb-3 bg-background/40">
          <summary className="cursor-pointer font-display text-lg flex items-center gap-2">
            <Instagram className="h-5 w-5 text-[hsl(330_85%_60%)]" /> Instagram via Zapier
          </summary>
          <ol className="mt-4 space-y-3 text-sm list-decimal list-inside">
            <li>É necessário ter conta <b>Instagram Business ou Creator</b> conectada a uma <b>Página do Facebook</b>.</li>
            <li>No Zapier, <b>Create Zap</b>.</li>
            <li><b>Trigger:</b> <code className="bg-muted px-1 rounded">Instagram for Business</code> → <code className="bg-muted px-1 rounded">New Media Posted</code> e conecte sua conta.</li>
            <li><b>Action:</b> <code className="bg-muted px-1 rounded">Webhooks by Zapier</code> → <code className="bg-muted px-1 rounded">POST</code> com:
              <pre className="bg-background/60 p-2 rounded mt-2 text-xs overflow-x-auto">{`URL: ${webhookUrl}
Payload Type: json
Data:
  secret        → ${secret ? secret.slice(0, 8) + "..." : "SEU_SEGREDO"}
  url           → Permalink
  platform      → instagram
  title         → Caption  (use Formatter para cortar em 80 chars se quiser)
  thumbnail_url → Thumbnail Url  (ou Media Url p/ imagens)
  author        → Username
  posted_at     → Timestamp
  external_id   → Id`}</pre>
            </li>
            <li><b>Test</b> e <b>Publish</b>.</li>
          </ol>
        </details>

        <details className="border border-white/10 rounded-xl p-4 bg-background/40">
          <summary className="cursor-pointer font-display text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5" /> Make (Integromat) — alternativa
          </summary>
          <ol className="mt-4 space-y-2 text-sm list-decimal list-inside">
            <li>Crie um cenário com módulo <b>YouTube → Watch Videos</b> (ou <b>Instagram for Business → Watch Media</b>).</li>
            <li>Adicione módulo <b>HTTP → Make a request</b>: método <code>POST</code>, URL acima, body <code>JSON</code> com os mesmos campos do Zapier.</li>
            <li>Ative o cenário e defina o intervalo (15min recomendado).</li>
          </ol>
        </details>
      </div>

      {/* IG Graph API config */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-2 text-primary flex items-center gap-2">
          <Instagram className="h-6 w-6" /> PUBLICAÇÃO DIRETA NO INSTAGRAM
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
          Cole a URL de um Reel, TikTok ou Short. O sistema baixa o vídeo e te dá 2 opções: <b>publicar direto no seu Instagram</b> (se configurado) ou <b>baixar o arquivo</b>.
        </p>

        <Label>URL do vídeo (Instagram, TikTok, YouTube Shorts)</Label>
        <div className="flex gap-2 mt-1.5">
          <Input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." />
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

      {/* Manual add */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-4 text-primary">ADICIONAR LINK MANUAL</h3>
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <Label>URL (YouTube,  TikTok…)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episódio 12 - Coxa" />
          </div>
          <div className="md:col-span-2">
            <Label>Thumbnail (opcional · cole URL de uma imagem)</Label>
            <Input value={thumbInput} onChange={(e) => setThumbInput(e.target.value)} placeholder="https://...jpg — útil para Instagram" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Instagram não fornece thumb pública. Se não colar uma imagem, geramos um screenshot automático.
            </p>
          </div>
          <Button onClick={handleAdd} disabled={busy || !url.trim()} className="bg-gradient-primary shadow-glow md:col-span-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Adicionar</>}
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
                <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-video bg-muted relative">
                  {isDirectVideo(p.url) ? (
                    <video
                      src={`${p.url}#t=0.1`}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  ) : p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.title || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      sem thumbnail
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded px-2 py-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <PlatformIcon p={p.platform} /> {p.platform}
                  </div>
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded px-2 py-1 text-[10px] uppercase">
                    {p.source}
                  </div>
                </a>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium line-clamp-2">{p.title || p.url}</p>
                  {p.author && <p className="text-xs text-muted-foreground">@{p.author}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => toggleVisible(p)} className="flex-1">
                      {p.visivel ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {p.visivel ? "Visível" : "Oculto"}
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
