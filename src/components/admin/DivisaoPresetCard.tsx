import { Calendar, Target, Play, TrendingUp, Loader2 } from "lucide-react";
import cardTreino from "@/assets/card-divisao-cine.jpg";

export type PresetLike = {
  id: string;
  label: string;
  freq: number;
  nivel: string[];
  dias: string[];
};

// "ABCDE 5x — Ênfase Inferiores" -> título / subtítulo
const partirLabel = (label: string) => {
  const partes = label.split("—");
  const titulo = (partes.shift() || label).trim();
  const sub = partes.join("—").trim();
  return { titulo, sub };
};

export const DivisaoPresetCard = ({
  preset,
  selecionado,
  gerando,
  disabled,
  onGerar,
}: {
  preset: PresetLike;
  selecionado: boolean;
  gerando: boolean;
  disabled?: boolean;
  onGerar: () => void;
}) => {
  const { titulo, sub } = partirLabel(preset.label);
  const nivelTxt = (preset.nivel?.[0] || "").toUpperCase();

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#080b10] transition-all duration-300 ${
        selecionado
          ? "border border-primary shadow-[0_0_28px_-10px_hsl(var(--primary)/0.55)]"
          : "border border-white/10 hover:border-primary/70 hover:shadow-[0_0_28px_-12px_hsl(var(--primary)/0.45)]"
      }`}
    >
      {/* Foto cinematográfica de fundo */}
      <img
        src={cardTreino}
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-100"
      />
      {/* Reflexo espelhado no terço direito */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(8,11,16,0.92) 0%, rgba(8,11,16,0.55) 38%, rgba(8,11,16,0.15) 62%, rgba(8,11,16,0.35) 100%)",
        }}
      />
      {/* Brilho diagonal tipo vidro/capa de filme */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.10) 48%, rgba(255,255,255,0.04) 52%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080b10] via-[#080b10]/25 to-transparent" />

      <div className="relative p-2.5 sm:p-3">
        {/* Badge topo */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm leading-none text-primary">N</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-foreground/80">
              AlphaCoach Original
            </span>
          </div>
          {nivelTxt && (
            <span className="flex items-center gap-1 rounded-full border border-primary/50 bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-foreground">
              <TrendingUp className="h-2 w-2 text-primary" />
              {nivelTxt}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="mt-1.5 font-display text-lg sm:text-xl leading-none tracking-tight text-foreground">
          {titulo}
        </h3>
        {sub && (
          <p className="mt-0.5 font-display text-xs sm:text-sm leading-none tracking-tight text-primary">
            {sub}
          </p>
        )}

        {/* Stats compactos */}
        <div className="mt-2 flex divide-x divide-white/10">
          <Stat icon={<Calendar className="h-3 w-3 text-primary" />} value={`${preset.freq}x`} label="Dias" />
          <Stat icon={<Target className="h-3 w-3 text-primary" />} value="Hipertrofia" label="Foco" />
        </div>

        {/* Ações */}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGerar}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {gerando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
            {gerando ? "Gerando..." : "Gerar e revisar"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex-1 px-1.5 first:pl-0">
    <div className="flex items-center gap-1.5">
      {icon}
      <p className="text-[11px] font-semibold leading-none text-foreground truncate">{value}</p>
    </div>
    <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
  </div>
);

export default DivisaoPresetCard;
