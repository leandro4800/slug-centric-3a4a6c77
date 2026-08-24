import { forwardRef, useEffect, useRef, useState } from "react";
import { Trophy, Download, Share2, X, Loader2, Clock, Dumbbell, ListChecks, Flame, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import designRefAsset from "@/assets/card-design-ref.png.asset.json";

interface Props {
  open: boolean;
  onClose: () => void;
  diaTreino: string;
  totalExercicios: number;
  duracaoMin?: number | null;
  volumeKg?: number | null;
  seriesTotal?: number | null;
  gastoCalorico?: number | null;
  mensagemGasto?: string | null;
  caloriasLoading?: boolean;
}

interface BrandColors {
  primary: string;
  primarySoft: string;
  primaryFaint: string;
  accent: string;
}

interface CardBg {
  url: string;
  mode: "full" | "scenario";
}

const FALLBACK_COLORS: BrandColors = {
  primary: "hsl(357 92% 47%)",
  primarySoft: "hsl(357 92% 47% / 0.35)",
  primaryFaint: "hsl(357 92% 47% / 0.15)",
  accent: "hsl(357 92% 60%)",
};

const CARD_W = 1080;
const CARD_H = 1920;
const PREVIEW_W = 300;

const LOAD_MESSAGES = [
  "Criando sua arte cinematográfica…",
  "Aplicando iluminação de estúdio…",
  "Renderizando fumaça e partículas…",
  "Toques finais de pós-produção…",
];

/** Converte "357 92% 47%" (CSS var HSL) para hex — o prompt da IA entende melhor hex. */
function hslStringToHex(hslRaw: string): string | null {
  const m = hslRaw.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(8)}${f(4)}${f(0)}`;
}

/**
 * Carrega a imagem de referência cinematográfica (direção de arte) como base64.
 * Tenta origem atual (web) e fallback para o domínio publicado (app nativo Capacitor).
 */
async function loadDesignRefBase64(): Promise<string | null> {
  const rel = designRefAsset.url;
  const candidates = [
    rel,
    `https://alpha-coach.app${rel}`,
    `https://slug-centric.lovable.app${rel}`,
  ];
  for (const url of candidates) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      if (!blob.type.startsWith("image")) continue;
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

