import { forwardRef, useEffect, useRef, useState } from "react";
import { Trophy, Download, Share2, X, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  diaTreino: string;
  totalExercicios: number;
}

export const TreinoConclusaoCard = ({ open, onClose, diaTreino, totalExercicios }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { tenant } = useBranding();
  const { user } = useAuth();
  const [avatarCarta, setAvatarCarta] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    // Captura o card em tamanho real (renderizado fora da tela, sem transform)
    const canvas = await html2canvas(cardRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#000000",
      width: 1080,
      height: 1350,
      windowWidth: 1080,
      windowHeight: 1350,
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

  const artProps = {
    nome,
    diaTreino,
    totalExercicios,
    dataHoje,
    avatar: avatarCarta,
    tenantNome: tenant?.nome || "ALPHA COACH",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Card real em tamanho 1080x1350 fora da tela — é o que é capturado */}
      <div className="fixed top-0 left-0 pointer-events-none opacity-0 -z-10" aria-hidden>
        <CardArt ref={cardRef} {...artProps} />
      </div>

      {/* Preview visível (escala reduzida, apenas visual) */}
      <div className="w-full max-w-[360px] aspect-[4/5] overflow-hidden rounded-2xl border border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)]">
        <div className="origin-top-left scale-[0.333] w-[1080px] h-[1350px]">
          <CardArt {...artProps} />
        </div>
      </div>

      <div className="flex gap-3 mt-6 w-full max-w-[360px]">
        <button
          onClick={handleShare}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-display tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          COMPARTILHAR
        </button>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="h-12 px-4 rounded-xl bg-secondary text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center max-w-[360px]">
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
}

const CardArt = forwardRef<HTMLDivElement, CardArtProps>(
  ({ nome, diaTreino, totalExercicios, dataHoje, avatar, tenantNome }, ref) => (
    <div
      ref={ref}
      className="w-[1080px] h-[1350px] bg-black relative overflow-hidden flex flex-col text-white font-sans"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(var(--primary)/0.35),transparent_60%)]" />

      {/* Topo: marca */}
      <div className="relative z-20 flex items-center gap-4 px-12 pt-10">
        <div className="w-14 h-14 bg-primary flex items-center justify-center font-display text-3xl text-white rounded">
          {tenantNome.charAt(0)}
        </div>
        <div className="text-xl font-bold tracking-[0.2em] uppercase">{tenantNome}</div>
      </div>

      {/* Bloco de título — área exclusiva, sem sobreposição com o avatar */}
      <div className="relative z-20 px-12 pt-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-primary/20 border border-primary rounded-full">
          <Trophy className="h-6 w-6 text-primary" />
          <span className="text-xl tracking-[0.25em] uppercase font-bold leading-none">
            Treino Concluído
          </span>
        </div>
        <h1 className="text-[104px] font-display tracking-[0.02em] mt-6 leading-[0.9] whitespace-nowrap">
          MAIS UM <span className="text-primary italic">CHECK</span>
        </h1>
      </div>

      {/* Avatar: ocupa só o espaço restante, alinhado embaixo */}
      <div className="relative z-10 flex-1 min-h-0 flex items-end justify-center px-12 pb-2">
        {avatar ? (
          <img
            src={avatar}
            alt="Atleta"
            crossOrigin="anonymous"
            className="max-h-full w-auto object-contain drop-shadow-[0_0_60px_hsl(var(--primary)/0.7)]"
          />
        ) : (
          <div className="h-full max-h-[520px] w-[400px] rounded-3xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
            <Trophy className="h-40 w-40 text-primary" />
          </div>
        )}
      </div>

      {/* Rodapé de stats */}
      <div className="relative z-20 mx-12 mb-12 bg-black/80 backdrop-blur border-y-4 border-primary px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm tracking-[0.2em] uppercase text-white/50">Atleta</p>
            <p className="text-5xl font-display tracking-[0.04em] mt-1 leading-none">{nome}</p>
          </div>
          <div className="text-right">
            <p className="text-sm tracking-[0.2em] uppercase text-white/50">{diaTreino}</p>
            <p className="text-5xl font-display text-primary leading-none mt-1">{totalExercicios}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">exercícios</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm uppercase tracking-[0.15em]">
          <span className="text-white/50">{dataHoje}</span>
          <span className="font-bold text-white underline decoration-primary underline-offset-4">
            #{tenantNome.replace(/\s+/g, "")}
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-2 bg-primary shadow-[0_0_30px_hsl(var(--primary))]" />
    </div>
  )
);
CardArt.displayName = "CardArt";

export default TreinoConclusaoCard;
