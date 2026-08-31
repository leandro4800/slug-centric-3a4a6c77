import { useState } from "react";
import { Calendar, Target, Dumbbell, Play, Eye, TrendingUp, Loader2 } from "lucide-react";
import cardTreino from "@/assets/card-divisao-cine.jpg";

export type PresetLike = {
  id: string;
  label: string;
  freq: number;
  nivel: string[];
  dias: string[];
};

const GRUPOS_MAP: Record<string, string> = {
  quadr: "QUADRÍCEPS",
  posterior: "POSTERIOR",
  glúte: "GLÚTEOS",
  glute: "GLÚTEOS",
  panturr: "PANTURRILHAS",
  peito: "PEITO",
  costas: "COSTAS",
  ombro: "OMBROS",
  bíceps: "BÍCEPS",
  biceps: "BÍCEPS",
  tríceps: "TRÍCEPS",
  triceps: "TRÍCEPS",
  trapézio: "TRAPÉZIO",
  trapezio: "TRAPÉZIO",
  perna: "PERNAS",
  core: "CORE",
  braço: "BRAÇOS",
  braco: "BRAÇOS",
  "full body": "CORPO TODO",
};

const extrairGrupos = (dias: string[]) => {
  const texto = dias.join(" ").toLowerCase();
  const out: string[] = [];
  for (const [k, v] of Object.entries(GRUPOS_MAP)) {
    if (texto.includes(k) && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 4);
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
  const [previa, setPrevia] = useState(false);
  const { titulo, sub } = partirLabel(preset.label);
  const grupos = extrairGrupos(preset.dias);
  const nivelTxt = (preset.nivel?.[0] || "").toUpperCase();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#080b10] transition-all duration-300 ${
        selecionado
          ? "border border-primary shadow-[0_0_28px_-10px_hsl(var(--primary)/0.55)]"
          : "border border-white/10 hover:border-primary/70 hover:shadow-[0_0_28px_-12px_hsl(var(--primary)/0.45)]"
      }`}
    >
      {/* Foto cinematográfica de fundo — mais visível/espelhada */}
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

      <div className="relative p-3.5 sm:p-4">
        {/* Badge topo */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-base leading-none text-primary">N</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/80">
              AlphaCoach Original
            </span>
          </div>
          {nivelTxt && (
            <span className="flex items-center gap-1 rounded-full border border-primary/50 bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
              <TrendingUp className="h-2.5 w-2.5 text-primary" />
              {nivelTxt}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="mt-2.5 font-display text-2xl sm:text-3xl leading-none tracking-tight text-foreground">
          {titulo}
        </h3>
        {sub && (
          <p className="mt-0.5 font-display text-base sm:text-lg leading-none tracking-tight text-primary">
            {sub}
          </p>
        )}

        {/* Stats compactos */}
        <div className="mt-3 flex divide-x divide-white/10">
          <Stat icon={<Calendar className="h-3.5 w-3.5 text-primary" />} value={`${preset.freq}x`} label="Dias" />
          <Stat icon={<Target className="h-3.5 w-3.5 text-primary" />} value="Hipertrofia" label="Foco" />
          <Stat
            icon={<Dumbbell className="h-3.5 w-3.5 text-primary" />}
            value={String(grupos.length || preset.dias.length)}
            label="Grupos"
          />
        </div>

        {/* Grupos trabalhados */}
        {grupos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {grupos.map((g) => (
              <span
                key={g}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-foreground/90"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGerar}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            {gerando ? "Gerando..." : "Gerar e revisar"}
          </button>
          <button
            type="button"
            onClick={() => setPrevia((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground/90 transition-colors hover:border-white/40"
          >
            <Eye className="h-3.5 w-3.5" />
            Prévia
          </button>
        </div>

        {previa && (
          <div className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/60 p-2.5">
            {preset.dias.map((d, i) => (
              <p key={i} className="text-[11px] leading-snug text-muted-foreground">
                • {d}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex-1 px-2 first:pl-0">
    <div className="flex items-center gap-1.5">
      {icon}
      <p className="font-display text-xs leading-none tracking-tight text-foreground truncate">{value}</p>
    </div>
    <p className="mt-1 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
  </div>
);

export default DivisaoPresetCard;