export const TreinoConclusaoCard = ({
  open,
  onClose,
  diaTreino,
  totalExercicios,
  duracaoMin = null,
  volumeKg = null,
  seriesTotal = null,
  gastoCalorico = null,
  mensagemGasto = null,
  caloriasLoading = false,
}: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { tenant } = useBranding();
  const { user } = useAuth();
  const [avatarCarta, setAvatarCarta] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState<BrandColors>(FALLBACK_COLORS);
  const [primaryHex, setPrimaryHex] = useState<string | null>(null);

  // Arquitetura híbrida: IA gera cenário+atleta; React renderiza textos/dados por cima
  const [cardBg, setCardBg] = useState<CardBg | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const genStartedRef = useRef(false);

  // Usa exatamente o mesmo avatar gerado na Carta do Atleta (camisa do time do coach)
  useEffect(() => {
    if (!open || !user) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("cartas_atleta")
        .select("avatar_carta_url, foto_original_url")
        .eq("aluno_id", user.id)
        .maybeSingle();
      if (cancel) return;
      setAvatarCarta(data?.avatar_carta_url || data?.foto_original_url || null);
    })();
    return () => {
      cancel = true;
    };
  }, [open, user]);

  // Resolve as cores reais do tenant (CSS vars) para usar em SVG/glows — nunca hardcoded
  useEffect(() => {
    if (!open) return;
    const cs = getComputedStyle(document.documentElement);
    const primaryRaw = cs.getPropertyValue("--primary").trim();
    const accentRaw = cs.getPropertyValue("--accent").trim();
    if (primaryRaw) {
      setColors({
        primary: `hsl(${primaryRaw})`,
        primarySoft: `hsl(${primaryRaw} / 0.35)`,
        primaryFaint: `hsl(${primaryRaw} / 0.15)`,
        accent: accentRaw ? `hsl(${accentRaw})` : `hsl(${primaryRaw})`,
      });
      setPrimaryHex(hslStringToHex(primaryRaw));
    }
  }, [open, tenant?.id]);

  // Gera (ou reutiliza do cache) o background cinematográfico via edge function.
  // Roda UMA vez por abertura do modal; o cache no servidor torna repetições instantâneas.
  useEffect(() => {
    if (!open || !user || genStartedRef.current) return;
    genStartedRef.current = true;
    let cancel = false;

    (async () => {
      setBgLoading(true);
      try {
        const designRef = await loadDesignRefBase64();
        const { data, error } = await supabase.functions.invoke("gerar-card-treino", {
          body: {
            tenant_id: tenant?.id ?? null,
            tenant_nome: tenant?.nome ?? "",
            primary: colors.primary,
            primary_hex: primaryHex,
            design_ref: designRef,
          },
        });
        if (cancel) return;
        if (!error && (data as any)?.card_url) {
          setCardBg({ url: (data as any).card_url, mode: (data as any).mode === "scenario" ? "scenario" : "full" });
        } else {
          console.warn("gerar-card-treino falhou, usando card padrão:", error ?? data);
        }
      } catch (e) {
        console.warn("gerar-card-treino erro, usando card padrão:", e);
      } finally {
        if (!cancel) setBgLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, tenant?.id]);

  // Mensagens de progresso enquanto a IA trabalha
  useEffect(() => {
    if (!bgLoading || cardBg) return;
    const t = setInterval(() => setLoadMsgIdx((i) => (i + 1) % LOAD_MESSAGES.length), 6000);
    return () => clearInterval(t);
  }, [bgLoading, cardBg]);

  if (!open) return null;

  const nome = (user?.user_metadata?.nome_completo || user?.email || "Atleta")
    .toString()
    .split(/\s|@/)[0]
    .toUpperCase();

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const generate = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    // Captura o card em tamanho real 1080x1920 (renderizado fora da tela, sem transform)
    const canvas = await html2canvas(cardRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#000000",
      width: CARD_W,
      height: CARD_H,
      windowWidth: CARD_W,
      windowHeight: CARD_H,
      scrollX: 0,
      scrollY: 0,
    });
    return canvas.toDataURL("image/png");
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const data = await generate();
      if (!data) return;
      const link = document.createElement("a");
      link.download = `treino-concluido-${nome.toLowerCase()}.png`;
      link.href = data;
      link.click();
      toast.success("Card salvo! Compartilhe nos stories. 🔥");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar o card.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const dataUrl = await generate();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `treino-${nome}.png`, { type: "image/png" });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: "Treino concluído!",
          text: `Mais um treino na conta. #${tenant?.nome?.replace(/\s+/g, "") || "AlphaCoach"}`,
        });
      } else {
        handleDownload();
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Não foi possível compartilhar.");
      }
    } finally {
      setBusy(false);
    }
  };

  const artProps: CardArtProps = {
    nome,
    diaTreino,
    totalExercicios,
    dataHoje,
    avatar: avatarCarta,
    tenantNome: tenant?.nome || "ALPHA COACH",
    tenantLogo: tenant?.logo_url || null,
    duracaoMin,
    volumeKg,
    seriesTotal,
    gastoCalorico,
    caloriasLoading,
    colors,
    bgUrl: cardBg?.url ?? null,
    bgMode: cardBg?.mode ?? null,
  };

  const previewScale = PREVIEW_W / CARD_W;

  // Só monta o card quando a geração terminar: sucesso (cardBg) ou falha real
  // (bgLoading false + cardBg null → cai no fallback DOM como card final)
  const artReady = cardBg !== null || !bgLoading;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Card real em tamanho 1080x1920 fora da tela — é o que é capturado.
          Só existe quando a geração terminou (sucesso ou falha real → fallback DOM). */}
      {artReady && (
        <div className="fixed top-0 left-0 pointer-events-none opacity-0 -z-10" aria-hidden>
          <CardArt ref={cardRef} {...artProps} />
        </div>
      )}

      {/* Preview visível (escala reduzida, apenas visual) */}
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)] shrink-0"
        style={{ width: PREVIEW_W, height: CARD_H * previewScale }}
      >
        {artReady ? (
          <div
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
              width: CARD_W,
              height: CARD_H,
            }}
          >
            <CardArt {...artProps} />
          </div>
        ) : (
          /* Carregamento limpo enquanto a IA gera a arte — sem hexágono/avatar/cenário,
             para não parecer um "card errado" antes da versão final */
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs text-center leading-snug text-foreground/80">
              {LOAD_MESSAGES[loadMsgIdx]}
            </p>
          </div>
        )}
      </div>

      {/* Mensagem da IA (gasto calórico) — as estatísticas já estão dentro do card */}
      {(caloriasLoading || mensagemGasto) && (
        <div
          className="mt-3 rounded-xl bg-primary/10 border border-primary/25 px-3 py-2 flex items-start gap-2"
          style={{ width: PREVIEW_W }}
        >
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <p className="text-[11px] leading-snug text-foreground/90">
            {caloriasLoading ? "Calculando seu gasto calórico..." : mensagemGasto}
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-4" style={{ width: PREVIEW_W }}>
        <button
          onClick={handleShare}
          disabled={busy || !artReady}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-display tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          COMPARTILHAR
        </button>
        <button
          onClick={handleDownload}
          disabled={busy || !artReady}
          className="h-12 px-4 rounded-xl bg-secondary text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center" style={{ maxWidth: PREVIEW_W }}>
        Marque o coach nos stories e leve o time junto. 💪
      </p>
    </div>
  );
};

