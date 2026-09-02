import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Sparkles, Pencil, Save, X, ArrowLeft, Download, Share2 } from "lucide-react";
import heic2any from "heic2any";
import html2canvas from "html2canvas";
import { saveOrShareBlob, saveOrShareDataUrl } from "@/lib/native-download";
import { AthleteCard, type CartaData, type AtributosCarta } from "./AthleteCard";
import { HolographicCard } from "./HolographicCard";
import { PainelEvolucao } from "./PainelEvolucao";

const ATR_FIELDS: Array<{ key: keyof AtributosCarta; label: string }> = [
  { key: "forca", label: "Força" },
  { key: "hipertrofia", label: "Hipertrofia" },
  { key: "resistencia", label: "Resistência" },
  { key: "mobilidade", label: "Mobilidade" },
  { key: "disciplina", label: "Disciplina" },
  { key: "recuperacao", label: "Recuperação" },
];

const calcOverall = (a: AtributosCarta) =>
  Math.round(
    (a.forca + a.hipertrofia + a.resistencia + a.mobilidade + a.disciplina + a.recuperacao) / 6
  );

type Props = {
  alunoId: string;
  /** se true, mostra controles de edição (próprio aluno OU coach do tenant) */
  canEdit: boolean;
};

export const CartaScreen = ({ alunoId, canEdit }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [carta, setCarta] = useState<CartaData | null>(null);
  const [draft, setDraft] = useState<CartaData | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [perfilNome, setPerfilNome] = useState<string>("");
  const [perfilSexo, setPerfilSexo] = useState<string>("");
  const [perfilAvatarUrl, setPerfilAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome_completo, sexo, tenant_id, avatar_url")
        .eq("id", alunoId)
        .maybeSingle();
      setPerfilNome(perfil?.nome_completo ?? "Atleta");
      setPerfilSexo(perfil?.sexo ?? "");
      setPerfilAvatarUrl(perfil?.avatar_url ?? null);
      setTenantId(perfil?.tenant_id ?? null);

      const { data: c } = await supabase
        .from("cartas_atleta")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (c) {
        const data: CartaData = {
          nome: perfil?.nome_completo ?? "Atleta",
          posicao: c.posicao,
          numero: c.numero,
          nivel: c.nivel,
          avatar_carta_url: c.avatar_carta_url,
          foto_original_url: c.foto_original_url ?? perfil?.avatar_url,
          atributos: c.atributos as AtributosCarta,
          estilo_dominante: c.estilo_dominante,
          estilo_secundario: c.estilo_secundario,
          bio: c.bio,
        };
        setCarta(data);
      } else {
        // ainda não tem — mostra esqueleto com defaults
        setCarta({
          nome: perfil?.nome_completo ?? "Atleta",
          posicao: "ATA",
          numero: 10,
          nivel: 75,
          avatar_carta_url: null,
          foto_original_url: perfil?.avatar_url ?? null,
          atributos: {
            forca: 75, hipertrofia: 75, resistencia: 70,
            mobilidade: 70, disciplina: 80, recuperacao: 70,
          },
          estilo_dominante: "Virtuoso",
          estilo_secundario: "Heartbeat",
        });
      }
      setLoading(false);
    })();
  }, [alunoId]);

  const startEdit = () => {
    if (!carta) return;
    setDraft({ ...carta, atributos: { ...carta.atributos } });
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveCarta = async () => {
    if (!draft || !tenantId) return;
    setSaving(true);
    const overall = calcOverall(draft.atributos);
    const payload = {
      aluno_id: alunoId,
      tenant_id: tenantId,
      posicao: draft.posicao,
      numero: draft.numero,
      nivel: overall,
      atributos: draft.atributos,
      estilo_dominante: draft.estilo_dominante,
      estilo_secundario: draft.estilo_secundario,
      bio: draft.bio,
      avatar_carta_url: draft.avatar_carta_url,
      foto_original_url: draft.foto_original_url,
    };
    const { error } = await supabase
      .from("cartas_atleta")
      .upsert(payload, { onConflict: "aluno_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCarta({ ...draft, nivel: overall });
    setEditing(false);
    setDraft(null);
    toast.success("Carta salva!");
  };

  const compressImage = (blob: Blob, maxDim: number, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, 'image/jpeg', quality);
        } catch { URL.revokeObjectURL(url); resolve(null); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
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

  const onUploadFoto = async (file: File) => {
    if (!file) return;
    const toastId = toast.loading("Preparando foto...");
    setGenerating(true); // Reusing generating state to show loader in button
    
    try {
      const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      let source: Blob = file;
      
      if (isHeic) {
        toast.loading("Convertendo formato Apple (HEIC)...", { id: toastId });
        const converted = await withTimeout(
          heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 }) as Promise<Blob | Blob[]>,
          45000,
          "A conversão demorou demais. Tente JPG."
        );
        source = Array.isArray(converted) ? converted[0] : converted;
      }

      toast.loading("Otimizando imagem...", { id: toastId });
      const normalized = await compressImage(source, 1200, 0.8);
      if (!normalized) throw new Error("Erro ao processar imagem.");

      const path = `${alunoId}/foto-original-${Date.now()}.jpg`;
      toast.loading("Enviando...", { id: toastId });
      
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, normalized, { upsert: true, contentType: "image/jpeg" });
        
      if (error) throw error;
      
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      
      setDraft((d) => (d ? { ...d, foto_original_url: url } : d));
      if (!editing) {
        setCarta((c) => (c ? { ...c, foto_original_url: url } : c));
        if (tenantId) {
          await supabase.from("cartas_atleta").upsert(
            { aluno_id: alunoId, tenant_id: tenantId, foto_original_url: url },
            { onConflict: "aluno_id" }
          );
        }
      }
      toast.success("Foto enviada!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao enviar foto", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const gerarAvatarIA = async () => {
    // Sem foto enviada, usa a foto de perfil como base — sem alterar a foto de perfil
    const fotoOriginal = (editing ? draft : carta)?.foto_original_url;
    const fotoUrl = fotoOriginal || perfilAvatarUrl;
    if (!fotoUrl) {
      toast.error("Envie uma foto ou defina uma foto de perfil primeiro");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("gerar-avatar-carta", {
      body: { foto_url: fotoUrl, sexo: perfilSexo, user_id: alunoId, force: true },
    });
    setGenerating(false);
    if (error || !data?.avatar_url) {
      toast.error(data?.error || error?.message || "Falha ao gerar avatar");
      return;
    }
    const url = data.avatar_url as string;
    if (editing) setDraft((d) => (d ? { ...d, avatar_carta_url: url } : d));
    else {
      setCarta((c) => (c ? { ...c, avatar_carta_url: url } : c));
      if (tenantId) {
        // Só grava foto_original_url se ela já existia (foto enviada na carta) —
        // se veio do perfil, não sobrescreve a imagem da carta
        const payload = {
          aluno_id: alunoId,
          tenant_id: tenantId,
          avatar_carta_url: url,
          ...(fotoOriginal ? { foto_original_url: fotoOriginal } : {}),
        };
        await supabase.from("cartas_atleta").upsert(payload, { onConflict: "aluno_id" });
      }
    }
    toast.success("Avatar gerado!");
  };

  const fetchImageBlob = async (url: string) => {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Não foi possível baixar a imagem (${res.status})`);
    return res.blob();
  };

  const downloadImage = async (url: string, filename: string) => {
    const tid = toast.loading("Preparando imagem...");
    try {
      const blob = await fetchImageBlob(url);
      await saveOrShareBlob(blob, filename, "Avatar Alpha Coach");
      toast.success("Pronto! Salve ou compartilhe na folha que abriu.", { id: tid });
    } catch (error: any) {
      console.error("Error downloading image:", error);
      toast.error(error?.message || "Erro ao baixar imagem.", { id: tid });
    }
  };

  const shareImage = async (url: string, filename: string) => {
    const tid = toast.loading("Preparando para compartilhar...");
    try {
      const blob = await fetchImageBlob(url);
      await saveOrShareBlob(blob, filename, "Avatar Alpha Coach");
      toast.success("Compartilhe pelo app que preferir.", { id: tid });
    } catch (error: any) {
      if (!/cancel/i.test(String(error?.message || ""))) {
        console.error("Error sharing image:", error);
        toast.error(error?.message || "Não foi possível compartilhar.", { id: tid });
      } else {
        toast.dismiss(tid);
      }
    }
  };

  const handleDownloadCard = async () => {
    if (!cardContainerRef.current) return;
    const tid = toast.loading("Gerando imagem da carta...");
    try {
      const canvas = await html2canvas(cardContainerRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      const filename = `carta-${perfilNome.toLowerCase().replace(/\s+/g, "-")}.png`;
      await saveOrShareDataUrl(canvas.toDataURL("image/png"), filename);
      toast.success("Pronto! Salve ou compartilhe na folha que abriu.", { id: tid });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao gerar imagem da carta", { id: tid });
    }
  };

  const handleShareCard = async () => {
    if (!cardContainerRef.current) return;
    const tid = toast.loading("Gerando carta para compartilhar...");
    try {
      const canvas = await html2canvas(cardContainerRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      const filename = `carta-${perfilNome.toLowerCase().replace(/\s+/g, "-")}.png`;
      await saveOrShareDataUrl(canvas.toDataURL("image/png"), filename);
      toast.success("Compartilhe pelo app que preferir.", { id: tid });
    } catch (err: any) {
      if (!/cancel/i.test(String(err?.message || ""))) {
        console.error(err);
        toast.error(err?.message || "Não foi possível compartilhar a carta.", { id: tid });
      } else {
        toast.dismiss(tid);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fut-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin fut-cyan" />
      </div>
    );
  }
  if (!carta) return null;

  const view = editing && draft ? draft : carta;

  return (
    <div className="min-h-screen bg-fut-deep py-8 px-4">
      <div className="max-w-6xl mx-auto mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="font-gaming border-[hsl(180_100%_60%/0.4)] hover:bg-[hsl(180_100%_50%/0.1)]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Carta */}
        <motion.div
          className="lg:col-span-5 flex flex-col items-center gap-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <HolographicCard hue="355 100% 50%">
            <div ref={cardContainerRef}>
              <AthleteCard carta={view} />
            </div>
          </HolographicCard>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
            <Button
              variant="outline"
              onClick={handleDownloadCard}
              className="font-gaming flex-1 border-[hsl(180_100%_50%/0.4)] hover:bg-[hsl(180_100%_50%/0.1)] text-white"
            >
              <Download className="w-4 h-4 mr-2" /> Baixar Carta
            </Button>
            <Button
              variant="outline"
              onClick={handleShareCard}
              className="font-gaming flex-1 border-[hsl(180_100%_50%/0.4)] hover:bg-[hsl(180_100%_50%/0.1)] text-white"
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
          </div>
        </motion.div>

        {/* Painel de info / edição */}
        <div className="lg:col-span-7 space-y-4">
          <div className="fut-glass p-5">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-display-fut text-2xl fut-text-glow">{perfilNome}</h1>
              {canEdit && !editing && (
                <Button variant="outline" size="sm" onClick={startEdit} className="font-gaming">
                  <Pencil className="w-4 h-4 mr-2" /> Editar carta
                </Button>
              )}
              {canEdit && editing && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveCarta} disabled={saving} className="bg-[hsl(180_100%_40%)] text-black hover:brightness-110">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar
                  </Button>
                </div>
              )}
            </div>
            <p className="font-body-fut text-sm text-muted-foreground">
              Carta gerada a partir do seu perfil de musculação. Estilo EA FC — atualize sua foto e regenere o avatar quando quiser.
            </p>
          </div>

          {canEdit && (
            <div className="fut-glass p-5 space-y-3">
              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase">Avatar</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUploadFoto(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="font-gaming"
                >
                  <Upload className="w-4 h-4 mr-2" /> Enviar foto
                </Button>
                <Button
                  onClick={gerarAvatarIA}
                  disabled={generating}
                  className="font-gaming bg-gradient-to-r from-[hsl(180_100%_45%)] to-[hsl(150_100%_45%)] text-black hover:brightness-110"
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Gerar avatar IA
                </Button>
              </div>
              <p className="font-body-fut text-xs text-muted-foreground">
                A IA gera uma réplica 3D estilo EA FC mantendo seu rosto, com uniforme preto padrão. Sem foto enviada, usa sua foto de perfil como base — sem alterar sua foto de perfil nem a imagem da carta.
              </p>

              {/* Avatar IA gerado — corpo inteiro, com animação ao tocar */}
              <div className="pt-3">
                <span className="font-gaming text-[10px] tracking-widest text-muted-foreground uppercase">
                  Avatar IA — corpo inteiro
                </span>
                <motion.div
                  whileTap={{ scale: 0.96, rotate: -1 }}
                  whileHover={{ scale: 1.02, rotateY: 4 }}
                  animate={
                    view.avatar_carta_url
                      ? { y: [0, -6, 0] }
                      : { y: 0 }
                  }
                  transition={{
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    scale: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                  className="mt-2 aspect-[3/5] max-w-[260px] rounded-lg overflow-hidden border border-[hsl(42_70%_62%/0.4)] bg-gradient-to-b from-black/60 to-black/90 flex items-center justify-center fut-gold-glow cursor-pointer relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {view.avatar_carta_url ? (
                    <>
                      <img
                        src={view.avatar_carta_url}
                        alt="Avatar IA corpo inteiro"
                        className="w-full h-full object-contain drop-shadow-[0_8px_30px_hsla(42_70%_62%_/_0.5)]"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground px-4 text-center">
                      Envie uma foto e gere o avatar IA
                    </span>
                  )}
                </motion.div>
                {view.avatar_carta_url && (
                  <div className="mt-3 flex gap-2 max-w-[260px]">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        downloadImage(
                          view.avatar_carta_url!,
                          `avatar-${perfilNome.toLowerCase().replace(/\s+/g, "-")}.png`
                        )
                      }
                      className="font-gaming text-[10px] flex-1"
                    >
                      <Download className="w-3 h-3 mr-1" /> Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        shareImage(
                          view.avatar_carta_url!,
                          `avatar-${perfilNome.toLowerCase().replace(/\s+/g, "-")}.png`
                        )
                      }
                      className="font-gaming text-[10px] flex-1"
                    >
                      <Share2 className="w-3 h-3 mr-1" /> Compartilhar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {editing && draft && (
            <div className="fut-glass p-5 space-y-4">
              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase">Identidade</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Posição</span>
                  <Input value={draft.posicao} maxLength={4}
                    onChange={(e) => setDraft({ ...draft, posicao: e.target.value.toUpperCase() })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Número</span>
                  <Input type="number" value={draft.numero}
                    onChange={(e) => setDraft({ ...draft, numero: parseInt(e.target.value) || 0 })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Estilo dominante</span>
                  <Input value={draft.estilo_dominante ?? ""}
                    onChange={(e) => setDraft({ ...draft, estilo_dominante: e.target.value })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Estilo secundário</span>
                  <Input value={draft.estilo_secundario ?? ""}
                    onChange={(e) => setDraft({ ...draft, estilo_secundario: e.target.value })} />
                </label>
              </div>

              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase pt-2">Atributos</h3>
              <div className="grid grid-cols-2 gap-3">
                {ATR_FIELDS.map(({ key, label }) => (
                  <label key={key} className="block">
                    <div className="flex justify-between items-baseline">
                      <span className="font-gaming text-xs text-muted-foreground">{label}</span>
                      <span className="font-display-fut text-base fut-cyan">{draft.atributos[key]}</span>
                    </div>
                    <input
                      type="range" min={1} max={99}
                      value={draft.atributos[key]}
                      onChange={(e) => setDraft({
                        ...draft,
                        atributos: { ...draft.atributos, [key]: parseInt(e.target.value) },
                      })}
                      className="w-full accent-[hsl(180_100%_50%)]"
                    />
                  </label>
                ))}
              </div>
              <p className="font-body-fut text-xs text-muted-foreground">
                Overall calculado: <span className="fut-cyan font-bold">{calcOverall(draft.atributos)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Painel 360° de evolução — visível para coach e atleta */}
      <div className="max-w-6xl mx-auto mt-10">
        <div className="fut-divider mb-6" />
        <h2 className="font-display-fut text-xl uppercase tracking-widest fut-text-glow mb-1">
          Painel 360° • Evolução do atleta
        </h2>
        <p className="font-body-fut text-sm text-muted-foreground mb-6">
          Histórico completo de medidas, treinos, exames e anamnese — sincronizado em tempo real entre coach e atleta.
        </p>
        <PainelEvolucao alunoId={alunoId} />
      </div>
    </div>
  );
};
