import { useBranding, type ThemeOverrides } from "@/contexts/BrandingProvider";
import { Play, Settings } from "lucide-react";
import heroDefault from "@/assets/hero-default.jpg";

interface Props {
  // Recebe handler quando usuário clica num "elemento editável" do preview
  onPick: (target: EditableTarget) => void;
  pickedTarget?: EditableTarget | null;
}

export type EditableTarget =
  | { id: "background"; label: "Fundo do app"; tokens: ["background"] }
  | { id: "card"; label: "Cartões"; tokens: ["card"] }
  | { id: "primary"; label: "Cor primária / Botões"; tokens: ["primary", "primary_glow", "accent"] }
  | { id: "accent"; label: "Detalhes secundários"; tokens: ["accent"] }
  | { id: "foreground"; label: "Texto principal"; tokens: ["foreground"] }
  | { id: "border"; label: "Bordas"; tokens: ["border"] };

export const EDITABLE_TARGETS: EditableTarget[] = [
  { id: "background", label: "Fundo do app", tokens: ["background"] },
  { id: "card", label: "Cartões", tokens: ["card"] },
  { id: "primary", label: "Cor primária / Botões", tokens: ["primary", "primary_glow", "accent"] },
  { id: "accent", label: "Detalhes secundários", tokens: ["accent"] },
  { id: "foreground", label: "Texto principal", tokens: ["foreground"] },
  { id: "border", label: "Bordas", tokens: ["border"] },
];

const HotZone = ({
  active,
  onClick,
  className,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={label}
    aria-label={label}
    className={`group relative ${className || ""} ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent" : "hover:ring-2 hover:ring-primary/60"}`}
  >
    {children}
    <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
      {label}
    </span>
  </button>
);

const find = (id: EditableTarget["id"]) => EDITABLE_TARGETS.find((t) => t.id === id)!;

export const PhonePreview = ({ onPick, pickedTarget }: Props) => {
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;

  return (
    <div className="mx-auto" style={{ width: 290 }}>
      <div className="relative" style={{ width: 290, height: 600 }}>
        {/* Frame do celular */}
        <div className="absolute inset-0 rounded-[36px] bg-neutral-900 shadow-2xl" />
        <div className="absolute inset-[6px] rounded-[30px] overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-neutral-900 rounded-b-2xl z-20" />

          {/* Background hot-zone (fundo geral) */}
          <HotZone
            label="Fundo do app"
            active={pickedTarget?.id === "background"}
            onClick={() => onPick(find("background"))}
            className="absolute inset-0 rounded-none"
          >
            <div className="absolute inset-0" />
          </HotZone>

          {/* Hero */}
          <div className="absolute top-0 left-0 right-0 h-[55%] overflow-hidden pointer-events-none">
            <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(var(--background)/0.3), hsl(var(--background)/0.4), hsl(var(--background)))" }} />
          </div>

          {/* Top bar */}
          <div className="absolute top-7 left-0 right-0 flex items-center justify-between px-3 z-10">
            <HotZone
              label="Cor primária / Logo"
              active={pickedTarget?.id === "primary"}
              onClick={() => onPick(find("primary"))}
              className="rounded px-1 py-0.5"
            >
              <span className="font-display text-xs" style={{ color: "hsl(var(--primary))" }}>ALPHA</span>
            </HotZone>
            <HotZone
              label="Botão Reproduzir / Ícones"
              active={pickedTarget?.id === "accent"}
              onClick={() => onPick(find("accent"))}
              className="rounded-full"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.2)", border: "1px solid hsl(var(--primary)/0.4)" }}>
                <Settings className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
              </div>
            </HotZone>
          </div>

          {/* Hero text + CTA */}
          <div className="absolute top-[28%] left-0 right-0 px-3 z-10">
            <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "hsl(var(--primary))" }}>
              {tenant?.nome || "AlphaCoach"}
            </p>
            <HotZone
              label="Texto principal"
              active={pickedTarget?.id === "foreground"}
              onClick={() => onPick(find("foreground"))}
              className="rounded inline-block"
            >
              <h2 className="font-display text-xl leading-none" style={{ color: "hsl(var(--foreground))" }}>
                {(tenant?.tagline || "TREINE COMO CAMPEÃO").slice(0, 24)}
              </h2>
            </HotZone>
            <div className="mt-2">
              <HotZone
                label="Botão Reproduzir / Ícones"
                active={pickedTarget?.id === "accent"}
                onClick={() => onPick(find("accent"))}
                className="rounded-md inline-flex"
              >
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded shadow-glow"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  <Play className="h-2.5 w-2.5 fill-current" /> REPRODUZIR
                </span>
              </HotZone>
            </div>
          </div>

          {/* Card linhas úteis */}
          <div className="absolute top-[58%] left-3 right-3">
            <HotZone
              label="Cartões"
              active={pickedTarget?.id === "card"}
              onClick={() => onPick(find("card"))}
              className="rounded-lg w-full block"
            >
              <div
                className="w-full rounded-lg p-2 flex items-center gap-2"
                style={{ background: "hsl(var(--card)/0.8)", border: "1px solid hsl(var(--border))" }}
              >
                <div className="w-7 h-7 rounded-md" style={{ background: "hsl(var(--primary)/0.2)", border: "1px solid hsl(var(--primary)/0.4)" }} />
                <div className="text-left">
                  <p className="font-display text-[10px]" style={{ color: "hsl(var(--primary))" }}>LINKS ÚTEIS</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--foreground)/0.6)" }}>Parceiros & cupons</p>
                </div>
              </div>
            </HotZone>
          </div>

          {/* Mini cards prescrição */}
          <div className="absolute top-[72%] left-3 right-3">
            <p className="font-display text-[9px] mb-1" style={{ color: "hsl(var(--foreground))" }}>
              <span style={{ color: "hsl(var(--primary))" }}>▶</span> MINHA PRESCRIÇÃO
            </p>
            <div className="flex gap-1.5">
              {[0,1,2].map((i) => (
                <HotZone
                  key={i}
                  label="Cartões"
                  active={pickedTarget?.id === "card"}
                  onClick={() => onPick(find("card"))}
                  className="rounded-md flex-1"
                >
                  <div
                    className="aspect-[2/3] rounded-md"
                    style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                </HotZone>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 h-9 flex items-center justify-around px-2 z-10" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
            {[0,1,2,3].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.4)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