interface CardArtProps {
  nome: string;
  diaTreino: string;
  totalExercicios: number;
  dataHoje: string;
  avatar: string | null;
  tenantNome: string;
  tenantLogo: string | null;
  duracaoMin: number | null;
  volumeKg: number | null;
  seriesTotal: number | null;
  gastoCalorico: number | null;
  caloriasLoading: boolean;
  colors: BrandColors;
  /** Background cinematográfico gerado por IA (null = fallback DOM) */
  bgUrl: string | null;
  /** full = atleta já está na imagem; scenario = compor avatar original por cima */
  bgMode: "full" | "scenario" | null;
}

const CardArt = forwardRef<HTMLDivElement, CardArtProps>(
  (
    {
      nome,
      diaTreino,
      totalExercicios,
      dataHoje,
      avatar,
      tenantNome,
      tenantLogo,
      duracaoMin,
      volumeKg,
      seriesTotal,
      gastoCalorico,
      caloriasLoading,
      colors,
      bgUrl,
      bgMode,
    },
    ref
  ) => {
    const nomeSize = nome.length > 12 ? "text-5xl" : nome.length > 8 ? "text-6xl" : "text-7xl";
    const treinoSize = diaTreino.length > 26 ? "text-xl" : diaTreino.length > 16 ? "text-2xl" : "text-3xl";

    const stats: { icon: typeof Clock; value: string; label: string }[] = [
      { icon: Clock, value: duracaoMin != null ? `${duracaoMin}` : "—", label: "MIN" },
      {
        icon: Dumbbell,
        value: volumeKg != null ? Math.round(volumeKg).toLocaleString("pt-BR") : "—",
        label: "KG VOL",
      },
      { icon: ListChecks, value: seriesTotal != null ? `${seriesTotal}` : "—", label: "SÉRIES" },
      {
        icon: Flame,
        value: caloriasLoading ? "…" : gastoCalorico != null ? gastoCalorico.toLocaleString("pt-BR") : "—",
        label: "KCAL",
      },
    ];

    return (
      <div
        ref={ref}
        className="relative overflow-hidden flex flex-col text-white font-sans"
        style={{ width: CARD_W, height: CARD_H, backgroundColor: "#000000" }}
      >
        {bgUrl ? (
          <>
            {/* Fundo preto sólido: garante que barras do object-contain fiquem invisíveis */}
            <div className="absolute inset-0 bg-black" />
            {/* ===== CAMADA IA: cenário cinematográfico (+ atleta no modo full) =====
                object-contain: a imagem INTEIRA sempre aparece — sem cortar cabeça/pés,
                independente da proporção exata devolvida pela IA */}
            <img
              src={bgUrl}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Modo scenario (fallback de identidade): compõe o avatar original por cima do cenário */}
            {bgMode === "scenario" && avatar ? (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[26%] h-[46%] flex items-end justify-center z-10">
                <img
                  src={avatar}
                  alt="Atleta"
                  crossOrigin="anonymous"
                  className="max-h-full w-auto object-contain"
                  style={{
                    filter: `drop-shadow(0 0 60px ${colors.primarySoft}) drop-shadow(0 30px 40px rgba(0,0,0,0.65))`,
                  }}
                />
              </div>
            ) : null}

            {/* Gradientes de legibilidade para a camada de UI (topo e rodapé) */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.18) 24%, transparent 42%, transparent 52%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.94) 100%)",
              }}
            />
          </>
        ) : (
          <>
            {/* ===== FALLBACK DOM (sem IA): fundo cinematográfico em gradientes ===== */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${colors.primarySoft} 0%, #000000 45%, #000000 100%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${colors.primarySoft} 0%, transparent 55%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, ${colors.primaryFaint} 0%, transparent 50%)`,
              }}
            />
            {/* Vinheta forte */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
              }}
            />
          </>
        )}

        {/* ===== CAMADA UI (React): todos os textos e dados — sempre corretos ===== */}

        {/* Header: marca do coach */}
        <div className="relative z-20 flex items-center gap-5 px-14 pt-14">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={tenantNome}
              crossOrigin="anonymous"
              className="w-16 h-16 object-contain rounded"
            />
          ) : (
            <div
              className="w-16 h-16 flex items-center justify-center font-display text-4xl text-white rounded"
              style={{ backgroundColor: colors.primary, boxShadow: `0 0 40px ${colors.primarySoft}` }}
            >
              {tenantNome.charAt(0)}
            </div>
          )}
          <div className="text-2xl font-bold tracking-[0.35em] uppercase">{tenantNome}</div>
        </div>

        {/* Badge de conclusão */}
        <div className="relative z-20 flex justify-center pt-12">
          <div
            className="inline-flex items-center gap-4 px-10 py-4 rounded-full"
            style={{
              border: `3px solid ${colors.primary}`,
              backgroundColor: colors.primaryFaint,
              boxShadow: `0 0 50px ${colors.primarySoft}, inset 0 0 30px ${colors.primaryFaint}`,
            }}
          >
            <Trophy className="h-8 w-8" style={{ color: colors.primary }} />
            <span className="text-3xl tracking-[0.3em] uppercase font-bold leading-none">
              Treino Concluído
            </span>
          </div>
        </div>

        {/* Título cinematográfico — Anton (condensada esportiva), "MAIS UM" metálico,
            "CHECK" na cor do tenant com itálico rasgado */}
        <div className="relative z-20 px-14 pt-10 text-center leading-none">
          <h1
            className="whitespace-nowrap uppercase"
            style={{ fontFamily: "'Anton', 'Bebas Neue', sans-serif", fontWeight: 400 }}
          >
            {/* "MAIS UM" em branco sólido: html2canvas não suporta background-clip: text
                (renderizaria o retângulo do gradiente por cima da imagem) */}
            <span
              className="text-[120px] tracking-[0.02em] text-white"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
            >
              MAIS UM{" "}
            </span>
            <span
              className="text-[120px] italic tracking-[0.02em] inline-block"
              style={{
                color: colors.primary,
                textShadow: `0 0 60px ${colors.primarySoft}, 0 0 24px ${colors.primarySoft}`,
                transform: "skewX(-8deg)",
              }}
            >
              CHECK
            </span>
          </h1>
          <div
            className="mx-auto mt-6 h-[3px] w-[420px]"
            style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` }}
          />
        </div>

        {/* Cena do atleta: protagonista com halo geométrico + frases motivacionais */}
        <div className="relative z-10 flex-1 min-h-0 flex items-end justify-center px-14">
          {!bgUrl && (
            <>
              {/* Halo hexagonal (apenas no fallback DOM — no modo IA o portal já está na imagem) */}
              <svg
                viewBox="0 0 600 700"
                className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[92%] w-auto"
                style={{ opacity: 0.75, filter: `drop-shadow(0 0 25px ${colors.primarySoft})` }}
              >
                <polygon
                  points="300,30 555,165 555,535 300,670 45,535 45,165"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="5"
                />
                <polygon
                  points="300,60 532,182 532,518 300,640 68,518 68,182"
                  fill="none"
                  stroke={colors.primarySoft}
                  strokeWidth="2"
                />
              </svg>

              {/* Rim light atrás do atleta */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[720px] h-[720px] rounded-full"
                style={{ background: `radial-gradient(circle, ${colors.primarySoft} 0%, transparent 65%)` }}
              />
            </>
          )}

          {/* Motivação lateral direita (texto — sempre React) */}
          <div className="absolute right-12 top-6 text-right z-20 space-y-3">
            {["DISCIPLINA", "FOCO", "RESULTADOS"].map((palavra, i) => (
              <p
                key={palavra}
                className="text-4xl tracking-[0.18em] uppercase leading-none"
                style={{
                  fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                  fontWeight: 400,
                  color: i === 1 ? colors.primary : "rgba(255,255,255,0.92)",
                  textShadow:
                    i === 1 ? `0 0 30px ${colors.primarySoft}` : "0 2px 12px rgba(0,0,0,0.6)",
                }}
              >
                {palavra}
              </p>
            ))}
            <div
              className="ml-auto h-[3px] w-24"
              style={{ background: `linear-gradient(90deg, transparent, ${colors.primary})` }}
            />
          </div>

          {/* Avatar DOM apenas no fallback (no modo IA full o atleta já está na imagem;
              no modo scenario o avatar é composto na camada IA acima) */}
          {!bgUrl &&
            (avatar ? (
              <img
                src={avatar}
                alt="Atleta"
                crossOrigin="anonymous"
                className="relative z-10 max-h-full w-auto object-contain"
                style={{ filter: `drop-shadow(0 0 70px ${colors.primarySoft})` }}
              />
            ) : (
              <div
                className="relative z-10 h-full max-h-[620px] w-[440px] rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: colors.primaryFaint, border: `3px solid ${colors.primarySoft}` }}
              >
                <Trophy className="h-44 w-44" style={{ color: colors.primary }} />
              </div>
            ))}
        </div>

        {/* Barra de informações: atleta / treino / exercícios
            Gradiente semi-transparente (não opaco): deixa entrever a imagem de fundo */}
        <div
          className="relative z-20 mx-14 mt-6 px-10 py-7 backdrop-blur-sm flex items-center justify-between"
          style={{
            borderTop: `4px solid ${colors.primary}`,
            borderBottom: `4px solid ${colors.primary}`,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.70) 55%, rgba(0,0,0,0.92) 100%)",
          }}
        >
          <div className="min-w-0">
            <p className="text-lg tracking-[0.3em] uppercase text-white/50">Atleta</p>
            <p className={`${nomeSize} font-display tracking-[0.03em] mt-1 leading-none truncate`}>{nome}</p>
            <p className="text-lg uppercase tracking-[0.15em] text-white/50 mt-3">{dataHoje}</p>
          </div>
          <div className="text-right shrink-0 pl-8">
            <p className={`${treinoSize} font-bold uppercase tracking-[0.08em] text-white/80 max-w-[380px]`}>
              {diaTreino}
            </p>
            <div className="flex items-end justify-end gap-3 mt-2">
              <Dumbbell className="h-10 w-10 mb-2" style={{ color: colors.primary }} />
              <p
                className="text-8xl font-display leading-none"
                style={{ color: colors.primary, textShadow: `0 0 40px ${colors.primarySoft}` }}
              >
                {totalExercicios}
              </p>
            </div>
            <p className="text-base uppercase tracking-[0.3em] text-white/50 mt-2">exercícios</p>
          </div>
        </div>

        {/* Estatísticas da sessão */}
        <div className="relative z-20 mx-14 mt-6 grid grid-cols-4 gap-5">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="rounded-2xl px-4 py-6 text-center"
              style={{
                border: `2px solid ${colors.primarySoft}`,
                boxShadow: `inset 0 0 30px ${colors.primaryFaint}`,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.70) 55%, rgba(0,0,0,0.92) 100%)",
              }}
            >
              <Icon className="h-9 w-9 mx-auto" style={{ color: colors.primary }} />
              <p className="font-display text-5xl mt-3 leading-none">{value}</p>
              <p className="text-base uppercase tracking-[0.25em] text-white/50 mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="relative z-20 mt-auto pt-8 pb-10 text-center">
          <p className="text-xl tracking-[0.4em] uppercase text-white/70">Evoluindo todos os dias</p>
          <p className="text-lg font-bold uppercase tracking-[0.2em] mt-2" style={{ color: colors.primary }}>
            #{tenantNome.replace(/\s+/g, "")}
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 w-full h-2"
          style={{ backgroundColor: colors.primary, boxShadow: `0 0 30px ${colors.primary}` }}
        />
      </div>
    );
  }
);
CardArt.displayName = "CardArt";

export default TreinoConclusaoCard;
