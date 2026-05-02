import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Copy, RefreshCw, Eye, EyeOff, Youtube, Instagram, Music2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

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
  const [showSecret, setShowSecret] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

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
      supabase.from("tenants_private" as any).select("vlog_webhook_secret").eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    setPosts((list as VlogPost[]) || []);
    setSecret(((t as unknown) as { vlog_webhook_secret: string } | null)?.vlog_webhook_secret ?? null);
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
    let thumb: string | null = oe?.thumbnail_url || null;
    let autoTitle: string | null = oe?.title || null;
    const author: string | null = oe?.author_name || null;

    // Fallback YouTube: thumb direta pelo ID
    if (!thumb && platform === "youtube") {
      const ytMatch = cleanUrl.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
      if (ytMatch) thumb = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
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

      {/* Manual add */}
      <div className="bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h3 className="font-display text-2xl mb-4 text-primary">ADICIONAR LINK MANUAL</h3>
        <div className="grid md:grid-cols-[2fr_1.5fr_auto] gap-3 items-end">
          <div>
            <Label>URL (YouTube, Instagram, TikTok…)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episódio 12 - Coxa" />
          </div>
          <Button onClick={handleAdd} disabled={busy || !url.trim()} className="bg-gradient-primary shadow-glow">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Adicionar</>}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <h3 className="font-display text-xl mb-4">VLOGS · {posts.length}</h3>
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
                  {p.thumbnail_url ? (
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
