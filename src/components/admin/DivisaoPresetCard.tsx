import { useState } from "react";
import { Calendar, Target, Dumbbell, Play, Eye, TrendingUp, Loader2 } from "lucide-react";
import cardTreino from "@/assets/card-treino.jpg";

export type PresetLike = {
  id: string;
  label: string;
  freq: number;
  nivel: string[];
  dias: string[];
};

const DIAS_SEMANA = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

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
  return out.slice(0, 5);
};

// "ABCDE 5x — Ênfase Inferiores" -> título / subtítulo
const partirLabel = (label: string) => {
  const partes = label.split("—");
  const titulo = (partes.shift() || label).trim();
  const sub = partes.join("—").trim();
  return { titulo, sub };
};

const limparDia = (d: string) => {
  const partes = d.split("—");
  return (partes.length > 1 ? partes.slice(1).join("—") : d).trim();
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
      className={`relative overflow-hidden rounded-[28px] bg-[#080b10] transition-all duration-300 ${
        selecionado
          ? "border border-primary shadow-[0_0_40px_-8px_hsl(var(--primary)/0.55)]"
          : "border border-primary/40 hover:border-primary/80 hover:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)]"
      }`}
    >
      {/* Foto de fundo à direita + overlay cinematográfico */}
      <img
        src={cardTreino}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #080b10 0%, rgba(8,11,16,0.95) 42%, rgba(8,11,16,0.2) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080b10] via-transparent to-transparent" />

      <div className="relative p-4 sm:p-6">
        {/* Badge topo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl leading-none text-primary">N</span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-foreground/80">
              AlphaCoach Original
            </span>
          </div>
          {nivelTxt && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/60 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
              <TrendingUp className="h-3 w-3 text-primary" />
              {nivelTxt}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="mt-4 font-display text-3xl sm:text-5xl leading-none tracking-tight text-foreground">
          {titulo}
        </h3>
        {sub && (
          <p className="mt-1 font-display text-xl sm:text-2xl leading-none tracking-tight text-primary">
            {sub}
          </p>
        )}
        <p className="mt-3 max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Divisão de treino de {preset.freq}x por semana com foco em{" "}
          {(sub || titulo).toLowerCase()}.
        </p>

        {/* Stats */}
        <div className="mt-5 flex max-w-md divide-x divide-white/10">
          <Stat icon={<Calendar className="h-5 w-5 text-primary" />} value={`${preset.freq}X`} label="Dias por semana" />
          <Stat icon={<Target className="h-5 w-5 text-primary" />} value="Hipertrofia" label="Foco principal" />
          <Stat
            icon={<Dumbbell className="h-5 w-5 text-primary" />}
            value={String(grupos.length || preset.dias.length)}
            label="Grupos musculares"
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:items-end">
          <div>
            {/* Grupos trabalhados */}
            {grupos.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Grupos trabalhados
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {grupos.map((g) => (
                    <span
                      key={g}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/90"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Ações */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGerar}
                disabled={disabled}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {gerando ? "Gerando..." : "Gerar e revisar"}
              </button>
              <button
                type="button"
                onClick={() => setPrevia((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-foreground/90 transition-colors hover:border-white/40"
              >
                <Eye className="h-4 w-4" />
                Prévia da divisão
              </button>
            </div>
          </div>

          {/* Divisão semanal */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Divisão semanal
              </p>
              <span className="rounded border border-primary/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                {preset.dias.length} treinos
              </span>
            </div>
            <div className="mt-3 flex divide-x divide-white/10">
              {preset.dias.map((d, i) => (
                <div key={i} className="flex-1 px-1 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/90">
                    {DIAS_SEMANA[i] || `D${i + 1}`}
                  </p>
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground line-clamp-3">
                    {limparDia(d)}
                  </p>
                </div>
              ))}
            </div>
            {previa && (
              <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                {preset.dias.map((d, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">
                    • {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex-1 px-3 first:pl-0 text-center first:text-left">
    <div className="flex justify-center first:justify-start">{icon}</div>
    <p className="mt-1.5 font-display text-base leading-none tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
  </div>
);

export default DivisaoPresetCard;
