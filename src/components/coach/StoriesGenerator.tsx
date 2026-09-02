import { useState, useEffect, useRef, useCallback } from "react";
import { saveOrShareBlob } from "@/lib/native-download";
import { isNativeApp } from "@/lib/native-platform";
import {
  Loader2,
  Check,
  Upload,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  ImageIcon,
  Dumbbell,
  Flame,
  Crown,
  Zap,
  Trophy,
  Salad,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import refMenteVida from "@/assets/marketing-refs/alpha-mente-vida-lima.png.asset.json";
import refNovaVersao from "@/assets/marketing-refs/alpha-nova-versao-lima.png.asset.json";
import refTreinoDieta from "@/assets/marketing-refs/alpha-treino-dieta-cyan.png.asset.json";
import refModoAlpha from "@/assets/marketing-refs/alpha-modo-alpha-vermelho.png.asset.json";
import refFocoDias from "@/assets/marketing-refs/alpha-foco-dias-lima.png.asset.json";
import refDisciplina from "@/assets/marketing-refs/alpha-disciplina-serie-dourado.png.asset.json";


/* ============================================================================
   STUDIO DE DIVULGAÇÃO — geração de arte 100% por IA.
   A arte inteira (foto + textos + ícones) vem pronta em PNG da edge function
   `generate-marketing-card`. Nada de html-to-image aqui.
   ========================================================================== */

const MONTHLY_LIMIT = 8;

type TemplateId =
  | "alpha-mente-vida-lima"
  | "alpha-nova-versao-lima"
  | "alpha-treino-dieta-cyan"
  | "alpha-modo-alpha-vermelho"
  | "alpha-foco-dias-lima"
  | "alpha-disciplina-serie-dourado";

const TEMPLATES: { id: TemplateId; label: string; desc: string; accent: string; Icon: LucideIcon; ref: string }[] = [
  { id: "alpha-mente-vida-lima", label: "Corpo, Mente e Vida", desc: "Verde lima", accent: "#8BC53F", Icon: Salad, ref: refMenteVida.url },
  { id: "alpha-nova-versao-lima", label: "Nova Versão", desc: "Verde lima", accent: "#8BC53F", Icon: Flame, ref: refNovaVersao.url },
  { id: "alpha-treino-dieta-cyan", label: "Treino & Dieta", desc: "Cyan elétrico", accent: "#2DD4CE", Icon: Dumbbell, ref: refTreinoDieta.url },
  { id: "alpha-modo-alpha-vermelho", label: "Modo Alpha", desc: "Vermelho intenso", accent: "#C0272D", Icon: Zap, ref: refModoAlpha.url },
  { id: "alpha-foco-dias-lima", label: "Foco Todos os Dias", desc: "Verde lima", accent: "#8BC53F", Icon: Trophy, ref: refFocoDias.url },
  { id: "alpha-disciplina-serie-dourado", label: "Disciplina — A Série", desc: "Dourado premium", accent: "#D4A24A", Icon: Crown, ref: refDisciplina.url },
];


interface Props {
  onEnterFullScreen?: () => void;
  onExitFullScreen?: () => void;
  isFullScreen?: boolean;
}

export const StoriesGenerator = ({ isFullScreen, onExitFullScreen }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [template, setTemplate] = useState<TemplateId>("alpha-mente-vida-lima");
  const [profileData, setProfileData] = useState<any>(null);
  const [cards, setCards] = useState<Record<string, string>>({});
  const [quotaUsed, setQuotaUsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    instagram_handle: "@seuperfil",
    phone: "+55 11 99999-0000",
    photo_url: "",
  });

  const cardUrl = cards[template] || null;

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const [{ data: p }, { data: c }, { data: cardRows }, { count }] = await Promise.all([
        supabase.from("perfis").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("coach_marketing_config").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("coach_marketing_cards")
          .select("template_id, image_url, status")
          .eq("user_id", user.id),
        supabase
          .from("coach_marketing_generation_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart.toISOString()),
      ]);

      setProfileData(p);
      if (c) {
        setConfig((prev) => ({
          ...prev,
          instagram_handle: c.instagram_handle || prev.instagram_handle,
          phone: (c as any).phone || prev.phone,
          photo_url: c.photo_url || "",
        }));
      }
      const map: Record<string, string> = {};
      (cardRows || []).forEach((r: any) => {
        if (r.image_url && r.status === "ready") map[r.template_id] = r.image_url;
      });
      setCards(map);
      setQuotaUsed(count ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const update = (k: string, v: string) => setConfig((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("coach_marketing_config").upsert(
        {
          user_id: user.id,
          template,
          instagram_handle: config.instagram_handle,
          phone: config.phone,
          photo_url: config.photo_url || null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" },
      );
      if (error) throw error;
      toast.success("Dados salvos!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/coach-marketing-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setConfig((prev) => ({ ...prev, photo_url: pub.publicUrl }));
      await supabase.from("coach_marketing_config").upsert(
        { user_id: user.id, photo_url: pub.publicUrl, updated_at: new Date().toISOString() } as any,
        { onConflict: "user_id" },
      );
      toast.success("Foto enviada! A IA vai usar seu rosto na arte.");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar a foto.");
    } finally {
      setUploading(false);
    }
  };

  const runGeneration = async (force: boolean) => {
    if (!user) return;
    setGenerating(true);
    try {
      // garante que nome/telefone/@ estejam salvos antes de virar prompt
      await supabase.from("coach_marketing_config").upsert(
        {
          user_id: user.id,
          instagram_handle: config.instagram_handle,
          phone: config.phone,
          photo_url: config.photo_url || null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" },
      );

      const { data, error } = await supabase.functions.invoke("generate-marketing-card", {
        body: { template_id: template, force },
      });
      let payload: any = data;
      if (error) {
        try {
          payload = await (error as any).context?.json?.();
        } catch {
          /* noop */
        }
        if (!payload?.error) throw new Error(error.message);
      }
      if (payload?.error) throw new Error(payload.error);

      setCards((prev) => ({ ...prev, [template]: payload.card_url }));
      if (typeof payload.quota_used === "number") setQuotaUsed(payload.quota_used);
      toast.success(payload.cached ? "Arte carregada." : "Arte gerada! 🔥");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar a arte.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (cardUrl) {
      runGeneration(false);
      return;
    }
    if (quotaUsed >= MONTHLY_LIMIT) {
      toast.error(`Limite de ${MONTHLY_LIMIT} gerações neste mês atingido.`);
      return;
    }
    runGeneration(true);
  };

  const handleRegenerate = () => {
    if (quotaUsed >= MONTHLY_LIMIT) {
      toast.error(`Limite de ${MONTHLY_LIMIT} gerações neste mês atingido.`);
      return;
    }
    if (!window.confirm("Gerar novamente consome 1 das suas gerações do mês. Continuar?")) return;
    runGeneration(true);
  };

  const fetchBlob = async () => {
    if (!cardUrl) return null;
    const res = await fetch(cardUrl, { cache: "no-store" });
    return await res.blob();
  };

  const handleDownload = async () => {
    setSharing(true);
    try {
      const blob = await fetchBlob();
      if (!blob) return;
      await saveOrShareBlob(blob, `divulgacao-${template}.png`);
      toast.success(isNativeApp() ? "Escolha onde salvar." : "Arte baixada!");
    } catch (e: any) {
      toast.error("Erro ao baixar: " + (e?.message || "tente novamente"));
    } finally {
      setSharing(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await fetchBlob();
      if (!blob) return;
      const file = new File([blob], `divulgacao-${template}.png`, { type: "image/png" });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title: "Consultoria online" });
      } else {
        await saveOrShareBlob(blob, `divulgacao-${template}.png`);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Não foi possível compartilhar.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const preview = (
    <div className="relative mx-auto aspect-[9/16] h-[600px] max-w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl ring-1 ring-white/10">
      {cardUrl ? (
        <img src={cardUrl} alt="Arte de divulgação gerada por IA" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          {generating ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Gerando sua arte...</p>
              <p className="text-xs opacity-70">Isso leva alguns segundos.</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhuma arte gerada para este template.</p>
            </>
          )}
        </div>
      )}
      {cardUrl && generating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-semibold">Gerando sua arte...</p>
        </div>
      )}
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black">
        {preview}
        <div className="fixed bottom-4 right-4 flex gap-2">
          <Button onClick={handleDownload} disabled={!cardUrl || sharing} size="sm" className="gap-2 rounded-full">
            <Download className="h-4 w-4" /> Baixar
          </Button>
          <Button onClick={onExitFullScreen} size="sm" variant="secondary" className="rounded-full">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-black uppercase tracking-wider">Artes com IA</h4>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {quotaUsed} de {MONTHLY_LIMIT} gerações usadas este mês
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all",
                template === t.id
                  ? "scale-[1.02] border-primary shadow-lg shadow-primary/20"
                  : "border-border/40 hover:border-primary/40",
              )}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `radial-gradient(circle at top right, ${t.accent}, transparent 60%)` }}
              />
              <div className="relative">
                {cards[t.id] ? (
                  <div className="relative">
                    <img
                      src={cards[t.id]}
                      alt={t.label}
                      loading="lazy"
                      className="mb-2 aspect-[9/16] w-full rounded-lg object-cover"
                    />
                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[8px] font-bold uppercase text-white">
                      Gerado
                    </span>
                  </div>
                ) : (
                  <div
                    className="mb-2 flex aspect-[9/16] w-full items-center justify-center rounded-lg border border-white/10"
                    style={{ background: `linear-gradient(160deg, ${t.accent}33, #09090b 65%)` }}
                  >
                    <t.Icon className="h-8 w-8" style={{ color: t.accent }} />
                  </div>
                )}
                <div className="text-xs font-black uppercase tracking-wider">{t.label}</div>
                <div className="text-[10px] opacity-70">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {preview}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-5">
          <h5 className="flex items-center gap-2 text-sm font-bold">
            <Upload className="h-4 w-4 text-primary" /> Sua foto (a IA preserva seu rosto)
          </h5>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-12 w-full gap-2 rounded-xl font-bold uppercase tracking-widest"
          >
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <><Upload className="h-4 w-4" /> Carregar foto</>}
          </Button>
          {(config.photo_url || profileData?.avatar_url) && (
            <div className="flex items-center gap-3 rounded-lg bg-black/30 p-2">
              <img src={config.photo_url || profileData?.avatar_url} alt="foto" className="h-12 w-12 rounded-lg object-cover" />
              <div className="text-[10px] text-muted-foreground">Foto usada como referência de identidade na geração.</div>
            </div>
          )}

          <div className="space-y-2 border-t border-border/40 pt-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase opacity-70">Nome do coach</Label>
              <Input value={profileData?.nome_completo || ""} readOnly className="h-8 text-xs opacity-70" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase opacity-70">Instagram</Label>
                <Input value={config.instagram_handle} onChange={(e) => update("instagram_handle", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase opacity-70">Telefone</Label>
                <Input value={config.phone} onChange={(e) => update("phone", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-fit space-y-3 rounded-2xl border border-border/40 bg-card p-5">
          <h5 className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> Gerar & publicar
          </h5>
          <p className="text-xs text-muted-foreground">
            A arte inteira é criada por IA. Reabrir, baixar ou compartilhar uma arte já gerada é grátis.
          </p>
          <Button onClick={handleSave} disabled={saving} variant="secondary" className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Salvar dados
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 font-bold uppercase tracking-widest text-primary-foreground"
          >
            {generating ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando sua arte…</> : <><Sparkles className="h-5 w-5" /> Gerar arte</>}
          </Button>
          {cardUrl && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDownload} disabled={sharing} variant="secondary" className="gap-2">
                  <Download className="h-4 w-4" /> Baixar
                </Button>
                <Button onClick={handleShare} disabled={sharing} variant="secondary" className="gap-2">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </Button>
              </div>
              <Button onClick={handleRegenerate} disabled={generating} variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" /> Gerar novamente (consome 1)
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoriesGenerator;
