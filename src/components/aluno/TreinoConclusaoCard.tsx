import { forwardRef, useRef, useState } from "react";
import { Trophy, Download, Share2, X, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAvatarVariant } from "@/hooks/use-avatar-variant";
import { useAuth } from "@/hooks/use-auth";

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
  const { url: avatarCelebracao } = useAvatarVariant("celebracao");
  const [busy, setBusy] = useState(false);

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
    const canvas = await html2canvas(cardRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#000000",
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Preview visível (escala reduzida do card real) */}
      <div className="w-full max-w-[360px] aspect-[4/5] overflow-hidden rounded-2xl border border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)]">
        <div className="origin-top-left scale-[0.333] w-[1080px] h-[1350px]">
          <CardArt
            ref={cardRef}
            nome={nome}
            diaTreino={diaTreino}
            totalExercicios={totalExercicios}
            dataHoje={dataHoje}
            avatar={avatarCelebracao}
            tenantNome={tenant?.nome || "ALPHA COACH"}
          />
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

const CardArt = ({
  nome,
  diaTreino,
  totalExercicios,
  dataHoje,
  avatar,
  tenantNome,
  ref,
}: {
  nome: string;
  diaTreino: string;
  totalExercicios: number;
  dataHoje: string;
  avatar: string | null;
  tenantNome: string;
  ref: React.RefObject<HTMLDivElement>;
}) => (
  <div
    ref={ref}
    className="w-[1080px] h-[1350px] bg-black relative overflow-hidden flex flex-col text-white font-sans"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-black to-black" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.4),transparent_60%)]" />

    {/* Header */}
    <div className="relative z-10 flex items-center gap-4 p-12">
      <div className="w-16 h-16 bg-primary flex items-center justify-center font-display text-4xl text-white rounded">
        {tenantNome.charAt(0)}
      </div>
      <div className="text-xl font-bold tracking-[0.3em] uppercase">{tenantNome}</div>
    </div>

    {/* Big trophy + headline */}
    <div className="relative z-10 px-12 mt-4 text-center">
      <div className="inline-flex items-center gap-3 px-6 py-2 bg-primary/20 border border-primary rounded-full">
        <Trophy className="h-7 w-7 text-primary" />
        <span className="text-2xl tracking-[0.4em] uppercase font-bold">Treino Concluído</span>
      </div>
      <h1 className="text-8xl font-display tracking-[0.05em] mt-8 leading-none">
        MAIS UM <span className="text-primary italic">CHECK</span>
      </h1>
      <p className="text-3xl mt-4 text-muted-foreground tracking-widest uppercase">na conta</p>
    </div>

    {/* Avatar / Hero */}
    <div className="relative z-10 flex-1 flex items-end justify-center mt-6 px-12">
      {avatar ? (
        <img
          src={avatar}
          alt="Atleta"
          className="h-[560px] object-contain drop-shadow-[0_0_60px_hsl(var(--primary)/0.7)]"
        />
      ) : (
        <div className="h-[560px] w-[400px] rounded-3xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
          <Trophy className="h-40 w-40 text-primary" />
        </div>
      )}
    </div>

    {/* Bottom info bar */}
    <div className="relative z-10 mx-12 mb-12 bg-black/70 backdrop-blur border-y-4 border-primary px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm tracking-widest uppercase text-muted-foreground">Atleta</p>
          <p className="text-5xl font-display tracking-[0.1em] mt-1">{nome}</p>
        </div>
        <div className="text-right">
          <p className="text-sm tracking-widest uppercase text-muted-foreground">{diaTreino}</p>
          <p className="text-5xl font-display text-primary tracking-tighter">{totalExercicios}</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">exercícios</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm uppercase tracking-widest">
        <span className="text-muted-foreground">{dataHoje}</span>
        <span className="font-bold text-white underline decoration-primary underline-offset-4">
          #{tenantNome.replace(/\s+/g, "")}
        </span>
      </div>
    </div>

    <div className="absolute bottom-0 left-0 w-full h-2 bg-primary shadow-[0_0_30px_hsl(var(--primary))]" />
  </div>
);

export default TreinoConclusaoCard;
