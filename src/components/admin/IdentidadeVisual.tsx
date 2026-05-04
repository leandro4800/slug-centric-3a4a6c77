import { useState } from "react";
import { useBranding, type ThemeOverrides } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { PhonePreview } from "./PhonePreview";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Save, Check } from "lucide-react";
import { toast } from "sonner";

type Preset = {
  id: string;
  name: string;
  subtitle: string;
  swatches: string[]; // hex array for visual chip
  overrides: ThemeOverrides;
};

// Defaults Netflix/Ferrari já estão no BrandingProvider; aqui só os presets.
const PRESETS: Preset[] = [
  {
    id: "ferrari",
    name: "FERRARI BLACK",
    subtitle: "Padrão · Vermelho & Preto",
    swatches: ["#000000", "#0A0A0A", "#E10600", "#FAFAFA"],
    overrides: {
      primary: "355 100% 48%",
      primary_glow: "355 100% 60%",
      accent: "355 100% 48%",
      background: "0 0% 0%",
      card: "0 0% 3%",
      foreground: "0 0% 98%",
      border: "0 0% 15%",
    },
  },
  {
    id: "tech-titanium",
    name: "TECH TITANIUM",
    subtitle: "Performance · Azul Elétrico",
    swatches: ["#121417", "#1C1F28", "#007BFF", "#FFFFFF"],
    overrides: {
      primary: "212 100% 50%",
      primary_glow: "212 100% 65%",
      accent: "212 100% 50%",
      background: "220 14% 8%",
      card: "222 18% 13%",
      foreground: "0 0% 100%",
      border: "220 14% 22%",
    },
  },
  {
    id: "deep-sea-glass",
    name: "DEEP SEA GLASS",
    subtitle: "Moderno & Fluido",
    swatches: ["#0F172A", "#1E293B", "#7DD3FC", "#FEFFEF"],
    overrides: {
      primary: "199 89% 74%",
      primary_glow: "199 89% 85%",
      accent: "199 89% 74%",
      background: "222 47% 11%",
      card: "217 33% 17%",
      foreground: "60 100% 97%",
      border: "217 33% 25%",
    },
  },
  {
    id: "gold-mirror",
    name: "GOLD MIRROR",
    subtitle: "Dourado Espelhado & Preto",
    swatches: ["#000000", "#1A1A1A", "#FFD700", "#FFFFFF"],
    overrides: {
      primary: "42 100% 50%",
      primary_glow: "48 100% 80%",
      accent: "42 100% 50%",
      background: "0 0% 0%",
      card: "0 0% 3%",
      foreground: "0 0% 98%",
      border: "0 0% 15%",
    },
  },
  {
    id: "nordic-minimalist",
    name: "NORDIC MINIMALIST",
    subtitle: "Limpo & Sofisticado",
    swatches: ["#FBF9FA", "#212529", "#A9A9A9", "#000000"],
    overrides: {
      primary: "210 11% 15%",
      primary_glow: "210 11% 30%",
      accent: "210 11% 15%",
      background: "330 14% 98%",
      card: "0 0% 100%",
      foreground: "210 11% 15%",
      border: "0 0% 85%",
    },
  },
];

export const IdentidadeVisual = () => {
  const { tenant, refresh, applyPreview, clearPreview } = useBranding();
  const [selected, setSelected] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tenant) return null;

  const handlePick = (p: Preset) => {
    setSelected(p);
    applyPreview(p.overrides);
  };

  const handleDiscard = () => {
    setSelected(null);
    clearPreview();
  };

  const handleSave = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("tenants")
      .update({ theme_overrides: selected.overrides })
      .eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Tema "${selected.name}" aplicado em todo o app!`);
      setSelected(null);
      await refresh();
    }
    setBusy(false);
  };

  const handleResetAll = async () => {
    setBusy(true);
    const { error } = await supabase.from("tenants").update({ theme_overrides: {} }).eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      setSelected(null);
      await refresh();
      toast.success("Tema restaurado para o padrão");
    }
    setBusy(false);
  };

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6">
      {/* Preview */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 text-center">
          Pré-visualização
        </p>
        <PhonePreview onPick={() => {}} pickedTarget={null} />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDiscard}
            disabled={!selected}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Descartar
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-primary shadow-glow"
            onClick={handleSave}
            disabled={busy || !selected}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" /> Aplicar</>}
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <h3 className="font-display text-lg mb-1">ESCOLHA UM TEMA</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Toque em qualquer card e o app inteiro muda na hora. Depois clique em <strong>Aplicar</strong> para salvar.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {PRESETS.map((p) => {
              const isActive = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all overflow-hidden ${
                    isActive
                      ? "border-primary shadow-glow scale-[1.02]"
                      : "border-border hover:border-primary/60"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${p.swatches[0]} 0%, ${p.swatches[1]} 100%)`,
                  }}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <p
                    className="font-display text-sm font-bold tracking-wide"
                    style={{ color: p.swatches[3] }}
                  >
                    {p.name}
                  </p>
                  <p className="text-[10px] opacity-70 mb-3" style={{ color: p.swatches[3] }}>
                    {p.subtitle}
                  </p>
                  <div className="flex gap-1.5">
                    {p.swatches.map((c, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border border-white/20 shadow-md"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Restaurar padrão</p>
            <p className="text-xs text-muted-foreground">Volta para o tema Ferrari Black</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll} disabled={busy}>
            <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Em breve: mais temas exclusivos serão adicionados aqui.
        </p>
      </div>
    </div>
  );
};
